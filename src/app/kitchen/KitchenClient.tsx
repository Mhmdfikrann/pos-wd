"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import { Clock, Check, Play, Bell, CornerUpLeft } from "lucide-react";
import { formatMMSS, formatClock } from "@/lib/format";
import { actionTransitionKitchenTicket } from "@/lib/kitchen-actions";
import {
  nextVisibleStatus,
  previousVisibleStatus,
  type KitchenStatus,
} from "@/lib/kitchen-core";
import type { KitchenTicketView } from "@/lib/kitchen-data";

type ItemStation = "kukus" | "goreng" | "minuman";
type StationFilter = "all" | ItemStation;
type TicketType = "dinein" | "takeaway" | "delivery";
type Status = "baru" | "proses" | "siap";

interface TicketItem {
  name: string;
  qty: number;
  note: string;
  station: ItemStation | null;
  done: boolean;
}

interface Ticket {
  id: string;
  no: string;
  type: TicketType;
  slot: string;
  base: number;
  status: Status;
  sourceStatus: KitchenStatus;
  items: TicketItem[];
}

const WARN_MINUTES = 5;
const ALERT_MINUTES = 10;
const WARN_SEC = WARN_MINUTES * 60;
const ALERT_SEC = ALERT_MINUTES * 60;

const STATIONS: [StationFilter, string][] = [
  ["all", "Semua"],
  ["kukus", "Kukus"],
  ["goreng", "Goreng"],
  ["minuman", "Minuman"],
];

const COLS: { key: Status; label: string; color: string; bg: string }[] = [
  { key: "baru", label: "Baru", color: "#3A5BB0", bg: "#EEF2FB" },
  { key: "proses", label: "Sedang Dimasak", color: "#C67A15", bg: "#FCEEDB" },
  { key: "siap", label: "Siap Antar", color: "#238152", bg: "#E4F4EC" },
];

const TYPE: Record<TicketType, [string, string, string]> = {
  dinein: ["Dine-in", "#A91F34", "#FFF1F2"],
  takeaway: ["Takeaway", "#C67A15", "#FCEEDB"],
  delivery: ["Delivery", "#238152", "#E4F4EC"],
};

const MONO = "var(--font-mono), monospace";

function ageColor(s: number): string {
  if (s >= ALERT_SEC) return "#D64545";
  if (s >= WARN_SEC) return "#E99A22";
  return "#238152";
}

function mapTickets(rows: KitchenTicketView[], doneMap: Record<string, boolean>): Ticket[] {
  const nowMs = Date.now();
  return rows.map((row) => ({
    id: row.id,
    no: row.orderNo.replace(/^TRX-/, ""),
    type: row.orderType,
    slot: row.slot,
    base: Math.max(0, Math.floor((nowMs - Date.parse(row.createdAt)) / 1000)),
    status: row.boardStatus,
    sourceStatus: row.status,
    items: row.items.map((item, idx) => ({
      name: item.name,
      qty: item.quantity,
      note: item.note ?? "",
      station: item.station,
      done: row.boardStatus === "siap" || !!doneMap[`${row.id}:${idx}`],
    })),
  }));
}

interface KitchenClientProps {
  initialTickets: KitchenTicketView[];
  outletName: string;
  staffName: string;
}

export default function KitchenClient({
  initialTickets,
  outletName,
  staffName,
}: KitchenClientProps) {
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState<Date | null>(null);
  const [station, setStation] = useState<StationFilter>("all");
  const [tickets, setTickets] = useState<Ticket[]>(() => mapTickets(initialTickets, {}));
  const [doneMap, setDoneMap] = useState<Record<string, boolean>>({});
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Set the first clock value on the next frame (not synchronously in the
    // effect body) to avoid a cascading render, then tick every second.
    const raf = requestAnimationFrame(() => setNow(new Date()));
    const timer = setInterval(() => {
      setTick((t) => t + 1);
      setNow(new Date());
    }, 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
    };
  }, []);

  const refreshTickets = async (signal?: AbortSignal) => {
    const res = await fetch("/api/kitchen/tickets", { cache: "no-store", signal });
    if (!res.ok) throw new Error("Gagal memuat ticket dapur.");
    const data = (await res.json()) as { tickets: KitchenTicketView[] };
    setTickets(mapTickets(data.tickets, doneMap));
  };

  useEffect(() => {
    const controller = new AbortController();
    const poll = () => {
      void refreshTickets(controller.signal).catch((err) => {
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : "Gagal memuat ticket dapur.");
        }
      });
    };
    const timer = setInterval(poll, 3000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
    // doneMap intentionally excluded: polling refreshes server state, item checks
    // are local display hints until Phase 6 gets per-item persistence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const elapsed = (t: Ticket) => t.base + tick;

  const transition = async (ticket: Ticket, toStatus: KitchenStatus) => {
    if (busyIds[ticket.id]) return;
    setBusyIds((m) => ({ ...m, [ticket.id]: true }));
    setError(null);
    const res = await actionTransitionKitchenTicket({ ticketId: ticket.id, toStatus });
    setBusyIds((m) => {
      const next = { ...m };
      delete next[ticket.id];
      return next;
    });
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await refreshTickets().catch((err) => {
      setError(err instanceof Error ? err.message : "Gagal memuat ticket dapur.");
    });
  };

  const bump = (id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    const next = nextVisibleStatus(ticket.sourceStatus);
    if (!next) return;
    void transition(ticket, next);
  };

  const recall = (id: string) => {
    const ticket = tickets.find((t) => t.id === id);
    if (!ticket) return;
    const prev = previousVisibleStatus(ticket.sourceStatus);
    if (!prev) return;
    void transition(ticket, prev);
  };

  const toggleItem = (id: string, idx: number) => {
    const key = `${id}:${idx}`;
    setDoneMap((m) => {
      const next = { ...m, [key]: !m[key] };
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                items: t.items.map((it, i) =>
                  i === idx ? { ...it, done: next[key] } : it,
                ),
              }
            : t,
        ),
      );
      return next;
    });
  };

  const visibleTickets = tickets.filter(
    (t) => station === "all" || t.items.some((i) => i.station === station)
  );

  const staffInitial = staffName.charAt(0);

  return (
    <div
      className="wd-kitchen-shell"
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#FFF9F2",
      }}
    >
      {/* ===== HEADER ===== */}
      <div
        className="wd-role-topbar wd-kitchen-topbar"
        style={{
          height: "64px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "0 20px",
          background: "#fff",
          borderBottom: "1px solid rgba(45,32,34,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "11px", flexShrink: 0 }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "9px",
              background: "#fff",
              border: "1px solid rgba(45,32,34,0.08)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            <Image
              src="/logo-icon.jpg"
              alt="Wanna Dimsum"
              width={36}
              height={36}
              style={{ width: "36px", height: "36px", objectFit: "contain" }}
            />
          </div>
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontSize: "13.5px", fontWeight: 800 }}>
              <span style={{ color: "#A91F34" }}>WANNA</span> DIMSUM
            </div>
            <div
              style={{
                fontSize: "10.5px",
                color: "rgba(45,32,34,0.5)",
                fontWeight: 600,
                marginTop: "2px",
              }}
            >
              Kitchen Display · {outletName}
            </div>
          </div>
        </div>

        <div
          className="wd-mobile-hide"
          style={{
            width: "1px",
            height: "28px",
            background: "rgba(45,32,34,0.1)",
            marginLeft: "6px",
          }}
        />

        {/* station tabs */}
        <div
          className="wd-kitchen-tabs"
          style={{
            display: "flex",
            gap: "4px",
            background: "#FFF9F2",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid rgba(45,32,34,0.08)",
          }}
        >
          {STATIONS.map(([key, label]) => {
            const on = station === key;
            return (
              <button
                key={key}
                onClick={() => setStation(key)}
                style={{
                  border: "none",
                  cursor: "pointer",
                  borderRadius: "7px",
                  fontFamily: "inherit",
                  fontSize: "13px",
                  fontWeight: 700,
                  padding: "8px 15px",
                  background: on ? "#A91F34" : "transparent",
                  color: on ? "#fff" : "rgba(45,32,34,0.6)",
                  transition: "all .12s",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div style={{ flex: 1 }} />

        <span
          className="wd-mobile-hide"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "13px",
            fontWeight: 800,
            padding: "8px 13px",
            borderRadius: "9px",
            background: "#FFF4D6",
            color: "#A9791F",
            fontFamily: MONO,
          }}
        >
          <Clock size={15} strokeWidth={2} />
          {now ? formatClock(now) : "--:--:--"}
        </span>
        <span
          className="wd-mobile-hide"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            fontSize: "12.5px",
            fontWeight: 700,
            padding: "8px 13px",
            borderRadius: "9px",
            background: "#E4F4EC",
            color: "#238152",
          }}
        >
          <span
            className="wd-blink"
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#2E9D64",
            }}
          />
          Online
        </span>
        <div className="wd-mobile-hide" style={{ width: "1px", height: "28px", background: "rgba(45,32,34,0.1)" }} />
        <div className="wd-topbar-user" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "#FFF4D6",
              color: "#A9791F",
              border: "1px solid rgba(169,121,31,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: "14px",
            }}
          >
            {staffInitial}
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: "12.5px", fontWeight: 700 }}>{staffName}</div>
            <div style={{ fontSize: "10.5px", color: "rgba(45,32,34,0.5)" }}>
              Dapur · Shift Siang
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div
          style={{
            flexShrink: 0,
            padding: "9px 20px",
            background: "#FBE7E7",
            color: "#B83636",
            fontSize: "12.5px",
            fontWeight: 700,
            borderBottom: "1px solid rgba(184,54,54,0.18)",
          }}
        >
          {error}
        </div>
      ) : null}

      {/* ===== BOARD ===== */}
      <div
        className="wd-kitchen-board"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(3,1fr)",
          gridTemplateRows: "minmax(0,1fr)",
          gap: 0,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {COLS.map((col, ci) => {
          const list = visibleTickets
            .filter((t) => t.status === col.key)
            .sort((a, b) => elapsed(b) - elapsed(a));
          return (
            <div
              key={col.key}
              style={{
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                borderRight: ci < 2 ? "1px solid rgba(45,32,34,0.08)" : "none",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 18px",
                  background: col.bg,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "9px" }}>
                  <span
                    style={{
                      width: "10px",
                      height: "10px",
                      borderRadius: "50%",
                      background: col.color,
                    }}
                  />
                  <span style={{ fontSize: "15px", fontWeight: 800, color: col.color }}>
                    {col.label}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "#fff",
                    background: col.color,
                    minWidth: "26px",
                    height: "24px",
                    padding: "0 8px",
                    borderRadius: "999px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {list.length}
                </span>
              </div>
              <div
                className="wd-scroll"
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "13px",
                }}
              >
                {list.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: "50px 16px",
                      color: "rgba(45,32,34,0.4)",
                      fontSize: "13.5px",
                      fontWeight: 600,
                    }}
                  >
                    Tidak ada pesanan
                  </div>
                ) : (
                  list.map((t) => (
                    <TicketCard
                      key={t.id}
                      ticket={t}
                      sec={elapsed(t)}
                      station={station}
                      onBump={bump}
                      onRecall={recall}
                      onToggleItem={toggleItem}
                      busy={!!busyIds[t.id]}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TicketCardProps {
  ticket: Ticket;
  sec: number;
  station: StationFilter;
  onBump: (id: string) => void;
  onRecall: (id: string) => void;
  onToggleItem: (id: string, idx: number) => void;
  busy: boolean;
}

function TicketCard({
  ticket: t,
  sec,
  station,
  onBump,
  onRecall,
  onToggleItem,
  busy,
}: TicketCardProps) {
  const [tLabel, tColor, tBg] = TYPE[t.type];
  const ageC = ageColor(sec);
  const overdue = sec >= ALERT_SEC && t.status !== "siap";
  const doneCount = t.items.filter((i) => i.done).length;
  const allDone = doneCount === t.items.length;

  const actionMap: Record<Status, [string, LucideIcon, string]> = {
    baru: ["Mulai Masak", Play, "#3A5BB0"],
    proses: [allDone ? "Tandai Siap" : "Selesai Masak", Check, "#238152"],
    siap: ["Sudah Diantar", Bell, "#A91F34"],
  };
  const [aLabel, AIcon, aColor] = actionMap[t.status];

  return (
    <div
      style={{
        flexShrink: 0,
        background: "#fff",
        border:
          "1px solid " +
          (overdue ? "rgba(214,69,69,0.5)" : "rgba(45,32,34,0.1)"),
        borderRadius: "13px",
        overflow: "hidden",
        boxShadow: "0 8px 22px -18px rgba(45,32,34,0.5)",
      }}
      className={overdue ? "wd-flash" : "wd-fade"}
    >
      {/* header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 14px",
          borderBottom: "1px dashed rgba(45,32,34,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: MONO, fontSize: "15px", fontWeight: 700 }}>
            #{t.no}
          </span>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: "6px",
              background: tBg,
              color: tColor,
            }}
          >
            {tLabel}
          </span>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontFamily: MONO,
            fontSize: "14px",
            fontWeight: 700,
            color: ageC,
          }}
        >
          <Clock size={14} strokeWidth={2.2} color={ageC} />
          {formatMMSS(sec)}
        </div>
      </div>

      {/* slot + progress */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "9px 14px 4px",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 700, color: "#A91F34" }}>
          {t.slot}
        </span>
        <span
          style={{ fontFamily: MONO, fontSize: "11.5px", color: "rgba(45,32,34,0.5)" }}
        >
          {doneCount}/{t.items.length} siap
        </span>
      </div>

      {/* items */}
      <div
        className="wd-scroll"
        style={{
          padding: "4px 14px 10px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
          maxHeight: "220px",
          overflowY: "auto",
        }}
      >
        {t.items.map((it, idx) => {
          const dim = station !== "all" && it.station !== station;
          return (
            <div
              key={idx}
              onClick={() => onToggleItem(t.id, idx)}
              style={{
                display: "flex",
                gap: "10px",
                padding: "8px 6px",
                borderRadius: "8px",
                cursor: "pointer",
                opacity: dim ? 0.4 : 1,
                background: it.done ? "#FFF9F2" : "transparent",
              }}
            >
              <div
                style={{
                  width: "22px",
                  height: "22px",
                  flexShrink: 0,
                  borderRadius: "6px",
                  marginTop: "1px",
                  border: it.done ? "none" : "1.5px solid rgba(45,32,34,0.22)",
                  background: it.done ? "#2E9D64" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {it.done ? <Check size={14} strokeWidth={3} color="#fff" /> : null}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "baseline" }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "#A91F34",
                      minWidth: "26px",
                    }}
                  >
                    {it.qty}&#215;
                  </span>
                  <span
                    style={{
                      fontSize: "15px",
                      fontWeight: 700,
                      textDecoration: it.done ? "line-through" : "none",
                      color: it.done ? "rgba(45,32,34,0.45)" : "#2D2022",
                    }}
                  >
                    {it.name}
                  </span>
                </div>
                {it.note ? (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#C67A15",
                      fontWeight: 600,
                      marginTop: "2px",
                      marginLeft: "34px",
                    }}
                  >
                    &#9998; {it.note}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* action */}
      <div style={{ display: "flex", gap: "8px", padding: "0 12px 12px" }}>
        {t.status !== "baru" ? (
          <button
              onClick={() => onRecall(t.id)}
              aria-label="Kembalikan"
              disabled={busy}
              style={{
              width: "46px",
              flexShrink: 0,
              height: "46px",
              borderRadius: "10px",
              border: "1.5px solid rgba(45,32,34,0.15)",
              background: "#fff",
              color: "rgba(45,32,34,0.55)",
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.55 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CornerUpLeft size={18} strokeWidth={2} />
          </button>
        ) : null}
        <button
          onClick={() => onBump(t.id)}
          disabled={busy}
          style={{
            flex: 1,
            height: "46px",
            borderRadius: "10px",
            border: "none",
            background: aColor,
            color: "#fff",
            fontFamily: "inherit",
            fontWeight: 800,
            fontSize: "14.5px",
            cursor: busy ? "not-allowed" : "pointer",
            opacity: busy ? 0.65 : 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            boxShadow: "0 10px 20px -12px " + aColor,
          }}
        >
          <AIcon size={17} strokeWidth={2.2} color="#fff" />
          {aLabel}
        </button>
      </div>
    </div>
  );
}
