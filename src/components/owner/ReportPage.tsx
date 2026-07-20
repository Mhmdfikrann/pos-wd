import { ic } from "./icons";
import { MiniStat, PageHead, MONO } from "./shared";
import { TableCard } from "./TablePage";
import { tableData, type TableData } from "./tableData";
import { DateRangeFilter, type DateRangeValue } from "@/components/DateRangeFilter";
import { formatRupiah } from "@/lib/format";
import type { OwnerReportSnapshot } from "@/lib/reports-data";

/** Shared top-right actions for all Owner report pages. */
function ReportActions({ dateRange, onDateRange }: { dateRange: DateRangeValue; onDateRange: (range: DateRangeValue) => void }) {
  return (
    <>
      <DateRangeFilter value={dateRange} onChange={onDateRange} label={null} />
      <button
        type="button"
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
      <button
        type="button"
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
    </>
  );
}

/** Port of `reportChartCard()`. */
function ReportChartCard({ report }: { report: OwnerReportSnapshot }) {
  const data = report.dailySales.length ? report.dailySales : [{ label: "-", total: 0, date: "-", orders: 0 }];
  const maxV = Math.max(1, ...data.map((c) => c.total));
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
        {data.map((row, i) => {
          const peak = row.total === maxV && row.total > 0;
          return (
            <div
              key={`${row.date}-${i}`}
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
                {compactMoney(row.total)}
              </div>
              <div
                className="wd-grow"
                style={{
                  width: "100%",
                  maxWidth: "46px",
                  height: `${(row.total / maxV) * 100}%`,
                  minHeight: "6px",
                  borderRadius: "8px 8px 4px 4px",
                  background: peak ? "#A91F34" : "#F3C6CD",
                  transformOrigin: "bottom",
                  animation: `wd-grow .5s ease ${i * 0.05}s both`,
                }}
              />
              <div style={{ fontSize: "11px", fontWeight: 600, color: "rgba(35,32,31,0.5)" }}>{row.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Port of `renderReport(label)`. */
export function ReportPage({
  label,
  report,
  dateRange,
  onDateRange,
  crumbPath,
}: {
  label: string;
  report?: OwnerReportSnapshot;
  dateRange: DateRangeValue;
  onDateRange: (range: DateRangeValue) => void;
  crumbPath?: string[];
}) {
  const d: TableData = report ? reportTableData(label, report) ?? tableData(label) : tableData(label);
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
    <div className="wd-owner-report-page">
      <PageHead
        label={label}
        actionLabel={null}
        subtitle={`Ringkasan ${label.toLowerCase()} untuk periode terpilih.`}
        rightContent={<ReportActions dateRange={dateRange} onDateRange={onDateRange} />}
        crumbPath={crumbPath}
      />
      <div className="wd-owner-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "14px", marginBottom: "16px" }}>
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
      {showChart && report ? <ReportChartCard report={report} /> : null}
      <TableCard d={d} />
    </div>
  );
}

function reportTableData(label: string, report: OwnerReportSnapshot): TableData | null {
  const l = label.toLowerCase();
  const summaryKpis: TableData["kpis"] = [
    ["Omzet Bersih", formatRupiah(report.summary.netSales), "up", `Gross ${formatRupiah(report.summary.grossSales)}`],
    ["Transaksi", String(report.summary.orderCount), null, `${report.summary.productsSold} item terjual`],
    ["Refund/Void", formatRupiah(report.summary.refundAmount + report.summary.voidAmount), "down", `Diskon ${formatRupiah(report.summary.discountAmount)}`],
  ];

  if (/penjualan produk/.test(l)) {
    return {
      kpis: summaryKpis,
      columns: [
        { k: "n", label: "Produk", w: "2fr", kind: "sub" },
        { k: "kat", label: "Kategori", w: "1.2fr" },
        { k: "s", label: "Terjual", w: "1fr", align: "right", kind: "mono" },
        { k: "r", label: "Omzet Item", w: "1.3fr", align: "right", kind: "mono" },
        { k: "st", label: "Stok", w: "1fr", kind: "badge" },
      ],
      rows: report.productSales.map((row) => ({
        n: [row.name, row.sku ?? "-"],
        kat: row.category,
        s: String(row.sold),
        r: formatRupiah(row.revenue),
        st: [row.tone === "ok" ? "Aman" : row.tone === "low" ? "Menipis" : "Habis", row.tone === "ok" ? "ok" : row.tone === "low" ? "warn" : "danger"],
      })),
      total: report.productSales.length,
    };
  }

  if (/kategori|departemen/.test(l)) {
    return {
      kpis: summaryKpis,
      columns: [
        { k: "n", label: "Kategori", w: "2fr", kind: "strong" },
        { k: "s", label: "Terjual", w: "1fr", align: "right", kind: "mono" },
        { k: "r", label: "Omzet Item", w: "1.3fr", align: "right", kind: "mono" },
      ],
      rows: report.categorySales.map((row) => ({ n: row.name, s: String(row.sold), r: formatRupiah(row.revenue) })),
      total: report.categorySales.length,
    };
  }

  if (/kasir/.test(l) && !/tutup/.test(l)) {
    return {
      kpis: summaryKpis,
      columns: [
        { k: "n", label: "Kasir", w: "2fr", kind: "strong" },
        { k: "o", label: "Transaksi", w: "1fr", align: "right", kind: "mono" },
        { k: "r", label: "Omzet Bersih", w: "1.4fr", align: "right", kind: "mono" },
      ],
      rows: report.cashierSales.map((row) => ({ n: row.cashierName, o: String(row.orders), r: formatRupiah(row.netSales) })),
      total: report.cashierSales.length,
    };
  }

  if (/terminal|pembayaran|settlement/.test(l)) {
    return {
      kpis: summaryKpis,
      columns: [
        { k: "m", label: "Metode", w: "1.6fr", kind: "strong" },
        { k: "c", label: "Transaksi", w: "1fr", align: "right", kind: "mono" },
        { k: "p", label: "Porsi", w: "1fr", align: "right", kind: "mono" },
        { k: "t", label: "Total", w: "1.4fr", align: "right", kind: "mono" },
      ],
      rows: report.paymentMethods.map((row) => ({
        m: row.method,
        c: String(row.count),
        p: `${row.percent}%`,
        t: formatRupiah(row.total),
      })),
      total: report.paymentMethods.length,
    };
  }

  if (/tutup kasir|rekonsiliasi/.test(l)) {
    return {
      kpis: summaryKpis,
      columns: [
        { k: "n", label: "Shift", w: "2fr", kind: "sub" },
        { k: "e", label: "Expected", w: "1.2fr", align: "right", kind: "mono" },
        { k: "a", label: "Aktual", w: "1.2fr", align: "right", kind: "mono" },
        { k: "d", label: "Selisih", w: "1fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
      ],
      rows: report.shiftReconciliation.map((row) => ({
        n: [row.cashierName, `${row.outletName} · ${shortDate(row.openedAt)}`],
        e: formatRupiah(row.expectedCash ?? 0),
        a: formatRupiah(row.actualCash ?? 0),
        d: formatRupiah(row.cashDifference ?? 0),
        st: [row.status === "closed" ? "Tutup" : "Open", row.status === "closed" ? "ok" : "warn"],
      })),
      total: report.shiftReconciliation.length,
    };
  }

  if (/persediaan|stok/.test(l)) {
    return {
      kpis: [
        ["Total SKU", String(report.inventory.length), null],
        ["Nilai Persediaan", formatRupiah(report.inventory.reduce((total, row) => total + row.value, 0)), null],
        ["Perlu Restock", String(report.inventory.filter((row) => row.status !== "ok").length), "down"],
      ],
      columns: [
        { k: "n", label: "Bahan / Produk", w: "2fr", kind: "sub" },
        { k: "sku", label: "SKU", w: "1fr", kind: "mono" },
        { k: "s", label: "Stok", w: "1fr", align: "right", kind: "mono" },
        { k: "m", label: "Min.", w: "0.8fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1.1fr", kind: "badge" },
        { k: "v", label: "Nilai", w: "1.2fr", align: "right", kind: "mono" },
      ],
      rows: report.inventory.map((row) => ({
        n: [row.name, `${row.category} · ${row.outletName}`],
        sku: row.sku,
        s: `${row.quantity} ${row.unit}`,
        m: String(row.minQuantity),
        st: [row.status === "ok" ? "Tersedia" : row.status === "low" ? "Menipis" : "Habis", row.status === "ok" ? "ok" : row.status === "low" ? "warn" : "danger"],
        v: formatRupiah(row.value),
      })),
      total: report.inventory.length,
    };
  }

  if (/refund|void|diskon|pengeluaran|biaya|keuangan|ringkasan penjualan|penjualan outlet|arus kas|omzet/.test(l)) {
    return {
      kpis: summaryKpis,
      columns: [
        { k: "k", label: "Jenis", w: "1fr", kind: "badge" },
        { k: "n", label: "Referensi", w: "1.8fr", kind: "sub" },
        { k: "a", label: "Nominal", w: "1.2fr", align: "right", kind: "mono" },
        { k: "d", label: "Waktu", w: "1fr", kind: "mono" },
      ],
      rows: report.financeEvents.map((event) => ({
        k: [event.kind, event.kind === "refund" || event.kind === "void" ? "danger" : event.kind === "discount" ? "warn" : "neutral"],
        n: [event.orderNo, event.note ?? event.actorName ?? "-"],
        a: formatRupiah(event.amount),
        d: shortDate(event.createdAt),
      })),
      total: report.financeEvents.length,
    };
  }

  return null;
}

function compactMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(value);
}

function shortDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10);
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "2-digit", year: "2-digit", timeZone: "Asia/Jakarta" }).format(parsed);
}
