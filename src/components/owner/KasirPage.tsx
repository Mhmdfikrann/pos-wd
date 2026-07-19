import Link from "next/link";
import { ic } from "./icons";
import { PageHead } from "./shared";

/** Port of `renderKasir()` — link points to the Next.js /kasir route. */
export function KasirPage() {
  return (
    <div>
      <PageHead label="Kasir" actionLabel={null} subtitle="Layar transaksi untuk kasir." />
      <div
        style={{
          background: "#fff",
          border: "1px solid rgba(35,32,31,0.06)",
          borderRadius: "16px",
          padding: "48px",
          textAlign: "center",
          maxWidth: "520px",
          margin: "20px auto 0",
        }}
      >
        <div
          style={{
            width: "72px",
            height: "72px",
            borderRadius: "16px",
            background: "#FFF1F2",
            color: "#A91F34",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 18px",
          }}
        >
          {ic("cashier", 34, "#A91F34", 1.8)}
        </div>
        <div style={{ fontSize: "19px", fontWeight: 800 }}>Buka Layar Kasir</div>
        <div
          style={{
            fontSize: "13.5px",
            color: "rgba(35,32,31,0.55)",
            marginTop: "6px",
            maxWidth: "38ch",
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Layar kasir POS tersedia sebagai mockup terpisah dengan katalog, keranjang, dan alur pembayaran lengkap.
        </div>
        <Link
          href="/kasir"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            height: "48px",
            padding: "0 24px",
            marginTop: "22px",
            borderRadius: "11px",
            background: "#FFD84D",
            color: "#2D2022",
            fontWeight: 800,
            fontSize: "15px",
            boxShadow: "0 12px 24px -12px rgba(233,154,34,0.8)",
          }}
        >
          Buka Kasir →
        </Link>
      </div>
    </div>
  );
}
