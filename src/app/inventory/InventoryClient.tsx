"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Search,
  Plus,
  Minus,
  Package,
  DollarSign,
  AlertTriangle,
  Calendar,
  ClipboardCheck,
  X,
  Check,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { actionAdjustStock } from "@/lib/inventory-actions";
import type { StockView } from "@/lib/inventory-data";

type Cat = "bahan" | "kemasan" | "minuman" | "operasional";
type Status = "ok" | "low" | "out";
type AdjType = "masuk" | "keluar" | "opname";

interface Item {
  id: string;
  itemId: string;
  outletId: string;
  name: string;
  sku: string;
  cat: Cat;
  qty: number;
  min: number;
  unit: string;
  cost: number;
  exp: number | null;
}

const MONO = "var(--font-mono), monospace";

const CATS: [string, string][] = [
  ["all", "Semua"],
  ["bahan", "Bahan Baku"],
  ["kemasan", "Kemasan"],
  ["minuman", "Minuman"],
  ["operasional", "Operasional"],
];
const CAT_LABEL: Record<Cat, string> = {
  bahan: "Bahan Baku",
  kemasan: "Kemasan",
  minuman: "Minuman",
  operasional: "Operasional",
};
const CAT_TINT: Record<Cat, [string, string]> = {
  bahan: ["#FFF1F2", "#A91F34"],
  kemasan: ["#EEF2FB", "#3A5BB0"],
  minuman: ["#FCEEDB", "#C67A15"],
  operasional: ["#EFEAEA", "#5A4B4D"],
};
const STATUSES: [string, string][] = [
  ["all", "Semua"],
  ["ok", "Tersedia"],
  ["low", "Menipis"],
  ["out", "Habis"],
];
const STATUS_TINT: Record<Status, [string, string, string]> = {
  ok: ["#E4F4EC", "#238152", "Tersedia"],
  low: ["#FCEEDB", "#C67A15", "Menipis"],
  out: ["#EFEAEA", "#5A4B4D", "Habis"],
};

function statusOf(it: Item): Status {
  if (it.qty <= 0) return "out";
  if (it.qty <= it.min) return "low";
  return "ok";
}

function Tabs({
  list,
  current,
  onPick,
  kind,
}: {
  list: [string, string][];
  current: string;
  onPick: (key: string) => void;
  kind: "cat" | "status";
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: "4px",
        background: "#fff",
        padding: "4px",
        borderRadius: "10px",
        border: "1px solid rgba(45,32,34,0.1)",
      }}
    >
      {list.map(([key, label]) => {
        const on = current === key;
        return (
          <button
            key={key}
            onClick={() => onPick(key)}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: "7px",
              fontFamily: "inherit",
              fontSize: "13px",
              fontWeight: 700,
              padding: "8px 14px",
              background: on ? (kind === "status" ? "#2D2022" : "#A91F34") : "transparent",
              color: on ? "#fff" : "rgba(45,32,34,0.6)",
              transition: "all .12s",
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

function toItem(view: StockView): Item {
  return {
    id: view.id,
    itemId: view.itemId,
    outletId: view.outletId,
    name: view.name,
    sku: view.sku,
    cat: view.cat,
    qty: view.qty,
    min: view.min,
    unit: view.unit,
    cost: view.cost,
    exp: view.exp,
  };
}

function toMovementType(type: AdjType): "in" | "out" | "opname" {
  if (type === "masuk") return "in";
  if (type === "keluar") return "out";
  return "opname";
}

export default function InventoryClient({
  initialItems,
  outletName,
  staffName,
}: {
  initialItems: StockView[];
  outletName: string;
  staffName: string;
}) {
  const [items, setItems] = useState<Item[]>(() => initialItems.map(toItem));
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("all");
  const [status, setStatus] = useState("all");
  const [adjId, setAdjId] = useState<string | null>(null);
  const [adjType, setAdjType] = useState<AdjType>("masuk");
  const [adjQty, setAdjQty] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const staffInitial = staffName.charAt(0);

  const totalValue = items.reduce((s, it) => s + it.qty * it.cost, 0);
  const restockCount = items.filter((it) => statusOf(it) !== "ok").length;
  const expCount = items.filter((it) => it.exp != null && it.exp <= 3).length;

  const filtered = () => {
    const q = query.trim().toLowerCase();
    return items.filter(
      (it) =>
        (cat === "all" || it.cat === cat) &&
        (status === "all" || statusOf(it) === status) &&
        (!q ||
          it.name.toLowerCase().includes(q) ||
          it.sku.toLowerCase().includes(q) ||
          CAT_LABEL[it.cat].toLowerCase().includes(q)),
    );
  };

  const openAdj = (id: string, type: AdjType) => {
    setAdjId(id);
    setAdjType(type);
    setAdjQty(0);
  };
  const closeAdj = () => setAdjId(null);
  const confirmAdj = async () => {
    const item = adjId ? items.find((it) => it.id === adjId) : null;
    if (!item || saving) return;
    setSaving(true);
    setError(null);
    const result = await actionAdjustStock({
      outletId: item.outletId,
      itemId: item.itemId,
      type: toMovementType(adjType),
      quantity: adjQty,
      note: adjType === "opname" ? "Stok opname" : null,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === result.item.id ? toItem(result.item) : it)));
    setAdjId(null);
  };

  const onOpname = () => {
    const first = filtered()[0];
    if (first) openAdj(first.id, "opname");
  };
  const onAddStock = () => {
    const first = filtered()[0];
    if (first) openAdj(first.id, "masuk");
  };

  const list = filtered();
  const adjItem = adjId ? items.find((i) => i.id === adjId) ?? null : null;

  return (
    <div className="wd-inventory-shell" style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#FFF9F2" }}>
      {/* ===== HEADER ===== */}
      <div
        className="wd-role-topbar wd-inventory-topbar"
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
            <div style={{ fontSize: "10.5px", color: "rgba(45,32,34,0.5)", fontWeight: 600, marginTop: "2px" }}>
              Inventori · {outletName}
            </div>
          </div>
        </div>

        <div className="wd-topbar-search" style={{ position: "relative", flex: 1, maxWidth: "420px", marginLeft: "6px" }}>
          <span
            style={{
              position: "absolute",
              left: "15px",
              top: "50%",
              transform: "translateY(-50%)",
              display: "flex",
              color: "rgba(45,32,34,0.4)",
            }}
          >
            <Search size={18} strokeWidth={2} />
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari bahan, SKU, atau kategori…"
            style={{
              width: "100%",
              height: "44px",
              border: "1.5px solid rgba(45,32,34,0.12)",
              borderRadius: "10px",
              padding: "0 14px 0 42px",
              fontSize: "14px",
              color: "#2D2022",
              background: "#FFF9F2",
              outline: "none",
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

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
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2E9D64" }}
          />
          Tersinkron
        </span>
        <div className="wd-mobile-hide" style={{ width: "1px", height: "28px", background: "rgba(45,32,34,0.1)" }} />
        <div className="wd-topbar-user" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "50%",
              background: "#EFEAEA",
              color: "#5A4B4D",
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
            <div style={{ fontSize: "10.5px", color: "rgba(45,32,34,0.5)" }}>Staf Inventori</div>
          </div>
        </div>
      </div>
      {/* ===== CONTENT ===== */}
      <div className="wd-scroll wd-inventory-content" style={{ flex: 1, overflowY: "auto", padding: "22px 26px 32px" }}>
        {error ? (
          <div
            style={{
              marginBottom: "14px",
              border: "1px solid rgba(184,54,54,0.2)",
              background: "#FBE7E7",
              color: "#B83636",
              borderRadius: "10px",
              padding: "11px 14px",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            {error}
          </div>
        ) : null}
        {/* Summary cards */}
        <div className="wd-inventory-summary" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
          <SummaryCard
            iconBg="#EEF2FB"
            iconColor="#3A5BB0"
            icon={<Package size={17} strokeWidth={2} />}
            label="Total SKU"
            value={String(items.length)}
            caption="item aktif di outlet ini"
          />
          <SummaryCard
            iconBg="#EDF7F1"
            iconColor="#238152"
            icon={<DollarSign size={17} strokeWidth={2} />}
            label="Nilai Persediaan"
            value={formatRupiah(totalValue)}
            caption="nilai stok saat ini"
          />
          <SummaryCard
            iconBg="#FCEEDB"
            iconColor="#C67A15"
            icon={<AlertTriangle size={17} strokeWidth={2} />}
            label="Perlu Restock"
            value={String(restockCount)}
            valueColor="#C67A15"
            caption="menipis + habis"
          />
          <SummaryCard
            iconBg="#FBE7E7"
            iconColor="#B83636"
            icon={<Calendar size={17} strokeWidth={2} />}
            label="Hampir Kedaluwarsa"
            value={String(expCount)}
            valueColor="#B83636"
            caption="≤ 3 hari lagi"
          />
        </div>

        {/* Toolbar */}
        <div className="wd-inventory-toolbar" style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "20px", flexWrap: "wrap" }}>
          <Tabs list={CATS} current={cat} onPick={setCat} kind="cat" />
          <div style={{ flex: 1 }} />
          <Tabs list={STATUSES} current={status} onPick={setStatus} kind="status" />
          <button
            onClick={onOpname}
            style={{
              height: "42px",
              padding: "0 16px",
              borderRadius: "10px",
              border: "1.5px solid rgba(45,32,34,0.15)",
              background: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: "13px",
              color: "#2D2022",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all .15s",
            }}
          >
            <ClipboardCheck size={16} strokeWidth={2} />
            Stok Opname
          </button>
          <button
            onClick={onAddStock}
            style={{
              height: "42px",
              padding: "0 18px",
              borderRadius: "10px",
              border: "none",
              background: "#A91F34",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: "13px",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              transition: "all .15s",
            }}
          >
            <Plus size={16} strokeWidth={2.4} color="#fff" />
            Tambah Stok
          </button>
        </div>

        {/* Table */}
        <div
          className="wd-responsive-table wd-inventory-table"
          style={{
            background: "#fff",
            border: "1px solid rgba(45,32,34,0.07)",
            borderRadius: "14px",
            overflow: "hidden",
            marginTop: "16px",
            boxShadow: "0 1px 2px rgba(45,32,34,0.04),0 24px 48px -40px rgba(127,22,40,0.35)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2.4fr 1.1fr 1.3fr 1fr 1.2fr 1.2fr 1fr",
              padding: "13px 22px",
              background: "#FFF4D6",
              fontSize: "11.5px",
              fontWeight: 700,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              color: "#A9791F",
            }}
          >
            <div>Bahan / Produk</div>
            <div>Kategori</div>
            <div style={{ textAlign: "right" }}>Stok</div>
            <div style={{ textAlign: "right" }}>Min.</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Nilai</div>
            <div style={{ textAlign: "right" }}>Aksi</div>
          </div>
          {list.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "rgba(45,32,34,0.5)" }}>
              <div style={{ fontSize: "15px", fontWeight: 700, color: "#2D2022" }}>Tidak ada item</div>
              <div style={{ fontSize: "13px", marginTop: "4px" }}>Ubah filter atau kata kunci pencarian.</div>
            </div>
          ) : (
            <div>
              {list.map((it) => {
                const st = statusOf(it);
                const [sBg, sColor, sLabel] = STATUS_TINT[st];
                const [cBg, cColor] = CAT_TINT[it.cat];
                const near = it.exp != null && it.exp <= 3;
                return (
                  <div
                    key={it.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2.4fr 1.1fr 1.3fr 1fr 1.2fr 1.2fr 1fr",
                      padding: "13px 22px",
                      fontSize: "13.5px",
                      borderTop: "1px solid rgba(45,32,34,0.06)",
                      alignItems: "center",
                      background: st === "out" ? "#FEFBFB" : "#fff",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "9px",
                          background: cBg,
                          color: cColor,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        <Package size={17} strokeWidth={2} color={cColor} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700 }}>{it.name}</div>
                        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "2px" }}>
                          <span style={{ fontFamily: MONO, fontSize: "11px", color: "rgba(45,32,34,0.45)" }}>
                            {it.sku}
                          </span>
                          {near ? (
                            <span
                              style={{
                                fontSize: "10.5px",
                                fontWeight: 700,
                                color: "#B83636",
                                background: "#FBE7E7",
                                padding: "1px 7px",
                                borderRadius: "5px",
                              }}
                            >
                              exp {it.exp}h
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          padding: "4px 10px",
                          borderRadius: "7px",
                          background: cBg,
                          color: cColor,
                        }}
                      >
                        {CAT_LABEL[it.cat]}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700 }}>
                      {it.qty}{" "}
                      <span style={{ fontWeight: 400, color: "rgba(45,32,34,0.45)", fontSize: "12px" }}>{it.unit}</span>
                    </div>
                    <div style={{ textAlign: "right", fontFamily: MONO, color: "rgba(45,32,34,0.5)" }}>{it.min}</div>
                    <div>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "7px",
                          fontSize: "12.5px",
                          fontWeight: 700,
                          padding: "5px 12px",
                          borderRadius: "999px",
                          background: sBg,
                          color: sColor,
                        }}
                      >
                        <span style={{ width: "7px", height: "7px", borderRadius: "50%", background: sColor }} />
                        {sLabel}
                      </span>
                    </div>
                    <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 600 }}>
                      {formatRupiah(it.qty * it.cost)}
                    </div>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button
                        onClick={() => openAdj(it.id, "masuk")}
                        aria-label="Stok masuk"
                        title="Stok masuk"
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          border: "1.5px solid rgba(35,129,82,0.3)",
                          background: "#E4F4EC",
                          color: "#238152",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ArrowUp size={16} strokeWidth={2.4} color="#238152" />
                      </button>
                      <button
                        onClick={() => openAdj(it.id, "keluar")}
                        aria-label="Stok keluar"
                        title="Stok keluar"
                        style={{
                          width: "34px",
                          height: "34px",
                          borderRadius: "8px",
                          border: "1.5px solid rgba(214,69,69,0.3)",
                          background: "#FBE7E7",
                          color: "#B83636",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <ArrowDown size={16} strokeWidth={2.4} color="#B83636" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {adjItem ? (
        <AdjustModal
          item={adjItem}
          adjType={adjType}
          adjQty={adjQty}
          onType={(t) => {
            setAdjType(t);
            setAdjQty(0);
          }}
          onQty={setAdjQty}
          onClose={closeAdj}
          onConfirm={() => void confirmAdj()}
          saving={saving}
        />
      ) : null}
    </div>
  );
}

function SummaryCard({
  iconBg,
  iconColor,
  icon,
  label,
  value,
  valueColor,
  caption,
}: {
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  caption: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(45,32,34,0.07)",
        borderRadius: "14px",
        padding: "18px 20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div
          style={{
            width: "34px",
            height: "34px",
            borderRadius: "9px",
            background: iconBg,
            color: iconColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(45,32,34,0.5)" }}>{label}</span>
      </div>
      <div
        style={{
          fontFamily: MONO,
          fontSize: "23px",
          fontWeight: 700,
          marginTop: "12px",
          color: valueColor,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: "12px", fontWeight: 600, color: "rgba(45,32,34,0.5)", marginTop: "5px" }}>{caption}</div>
    </div>
  );
}

function AdjustModal({
  item,
  adjType,
  adjQty,
  onType,
  onQty,
  onClose,
  onConfirm,
  saving,
}: {
  item: Item;
  adjType: AdjType;
  adjQty: number;
  onType: (t: AdjType) => void;
  onQty: (q: number) => void;
  onClose: () => void;
  onConfirm: () => void;
  saving: boolean;
}) {
  const tabs: [AdjType, string, string][] = [
    ["masuk", "Stok Masuk", "#238152"],
    ["keluar", "Stok Keluar", "#B83636"],
    ["opname", "Opname", "#3A5BB0"],
  ];
  let resultQty = item.qty;
  if (adjType === "masuk") resultQty = item.qty + adjQty;
  else if (adjType === "keluar") resultQty = Math.max(0, item.qty - adjQty);
  else resultQty = adjQty;
  const quicks = adjType === "opname" ? [item.min, item.min * 2, 50, 100] : [5, 10, 25, 50];

  return (
    <div
      onClick={onClose}
      className="wd-fade"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(45,32,34,0.5)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wd-slideup"
        style={{
          width: "440px",
          background: "#fff",
          borderRadius: "18px",
          overflow: "hidden",
          boxShadow: "0 40px 80px -30px rgba(127,22,40,0.5)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "18px 22px",
            borderBottom: "1px solid rgba(45,32,34,0.08)",
          }}
        >
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800 }}>Penyesuaian Stok</div>
            <div style={{ fontSize: "12.5px", color: "rgba(45,32,34,0.55)", marginTop: "2px" }}>
              {item.name} · {item.sku}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#FFF9F2",
              width: "34px",
              height: "34px",
              borderRadius: "9px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "rgba(45,32,34,0.6)",
            }}
          >
            <X size={18} strokeWidth={2.2} />
          </button>
        </div>
        <div style={{ padding: "20px 22px" }}>
          <div
            style={{
              display: "flex",
              gap: "6px",
              background: "#FFF9F2",
              padding: "4px",
              borderRadius: "11px",
              border: "1px solid rgba(45,32,34,0.08)",
              marginBottom: "18px",
            }}
          >
            {tabs.map(([key, label, color]) => {
              const on = adjType === key;
              return (
                <button
                  key={key}
                  onClick={() => onType(key)}
                  style={{
                    flex: 1,
                    height: "40px",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    fontSize: "13px",
                    fontWeight: 700,
                    background: on ? color : "transparent",
                    color: on ? "#fff" : "rgba(45,32,34,0.6)",
                    transition: "all .12s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              justifyContent: "center",
              padding: "4px 0 6px",
            }}
          >
            <button
              onClick={() => onQty(Math.max(0, adjQty - 1))}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "10px",
                border: "1.5px solid rgba(45,32,34,0.15)",
                background: "#fff",
                color: "#A91F34",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Minus size={18} strokeWidth={2.4} color="#A91F34" />
            </button>
            <div style={{ textAlign: "center", minWidth: "110px" }}>
              <div style={{ fontFamily: MONO, fontSize: "34px", fontWeight: 700 }}>{adjQty}</div>
              <div style={{ fontSize: "11.5px", color: "rgba(45,32,34,0.5)", fontWeight: 600 }}>{item.unit}</div>
            </div>
            <button
              onClick={() => onQty(adjQty + 1)}
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "10px",
                border: "none",
                background: "#A91F34",
                color: "#fff",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Plus size={18} strokeWidth={2.4} color="#fff" />
            </button>
          </div>
          <div style={{ display: "flex", gap: "8px", marginTop: "14px" }}>
            {quicks.map((n, i) => (
              <button
                key={i}
                onClick={() => onQty(n)}
                style={{
                  flex: 1,
                  height: "38px",
                  borderRadius: "8px",
                  border: "1.5px solid rgba(45,32,34,0.12)",
                  background: "#fff",
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: "12.5px",
                  color: "#2D2022",
                  cursor: "pointer",
                }}
              >
                {(adjType === "opname" ? "" : "+") + n}
              </button>
            ))}
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: "18px",
              padding: "14px 16px",
              background: "#FFF9F2",
              borderRadius: "11px",
              border: "1px solid rgba(45,32,34,0.08)",
            }}
          >
            <div>
              <span style={{ fontSize: "12.5px", color: "rgba(45,32,34,0.55)" }}>Stok sekarang </span>
              <span style={{ fontFamily: MONO, fontWeight: 700 }}>
                {item.qty} {item.unit}
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "rgba(45,32,34,0.3)" }}>→</span>
              <span style={{ fontFamily: MONO, fontSize: "17px", fontWeight: 700, color: "#238152" }}>
                {resultQty} {item.unit}
              </span>
            </div>
          </div>
          <button
            onClick={onConfirm}
            disabled={saving}
            style={{
              width: "100%",
              height: "52px",
              marginTop: "18px",
              borderRadius: "11px",
              border: "none",
              background: "#FFD84D",
              color: "#2D2022",
              fontFamily: "inherit",
              fontWeight: 800,
              fontSize: "15px",
              cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 12px 24px -12px rgba(233,154,34,0.8)",
            }}
          >
            <Check size={18} strokeWidth={2.4} />
            {saving ? "Menyimpan..." : "Simpan Penyesuaian"}
          </button>
        </div>
      </div>
    </div>
  );
}
