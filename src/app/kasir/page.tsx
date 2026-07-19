"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Search,
  Clock,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  Truck,
  ShoppingBag,
  Banknote,
  QrCode,
  CreditCard,
  Wallet,
  Printer,
} from "lucide-react";
import { formatRupiah } from "@/lib/format";

// ---- Config (mockup props defaults) ----
const OUTLET_NAME = "Outlet Kemang";
const CASHIER_NAME = "Sinta Dewi";
const TAX_PERCENT = 11;
const TAX_RATE = TAX_PERCENT / 100;

// ---- Types ----
type Stock = "ok" | "low" | "out";
type Product = { id: string; name: string; price: number; cat: string; stock: Stock };
type Cart = Record<string, number>;
type OrderType = "dinein" | "takeaway" | "delivery";
type PayMethod = "tunai" | "qris" | "debit" | "ewallet";
type ModalKind = null | "pay" | "done";

// ---- Static data ----
const CATS: [string, string][] = [
  ["all", "Semua"],
  ["dimsum", "Dimsum"],
  ["kukus", "Kukus"],
  ["goreng", "Goreng"],
  ["paket", "Paket"],
  ["minuman", "Minuman"],
  ["addon", "Add-on"],
];

const CAT_TITLE: Record<string, string> = {
  all: "Semua Menu",
  dimsum: "Dimsum",
  kukus: "Menu Kukus",
  goreng: "Menu Goreng",
  paket: "Paket Hemat",
  minuman: "Minuman",
  addon: "Add-on",
};

const PRODUCTS: Product[] = [
  { id: "d1", name: "Dimsum Ayam", price: 18000, cat: "dimsum", stock: "ok" },
  { id: "d2", name: "Dimsum Ayam Keju", price: 22000, cat: "dimsum", stock: "ok" },
  { id: "d3", name: "Siomay Ayam", price: 20000, cat: "dimsum", stock: "low" },
  { id: "d4", name: "Ceker Dimsum", price: 24000, cat: "dimsum", stock: "ok" },
  { id: "h1", name: "Hakau Udang", price: 24000, cat: "kukus", stock: "low" },
  { id: "h2", name: "Xiao Long Bao", price: 28000, cat: "kukus", stock: "ok" },
  { id: "h3", name: "Mantao Kukus", price: 16000, cat: "kukus", stock: "ok" },
  { id: "g1", name: "Lumpia Udang", price: 20000, cat: "goreng", stock: "ok" },
  { id: "g2", name: "Pangsit Goreng", price: 18000, cat: "goreng", stock: "ok" },
  { id: "g3", name: "Lumpia Kulit Tahu", price: 20000, cat: "goreng", stock: "out" },
  { id: "p1", name: "Paket Hemat A", price: 45000, cat: "paket", stock: "ok" },
  { id: "p2", name: "Paket Berdua", price: 78000, cat: "paket", stock: "ok" },
  { id: "p3", name: "Paket Keluarga", price: 145000, cat: "paket", stock: "ok" },
  { id: "m1", name: "Es Teh Melati", price: 7000, cat: "minuman", stock: "ok" },
  { id: "m2", name: "Es Jeruk", price: 10000, cat: "minuman", stock: "ok" },
  { id: "m3", name: "Teh Tarik", price: 12000, cat: "minuman", stock: "ok" },
  { id: "m4", name: "Air Mineral", price: 5000, cat: "minuman", stock: "ok" },
  { id: "a1", name: "Saus XO", price: 8000, cat: "addon", stock: "ok" },
  { id: "a2", name: "Sambal Extra", price: 3000, cat: "addon", stock: "ok" },
  { id: "a3", name: "Kecap Asin", price: 2000, cat: "addon", stock: "ok" },
];

const prod = (id: string): Product => PRODUCTS.find((p) => p.id === id)!;
const fmt = formatRupiah;
const MONO = "var(--font-mono), monospace";

// Stock tag: [label, color]
const STOCK_TAG: Record<Stock, [string, string]> = {
  ok: ["Tersedia", "#2E9D64"],
  low: ["Menipis", "#E99A22"],
  out: ["Habis", "#5A4B4D"],
};

const OT_MAP: Record<OrderType, [string, string]> = {
  dinein: ["Meja", "A-12"],
  takeaway: ["Antrean", "T-07"],
  delivery: ["Order", "GF-231"],
};

// Dine-in domed-plate icon (mockup path has no exact lucide component).
function DineInIcon({ size = 16, strokeWidth = 2 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 11h18" />
      <path d="M12 11V4" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M6 20h12" />
    </svg>
  );
}

export default function KasirPage() {
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<Cart>({ d1: 2, h1: 1, m1: 3 });
  const [orderType, setOrderType] = useState<OrderType>("dinein");
  const [modal, setModal] = useState<ModalKind>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("tunai");
  const [cash, setCash] = useState(0);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastCash, setLastCash] = useState(0);

  // Derived values
  const subtotal = Object.entries(cart).reduce((s, [id, q]) => s + prod(id).price * q, 0);
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Handlers
  const add = (id: string) => {
    if (prod(id).stock === "out") return;
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  };
  const dec = (id: string) => {
    setCart((c) => {
      const q = (c[id] || 0) - 1;
      const next = { ...c };
      if (q <= 0) delete next[id];
      else next[id] = q;
      return next;
    });
  };
  const remove = (id: string) => {
    setCart((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  };
  const openPay = () => {
    if (cartCount === 0) return;
    setModal("pay");
    setPayMethod("tunai");
    setCash(0);
  };
  const closeModal = () => setModal(null);
  const appendCash = (d: number) => setCash((c) => (c * 10 + d > 99999999 ? c : c * 10 + d));
  const confirmPay = () => {
    if (payMethod === "tunai" && cash < total) return;
    const paid = payMethod === "tunai" ? cash : total;
    setLastTotal(total);
    setLastCash(paid);
    setModal("done");
  };
  const newTrx = () => {
    setCart({});
    setModal(null);
    setCash(0);
  };

  const counts: Record<string, number> = {};
  PRODUCTS.forEach((p) => {
    counts[p.cat] = (counts[p.cat] || 0) + 1;
  });
  counts.all = PRODUCTS.length;

  const q = query.trim().toLowerCase();
  const filtered = PRODUCTS.filter(
    (p) => (cat === "all" || p.cat === cat) && (!q || p.name.toLowerCase().includes(q)),
  );
  const [slotLabel, slotValue] = OT_MAP[orderType];
  const cashierInitial = CASHIER_NAME.charAt(0);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#FFF9F2" }}>
      {/* ===== HEADER ===== */}
      <div
        style={{
          height: 64,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 20px",
          background: "#fff",
          borderBottom: "1px solid rgba(45,32,34,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 11, flexShrink: 0 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 9,
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
              style={{ width: 36, height: 36, objectFit: "contain" }}
            />
          </div>
          <div style={{ lineHeight: 1.05 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800 }}>
              <span style={{ color: "#A91F34" }}>WANNA</span> DIMSUM
            </div>
            <div style={{ fontSize: 10.5, color: "rgba(45,32,34,0.5)", fontWeight: 600, marginTop: 2 }}>
              {OUTLET_NAME}
            </div>
          </div>
        </div>

        <div style={{ position: "relative", flex: 1, maxWidth: 460, marginLeft: 6 }}>
          <span
            style={{
              position: "absolute",
              left: 15,
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
            placeholder="Cari dimsum, paket, minuman… atau scan barcode"
            style={{
              width: "100%",
              height: 44,
              border: "1.5px solid rgba(45,32,34,0.12)",
              borderRadius: 10,
              padding: "0 14px 0 42px",
              fontSize: 14,
              color: "#2D2022",
              background: "#FFF9F2",
              outline: "none",
            }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            fontWeight: 700,
            padding: "8px 13px",
            borderRadius: 9,
            background: "#FFF4D6",
            color: "#A9791F",
          }}
        >
          <Clock size={15} strokeWidth={2} />
          Shift · 4j 12m
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            fontSize: 12.5,
            fontWeight: 700,
            padding: "8px 13px",
            borderRadius: 9,
            background: "#E4F4EC",
            color: "#238152",
          }}
        >
          <span
            className="wd-blink"
            style={{ width: 8, height: 8, borderRadius: "50%", background: "#2E9D64" }}
          />
          Online
        </span>
        <div style={{ width: 1, height: 28, background: "rgba(45,32,34,0.1)" }} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#FFD84D",
              color: "#2D2022",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 14,
            }}
          >
            {cashierInitial}
          </div>
          <div style={{ lineHeight: 1.15 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700 }}>{CASHIER_NAME}</div>
            <div style={{ fontSize: 10.5, color: "rgba(45,32,34,0.5)" }}>Kasir · Terminal 01</div>
          </div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Category rail */}
        <div
          className="wd-scroll"
          style={{
            width: 186,
            flexShrink: 0,
            background: "#fff",
            borderRight: "1px solid rgba(45,32,34,0.08)",
            overflowY: "auto",
            padding: "14px 12px",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "rgba(45,32,34,0.4)",
              padding: "0 6px 10px",
            }}
          >
            Kategori
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {CATS.map(([key, label]) => {
              const on = cat === key;
              return (
                <button
                  key={key}
                  onClick={() => setCat(key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    cursor: "pointer",
                    borderRadius: 10,
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: on ? 800 : 600,
                    padding: "11px 13px",
                    color: on ? "#A91F34" : "rgba(45,32,34,0.68)",
                    background: on ? "#FFF1F2" : "transparent",
                    transition: "all .12s",
                  }}
                  onMouseEnter={(e) => {
                    if (!on) e.currentTarget.style.background = "#FFF9F2";
                  }}
                  onMouseLeave={(e) => {
                    if (!on) e.currentTarget.style.background = "transparent";
                  }}
                >
                  <span>{label}</span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      fontWeight: 700,
                      color: on ? "#A91F34" : "rgba(45,32,34,0.35)",
                    }}
                  >
                    {counts[key] || 0}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        {/* Catalog */}
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              padding: "16px 22px 12px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800 }}>{CAT_TITLE[cat]}</div>
            <div style={{ fontSize: 12.5, color: "rgba(45,32,34,0.5)", fontFamily: MONO }}>
              {filtered.length} menu
            </div>
          </div>
          <div className="wd-scroll" style={{ flex: 1, overflowY: "auto", padding: "4px 22px 22px" }}>
            {filtered.length === 0 ? (
              <div style={{ textAlign: "center", padding: "70px 20px", color: "rgba(45,32,34,0.5)" }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔍</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#2D2022" }}>
                  Menu tidak ditemukan
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>Coba kata kunci atau kategori lain.</div>
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
                  gap: 14,
                }}
              >
                {filtered.map((p) => {
                  const out = p.stock === "out";
                  const inCart = cart[p.id] || 0;
                  const [tagLabel, tagColor] = STOCK_TAG[p.stock];
                  return (
                    <div
                      key={p.id}
                      onClick={() => add(p.id)}
                      style={{
                        position: "relative",
                        border: inCart ? "1.5px solid #A91F34" : "1px solid rgba(45,32,34,0.08)",
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#fff",
                        cursor: out ? "not-allowed" : "pointer",
                        opacity: out ? 0.5 : 1,
                        transition: "all .15s",
                        boxShadow: inCart ? "0 10px 26px -16px rgba(127,22,40,0.6)" : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!out) {
                          e.currentTarget.style.boxShadow = "0 14px 30px -18px rgba(127,22,40,0.5)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.boxShadow = inCart
                          ? "0 10px 26px -16px rgba(127,22,40,0.6)"
                          : "none";
                        e.currentTarget.style.transform = "none";
                      }}
                    >
                      <div
                        style={{
                          height: 92,
                          background: out
                            ? "repeating-linear-gradient(45deg,#EFEAEA,#EFEAEA 8px,#E5DEDE 8px,#E5DEDE 16px)"
                            : "repeating-linear-gradient(45deg,#FFF4D6,#FFF4D6 8px,#FDEBBE 8px,#FDEBBE 16px)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "relative",
                        }}
                      >
                        <span style={{ fontFamily: MONO, fontSize: 9, color: "rgba(45,32,34,0.4)" }}>
                          foto produk
                        </span>
                        <span
                          style={{
                            position: "absolute",
                            top: 8,
                            left: 8,
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: 5,
                            background: tagColor,
                            color: "#fff",
                          }}
                        >
                          {tagLabel}
                        </span>
                        {inCart ? (
                          <span
                            className="wd-pop"
                            style={{
                              position: "absolute",
                              top: 8,
                              right: 8,
                              minWidth: 22,
                              height: 22,
                              padding: "0 6px",
                              borderRadius: 999,
                              background: "#A91F34",
                              color: "#fff",
                              fontFamily: MONO,
                              fontSize: 12,
                              fontWeight: 700,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {inCart}
                          </span>
                        ) : null}
                      </div>
                      <div style={{ padding: "11px 12px 13px" }}>
                        <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.25, minHeight: 34 }}>
                          {p.name}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginTop: 4,
                          }}
                        >
                          <span
                            style={{
                              fontFamily: MONO,
                              fontSize: 13,
                              fontWeight: 600,
                              color: out ? "rgba(45,32,34,0.5)" : "#A91F34",
                            }}
                          >
                            {fmt(p.price)}
                          </span>
                          {out ? null : (
                            <span
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 8,
                                background: "#A91F34",
                                color: "#fff",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                              }}
                            >
                              <Plus size={15} strokeWidth={2.4} />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* Order panel */}
        <div
          style={{
            width: 410,
            flexShrink: 0,
            background: "#fff",
            borderLeft: "1px solid rgba(45,32,34,0.08)",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-18px 0 40px -34px rgba(127,22,40,0.5)",
          }}
        >
          {/* Order header */}
          <div style={{ flexShrink: 0, padding: "16px 20px 14px", borderBottom: "1px solid rgba(45,32,34,0.07)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 13,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 16, fontWeight: 800 }}>Pesanan</span>
                <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(45,32,34,0.5)" }}>
                  #TRX-0429
                </span>
              </div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  background: "#FFF4D6",
                  color: "#A9791F",
                  padding: "3px 10px",
                  borderRadius: 999,
                }}
              >
                {cartCount} item
              </span>
            </div>
            {/* Order type tabs */}
            <div
              style={{
                display: "flex",
                gap: 6,
                background: "#FFF9F2",
                padding: 4,
                borderRadius: 11,
                border: "1px solid rgba(45,32,34,0.08)",
              }}
            >
              {(
                [
                  ["dinein", "Dine-in"],
                  ["takeaway", "Takeaway"],
                  ["delivery", "Delivery"],
                ] as [OrderType, string][]
              ).map(([key, label]) => {
                const on = orderType === key;
                const Icon =
                  key === "dinein" ? DineInIcon : key === "takeaway" ? ShoppingBag : Truck;
                return (
                  <button
                    key={key}
                    onClick={() => setOrderType(key)}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 7,
                      height: 40,
                      border: "none",
                      borderRadius: 8,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 700,
                      background: on ? "#A91F34" : "transparent",
                      color: on ? "#fff" : "rgba(45,32,34,0.6)",
                      transition: "all .15s",
                      boxShadow: on ? "0 8px 16px -10px rgba(127,22,40,0.7)" : "none",
                    }}
                  >
                    <Icon size={16} strokeWidth={2} />
                    {label}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 11 }}>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 40,
                  padding: "0 12px",
                  border: "1.5px solid rgba(45,32,34,0.12)",
                  borderRadius: 9,
                  background: "#FFF9F2",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(45,32,34,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {slotLabel}
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#A91F34" }}>{slotValue}</span>
              </div>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  height: 40,
                  padding: "0 12px",
                  border: "1.5px solid rgba(45,32,34,0.12)",
                  borderRadius: 9,
                  background: "#FFF9F2",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "rgba(45,32,34,0.45)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Tamu
                </span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#2D2022" }}>2</span>
              </div>
            </div>
          </div>

          {/* Cart list */}
          <div className="wd-scroll" style={{ flex: 1, overflowY: "auto" }}>
            {Object.entries(cart).length === 0 ? (
              <div
                style={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 30,
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    width: 72,
                    height: 72,
                    borderRadius: 16,
                    background: "#FFF4D6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 34,
                    marginBottom: 14,
                  }}
                >
                  🥟
                </div>
                <div style={{ fontSize: 15, fontWeight: 700 }}>Keranjang masih kosong</div>
                <div
                  style={{
                    fontSize: 13,
                    color: "rgba(45,32,34,0.55)",
                    marginTop: 5,
                    maxWidth: "22ch",
                  }}
                >
                  Ketuk menu di sebelah kiri untuk menambah pesanan.
                </div>
              </div>
            ) : (
              <div style={{ padding: "6px 18px 10px" }}>
                {Object.entries(cart).map(([id, qty]) => {
                  const p = prod(id);
                  return (
                    <div
                      key={id}
                      className="wd-fade"
                      style={{
                        display: "flex",
                        gap: 11,
                        padding: "13px 0",
                        borderBottom: "1px solid rgba(45,32,34,0.07)",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{p.name}</div>
                        <div
                          style={{
                            fontFamily: MONO,
                            fontSize: 12,
                            color: "rgba(45,32,34,0.5)",
                            marginTop: 2,
                          }}
                        >
                          {fmt(p.price)} / porsi
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
                          <button
                            onClick={() => dec(id)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: "1.5px solid rgba(45,32,34,0.15)",
                              background: "#fff",
                              color: "#A91F34",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            {qty === 1 ? (
                              <Trash2 size={15} strokeWidth={2.2} />
                            ) : (
                              <Minus size={15} strokeWidth={2.2} />
                            )}
                          </button>
                          <span
                            style={{
                              fontFamily: MONO,
                              fontSize: 16,
                              fontWeight: 700,
                              minWidth: 22,
                              textAlign: "center",
                            }}
                          >
                            {qty}
                          </span>
                          <button
                            onClick={() => add(id)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 8,
                              border: "none",
                              background: "#A91F34",
                              color: "#fff",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Plus size={15} strokeWidth={2.4} />
                          </button>
                        </div>
                      </div>
                      <div
                        style={{
                          textAlign: "right",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                        }}
                      >
                        <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>
                          {fmt(p.price * qty)}
                        </div>
                        <button
                          onClick={() => remove(id)}
                          aria-label="Hapus"
                          style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            color: "rgba(45,32,34,0.35)",
                            padding: 4,
                            display: "flex",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "#D64545")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(45,32,34,0.35)")}
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
</div>

          {/* Totals + pay */}
          <div
            style={{
              flexShrink: 0,
              padding: "16px 20px 18px",
              background: "#FFF9F2",
              borderTop: "1px solid rgba(45,32,34,0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "rgba(45,32,34,0.6)",
                marginBottom: 7,
              }}
            >
              <span>Subtotal</span>
              <span style={{ fontFamily: MONO }}>{fmt(subtotal)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "rgba(45,32,34,0.6)",
              }}
            >
              <span>PPN {TAX_PERCENT}%</span>
              <span style={{ fontFamily: MONO }}>{fmt(tax)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginTop: 11,
                paddingTop: 11,
                borderTop: "1.5px dashed rgba(45,32,34,0.15)",
              }}
            >
              <span style={{ fontSize: 15, fontWeight: 800 }}>Total</span>
              <span style={{ fontFamily: MONO, fontSize: 24, fontWeight: 700, color: "#A91F34" }}>
                {fmt(total)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 9, marginTop: 15 }}>
              <button
                onClick={() => {}}
                style={{
                  flex: "0 0 auto",
                  height: 54,
                  padding: "0 18px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(45,32,34,0.15)",
                  background: "#fff",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#2D2022",
                  cursor: "pointer",
                  transition: "all .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF4D6")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
              >
                Tahan
              </button>
              <button
                onClick={openPay}
                style={{
                  flex: 1,
                  height: 54,
                  borderRadius: 10,
                  border: "none",
                  background: "#FFD84D",
                  color: "#2D2022",
                  fontFamily: "inherit",
                  fontWeight: 800,
                  fontSize: 16,
                  cursor: "pointer",
                  transition: "all .15s",
                  boxShadow: "0 12px 24px -12px rgba(233,154,34,0.8)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#f5cc33")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#FFD84D")}
              >
                {cartCount === 0 ? "Pilih Menu" : "Bayar " + fmt(total)}
              </button>
            </div>
          </div>
        </div>
</div>

      {modal === "done"
        ? (() => {
            const change = lastCash - lastTotal;
            return (
              <div
                onClick={closeModal}
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
                    width: 420,
                    background: "#fff",
                    borderRadius: 18,
                    padding: "36px 34px 30px",
                    textAlign: "center",
                    boxShadow: "0 40px 80px -30px rgba(127,22,40,0.5)",
                  }}
                >
                  <div
                    className="wd-pop"
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: "50%",
                      background: "#E4F4EC",
                      color: "#2E9D64",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 18px",
                    }}
                  >
                    <Check size={36} strokeWidth={2.6} />
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800 }}>Pembayaran Berhasil</div>
                  <div style={{ fontSize: 13.5, color: "rgba(45,32,34,0.55)", marginTop: 5 }}>
                    Transaksi #TRX-0429 tercatat.
                  </div>
                  <div
                    style={{
                      background: "#FFF9F2",
                      border: "1px solid rgba(45,32,34,0.08)",
                      borderRadius: 12,
                      padding: "16px 18px",
                      marginTop: 20,
                      textAlign: "left",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "rgba(45,32,34,0.6)",
                        marginBottom: 7,
                      }}
                    >
                      <span>Total</span>
                      <span style={{ fontFamily: MONO, fontWeight: 700, color: "#2D2022" }}>
                        {fmt(lastTotal)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 13,
                        color: "rgba(45,32,34,0.6)",
                        marginBottom: 7,
                      }}
                    >
                      <span>Tunai</span>
                      <span style={{ fontFamily: MONO }}>{fmt(lastCash)}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        paddingTop: 9,
                        borderTop: "1px dashed rgba(45,32,34,0.15)",
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 800 }}>Kembalian</span>
                      <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, color: "#2E9D64" }}>
                        {fmt(Math.max(0, change))}
                      </span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                    <button
                      onClick={newTrx}
                      style={{
                        flex: 1,
                        height: 50,
                        borderRadius: 10,
                        border: "1.5px solid rgba(45,32,34,0.15)",
                        background: "#fff",
                        fontFamily: "inherit",
                        fontWeight: 700,
                        fontSize: 14,
                        color: "#2D2022",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      <Printer size={17} strokeWidth={2} />
                      Cetak Struk
                    </button>
                    <button
                      onClick={newTrx}
                      style={{
                        flex: 1,
                        height: 50,
                        borderRadius: 10,
                        border: "none",
                        background: "#A91F34",
                        color: "#fff",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: 14,
                        cursor: "pointer",
                      }}
                    >
                      Transaksi Baru
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        : null}
      {modal === "pay"
        ? (() => {
            const methods: [PayMethod, string][] = [
              ["tunai", "Tunai"],
              ["qris", "QRIS"],
              ["debit", "Kartu"],
              ["ewallet", "E-Wallet"],
            ];
            const methodIcon: Record<PayMethod, typeof Banknote> = {
              tunai: Banknote,
              qris: QrCode,
              debit: CreditCard,
              ewallet: Wallet,
            };
            const isCash = payMethod === "tunai";
            const change = cash - total;
            const canPay = !isCash || cash >= total;
            const quick: [string, number][] = [
              ["Uang Pas", total],
              ["50rb", 50000],
              ["100rb", 100000],
              ["150rb", 150000],
            ];
            const keypad: (number | "C" | "back")[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, "C", 0, "back"];

            let changeEl: React.ReactNode;
            if (cash === 0)
              changeEl = (
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "rgba(45,32,34,0.4)", marginTop: 4 }}>
                  Masukkan nominal uang diterima
                </div>
              );
            else if (change < 0)
              changeEl = (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#D64545", marginTop: 4 }}>
                  Kurang {fmt(-change)}
                </div>
              );
            else
              changeEl = (
                <div style={{ fontSize: 13, fontWeight: 700, color: "#2E9D64", marginTop: 4 }}>
                  Kembali {fmt(change)}
                </div>
              );

            return (
              <div
                onClick={closeModal}
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
                    width: isCash ? 760 : 440,
                    background: "#fff",
                    borderRadius: 18,
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
                    <div style={{ fontSize: 17, fontWeight: 800 }}>Pembayaran</div>
                    <button
                      onClick={closeModal}
                      style={{
                        border: "none",
                        background: "#FFF9F2",
                        width: 34,
                        height: 34,
                        borderRadius: 9,
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
                  <div style={{ display: "flex" }}>
                    {/* left: methods + total */}
                    <div
                      style={{
                        width: isCash ? 320 : "100%",
                        padding: "20px 22px",
                        borderRight: isCash ? "1px solid rgba(45,32,34,0.08)" : "none",
                      }}
                    >
                      <div
                        style={{
                          background: "#2D2022",
                          color: "#fff",
                          borderRadius: 13,
                          padding: "18px 20px",
                          marginBottom: 20,
                        }}
                      >
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>
                          Total Tagihan
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, marginTop: 3 }}>
                          {fmt(total)}
                        </div>
                        <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                          {cartCount} item · sudah termasuk PPN
                        </div>
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          color: "rgba(45,32,34,0.42)",
                          marginBottom: 11,
                        }}
                      >
                        Metode Bayar
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                        {methods.map(([key, label]) => {
                          const on = payMethod === key;
                          const Icon = methodIcon[key];
                          return (
                            <button
                              key={key}
                              onClick={() => {
                                setPayMethod(key);
                                setCash(0);
                              }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 9,
                                height: 48,
                                padding: "0 13px",
                                borderRadius: 10,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                fontSize: 13.5,
                                fontWeight: 700,
                                border: on ? "1.5px solid #A91F34" : "1.5px solid rgba(45,32,34,0.12)",
                                background: on ? "#FFF1F2" : "#fff",
                                color: on ? "#A91F34" : "rgba(45,32,34,0.7)",
                                transition: "all .12s",
                              }}
                            >
                              <Icon size={18} strokeWidth={2} />
                              {label}
                            </button>
                          );
                        })}
                      </div>
                      {!isCash ? (
                        <div
                          style={{
                            marginTop: 20,
                            textAlign: "center",
                            padding: 20,
                            background: "#FFF9F2",
                            borderRadius: 12,
                            border: "1px dashed rgba(45,32,34,0.18)",
                          }}
                        >
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Menunggu pembayaran</div>
                          <div style={{ fontSize: 12.5, color: "rgba(45,32,34,0.55)", marginTop: 4 }}>
                            Arahkan pelanggan menyelesaikan pembayaran via {payMethod.toUpperCase()}.
                          </div>
                        </div>
                      ) : null}
                      <button
                        onClick={confirmPay}
                        disabled={!canPay}
                        style={{
                          width: "100%",
                          height: 54,
                          marginTop: 20,
                          borderRadius: 11,
                          border: "none",
                          background: canPay ? "#FFD84D" : "rgba(45,32,34,0.12)",
                          color: canPay ? "#2D2022" : "rgba(45,32,34,0.4)",
                          fontFamily: "inherit",
                          fontWeight: 800,
                          fontSize: 16,
                          cursor: canPay ? "pointer" : "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          boxShadow: canPay ? "0 12px 24px -12px rgba(233,154,34,0.8)" : "none",
                        }}
                      >
                        <Check size={19} strokeWidth={2.4} />
                        Konfirmasi Bayar
                      </button>
                    </div>
                    {/* right: keypad (cash only) */}
                    {isCash ? (
                      <div style={{ flex: 1, padding: "20px 22px" }}>
                        <div
                          style={{
                            background: "#FFF9F2",
                            border: "1.5px solid rgba(45,32,34,0.12)",
                            borderRadius: 11,
                            padding: "14px 16px",
                            marginBottom: 13,
                          }}
                        >
                          <div style={{ fontSize: 12, color: "rgba(45,32,34,0.5)", fontWeight: 600 }}>
                            Uang Diterima
                          </div>
                          <div style={{ fontFamily: MONO, fontSize: 28, fontWeight: 700, marginTop: 2 }}>
                            {cash === 0 ? "Rp 0" : fmt(cash)}
                          </div>
                          {changeEl}
                        </div>
                        <div style={{ display: "flex", gap: 8, marginBottom: 13 }}>
                          {quick.map(([label, amt]) => (
                            <button
                              key={label}
                              onClick={() => setCash(amt)}
                              style={{
                                flex: 1,
                                height: 40,
                                borderRadius: 8,
                                border: "1.5px solid rgba(45,32,34,0.12)",
                                background: "#fff",
                                fontFamily: "inherit",
                                fontWeight: 700,
                                fontSize: 12,
                                color: "#2D2022",
                                cursor: "pointer",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 9 }}>
                          {keypad.map((k) => {
                            if (k === "C")
                              return (
                                <button
                                  key={k}
                                  onClick={() => setCash(0)}
                                  style={{
                                    height: 54,
                                    borderRadius: 9,
                                    border: "1.5px solid rgba(214,69,69,0.3)",
                                    background: "#FBE7E7",
                                    color: "#B83636",
                                    fontFamily: "inherit",
                                    fontSize: 15,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  C
                                </button>
                              );
                            if (k === "back")
                              return (
                                <button
                                  key={k}
                                  onClick={() => setCash((c) => Math.floor(c / 10))}
                                  style={{
                                    height: 54,
                                    borderRadius: 9,
                                    border: "1.5px solid rgba(45,32,34,0.1)",
                                    background: "#fff",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    color: "#2D2022",
                                  }}
                                >
                                  ⌫
                                </button>
                              );
                            return (
                              <button
                                key={k}
                                onClick={() => appendCash(k)}
                                style={{
                                  height: 54,
                                  borderRadius: 9,
                                  border: "1.5px solid rgba(45,32,34,0.1)",
                                  background: "#fff",
                                  fontFamily: MONO,
                                  fontSize: 21,
                                  fontWeight: 700,
                                  color: "#2D2022",
                                  cursor: "pointer",
                                  transition: "all .1s",
                                }}
                                onMouseDown={(e) => (e.currentTarget.style.background = "#FFD84D")}
                                onMouseUp={(e) => (e.currentTarget.style.background = "#fff")}
                                onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
                              >
                                {k}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })()
        : null}
</div>
  );
}
