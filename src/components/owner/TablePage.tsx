"use client";

import { useMemo, useState } from "react";
import { ic } from "./icons";
import { Badge, MiniStat, PageHead, MONO } from "./shared";
import { tableData, type Column, type TableData, type CellValue } from "./tableData";

/** Port of `actionFor(label)`. */
function actionFor(label: string): string | null {
  const l = label.toLowerCase();
  if (/laporan|analisa|ringkasan|rekonsiliasi/.test(l)) return null;
  if (/^(daftar|buku menu)/.test(l)) return "Tambah";
  return "Tambah";
}

/** Port of `toolbar(placeholder, filters)`. */
export function Toolbar({
  placeholder,
  filters,
  query,
  onQuery,
  onExportExcel,
  onExportPdf,
}: {
  placeholder?: string;
  filters?: string[];
  query: string;
  onQuery: (query: string) => void;
  onExportExcel?: () => void;
  onExportPdf?: () => void;
}) {
  const btnStyle = {
    height: "40px",
    padding: "0 14px",
    borderRadius: "9px",
    border: "1px solid rgba(35,32,31,0.12)",
    background: "#fff",
    fontFamily: "inherit",
    fontSize: "12.5px",
    fontWeight: 600,
    color: "rgba(35,32,31,0.65)",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
  } as const;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "1", minWidth: "200px", maxWidth: "320px" }}>
        <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", display: "flex", color: "rgba(35,32,31,0.4)" }}>
          {ic("search", 16, "currentColor", 2)}
        </span>
        <input
          value={query}
          onChange={(e) => onQuery(e.target.value)}
          placeholder={placeholder || "Cari…"}
          style={{
            width: "100%",
            height: "40px",
            border: "1px solid rgba(35,32,31,0.12)",
            borderRadius: "9px",
            padding: "0 12px 0 36px",
            fontFamily: "inherit",
            fontSize: "13px",
            background: "#fff",
            outline: "none",
          }}
        />
      </div>
      {(filters || ["Semua Status"]).map((f, i) => (
        <button key={i} style={btnStyle}>
          {ic("filter", 14, "currentColor", 2)}
          {f}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      {onExportExcel ? (
        <button style={btnStyle} onClick={onExportExcel}>
          {ic("download", 14, "currentColor", 2)}
          Export Excel
        </button>
      ) : null}
      {onExportPdf ? (
        <button style={btnStyle} onClick={onExportPdf}>
          {ic("download", 14, "currentColor", 2)}
          Export PDF
        </button>
      ) : null}
    </div>
  );
}

function Cell({ col, value }: { col: Column; value: CellValue | undefined }) {
  const v = value;
  let inner: React.ReactNode;
  if (col.kind === "badge" && Array.isArray(v)) inner = <Badge text={v[0]} tone={v[1]} />;
  else if (col.kind === "sub" && Array.isArray(v))
    inner = (
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v[0]}</div>
        <div style={{ fontSize: "11.5px", color: "rgba(35,32,31,0.5)", marginTop: "1px" }}>{v[1]}</div>
      </div>
    );
  else if (col.kind === "mono") inner = <span style={{ fontFamily: MONO }}>{v as string}</span>;
  else if (col.kind === "strong") inner = <span style={{ fontWeight: 700 }}>{v as string}</span>;
  else if (col.kind === "action")
    inner = (
      <button
        style={{
          height: "30px",
          padding: "0 13px",
          borderRadius: "7px",
          border: "1px solid rgba(35,32,31,0.14)",
          background: "#fff",
          fontFamily: "inherit",
          fontSize: "12px",
          fontWeight: 600,
          cursor: "pointer",
          color: "#2D2022",
        }}
      >
        Detail
      </button>
    );
  else inner = v as string;
  return (
    <div
      style={{
        textAlign: col.align || "left",
        minWidth: 0,
        whiteSpace: col.kind === "sub" ? "normal" : "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      {inner}
    </div>
  );
}

/** Port of `tableCard(d)`. */
export function TableCard({ d }: { d: TableData }) {
  const cols = d.columns;
  const tmpl = cols.map((c) => c.w || "1fr").join(" ");
  return (
    <div className="wd-responsive-table" style={{ background: "#fff", border: "1px solid rgba(35,32,31,0.06)", borderRadius: "14px", overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }} className="wd-scroll">
        <div style={{ minWidth: "1050px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: tmpl,
              gap: "10px",
              padding: "11px 20px",
              background: "#FAFAFA",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "rgba(35,32,31,0.42)",
            }}
          >
            {cols.map((c, i) => (
              <div key={i} style={{ textAlign: c.align || "left" }}>
                {c.label}
              </div>
            ))}
          </div>
          <div>
            {d.rows.map((r, ri) => (
              <div
                key={ri}
                style={{
                  display: "grid",
                  gridTemplateColumns: tmpl,
                  gap: "10px",
                  padding: "13px 20px",
                  fontSize: "13.5px",
                  borderTop: "1px solid rgba(35,32,31,0.05)",
                  alignItems: "center",
                }}
              >
                {cols.map((c, ci) => (
                  <Cell key={ci} col={c} value={r[c.k]} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderTop: "1px solid rgba(35,32,31,0.06)",
        }}
      >
        <span style={{ fontSize: "12.5px", color: "rgba(35,32,31,0.5)" }}>
          Menampilkan 1–{d.rows.length} dari {d.total || d.rows.length} data
        </span>
        <div style={{ display: "flex", gap: "6px" }}>
          {["‹", "1", "2", "3", "›"].map((x, i) => (
            <button
              key={i}
              style={{
                minWidth: "32px",
                height: "32px",
                borderRadius: "7px",
                border: "1px solid rgba(35,32,31,0.12)",
                background: x === "1" ? "#A91F34" : "#fff",
                color: x === "1" ? "#fff" : "rgba(35,32,31,0.6)",
                fontFamily: "inherit",
                fontSize: "12.5px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {x}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Port of `renderTable(label)`. */
export function TablePage({ label, crumbPath }: { label: string; crumbPath?: string[] }) {
  const d = tableData(label);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [created, setCreated] = useState(false);
  const filtered = useMemo(() => filterTableData(d, query), [d, query]);
  const actionLabel = actionFor(label);

  function handleExportExcel() {
    const headers = filtered.columns.map((c) => c.label);
    const rows = filtered.rows.map((r) =>
      filtered.columns.map((c) => cellText(r[c.k]))
    );
    const headerLine = headers.join(",");
    const rowLines = rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","));
    const csv = [headerLine, ...rowLines].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `export-${label.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    const headers = filtered.columns.map((c) => c.label);
    const rows = filtered.rows.map((r) =>
      filtered.columns.map((c) => cellText(r[c.k]))
    );

    const printWin = window.open("", "_blank");
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Export PDF - ${label}</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 24px; color: #23201F; background: #fff; }
          .header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #A91F34; padding-bottom: 12px; margin-bottom: 20px; }
          .brand { font-size: 20px; font-weight: 800; color: #A91F34; letter-spacing: -0.5px; }
          .subtitle { font-size: 13px; color: #666; margin-top: 2px; }
          .meta { text-align: right; font-size: 12px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #FFF9F2; color: #A91F34; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px; border: 1px solid rgba(35,32,31,0.14); text-align: left; }
          td { font-size: 12px; padding: 9px 10px; border: 1px solid rgba(35,32,31,0.12); }
          tr:nth-child(even) { background: #FAFAFA; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">WANNA DIMSUM POS</div>
            <div class="subtitle">Laporan Data ${label}</div>
          </div>
          <div class="meta">
            Tanggal: <strong>${new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</strong><br/>
            Total Data: <strong>${rows.length} Items</strong>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              ${headers.map((h) => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (r) => `
              <tr>
                ${r.map((cell) => `<td>${cell}</td>`).join("")}
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  return (
    <div>
      <PageHead label={label} crumbPath={crumbPath} actionLabel={actionLabel} subtitle={d.subtitle} onAction={actionLabel ? () => setAddOpen(true) : undefined} />
      {created ? (
        <div role="status" style={{ marginBottom: 14, padding: "10px 13px", borderRadius: 10, background: "#E4F4EC", color: "#238152", fontSize: 12.5, fontWeight: 800 }}>
          Data demo berhasil ditambahkan untuk sesi ini.
        </div>
      ) : null}
      {d.kpis && d.kpis.length ? (
        <div className="wd-owner-kpi-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${d.kpis.length},1fr)`, gap: "14px", marginBottom: "16px" }}>
          {d.kpis.map((k, i) => (
            <MiniStat key={i} label={k[0]} value={k[1]} sub={k[3] || (k[2] ? (k[2] === "up" ? "▲ tren naik" : "▼ tren turun") : null)} tone={k[2]} />
          ))}
        </div>
      ) : null}
      <Toolbar placeholder={`Cari ${label.toLowerCase()}…`} filters={d.filters} query={query} onQuery={setQuery} onExportExcel={handleExportExcel} onExportPdf={handleExportPdf} />
      <TableCard d={filtered} />
      {addOpen ? (
        <div
          className="wd-fade"
          onClick={() => setAddOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 120, background: "rgba(35,32,31,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={(e) => e.stopPropagation()} className="wd-slideup" style={{ width: "min(420px, calc(100vw - 32px))", borderRadius: 16, background: "#fff", padding: 20, boxShadow: "0 32px 70px -34px rgba(35,32,31,0.55)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>{actionLabel} {label}</div>
            <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.55)", marginBottom: 16 }}>Form cepat demo untuk memastikan tombol aksi Owner tidak inert.</div>
            <input autoFocus placeholder={`Nama ${label.toLowerCase()}`} style={{ width: "100%", height: 42, border: "1px solid rgba(35,32,31,0.14)", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", outline: "none", marginBottom: 10 }} />
            <input placeholder="Catatan" style={{ width: "100%", height: 42, border: "1px solid rgba(35,32,31,0.14)", borderRadius: 10, padding: "0 12px", fontFamily: "inherit", outline: "none" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={() => setAddOpen(false)} style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>Batal</button>
              <button type="button" onClick={() => { setCreated(true); setAddOpen(false); }} style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}>Simpan</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function filterTableData(d: TableData, query: string): TableData {
  const q = query.trim().toLowerCase();
  if (!q) return d;
  const rows = d.rows.filter((row) =>
    Object.values(row).some((value) => cellText(value).toLowerCase().includes(q)),
  );
  return { ...d, rows, total: rows.length };
}

function cellText(value: CellValue | undefined): string {
  if (value == null) return "";
  if (Array.isArray(value)) return value.join(" ");
  return String(value);
}
