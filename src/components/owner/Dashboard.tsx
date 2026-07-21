import { ic } from "./icons";
import { MONO } from "./shared";
import { DateRangeFilter, type DateRangeValue } from "@/components/DateRangeFilter";
import { formatRupiah } from "@/lib/format";
import type { OwnerReportSnapshot } from "@/lib/reports-data";

const CARD = {
  background: "#fff",
  border: "1px solid rgba(35,32,31,0.06)",
  borderRadius: "14px",
} as const;

const badgeTints: Array<[string, string]> = [
  ["#FFF1F2", "#A91F34"],
  ["#FFF7E9", "#C67A15"],
  ["#EDF7F1", "#238152"],
  ["#EEF2FB", "#3A5BB0"],
  ["#F1EEEA", "#5A4B4D"],
];

function StockBadge({ tone, stock }: { tone: "ok" | "low" | "out"; stock: number }) {
  const map: Record<string, [string, string]> = {
    ok: ["#EDF7F1", "#238152"],
    low: ["#FFF7E9", "#C67A15"],
    out: ["#F1EEEA", "#5A4B4D"],
  };
  const [bg, col] = map[tone];
  return (
    <span style={{ fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "7px", background: bg, color: col, fontFamily: MONO }}>
      {stock === 999 ? "∞" : String(stock)}
    </span>
  );
}

interface DashboardProps {
  report: OwnerReportSnapshot;
  userName: string;
  dateRange: DateRangeValue;
  onDateRange: (range: DateRangeValue) => void;
}

/** Port of the Dashboard Penjualan page + `renderVals` dashboard bits. */
export function Dashboard({ report, userName, dateRange, onDateRange }: DashboardProps) {
  const chart = report.dailySales;
  const maxV = Math.max(1, ...chart.map((c) => c.total));
  const chartTotal = chart.reduce((total, row) => total + row.total, 0);

  return (
    <div className="wd-owner-dashboard" style={{ padding: "22px 26px 32px" }}>
      {/* Greeting */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "16px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: "22px", fontWeight: 800, letterSpacing: "-0.02em" }}>Halo, {firstName(userName)}</div>
          <div style={{ fontSize: "13.5px", color: "rgba(35,32,31,0.55)", marginTop: "3px" }}>Ringkasan bisnis · {rangeLabel(report.range.from, report.range.to)}</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <DateRangeFilter value={dateRange} onChange={onDateRange} label={null} />
        </div>
      </div>

      {/* Stat cards */}
      <div className="wd-owner-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "14px" }}>
        <StatCard iconName="wallet" iconBg="#FFF1F2" iconColor="#A91F34" label="Omzet Bersih" value={formatRupiah(report.summary.netSales)} delta={`Refund ${formatRupiah(report.summary.refundAmount)}`} deltaColor="#2E9D64" />
        <StatCard iconName="receiptSm" iconBg="#FFF7E9" iconColor="#C67A15" label="Transaksi" value={String(report.summary.orderCount)} delta={`Void ${formatRupiah(report.summary.voidAmount)}`} deltaColor="#C67A15" />
        <StatCard iconName="cube" iconBg="#EDF7F1" iconColor="#238152" label="Produk Terjual" value={String(report.summary.productsSold)} delta={`Diskon ${formatRupiah(report.summary.discountAmount)}`} deltaColor="#2E9D64" />
        <StatCard iconName="customer" iconBg="#EEF2FB" iconColor="#3A5BB0" label="Pengeluaran" value={formatRupiah(report.summary.expenseAmount)} delta="Kas operasional" deltaColor="#3A5BB0" />
      </div>

      {/* Chart + payment */}
      <div className="wd-owner-split-grid" style={{ display: "grid", gridTemplateColumns: "1.7fr 1fr", gap: "14px", marginTop: "14px" }}>
        <div style={{ ...CARD, padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "18px" }}>
            <div style={{ fontSize: "14.5px", fontWeight: 800 }}>Penjualan 7 Hari Terakhir</div>
            <div style={{ fontFamily: MONO, fontSize: "12px", color: "rgba(35,32,31,0.5)" }}>
              Total <b style={{ color: "#A91F34" }}>{formatRupiah(chartTotal)}</b>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: "14px", height: "180px", paddingTop: "8px" }}>
            {(chart.length ? chart : [{ label: "-", total: 0, date: "-", orders: 0 }]).map((row, i) => {
              const peak = row.total === maxV && row.total > 0;
              return (
                <div key={`${row.date}-${i}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", height: "100%", justifyContent: "flex-end" }}>
                  <div style={{ fontFamily: MONO, fontSize: "10.5px", fontWeight: 700, color: peak ? "#A91F34" : "rgba(35,32,31,0.4)" }}>{compactMoney(row.total)}</div>
                  <div
                    className="wd-grow"
                    style={{
                      width: "100%",
                      maxWidth: "38px",
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
        <div style={{ ...CARD, padding: "20px 22px" }}>
          <div style={{ fontSize: "14.5px", fontWeight: 800, marginBottom: "18px" }}>Metode Pembayaran</div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {(report.paymentMethods.length ? report.paymentMethods : [{ method: "Belum ada", percent: 0, color: "#5A4B4D" }]).map((payment) => (
              <div key={payment.method}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12.5px", marginBottom: "6px" }}>
                  <span style={{ fontWeight: 600 }}>{payment.method}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, color: payment.color }}>{payment.percent}%</span>
                </div>
                <div style={{ height: "8px", borderRadius: "999px", background: "#F1EEEA", overflow: "hidden" }}>
                  <div style={{ width: `${payment.percent}%`, height: "100%", borderRadius: "999px", background: payment.color }} />
                </div>
              </div>
            ))}
          </div>
          {report.orderChannels.length ? (
            <div style={{ marginTop: 18, paddingTop: 14, borderTop: "1px dashed rgba(35,32,31,0.12)" }}>
              <div style={{ fontSize: "12px", fontWeight: 800, color: "rgba(35,32,31,0.45)", marginBottom: 8 }}>Channel Order</div>
              {report.orderChannels.slice(0, 4).map((row) => (
                <div key={row.channel} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginTop: 5 }}>
                  <span style={{ fontWeight: 700 }}>{row.channel}</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(row.total)}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* Top products + recent trx */}
      <div className="wd-owner-split-grid" style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "14px", marginTop: "14px" }}>
        <div className="wd-responsive-table" style={{ ...CARD, overflow: "hidden" }}>
          <div style={{ padding: "16px 22px 12px", fontSize: "14.5px", fontWeight: 800 }}>Produk Terlaris</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 0.8fr",
              padding: "9px 22px",
              background: "#FAFAFA",
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              color: "rgba(35,32,31,0.42)",
            }}
          >
            <div>Produk</div>
            <div style={{ textAlign: "right" }}>Terjual</div>
            <div style={{ textAlign: "right" }}>Omzet</div>
            <div style={{ textAlign: "right" }}>Stok</div>
          </div>
          {(report.topProducts.length ? report.topProducts : []).map((t, i) => {
            const [badgeBg, badgeColor] = badgeTints[i % badgeTints.length];
            return (
              <div
                key={t.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 0.8fr",
                  padding: "12px 22px",
                  fontSize: "13.5px",
                  borderTop: "1px solid rgba(35,32,31,0.05)",
                  alignItems: "center",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
                  <div
                    style={{
                      width: "30px",
                      height: "30px",
                      borderRadius: "8px",
                      background: badgeBg,
                      color: badgeColor,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "13px",
                      fontWeight: 800,
                      flexShrink: 0,
                    }}
                  >
                    {t.name.charAt(0)}
                  </div>
                  <span style={{ fontWeight: 700 }}>{t.name}</span>
                </div>
                <div style={{ textAlign: "right", fontFamily: MONO }}>{t.sold}</div>
                <div style={{ textAlign: "right", fontFamily: MONO }}>{formatRupiah(t.revenue)}</div>
                <div style={{ textAlign: "right" }}>
                  <StockBadge tone={t.tone} stock={t.stock} />
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ ...CARD, overflow: "hidden" }}>
          <div style={{ padding: "16px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "14.5px", fontWeight: 800 }}>Transaksi Terakhir</span>
            <a href="#" style={{ fontSize: "12px", fontWeight: 700, color: "#A91F34" }}>
              Lihat semua
            </a>
          </div>
          {report.recentOrders.map((r) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "11px 20px", borderTop: "1px solid rgba(35,32,31,0.05)" }}>
              <div
                style={{
                  width: "34px",
                  height: "34px",
                  borderRadius: "9px",
                  background: "#F5F6F8",
                  color: "rgba(35,32,31,0.55)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {ic(methodIcon(r.method), 17, "currentColor", 1.6)}
              </div>
              <div style={{ flex: 1, minWidth: 0, lineHeight: 1.2 }}>
                <div style={{ fontSize: "13px", fontWeight: 700 }}>{r.orderNo}</div>
                <div style={{ fontSize: "11.5px", color: "rgba(35,32,31,0.5)", marginTop: "1px" }}>{r.meta}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: MONO, fontSize: "13px", fontWeight: 700 }}>{formatRupiah(r.amount)}</div>
                <div style={{ fontSize: "10.5px", color: "rgba(35,32,31,0.45)", marginTop: "1px" }}>{r.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || "Owner";
}

function rangeLabel(from: string, to: string): string {
  const start = new Date(from);
  const end = new Date(to);
  end.setUTCDate(end.getUTCDate() - 1);
  const fmt = new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
  return `${fmt.format(start)} - ${fmt.format(end)}`;
}

function compactMoney(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}jt`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}rb`;
  return String(value);
}

function methodIcon(method: string): "wallet" | "receiptSm" {
  return method === "Tunai" ? "wallet" : "receiptSm";
}

function StatCard({
  iconName,
  iconBg,
  iconColor,
  label,
  value,
  delta,
  deltaColor,
}: {
  iconName: "wallet" | "receiptSm" | "cube" | "customer";
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  delta: string;
  deltaColor: string;
}) {
  return (
    <div style={{ ...CARD, padding: "18px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "34px", height: "34px", borderRadius: "9px", background: iconBg, color: iconColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {ic(iconName, 17, "currentColor")}
        </div>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "rgba(35,32,31,0.5)" }}>{label}</span>
      </div>
      <div style={{ fontFamily: MONO, fontSize: "23px", fontWeight: 700, marginTop: "12px" }}>{value}</div>
      <div style={{ fontSize: "12px", fontWeight: 700, color: deltaColor, marginTop: "5px" }}>{delta}</div>
    </div>
  );
}
