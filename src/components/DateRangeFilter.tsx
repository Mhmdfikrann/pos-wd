"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { CalendarDate, getLocalTimeZone, today } from "@internationalized/date";
import { RangeCalendar } from "@/components/ui/range-calendar";

export type DateRangeValue = {
  start: CalendarDate;
  end: CalendarDate;
};

interface DateRangeFilterProps {
  value?: DateRangeValue;
  onChange?: (range: DateRangeValue) => void;
  label?: string | null;
  compact?: boolean;
}

export function defaultDateRange(days = 6): DateRangeValue {
  const now = today(getLocalTimeZone());
  return { start: now.subtract({ days }), end: now };
}

export function dateRangeLabel(range: DateRangeValue): string {
  return compactRangeLabel(range.start, range.end);
}

export function DateRangeFilter({ value, onChange, label = null, compact = false }: DateRangeFilterProps) {
  const [open, setOpen] = useState(false);
  const [internal, setInternal] = useState<DateRangeValue>(() => defaultDateRange());
  const range = value ?? internal;
  const visibleDuration = useMemo(() => ({ months: compact ? 1 : 2 }), [compact]);

  const setRange = (next: DateRangeValue | null) => {
    if (!next?.start || !next?.end) return;
    setInternal(next);
    onChange?.(next);
  };

  const pickPreset = (days: number) => {
    const end = today(getLocalTimeZone());
    const next = { start: end.subtract({ days }), end };
    setRange(next);
  };

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          height: 40,
          padding: "0 11px",
          borderRadius: 10,
          border: "1px solid rgba(35,32,31,0.12)",
          background: "#fff",
          color: "#2D2022",
          fontFamily: "inherit",
          fontSize: 12.5,
          fontWeight: 800,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 7,
          boxShadow: open ? "0 0 0 3px rgba(169,31,52,0.10)" : "none",
        }}
      >
        <CalendarDays size={15} strokeWidth={2.2} color="#A91F34" />
        {label ? <span style={{ color: "rgba(35,32,31,0.52)", fontWeight: 700 }}>{label}</span> : null}
        <span style={{ fontFamily: "var(--font-mono), monospace", color: "#2D2022", whiteSpace: "nowrap" }}>{dateRangeLabel(range)}</span>
        <ChevronDown
          size={14}
          strokeWidth={2.4}
          style={{ color: "rgba(35,32,31,0.42)", transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}
        />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Pilih rentang tanggal"
          className="wd-fade"
          style={{
            position: "absolute",
            top: "calc(100% + 10px)",
            right: 0,
            zIndex: 90,
            width: compact ? 334 : 620,
            maxWidth: "calc(100vw - 32px)",
            borderRadius: 18,
            border: "1px solid rgba(35,32,31,0.10)",
            background: "#fff",
            boxShadow: "0 28px 70px -34px rgba(35,32,31,0.55)",
            padding: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {[
              [0, "Hari ini"],
              [6, "7 hari"],
              [29, "30 hari"],
            ].map(([days, text]) => (
              <button
                key={String(days)}
                type="button"
                onClick={() => pickPreset(Number(days))}
                style={{
                  height: 32,
                  padding: "0 10px",
                  borderRadius: 8,
                  border: "1px solid rgba(35,32,31,0.10)",
                  background: "#FFF9F2",
                  color: "rgba(35,32,31,0.72)",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {text}
              </button>
            ))}
          </div>
          <div className="wd-scroll" style={{ overflowX: "auto" }}>
            <RangeCalendar
              aria-label="Rentang tanggal"
              value={range}
              onChange={setRange}
              visibleDuration={visibleDuration}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.52)" }}>{dateRangeLabel(range)}</div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                height: 36,
                padding: "0 14px",
                borderRadius: 9,
                border: "none",
                background: "#A91F34",
                color: "#fff",
                fontFamily: "inherit",
                fontSize: 12.5,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Terapkan
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCalendarDate(date: CalendarDate): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date.toDate(getLocalTimeZone()));
}

function compactRangeLabel(start: CalendarDate, end: CalendarDate): string {
  const month = new Intl.DateTimeFormat("id-ID", { month: "short" });
  if (start.year === end.year && start.month === end.month) {
    return `${start.day}–${end.day} ${month.format(end.toDate(getLocalTimeZone()))} ${end.year}`;
  }

  if (start.year === end.year) {
    return `${start.day} ${month.format(start.toDate(getLocalTimeZone()))}–${end.day} ${month.format(end.toDate(getLocalTimeZone()))} ${end.year}`;
  }

  return `${formatCalendarDate(start)}–${formatCalendarDate(end)}`;
}
