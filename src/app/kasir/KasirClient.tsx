"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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
  ChevronDown,
} from "lucide-react";
import { LogoutButton } from "@/components/LogoutButton";
import { formatRupiah } from "@/lib/format";
import { formatShiftDuration } from "@/lib/shift-rules";
import { actionCheckout, actionSaveHeldOrder } from "@/lib/order-actions";
import { actionCloseShift, actionGetExpectedCash, actionRecordCashMovement } from "@/lib/shift-actions";
import type { CashMovementType, ExpectedCashBreakdown } from "@/lib/cash-data";
import type { Receipt } from "@/lib/order";

// ---- Types ----
type Stock = "ok" | "low" | "out";
type OrderType = "dinein" | "takeaway" | "delivery";
type DeliveryProvider = "gofood" | "grabfood" | "shopeefood";
export type Product = { id: string; name: string; price: number; cat: string; stock: Stock };
export type Promo = { id: string; name: string; type: "percent" | "amount"; value: number };
export type HeldOrder = {
  orderId: string;
  orderNo: string;
  orderType: OrderType;
  tableNo: string | null;
  customerName: string | null;
  deliveryProvider: DeliveryProvider | null;
  channelOrderName: string | null;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  promoId: string | null;
  promoName: string | null;
  updatedAt: string;
  lines: Array<{ productId: string | null; quantity: number; note: string | null }>;
};
type Cart = Record<string, number>;
type PayMethod = "tunai" | "qris" | "card" | "transfer" | "ewallet";
type ModalKind = null | "pay" | "done" | "close" | "promo" | "held";

// Title for the "Semua" tab; per-category titles come from the category label.
const ALL_TITLE = "Semua Menu";

const fmt = formatRupiah;
const MONO = "var(--font-mono), monospace";

// Stock tag: [label, color]
const STOCK_TAG: Record<Stock, [string, string]> = {
  ok: ["Tersedia", "#2E9D64"],
  low: ["Menipis", "#E99A22"],
  out: ["Habis", "#5A4B4D"],
};

const DELIVERY_PROVIDERS: [DeliveryProvider, string][] = [
  ["gofood", "GoFood"],
  ["grabfood", "GrabFood"],
  ["shopeefood", "ShopeeFood"],
];
const DELIVERY_LABEL: Record<DeliveryProvider, string> = Object.fromEntries(DELIVERY_PROVIDERS) as Record<DeliveryProvider, string>;

// Client pay-method label → server payments.method enum.
const PAY_METHOD: Record<PayMethod, "cash" | "qris" | "transfer" | "ewallet" | "card"> = {
  tunai: "cash",
  qris: "qris",
  card: "card",
  transfer: "transfer",
  ewallet: "ewallet",
};
const CARD_PROVIDERS = [
  ["edc_bca", "EDC BCA"],
  ["edc_mandiri", "EDC Mandiri"],
  ["edc_bca_lainnya", "EDC BCA Lainnya"],
  ["edc_mandiri_lainnya", "EDC Mandiri Lainnya"],
] as const;
const TRANSFER_ACCOUNTS = [["bca", "Transfer Rekening BCA"], ["mandiri", "Transfer Rekening Mandiri"]] as const;
type ClientPaymentLine = { method: PayMethod; amount: number; cashReceived: number; provider?: string | null; channelLabel?: string | null; referenceNo?: string | null };

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

export default function KasirClient({
  products,
  categories,
  outletId,
  outletName,
  cashierName,
  shiftId,
  shiftOpenedAt,
  taxPercent,
  promos,
  heldOrders: initialHeldOrders,
}: {
  products: Product[];
  categories: [string, string][];
  outletId: string;
  outletName: string;
  cashierName: string;
  shiftId: string;
  /** ISO timestamp of the active shift's open (for the live badge). */
  shiftOpenedAt: string;
  /** outlet PPN percent — server is authoritative, this mirrors it for display. */
  taxPercent: number;
  promos: Promo[];
  heldOrders: HeldOrder[];
}) {
  const router = useRouter();
  // Product lookup by id (replaces the module-level PRODUCTS.find).
  const byId = new Map(products.map((p) => [p.id, p]));
  const prod = (id: string): Product | undefined => byId.get(id);

  // Category rail = "Semua" + the DB categories, in order.
  const cats: [string, string][] = [["all", "Semua"], ...categories];
  // Content title: "Semua Menu" for the all-filter, else the category's label.
  const catTitle = (key: string): string =>
    key === "all" ? ALL_TITLE : categories.find(([k]) => k === key)?.[1] ?? key;

  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  // Seed cart only with products that actually exist in the catalog.
  const [cart, setCart] = useState<Cart>(() => {
    const seed: Cart = { d1: 2, h1: 1, m1: 3 };
    const valid: Cart = {};
    for (const [id, q] of Object.entries(seed)) if (byId.has(id)) valid[id] = q;
    return valid;
  });
  const [orderType, setOrderType] = useState<OrderType>("dinein");
  const [tableNo, setTableNo] = useState("A-12");
  const [customerName, setCustomerName] = useState("");
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProvider>("gofood");
  const [channelOrderName, setChannelOrderName] = useState("");
  const [contextError, setContextError] = useState<string | null>(null);
  const [promoId, setPromoId] = useState<string | null>(null);
  const [heldOrders, setHeldOrders] = useState<HeldOrder[]>(initialHeldOrders);
  const [activeHeldOrderId, setActiveHeldOrderId] = useState<string | null>(null);
  const [savingHeld, setSavingHeld] = useState(false);
  const [heldError, setHeldError] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("tunai");
  const [cash, setCash] = useState(0);
  const [paymentProvider, setPaymentProvider] = useState("edc_bca");
  const [paymentReference, setPaymentReference] = useState("");
  const [splitAmount, setSplitAmount] = useState(0);
  const [splitLines, setSplitLines] = useState<ClientPaymentLine[]>([]);
  const [lastTotal, setLastTotal] = useState(0);
  const [lastChange, setLastChange] = useState(0);
  // Checkout wiring: busy guard (blocks double-submit), error, and the receipt
  // returned by the server. One idempotency key per pay-modal open (BR-003).
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => crypto.randomUUID());
  const [expectedCash, setExpectedCash] = useState<ExpectedCashBreakdown | null>(null);
  const [actualCash, setActualCash] = useState(0);
  const [closingNote, setClosingNote] = useState("");
  const [closing, setClosing] = useState(false);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [cashMoveType, setCashMoveType] = useState<CashMovementType>("cash_in");
  const [cashMoveAmount, setCashMoveAmount] = useState(0);
  const [cashMoveNote, setCashMoveNote] = useState("");
  const [cashMoveBusy, setCashMoveBusy] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Live shift-duration badge: recompute every 30s from the open timestamp.
  const shiftOpenedMs = new Date(shiftOpenedAt).getTime();
  const [shiftLabel, setShiftLabel] = useState(() =>
    formatShiftDuration(shiftOpenedMs, Date.now()),
  );
  useEffect(() => {
    // Interval only — the initializer already set the first value, so no
    // synchronous setState in the effect body (react-hooks/set-state-in-effect).
    const t = setInterval(
      () => setShiftLabel(formatShiftDuration(shiftOpenedMs, Date.now())),
      30_000,
    );
    return () => clearInterval(t);
  }, [shiftOpenedMs]);

  // Derived values — a cart id with no matching product contributes 0. Tax math
  // mirrors the server (order-math.ts): round once on the discounted subtotal.
  // The server total is authoritative at checkout; this is for display.
  const subtotal = Object.entries(cart).reduce((s, [id, q]) => s + (prod(id)?.price ?? 0) * q, 0);
  const activePromo = promos.find((p) => p.id === promoId) ?? null;
  const discount = activePromo
    ? Math.min(subtotal, activePromo.type === "percent" ? Math.round((subtotal * activePromo.value) / 100) : activePromo.value)
    : 0;
  const tax = Math.round(((subtotal - discount) * taxPercent) / 100);
  const total = subtotal - discount + tax;
  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);

  // Handlers
  const add = (id: string) => {
    if (prod(id)?.stock === "out") return;
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
    const validation = validateOrderContext();
    if (validation) {
      setContextError(validation);
      return;
    }
    setContextError(null);
    setModal("pay");
    setPayMethod("tunai");
    setCash(0);
    setPaymentProvider("edc_bca");
    setPaymentReference("");
    setSplitAmount(0);
    setSplitLines([]);
    setPayError(null);
  };
  const closeModal = () => {
    if (paying || closing) return; // don't dismiss mid-charge / close
    setModal(null);
  };
  const appendCash = (d: number) => setCash((c) => (c * 10 + d > 99999999 ? c : c * 10 + d));

  // Checkout: server is authoritative. The idempotency key is minted once per
  // attempt (in state) and reused across retries so a double-submit — network
  // retry, double-click, StrictMode — can never double-charge (BR-003).
  const confirmPay = async () => {
    if (paying) return;
    const usingSplit = splitLines.length > 0;
    if (!usingSplit && payMethod === "tunai" && cash < total) return;
    if (usingSplit && splitRemaining !== 0) return;
    if (cartCount === 0) return;
    setPaying(true);
    setPayError(null);

    const cart_lines = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    const cashReceived = payMethod === "tunai" ? cash : total;
    const payments = usingSplit
      ? splitLines.map((line) => ({
          method: PAY_METHOD[line.method],
          amount: line.amount,
          cashReceived: line.method === "tunai" ? line.cashReceived : undefined,
          provider: line.provider,
          channelLabel: line.channelLabel,
          referenceNo: line.referenceNo,
        }))
      : undefined;

    const res = await actionCheckout({
      outletId,
      heldOrderId: activeHeldOrderId,
      cart: cart_lines,
      orderType,
      tableNo: orderType === "dinein" ? tableNo : null,
      customerName: orderType === "delivery" ? null : customerName,
      deliveryProvider: orderType === "delivery" ? deliveryProvider : null,
      channelOrderName: orderType === "delivery" ? channelOrderName : null,
      taxPercent,
      promoId,
      payment: payments ? undefined : {
        method: PAY_METHOD[payMethod],
        cashReceived,
        referenceNo: paymentReference || null,
      },
      payments,
      idempotencyKey,
    });

    setPaying(false);
    if (!res.ok) {
      setPayError(res.error);
      return;
    }
    setReceipt(res.receipt);
    if (activeHeldOrderId) {
      setHeldOrders((orders) => orders.filter((order) => order.orderId !== activeHeldOrderId));
      setActiveHeldOrderId(null);
    }
    setLastTotal(res.receipt.total);
    setLastChange(res.receipt.payments.reduce((sum, line) => sum + (line.changeAmount ?? 0), 0));
    setModal("done");
  };

  const newTrx = () => {
    setCart({});
    setModal(null);
    setCash(0);
    setSplitAmount(0);
    setSplitLines([]);
    setPaymentReference("");
    setReceipt(null);
    setLastChange(0);
    setPayError(null);
    setContextError(null);
    setTableNo("");
    setCustomerName("");
    setDeliveryProvider("gofood");
    setChannelOrderName("");
    setPromoId(null);
    setActiveHeldOrderId(null);
    setHeldError(null);
    // Fresh key for the next transaction (BR-003).
    setIdempotencyKey(crypto.randomUUID());
  };

  const saveCurrentOrder = async () => {
    if (savingHeld || cartCount === 0) return;
    const validation = validateOrderContext();
    if (validation) {
      setContextError(validation);
      return;
    }
    setSavingHeld(true);
    setHeldError(null);
    const cart_lines = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    const res = await actionSaveHeldOrder({
      orderId: activeHeldOrderId,
      outletId,
      cart: cart_lines,
      orderType,
      tableNo: orderType === "dinein" ? tableNo : null,
      customerName: orderType === "delivery" ? null : customerName,
      deliveryProvider: orderType === "delivery" ? deliveryProvider : null,
      channelOrderName: orderType === "delivery" ? channelOrderName : null,
      taxPercent,
      promoId,
    });
    setSavingHeld(false);
    if (!res.ok) {
      setHeldError(res.error);
      return;
    }
    setHeldOrders((orders) => {
      const others = orders.filter((order) => order.orderId !== res.heldOrder.orderId);
      return [res.heldOrder, ...others];
    });
    setActiveHeldOrderId(res.heldOrder.orderId);
    setHeldError(null);
  };

  const resumeHeldOrder = (order: HeldOrder) => {
    const nextCart: Cart = {};
    for (const line of order.lines) {
      if (line.productId && byId.has(line.productId)) nextCart[line.productId] = line.quantity;
    }
    setCart(nextCart);
    setOrderType(order.orderType);
    setTableNo(order.tableNo ?? "");
    setCustomerName(order.customerName ?? "");
    setDeliveryProvider(order.deliveryProvider ?? "gofood");
    setChannelOrderName(order.channelOrderName ?? "");
    setPromoId(order.promoId);
    setActiveHeldOrderId(order.orderId);
    setContextError(null);
    setHeldError(null);
    setModal(null);
  };

  const openCloseShift = async () => {
    if (paying || closing) return;
    setCloseError(null);
    setExpectedCash(null);
    setActualCash(0);
    setClosingNote("");
    setCashMoveType("cash_in");
    setCashMoveAmount(0);
    setCashMoveNote("");
    setModal("close");
    const res = await actionGetExpectedCash(shiftId);
    if (!res.ok) {
      setCloseError(res.error);
      return;
    }
    setExpectedCash(res.expected);
    setActualCash(res.expected.expectedCash);
  };

  const refreshExpectedCash = async () => {
    const res = await actionGetExpectedCash(shiftId);
    if (!res.ok) {
      setCloseError(res.error);
      return null;
    }
    setExpectedCash(res.expected);
    setActualCash((current) => (current === 0 ? res.expected.expectedCash : current));
    return res.expected;
  };

  const saveCashMovement = async () => {
    if (cashMoveBusy || cashMoveAmount <= 0) return;
    setCashMoveBusy(true);
    setCloseError(null);
    const res = await actionRecordCashMovement({
      shiftId,
      type: cashMoveType,
      amount: cashMoveAmount,
      note: cashMoveNote,
    });
    setCashMoveBusy(false);
    if (!res.ok) {
      setCloseError(res.error);
      return;
    }
    setCashMoveAmount(0);
    setCashMoveNote("");
    await refreshExpectedCash();
  };

  const confirmCloseShift = async () => {
    if (closing) return;
    setClosing(true);
    setCloseError(null);
    const res = await actionCloseShift({
      shiftId,
      actualCash,
      note: closingNote,
    });
    setClosing(false);
    if (!res.ok) {
      setCloseError(res.error);
      return;
    }
    setModal(null);
    router.refresh();
  };

  const splitPaid = splitLines.reduce((sum, line) => sum + line.amount, 0);
  const splitRemaining = total - splitPaid;
  const addSplitLine = () => {
    const amount = splitAmount || Math.max(0, splitRemaining);
    if (amount <= 0 || amount > splitRemaining) return;
    if (payMethod !== "tunai" && !paymentReference.trim()) {
      setPayError("Reference wajib untuk pembayaran non-tunai.");
      return;
    }
    if (payMethod === "tunai" && cash < amount) {
      setPayError("Tunai kurang dari nominal cash line.");
      return;
    }
    const provider = payMethod === "card" || payMethod === "transfer" ? paymentProvider : null;
    const label = payMethod === "card" ? CARD_PROVIDERS.find(([id]) => id === provider)?.[1] : payMethod === "transfer" ? TRANSFER_ACCOUNTS.find(([id]) => id === provider)?.[1] : null;
    setSplitLines((lines) => [...lines, { method: payMethod, amount, cashReceived: payMethod === "tunai" ? cash : amount, provider, channelLabel: label ?? null, referenceNo: payMethod === "tunai" ? null : paymentReference.trim() }]);
    setSplitAmount(0);
    setCash(0);
    setPaymentReference("");
    setPayError(null);
  };

  const counts: Record<string, number> = {};
  products.forEach((p) => {
    counts[p.cat] = (counts[p.cat] || 0) + 1;
  });
  counts.all = products.length;

  const q = query.trim().toLowerCase();
  const filtered = products.filter(
    (p) => (cat === "all" || p.cat === cat) && (!q || p.name.toLowerCase().includes(q)),
  );
  const contextValidation = validateOrderContext();
  const contextSummary = orderContextSummary();
  const cashierInitial = cashierName.charAt(0);

  function handleOrderType(next: OrderType) {
    setOrderType(next);
    setContextError(null);
  }

  function validateOrderContext(): string | null {
    if (orderType === "dinein" && !tableNo.trim()) return "Nomor meja wajib untuk dine-in.";
    if (orderType === "takeaway" && !customerName.trim()) return "Nama pemesan wajib untuk take away.";
    if (orderType === "delivery") {
      if (!deliveryProvider) return "Provider delivery wajib dipilih.";
      if (!channelOrderName.trim()) return "Nama transaksi marketplace wajib diisi.";
    }
    return null;
  }

  function orderContextSummary(): string {
    if (orderType === "dinein") {
      return [tableNo.trim() ? `Meja ${tableNo.trim()}` : "Nomor meja belum diisi", customerName.trim() ? `a.n. ${customerName.trim()}` : null]
        .filter(Boolean)
        .join(" · ");
    }
    if (orderType === "takeaway") return customerName.trim() ? `Takeaway · a.n. ${customerName.trim()}` : "Nama pemesan belum diisi";
    return `${DELIVERY_LABEL[deliveryProvider]} · ${channelOrderName.trim() || "Nama transaksi belum diisi"}`;
  }

  function receiptContextSummary(r: Receipt | null): string {
    if (!r) return contextSummary;
    if (r.orderType === "dinein") {
      return [r.tableNo ? `Meja ${r.tableNo}` : "Dine-in", r.customerName ? `a.n. ${r.customerName}` : null]
        .filter(Boolean)
        .join(" · ");
    }
    if (r.orderType === "takeaway") return r.customerName ? `Takeaway · a.n. ${r.customerName}` : "Takeaway";
    const provider = r.deliveryProvider ? DELIVERY_LABEL[r.deliveryProvider] : "Delivery";
    return [provider, r.channelOrderName].filter(Boolean).join(" · ");
  }

  return (
    <div className="wd-kasir-shell" style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#FFF9F2" }}>
      {/* ===== HEADER ===== */}
      <div
        className="wd-role-topbar wd-kasir-topbar"
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
              {outletName}
            </div>
          </div>
        </div>

        <div className="wd-topbar-search" style={{ position: "relative", flex: 1, maxWidth: 460, marginLeft: 6 }}>
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
          className="wd-mobile-hide"
          aria-label={`Kasir aktif: ${cashierName}`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            fontWeight: 800,
            padding: "8px 13px",
            borderRadius: 9,
            background: "#FFF1F2",
            color: "#A91F34",
            maxWidth: 220,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              background: "#FFD84D",
              color: "#2D2022",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 10,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            {cashierInitial}
          </span>
          <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Kasir aktif · {cashierName}
          </span>
        </span>
        <span
          className="wd-mobile-hide"
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
          Shift · {shiftLabel}
        </span>
        <button
          onClick={() => void openCloseShift()}
          disabled={closing}
          style={{
            height: 36,
            border: "1.5px solid rgba(45,32,34,0.14)",
            borderRadius: 9,
            background: "#fff",
            color: "#2D2022",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 800,
            padding: "0 13px",
            cursor: closing ? "wait" : "pointer",
          }}
        >
          Tutup Shift
        </button>
        <span
          className="wd-mobile-hide"
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
        <div className="wd-mobile-hide" style={{ width: 1, height: 28, background: "rgba(45,32,34,0.1)" }} />
        <div
          className="wd-topbar-user"
          style={{ position: "relative", display: "flex", alignItems: "center", gap: 10 }}
        >
          <button
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              display: "flex",
              alignItems: "center",
              gap: 10,
              cursor: "pointer",
              fontFamily: "inherit",
              color: "#2D2022",
            }}
          >
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
                flexShrink: 0,
              }}
            >
              {cashierInitial}
            </div>
            <div style={{ lineHeight: 1.15, textAlign: "left" }}>
              <div style={{ fontSize: 12.5, fontWeight: 700 }}>{cashierName}</div>
              <div style={{ fontSize: 10.5, color: "rgba(45,32,34,0.5)" }}>Kasir · Terminal 01</div>
            </div>
            <ChevronDown
              size={15}
              strokeWidth={2.3}
              style={{
                color: "rgba(45,32,34,0.45)",
                transform: profileOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform .15s ease",
              }}
            />
          </button>

          {profileOpen ? (
            <div
              role="menu"
              className="wd-fade"
              style={{
                position: "absolute",
                top: "calc(100% + 10px)",
                right: 0,
                width: 230,
                zIndex: 80,
                border: "1px solid rgba(45,32,34,0.1)",
                borderRadius: 14,
                background: "#fff",
                boxShadow: "0 22px 50px -24px rgba(45,32,34,0.45)",
                padding: 10,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 8px 10px",
                  borderBottom: "1px solid rgba(45,32,34,0.08)",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: "50%",
                    background: "#FFD84D",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    color: "#2D2022",
                  }}
                >
                  {cashierInitial}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#2D2022" }}>{cashierName}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(45,32,34,0.48)", marginTop: 2 }}>
                    Kasir · Terminal 01
                  </div>
                </div>
              </div>
              <LogoutButton
                variant="full"
                style={{
                  width: "100%",
                  height: 40,
                  border: "none",
                  borderRadius: 10,
                  background: "#FBE7E7",
                  color: "#B83636",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div className="wd-kasir-body" style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Category rail */}
        <div
          className="wd-scroll wd-kasir-category"
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
            {cats.map(([key, label]) => {
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
        <div className="wd-kasir-catalog" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <div
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 12,
              padding: "16px 22px 12px",
            }}
          >
            <div style={{ fontSize: 17, fontWeight: 800 }}>{catTitle(cat)}</div>
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
                className="wd-kasir-products"
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
          className="wd-kasir-order"
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
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                {heldOrders.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => setModal("held")}
                    style={{ border: "none", borderRadius: 999, background: "#FFF1F2", color: "#A91F34", padding: "4px 9px", fontFamily: "inherit", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
                  >
                    Buka Order Tersimpan ({heldOrders.length})
                  </button>
                ) : null}
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
                    onClick={() => handleOrderType(key)}
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
            <div
              style={{
                marginTop: 11,
                border: "1.5px solid rgba(45,32,34,0.1)",
                borderRadius: 12,
                background: "#FFF9F2",
                padding: 10,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 9 }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(45,32,34,0.42)" }}>
                  Konteks pesanan
                </span>
                <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 12, fontWeight: 800, color: contextValidation ? "#B83636" : "#238152" }}>
                  {contextSummary}
                </span>
              </div>

              {orderType === "dinein" ? (
                <div style={{ display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 8 }}>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(45,32,34,0.55)", marginBottom: 5 }}>Nomor meja *</span>
                    <input
                      value={tableNo}
                      onChange={(e) => { setTableNo(e.target.value); setContextError(null); }}
                      placeholder="A-12"
                      style={{ width: "100%", height: 38, border: "1.5px solid rgba(45,32,34,0.14)", borderRadius: 9, padding: "0 10px", background: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}
                    />
                  </label>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(45,32,34,0.55)", marginBottom: 5 }}>Nama pemesan</span>
                    <input
                      value={customerName}
                      onChange={(e) => { setCustomerName(e.target.value); setContextError(null); }}
                      placeholder="opsional"
                      style={{ width: "100%", height: 38, border: "1.5px solid rgba(45,32,34,0.14)", borderRadius: 9, padding: "0 10px", background: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}
                    />
                  </label>
                </div>
              ) : null}

              {orderType === "takeaway" ? (
                <label style={{ display: "block" }}>
                  <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(45,32,34,0.55)", marginBottom: 5 }}>Nama pemesan *</span>
                  <input
                    value={customerName}
                    onChange={(e) => { setCustomerName(e.target.value); setContextError(null); }}
                    placeholder="Nama untuk dipanggil"
                    style={{ width: "100%", height: 38, border: "1.5px solid rgba(45,32,34,0.14)", borderRadius: 9, padding: "0 10px", background: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}
                  />
                </label>
              ) : null}

              {orderType === "delivery" ? (
                <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", gap: 8 }}>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(45,32,34,0.55)", marginBottom: 5 }}>Provider *</span>
                    <select
                      value={deliveryProvider}
                      onChange={(e) => { setDeliveryProvider(e.target.value as DeliveryProvider); setContextError(null); }}
                      style={{ width: "100%", height: 38, border: "1.5px solid rgba(45,32,34,0.14)", borderRadius: 9, padding: "0 10px", background: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}
                    >
                      {DELIVERY_PROVIDERS.map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "block" }}>
                    <span style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(45,32,34,0.55)", marginBottom: 5 }}>Nama transaksi *</span>
                    <input
                      value={channelOrderName}
                      onChange={(e) => { setChannelOrderName(e.target.value); setContextError(null); }}
                      placeholder="GF-231 / nama customer"
                      style={{ width: "100%", height: 38, border: "1.5px solid rgba(45,32,34,0.14)", borderRadius: 9, padding: "0 10px", background: "#fff", outline: "none", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700 }}
                    />
                  </label>
                </div>
              ) : null}

              {contextError ? (
                <div role="alert" style={{ marginTop: 8, borderRadius: 8, background: "#FBE7E7", color: "#B83636", padding: "7px 9px", fontSize: 12, fontWeight: 700 }}>
                  {contextError}
                </div>
              ) : null}
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
                  if (!p) return null;
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
            {activePromo ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  color: "#2E9D64",
                  marginBottom: 7,
                }}
              >
                <span>Promo · {activePromo.name}</span>
                <span style={{ fontFamily: MONO, fontWeight: 700 }}>-{fmt(discount)}</span>
              </div>
            ) : null}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 13,
                color: "rgba(45,32,34,0.6)",
              }}
            >
              <span>PPN {taxPercent}%</span>
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
            {activeHeldOrderId ? (
              <div style={{ marginTop: 10, fontSize: 12, fontWeight: 800, color: "#A91F34" }}>
                Mengedit order tersimpan · {heldOrders.find((o) => o.orderId === activeHeldOrderId)?.orderNo ?? activeHeldOrderId}
              </div>
            ) : null}
            {heldError ? (
              <div role="alert" style={{ marginTop: 10, borderRadius: 8, background: "#FBE7E7", color: "#B83636", padding: "8px 10px", fontSize: 12, fontWeight: 700 }}>
                {heldError}
              </div>
            ) : null}
            <div style={{ display: "flex", gap: 9, marginTop: 15 }}>
              <button
                onClick={() => setModal("promo")}
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
                Promosi
              </button>
              <button
                onClick={() => void saveCurrentOrder()}
                disabled={savingHeld || cartCount === 0}
                style={{
                  flex: "0 0 auto",
                  height: 54,
                  padding: "0 14px",
                  borderRadius: 10,
                  border: "1.5px solid rgba(45,32,34,0.15)",
                  background: "#fff",
                  fontFamily: "inherit",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "#2D2022",
                  cursor: savingHeld || cartCount === 0 ? "not-allowed" : "pointer",
                  opacity: savingHeld || cartCount === 0 ? 0.55 : 1,
                  transition: "all .15s",
                }}
              >
                {savingHeld ? "Menyimpan…" : "Simpan Order"}
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

      {modal === "promo" ? (
        <div onClick={closeModal} className="wd-fade" style={{ position: "fixed", inset: 0, background: "rgba(45,32,34,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} className="wd-slideup" style={{ width: 420, background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 40px 80px -30px rgba(127,22,40,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(45,32,34,0.08)" }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Promosi</div>
              <button onClick={closeModal} style={{ border: "none", background: "#FFF9F2", width: 34, height: 34, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(45,32,34,0.6)" }}><X size={18} strokeWidth={2.2} /></button>
            </div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              <button type="button" onClick={() => { setPromoId(null); setModal(null); }} style={{ textAlign: "left", border: "1.5px solid rgba(45,32,34,0.12)", borderRadius: 12, background: promoId === null ? "#FFF9F2" : "#fff", padding: "12px 14px", fontFamily: "inherit", cursor: "pointer" }}>
                <div style={{ fontSize: 14, fontWeight: 800 }}>Tanpa promo</div>
                <div style={{ fontSize: 12, color: "rgba(45,32,34,0.52)", marginTop: 2 }}>Harga normal tanpa diskon.</div>
              </button>
              {promos.length === 0 ? (
                <div style={{ textAlign: "center", padding: "18px 10px", fontSize: 13, fontWeight: 700, color: "rgba(45,32,34,0.45)" }}>Belum ada promo aktif.</div>
              ) : promos.map((promo) => {
                const amount = Math.min(subtotal, promo.type === "percent" ? Math.round((subtotal * promo.value) / 100) : promo.value);
                return (
                  <button key={promo.id} type="button" onClick={() => { setPromoId(promo.id); setModal(null); }} style={{ textAlign: "left", border: "1.5px solid " + (promoId === promo.id ? "rgba(169,31,52,0.45)" : "rgba(45,32,34,0.12)"), borderRadius: 12, background: promoId === promo.id ? "#FFF1F2" : "#fff", padding: "12px 14px", fontFamily: "inherit", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span style={{ fontSize: 14, fontWeight: 800 }}>{promo.name}</span>
                      <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: "#2E9D64" }}>-{fmt(amount)}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(45,32,34,0.52)", marginTop: 2 }}>{promo.type === "percent" ? `${promo.value}%` : fmt(promo.value)} · dihitung ulang server saat bayar</div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {modal === "held" ? (
        <div onClick={closeModal} className="wd-fade" style={{ position: "fixed", inset: 0, background: "rgba(45,32,34,0.5)", backdropFilter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}>
          <div onClick={(e) => e.stopPropagation()} className="wd-slideup" style={{ width: 480, maxHeight: "80vh", background: "#fff", borderRadius: 18, overflow: "hidden", boxShadow: "0 40px 80px -30px rgba(127,22,40,0.5)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid rgba(45,32,34,0.08)" }}>
              <div style={{ fontSize: 17, fontWeight: 800 }}>Order Tersimpan</div>
              <button onClick={closeModal} style={{ border: "none", background: "#FFF9F2", width: 34, height: 34, borderRadius: 9, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(45,32,34,0.6)" }}><X size={18} strokeWidth={2.2} /></button>
            </div>
            <div className="wd-scroll" style={{ padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {heldOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 10px", fontSize: 13, fontWeight: 700, color: "rgba(45,32,34,0.45)" }}>Belum ada order tersimpan.</div>
              ) : heldOrders.map((order) => (
                <button key={order.orderId} type="button" onClick={() => resumeHeldOrder(order)} style={{ textAlign: "left", border: "1.5px solid rgba(45,32,34,0.12)", borderRadius: 12, background: activeHeldOrderId === order.orderId ? "#FFF1F2" : "#fff", padding: "12px 14px", fontFamily: "inherit", cursor: "pointer" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800 }}>{order.orderNo}</span>
                    <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color: "#A91F34" }}>{fmt(order.total)}</span>
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "#2D2022", marginTop: 5 }}>{order.orderType === "dinein" ? `Meja ${order.tableNo ?? "-"}` : order.orderType === "takeaway" ? `Takeaway · ${order.customerName ?? "-"}` : `${order.deliveryProvider ?? "delivery"} · ${order.channelOrderName ?? "-"}`}</div>
                  <div style={{ fontSize: 12, color: "rgba(45,32,34,0.52)", marginTop: 2 }}>{order.lines.reduce((n, line) => n + line.quantity, 0)} item{order.promoName ? ` · Promo ${order.promoName}` : ""}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {modal === "done"
        ? (() => {
            const change = lastChange;
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
                    Transaksi {receipt?.orderNo ?? ""} tercatat.
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
                        gap: 12,
                        fontSize: 13,
                        color: "rgba(45,32,34,0.6)",
                        marginBottom: 7,
                      }}
                    >
                      <span>Konteks</span>
                      <span style={{ fontWeight: 800, color: "#2D2022", textAlign: "right" }}>
                        {receiptContextSummary(receipt)}
                      </span>
                    </div>
                    {receipt?.discountAmount ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 13,
                          color: "#2E9D64",
                          marginBottom: 7,
                        }}
                      >
                        <span>Promo · {receipt.promoName ?? "Diskon"}</span>
                        <span style={{ fontFamily: MONO, fontWeight: 700 }}>-{fmt(receipt.discountAmount)}</span>
                      </div>
                    ) : null}
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
                    {receipt?.payments.map((line, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          fontSize: 13,
                          color: "rgba(45,32,34,0.6)",
                          marginBottom: 7,
                        }}
                      >
                        <span>{line.channelLabel ?? line.provider ?? line.method}{line.referenceNo ? ` · ${line.referenceNo}` : ""}</span>
                        <span style={{ fontFamily: MONO }}>{fmt(line.cashReceived ?? line.amount)}</span>
                      </div>
                    ))}
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
              ["card", "Non Tunai > Kartu"],
              ["transfer", "Transfer Rekening"],
              ["ewallet", "E-Wallet"],
            ];
            const methodIcon: Record<PayMethod, typeof Banknote> = {
              tunai: Banknote,
              qris: QrCode,
              card: CreditCard,
              transfer: Banknote,
              ewallet: Wallet,
            };
            const isCash = payMethod === "tunai";
            const targetAmount = splitLines.length > 0 ? splitAmount || Math.max(0, splitRemaining) : total;
            const change = cash - targetAmount;
            // Block the button mid-charge too, so a double-click can't fire a
            // second checkout (the idempotency key backstops it regardless).
            const canPay = (splitLines.length > 0 ? splitRemaining === 0 : (!isCash || cash >= total) && (isCash || !!paymentReference.trim() || payMethod === "qris" || payMethod === "ewallet")) && !paying;
            const quick: [string, number][] = [
              ["Uang Pas", targetAmount],
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
                      flexShrink: 0,
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
                          {cartCount} item · sudah termasuk PPN{activePromo ? ` · diskon ${fmt(discount)}` : ""}
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
                        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
                          {payMethod === "card" || payMethod === "transfer" ? (
                            <select
                              value={paymentProvider}
                              onChange={(e) => setPaymentProvider(e.target.value)}
                              style={{ height: 42, border: "1.5px solid rgba(45,32,34,0.14)", borderRadius: 10, padding: "0 11px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, background: "#fff" }}
                            >
                              {(payMethod === "card" ? CARD_PROVIDERS : TRANSFER_ACCOUNTS).map(([id, label]) => (
                                <option key={id} value={id}>{label}</option>
                              ))}
                            </select>
                          ) : null}
                          <input
                            value={paymentReference}
                            onChange={(e) => setPaymentReference(e.target.value)}
                            placeholder="Reference / approval code"
                            style={{ height: 42, border: "1.5px solid rgba(45,32,34,0.14)", borderRadius: 10, padding: "0 11px", fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, background: "#fff" }}
                          />
                        </div>
                      ) : null}

                      <div style={{ marginTop: 16, border: "1px dashed rgba(45,32,34,0.18)", borderRadius: 12, padding: 12, background: "#FFF9F2" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(45,32,34,0.55)" }}>Pisah Bayar</div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: splitRemaining === 0 ? "#238152" : "#A91F34", marginTop: 2 }}>
                              Dibayar {fmt(splitPaid)} · Sisa {fmt(Math.max(0, splitRemaining))}
                            </div>
                          </div>
                          <input
                            value={splitAmount === 0 ? "" : String(splitAmount)}
                            onChange={(e) => setSplitAmount(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                            placeholder="Nominal"
                            inputMode="numeric"
                            style={{ width: 105, height: 36, border: "1.5px solid rgba(45,32,34,0.14)", borderRadius: 9, padding: "0 9px", fontFamily: MONO, fontSize: 12.5, background: "#fff" }}
                          />
                          <button type="button" onClick={addSplitLine} style={{ height: 36, border: "none", borderRadius: 9, background: "#A91F34", color: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 800, padding: "0 10px", cursor: "pointer" }}>Tambah</button>
                        </div>
                        {splitLines.length > 0 ? (
                          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 5 }}>
                            {splitLines.map((line, idx) => (
                              <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: 700, color: "rgba(45,32,34,0.7)" }}>
                                <span>{idx + 1}. {line.channelLabel ?? line.method}{line.referenceNo ? ` · ${line.referenceNo}` : ""}</span>
                                <span style={{ fontFamily: MONO }}>{fmt(line.amount)}</span>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                      {payError ? (
                        <div
                          role="alert"
                          style={{
                            marginTop: 16,
                            background: "#FBE7E7",
                            color: "#B83636",
                            borderRadius: 9,
                            padding: "10px 13px",
                            fontSize: 12.5,
                            fontWeight: 600,
                          }}
                        >
                          {payError}
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
                        {paying ? "Memproses…" : "Konfirmasi Bayar"}
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
      {modal === "close"
        ? (() => {
            const expected = expectedCash?.expectedCash ?? 0;
            const difference = actualCash - expected;
            const needsNote = difference !== 0;
            const canClose = Boolean(expectedCash) && !closing && (!needsNote || closingNote.trim().length > 0);
            const rows: [string, number, "plus" | "minus" | "base"][] = expectedCash
              ? [
                  ["Kas awal", expectedCash.openingCash, "base"],
                  ["Pembayaran tunai", expectedCash.cashPayments, "plus"],
                  ["Kas masuk", expectedCash.cashIn, "plus"],
                  ["Adjustment", expectedCash.adjustments, "plus"],
                  ["Kas keluar", expectedCash.cashOut, "minus"],
                  ["Expense", expectedCash.expenses, "minus"],
                  ["Refund tunai", expectedCash.cashRefunds, "minus"],
                ]
              : [];

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
                  padding: 16,
                  zIndex: 120,
                  overflowY: "auto",
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="wd-slideup"
                  style={{
                    width: "min(560px, calc(100vw - 32px))",
                    maxHeight: "calc(100dvh - 32px)",
                    background: "#fff",
                    borderRadius: 18,
                    overflow: "hidden",
                    boxShadow: "0 40px 80px -30px rgba(127,22,40,0.5)",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "18px 22px",
                      borderBottom: "1px solid rgba(45,32,34,0.08)",
                      flexShrink: 0,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800 }}>Tutup Shift</div>
                      <div style={{ fontSize: 12.5, color: "rgba(45,32,34,0.55)", marginTop: 2 }}>
                        Rekonsiliasi kas terminal 01
                      </div>
                    </div>
                    <button
                      onClick={closeModal}
                      disabled={closing}
                      style={{
                        border: "none",
                        background: "#FFF9F2",
                        width: 34,
                        height: 34,
                        borderRadius: 9,
                        cursor: closing ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "rgba(45,32,34,0.6)",
                      }}
                    >
                      <X size={18} strokeWidth={2.2} />
                    </button>
                  </div>
                  <div
                    className="wd-scroll"
                    style={{
                      padding: "20px 22px 22px",
                      overflowY: "auto",
                      overscrollBehavior: "contain",
                    }}
                  >
                    <div
                      style={{
                        background: "#2D2022",
                        color: "#fff",
                        borderRadius: 13,
                        padding: "16px 18px",
                        marginBottom: 16,
                      }}
                    >
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.62)", fontWeight: 700 }}>
                        Expected Cash
                      </div>
                      <div style={{ fontFamily: MONO, fontSize: 30, fontWeight: 700, marginTop: 2 }}>
                        {expectedCash ? fmt(expected) : "Menghitung..."}
                      </div>
                    </div>

                    {rows.length > 0 ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                          marginBottom: 16,
                        }}
                      >
                        {rows.map(([label, amount, tone]) => (
                          <div
                            key={label}
                            style={{
                              border: "1px solid rgba(45,32,34,0.08)",
                              borderRadius: 9,
                              padding: "10px 12px",
                              background: "#FFF9F2",
                            }}
                          >
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(45,32,34,0.48)" }}>
                              {label}
                            </div>
                            <div
                              style={{
                                fontFamily: MONO,
                                fontSize: 14,
                                fontWeight: 800,
                                marginTop: 3,
                                color: tone === "minus" ? "#B83636" : tone === "plus" ? "#238152" : "#2D2022",
                              }}
                            >
                              {tone === "minus" && amount > 0 ? "-" : ""}
                              {fmt(amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    <div
                      style={{
                        border: "1px solid rgba(45,32,34,0.08)",
                        borderRadius: 12,
                        padding: 12,
                        marginBottom: 16,
                        background: "#fff",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "rgba(45,32,34,0.55)", marginBottom: 10 }}>
                        Mutasi Kas
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 9 }}>
                        <select
                          value={cashMoveType}
                          onChange={(e) => setCashMoveType(e.target.value as CashMovementType)}
                          style={{
                            height: 40,
                            border: "1.5px solid rgba(45,32,34,0.12)",
                            borderRadius: 9,
                            padding: "0 10px",
                            fontFamily: "inherit",
                            fontSize: 13,
                            fontWeight: 700,
                            background: "#FFF9F2",
                            color: "#2D2022",
                          }}
                        >
                          <option value="cash_in">Kas Masuk</option>
                          <option value="cash_out">Kas Keluar</option>
                          <option value="expense">Expense</option>
                          <option value="adjustment">Adjustment</option>
                        </select>
                        <input
                          value={cashMoveAmount === 0 ? "" : String(cashMoveAmount)}
                          onChange={(e) => setCashMoveAmount(Number(e.target.value.replace(/\D/g, "")) || 0)}
                          inputMode="numeric"
                          placeholder="Nominal"
                          style={{
                            height: 40,
                            border: "1.5px solid rgba(45,32,34,0.12)",
                            borderRadius: 9,
                            padding: "0 10px",
                            fontFamily: MONO,
                            fontSize: 14,
                            fontWeight: 800,
                            outline: "none",
                          }}
                        />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 9, marginTop: 9 }}>
                        <input
                          value={cashMoveNote}
                          onChange={(e) => setCashMoveNote(e.target.value)}
                          placeholder="Catatan mutasi"
                          style={{
                            height: 40,
                            border: "1.5px solid rgba(45,32,34,0.12)",
                            borderRadius: 9,
                            padding: "0 10px",
                            fontFamily: "inherit",
                            fontSize: 13,
                            outline: "none",
                          }}
                        />
                        <button
                          onClick={() => void saveCashMovement()}
                          disabled={cashMoveBusy || cashMoveAmount <= 0}
                          style={{
                            height: 40,
                            border: "none",
                            borderRadius: 9,
                            padding: "0 13px",
                            background: cashMoveBusy || cashMoveAmount <= 0 ? "rgba(45,32,34,0.12)" : "#2D2022",
                            color: cashMoveBusy || cashMoveAmount <= 0 ? "rgba(45,32,34,0.4)" : "#fff",
                            fontFamily: "inherit",
                            fontSize: 12.5,
                            fontWeight: 800,
                            cursor: cashMoveBusy || cashMoveAmount <= 0 ? "not-allowed" : "pointer",
                          }}
                        >
                          {cashMoveBusy ? "Simpan..." : "Simpan"}
                        </button>
                      </div>
                    </div>

                    <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "rgba(45,32,34,0.55)" }}>
                      Kas Aktual
                    </label>
                    <input
                      value={actualCash === 0 ? "" : String(actualCash)}
                      onChange={(e) => setActualCash(Number(e.target.value.replace(/\D/g, "")) || 0)}
                      inputMode="numeric"
                      placeholder="Masukkan kas aktual"
                      style={{
                        width: "100%",
                        height: 46,
                        marginTop: 7,
                        border: "1.5px solid rgba(45,32,34,0.12)",
                        borderRadius: 10,
                        padding: "0 13px",
                        fontFamily: MONO,
                        fontSize: 18,
                        fontWeight: 800,
                        outline: "none",
                        background: "#fff",
                        color: "#2D2022",
                      }}
                    />

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 13,
                        padding: "12px 14px",
                        background: needsNote ? "#FCEEDB" : "#E4F4EC",
                        borderRadius: 10,
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 800, color: needsNote ? "#A9791F" : "#238152" }}>
                        Selisih
                      </span>
                      <span style={{ fontFamily: MONO, fontSize: 18, fontWeight: 800, color: needsNote ? "#A9791F" : "#238152" }}>
                        {fmt(difference)}
                      </span>
                    </div>

                    <label
                      style={{
                        display: "block",
                        fontSize: 12,
                        fontWeight: 800,
                        color: "rgba(45,32,34,0.55)",
                        marginTop: 14,
                      }}
                    >
                      Catatan Penutupan {needsNote ? "(wajib)" : ""}
                    </label>
                    <textarea
                      value={closingNote}
                      onChange={(e) => setClosingNote(e.target.value)}
                      placeholder={needsNote ? "Jelaskan penyebab selisih kas" : "Opsional bila kas sesuai"}
                      rows={3}
                      style={{
                        width: "100%",
                        marginTop: 7,
                        border: "1.5px solid rgba(45,32,34,0.12)",
                        borderRadius: 10,
                        padding: "11px 13px",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        resize: "none",
                        color: "#2D2022",
                      }}
                    />

                    {closeError ? (
                      <div
                        role="alert"
                        style={{
                          marginTop: 13,
                          background: "#FBE7E7",
                          color: "#B83636",
                          borderRadius: 9,
                          padding: "10px 13px",
                          fontSize: 12.5,
                          fontWeight: 700,
                        }}
                      >
                        {closeError}
                      </div>
                    ) : null}

                    <button
                      onClick={() => void confirmCloseShift()}
                      disabled={!canClose}
                      style={{
                        width: "100%",
                        height: 52,
                        marginTop: 17,
                        borderRadius: 11,
                        border: "none",
                        background: canClose ? "#A91F34" : "rgba(45,32,34,0.12)",
                        color: canClose ? "#fff" : "rgba(45,32,34,0.4)",
                        fontFamily: "inherit",
                        fontWeight: 800,
                        fontSize: 15,
                        cursor: canClose ? "pointer" : "not-allowed",
                      }}
                    >
                      {closing ? "Menutup Shift..." : "Tutup Shift"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()
        : null}
</div>
  );
}
