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
export function Toolbar({ placeholder, filters }: { placeholder?: string; filters?: string[] }) {
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
      <button style={btnStyle}>
        {ic("download", 14, "currentColor", 2)}
        Export
      </button>
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
export function TablePage({ label }: { label: string }) {
  const d = tableData(label);
  return (
    <div>
      <PageHead label={label} actionLabel={actionFor(label)} subtitle={d.subtitle} />
      {d.kpis && d.kpis.length ? (
      <div className="wd-owner-kpi-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${d.kpis.length},1fr)`, gap: "14px", marginBottom: "16px" }}>
          {d.kpis.map((k, i) => (
            <MiniStat key={i} label={k[0]} value={k[1]} sub={k[3] || (k[2] ? (k[2] === "up" ? "▲ tren naik" : "▼ tren turun") : null)} tone={k[2]} />
          ))}
        </div>
      ) : null}
      <Toolbar placeholder={`Cari ${label.toLowerCase()}…`} filters={d.filters} />
      <TableCard d={d} />
    </div>
  );
}
