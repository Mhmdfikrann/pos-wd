import { ic } from "./icons";
import { MiniStat, PageHead, MONO } from "./shared";
import { TableCard } from "./TablePage";
import { tableData, type TableData } from "./tableData";
import { CHART } from "./data";

/** Port of `reportFilter()`. */
function ReportFilter() {
  const pills = ["Hari Ini", "7 Hari", "Bulan Ini", "Custom"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
      <div
        style={{
          display: "flex",
          gap: "4px",
          background: "#fff",
          padding: "4px",
          borderRadius: "10px",
          border: "1px solid rgba(35,32,31,0.1)",
        }}
      >
        {pills.map((p, i) => (
          <button
            key={i}
            style={{
              border: "none",
              cursor: "pointer",
              borderRadius: "7px",
              fontFamily: "inherit",
              fontSize: "12.5px",
              fontWeight: 700,
              padding: "8px 14px",
              background: i === 2 ? "#23201F" : "transparent",
              color: i === 2 ? "#fff" : "rgba(35,32,31,0.6)",
            }}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        style={{
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
        }}
      >
        Semua Outlet
      </button>
      <div style={{ flex: 1 }} />
      <button
        style={{
          height: "40px",
          padding: "0 14px",
          borderRadius: "9px",
          border: "none",
          background: "#A91F34",
          color: "#fff",
          fontFamily: "inherit",
          fontSize: "12.5px",
          fontWeight: 700,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
        }}
      >
        {ic("download", 14, "#fff", 2)}
        Unduh Laporan
      </button>
    </div>
  );
}

/** Port of `reportChartCard()`. */
function ReportChartCard() {
  const data = CHART;
  const maxV = Math.max(...data.map((c) => c[1]));
  return (
    <div
      style={{
        background: "#fff",
        border: "1px solid rgba(35,32,31,0.06)",
        borderRadius: "14px",
        padding: "20px 22px",
        marginBottom: "16px",
      }}
    >
      <div style={{ fontSize: "14.5px", fontWeight: 800, marginBottom: "18px" }}>Tren Periode</div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", height: "180px", paddingTop: "8px" }}>
        {data.map(([day, v], i) => {
          const peak = v === maxV;
          return (
            <div
              key={day}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                height: "100%",
                justifyContent: "flex-end",
              }}
            >
              <div style={{ fontFamily: MONO, fontSize: "10.5px", fontWeight: 700, color: peak ? "#A91F34" : "rgba(35,32,31,0.4)" }}>
                {v.toFixed(1)}jt
              </div>
              <div
                className="wd-grow"
                style={{
                  width: "100%",
                  maxWidth: "46px",
                  height: `${(v / maxV) * 100}%`,
                  minHeight: "6px",
                  borderRadius: "8px 8px 4px 4px",
                  background: peak ? "#A91F34" : "#F3C6CD",
                  transformOrigin: "bottom",
                  animation: `wd-grow .5s ease ${i * 0.05}s both`,
                }}
              />
              <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(35,32,31,0.5)" }}>{day}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Port of `renderReport(label)`. */
export function ReportPage({ label }: { label: string }) {
  const d: TableData = tableData(label);
  const kpis =
    d.kpis && d.kpis.length
      ? d.kpis
      : ([
          ["Total Omzet", "Rp 128,4 jt", "up"],
          ["Transaksi", "1.842", null],
          ["Rata-rata / Order", "Rp 69.700", "up"],
        ] as TableData["kpis"]);
  const showChart = /penjualan|dashboard|arus kas|analisa|teramai|pendapatan|omzet|settlement|penjualan produk|outlet/.test(
    label.toLowerCase(),
  );
  return (
    <div>
      <PageHead label={label} actionLabel={null} subtitle={`Ringkasan ${label.toLowerCase()} untuk periode terpilih.`} />
      <ReportFilter />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "16px" }}>
        {kpis.slice(0, 3).map((k, i) => (
          <MiniStat
            key={i}
            label={k[0]}
            value={k[1]}
            sub={k[3] || (k[2] ? (k[2] === "up" ? "▲ vs periode lalu" : "▼ vs periode lalu") : null)}
            tone={k[2]}
          />
        ))}
      </div>
      {showChart ? <ReportChartCard /> : null}
      <TableCard d={d} />
    </div>
  );
}
