"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import { ic } from "./icons";
import { Badge, MiniStat, MONO } from "./shared";

export const PURCHASE_LABELS = [
  "Permintaan Barang",
  "Pemesanan Stock",
  "Pemesanan Stok",
  "Faktur Pembelian",
  "Pembayaran Faktur",
];

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(35,32,31,0.06)",
  borderRadius: 14,
  overflow: "hidden",
};

const HEAD: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "12px 20px",
  background: "#FFF9F2",
  borderBottom: "1px solid rgba(35,32,31,0.08)",
  fontSize: 11.5,
  fontWeight: 800,
  color: "#A91F34",
  textTransform: "uppercase",
  letterSpacing: "0.03em",
  alignItems: "center",
};

const ROW: React.CSSProperties = {
  display: "grid",
  gap: 10,
  padding: "14px 20px",
  fontSize: 13.5,
  borderTop: "1px solid rgba(35,32,31,0.05)",
  alignItems: "center",
};

const inpStyle: React.CSSProperties = {
  width: "100%",
  height: 40,
  border: "1px solid rgba(35,32,31,0.14)",
  borderRadius: 9,
  padding: "0 12px",
  fontFamily: "inherit",
  fontSize: 13.5,
  background: "#fff",
  outline: "none",
};

// --- Mock Data ---

interface RequisitionItem {
  id: string;
  code: string;
  date: string;
  requester: string;
  outlet: string;
  itemCount: number;
  status: "Menunggu" | "Disetujui" | "Ditolak" | "Selesai";
  notes?: string;
}

interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  outlet: string;
  totalAmount: number;
  status: "Draft" | "Terkirim" | "Diterima" | "Selesai";
}

interface PurchaseInvoiceItem {
  id: string;
  invoiceNumber: string;
  poNumber: string;
  supplier: string;
  date: string;
  dueDate: string;
  totalAmount: number;
  paidAmount: number;
  status: "Belum Lunas" | "Sebagian" | "Lunas";
}

interface InvoicePaymentItem {
  id: string;
  paymentNumber: string;
  invoiceNumber: string;
  supplier: string;
  paymentDate: string;
  method: string;
  amount: number;
  status: "Sukses" | "Pending";
}

const DEFAULT_REQUISITIONS: RequisitionItem[] = [
  { id: "req-1", code: "REQ-2026-001", date: "24 Jul 2026", requester: "Budi (Kitchen Lead)", outlet: "Outlet Utama - Jakarta", itemCount: 5, status: "Menunggu", notes: "Stok daging ayam dan kulit dimsum menipis" },
  { id: "req-2", code: "REQ-2026-002", date: "23 Jul 2026", requester: "Siti (Barista)", outlet: "Outlet Utama - Jakarta", itemCount: 3, status: "Disetujui", notes: "Sirup dan kemasan gelas takeaway" },
  { id: "req-3", code: "REQ-2026-003", date: "21 Jul 2026", requester: "Agus (Inventory)", outlet: "Cabang Bandung", itemCount: 8, status: "Selesai", notes: "Restock bulanan bahan baku" },
];

const DEFAULT_ORDERS: PurchaseOrderItem[] = [
  { id: "po-1", poNumber: "PO-2026-089", date: "24 Jul 2026", supplier: "PT Poultry Nusantara", outlet: "Outlet Utama - Jakarta", totalAmount: 4500000, status: "Terkirim" },
  { id: "po-2", poNumber: "PO-2026-088", date: "23 Jul 2026", supplier: "CV Dimsum Supplier Jaya", outlet: "Outlet Utama - Jakarta", totalAmount: 2800000, status: "Diterima" },
  { id: "po-3", poNumber: "PO-2026-087", date: "22 Jul 2026", supplier: "UD Kemasan Packindo", outlet: "Cabang Bandung", totalAmount: 1200000, status: "Selesai" },
];

const DEFAULT_INVOICES: PurchaseInvoiceItem[] = [
  { id: "inv-1", invoiceNumber: "INV-PO-0089", poNumber: "PO-2026-089", supplier: "PT Poultry Nusantara", date: "24 Jul 2026", dueDate: "07 Agt 2026", totalAmount: 4500000, paidAmount: 0, status: "Belum Lunas" },
  { id: "inv-2", invoiceNumber: "INV-PO-0088", poNumber: "PO-2026-088", supplier: "CV Dimsum Supplier Jaya", date: "23 Jul 2026", dueDate: "30 Jul 2026", totalAmount: 2800000, paidAmount: 1400000, status: "Sebagian" },
  { id: "inv-3", invoiceNumber: "INV-PO-0087", poNumber: "PO-2026-087", supplier: "UD Kemasan Packindo", date: "22 Jul 2026", dueDate: "29 Jul 2026", totalAmount: 1200000, paidAmount: 1200000, status: "Lunas" },
];

const DEFAULT_PAYMENTS: InvoicePaymentItem[] = [
  { id: "pay-1", paymentNumber: "PAY-2026-042", invoiceNumber: "INV-PO-0088", supplier: "CV Dimsum Supplier Jaya", paymentDate: "23 Jul 2026", method: "Transfer Bank BCA", amount: 1400000, status: "Sukses" },
  { id: "pay-2", paymentNumber: "PAY-2026-041", invoiceNumber: "INV-PO-0087", supplier: "UD Kemasan Packindo", paymentDate: "22 Jul 2026", method: "Transfer Bank Mandiri", amount: 1200000, status: "Sukses" },
];

export function PurchaseManager({ label }: { label: string }) {
  const isReq = label === "Permintaan Barang";
  const isOrder = label === "Pemesanan Stock" || label === "Pemesanan Stok";
  const isInvoice = label === "Faktur Pembelian";
  const isPayment = label === "Pembayaran Faktur";

  const [query, setQuery] = useState("");
  const [requisitions, setRequisitions] = useState<RequisitionItem[]>(DEFAULT_REQUISITIONS);
  const [orders, setOrders] = useState<PurchaseOrderItem[]>(DEFAULT_ORDERS);
  const [invoices, setInvoices] = useState<PurchaseInvoiceItem[]>(DEFAULT_INVOICES);
  const [payments, setPayments] = useState<InvoicePaymentItem[]>(DEFAULT_PAYMENTS);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Form states
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formSupplier, setFormSupplier] = useState("PT Poultry Nusantara");
  const [formOutlet, setFormOutlet] = useState("Outlet Utama - Jakarta");
  const [formAmount, setFormAmount] = useState("1500000");
  const [formMethod, setFormMethod] = useState("Transfer Bank BCA");
  const [formNotes, setFormNotes] = useState("");

  function openCreateModal() {
    setCreateModalOpen(true);
    if (isReq) {
      setFormCode(`REQ-2026-${String(requisitions.length + 1).padStart(3, "0")}`);
      setFormName("Stok Bahan Dapur & Minuman");
      setFormNotes("");
    } else if (isOrder) {
      setFormCode(`PO-2026-${String(orders.length + 90).padStart(3, "0")}`);
      setFormSupplier("PT Poultry Nusantara");
      setFormAmount("2500000");
    } else if (isInvoice) {
      setFormCode(`INV-PO-${String(invoices.length + 90).padStart(4, "0")}`);
      setFormSupplier("CV Dimsum Supplier Jaya");
      setFormAmount("3200000");
    } else {
      setFormCode(`PAY-2026-${String(payments.length + 43).padStart(3, "0")}`);
      setFormSupplier("PT Poultry Nusantara");
      setFormAmount("1500000");
      setFormMethod("Transfer Bank BCA");
    }
  }

  function handleSaveCreate() {
    const todayStr = new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const amt = Number(formAmount.replace(/[^0-9]/g, "")) || 0;

    if (isReq) {
      const newReq: RequisitionItem = {
        id: `req-${Date.now()}`,
        code: formCode,
        date: todayStr,
        requester: "Owner / Manager",
        outlet: formOutlet,
        itemCount: 4,
        status: "Menunggu",
        notes: formNotes || "Permintaan stok baru",
      };
      setRequisitions([newReq, ...requisitions]);
      setMsg({ type: "ok", text: `Permintaan Barang "${formCode}" berhasil dibuat!` });
    } else if (isOrder) {
      const newPo: PurchaseOrderItem = {
        id: `po-${Date.now()}`,
        poNumber: formCode,
        date: todayStr,
        supplier: formSupplier,
        outlet: formOutlet,
        totalAmount: amt,
        status: "Draft",
      };
      setOrders([newPo, ...orders]);
      setMsg({ type: "ok", text: `Pemesanan Stok "${formCode}" berhasil dibuat!` });
    } else if (isInvoice) {
      const newInv: PurchaseInvoiceItem = {
        id: `inv-${Date.now()}`,
        invoiceNumber: formCode,
        poNumber: `PO-2026-0${invoices.length + 90}`,
        supplier: formSupplier,
        date: todayStr,
        dueDate: "14 Hari",
        totalAmount: amt,
        paidAmount: 0,
        status: "Belum Lunas",
      };
      setInvoices([newInv, ...invoices]);
      setMsg({ type: "ok", text: `Faktur Pembelian "${formCode}" berhasil dibuat!` });
    } else {
      const newPay: InvoicePaymentItem = {
        id: `pay-${Date.now()}`,
        paymentNumber: formCode,
        invoiceNumber: "INV-PO-0089",
        supplier: formSupplier,
        paymentDate: todayStr,
        method: formMethod,
        amount: amt,
        status: "Sukses",
      };
      setPayments([newPay, ...payments]);
      setMsg({ type: "ok", text: `Pembayaran Faktur "${formCode}" berhasil dicatat!` });
    }

    setCreateModalOpen(false);
  }

  function handleExportExcel() {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (isReq) {
      headers = ["No Req", "Tanggal", "Pemohon", "Outlet", "Total Item", "Status", "Catatan"];
      rows = requisitions.map((r) => [r.code, r.date, r.requester, r.outlet, r.itemCount, r.status, r.notes || ""]);
    } else if (isOrder) {
      headers = ["No PO", "Tanggal", "Pemasok", "Outlet", "Total Nominal", "Status"];
      rows = orders.map((o) => [o.poNumber, o.date, o.supplier, o.outlet, o.totalAmount, o.status]);
    } else if (isInvoice) {
      headers = ["No Faktur", "No PO", "Pemasok", "Tanggal", "Jatuh Tempo", "Total Tagihan", "Terbayar", "Status"];
      rows = invoices.map((i) => [i.invoiceNumber, i.poNumber, i.supplier, i.date, i.dueDate, i.totalAmount, i.paidAmount, i.status]);
    } else {
      headers = ["No Bayar", "No Faktur", "Pemasok", "Tanggal Bayar", "Metode Bayar", "Nominal", "Status"];
      rows = payments.map((p) => [p.paymentNumber, p.invoiceNumber, p.supplier, p.paymentDate, p.method, p.amount, p.status]);
    }

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${label.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (isReq) {
      headers = ["No Req", "Tanggal", "Pemohon", "Outlet", "Items", "Status"];
      rows = requisitions.map((r) => [r.code, r.date, r.requester, r.outlet, `${r.itemCount} Items`, r.status]);
    } else if (isOrder) {
      headers = ["No PO", "Tanggal", "Pemasok", "Outlet", "Total Nominal", "Status"];
      rows = orders.map((o) => [o.poNumber, o.date, o.supplier, o.outlet, formatRupiah(o.totalAmount), o.status]);
    } else if (isInvoice) {
      headers = ["No Faktur", "No PO", "Pemasok", "Tanggal", "Total", "Terbayar", "Status"];
      rows = invoices.map((i) => [i.invoiceNumber, i.poNumber, i.supplier, i.date, formatRupiah(i.totalAmount), formatRupiah(i.paidAmount), i.status]);
    } else {
      headers = ["No Bayar", "No Faktur", "Pemasok", "Tanggal", "Metode", "Nominal", "Status"];
      rows = payments.map((p) => [p.paymentNumber, p.invoiceNumber, p.supplier, p.paymentDate, p.method, formatRupiah(p.amount), p.status]);
    }

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
          .mono { font-family: monospace; font-weight: 600; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">WANNA DIMSUM POS</div>
            <div class="subtitle">Laporan ${label} - Pembelian Stok</div>
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
                <td class="mono">${r[0]}</td>
                <td><strong>${r[1]}</strong></td>
                <td>${r[2]}</td>
                <td>${r[3]}</td>
                <td class="mono">${r[4]}</td>
                <td>${r[5]}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  const reqTmpl = "1.6fr 1.2fr 2fr 1.8fr 1fr 1.1fr 0.6fr";
  const orderTmpl = "1.5fr 1.2fr 2.2fr 1.8fr 1.4fr 1.1fr 0.6fr";
  const invoiceTmpl = "1.5fr 1.4fr 2.2fr 1.2fr 1.2fr 1.4fr 1.1fr 0.6fr";
  const payTmpl = "1.5fr 1.4fr 2.2fr 1.2fr 1.6fr 1.4fr 1.1fr 0.6fr";

  return (
    <div className="wd-owner-purchase-manager">
      {/* Head */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.45)", marginBottom: 7 }}>
            <span>Pembelian Stok</span>
            <span style={{ color: "rgba(35,32,31,0.25)" }}>/</span>
            <span style={{ color: "#A91F34" }}>{label}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{label}</div>
          <div style={{ fontSize: 13.5, color: "rgba(35,32,31,0.55)", marginTop: 3 }}>
            {isReq
              ? "Kelola pengajuan permintaan barang dari cabang/dapur untuk persetujuan stok."
              : isOrder
              ? "Kelola pemesanan stok (PO / Purchase Order) ke supplier & pemasok terdaftar."
              : isInvoice
              ? "Kelola tagihan faktur pembelian barang dari supplier & jatuh tempo pembayaran."
              : "Kelola riwayat pencatatan dan realisasi pembayaran faktur pembelian."}
          </div>
        </div>
        <div>
          <button
            onClick={openCreateModal}
            style={{
              height: 42, padding: "0 18px", borderRadius: 10, border: "none",
              background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700,
              fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            {ic("plus", 15, "#fff", 2.4)}
            {isReq ? "Buat Permintaan Barang" : isOrder ? "Buat Pemesanan (PO)" : isInvoice ? "Buat Faktur Pembelian" : "Catat Pembayaran Faktur"}
          </button>
        </div>
      </div>

      {msg ? (
        <div
          style={{
            background: msg.type === "ok" ? "#E4F4EC" : "#FBE7E7",
            color: msg.type === "ok" ? "#238152" : "#B83636",
            borderRadius: 10,
            padding: "12px 16px",
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800, color: "inherit" }}>
            ✕
          </button>
        </div>
      ) : null}

      {/* KPI Cards */}
      <div className="wd-owner-kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 16 }}>
        {isReq ? (
          <>
            <MiniStat label="Total Permintaan" value={String(requisitions.length)} sub="Semua pengajuan" tone="info" />
            <MiniStat label="Menunggu Approve" value={String(requisitions.filter((r) => r.status === "Menunggu").length)} sub="Perlu persetujuan" tone="warn" />
            <MiniStat label="Disetujui / Selesai" value={String(requisitions.filter((r) => r.status === "Disetujui" || r.status === "Selesai").length)} sub="Proses dipesan" tone="ok" />
          </>
        ) : isOrder ? (
          <>
            <MiniStat label="Total PO" value={String(orders.length)} sub="Pemesanan stok" tone="info" />
            <MiniStat label="PO Terkirim" value={String(orders.filter((o) => o.status === "Terkirim").length)} sub="Menunggu kedatangan" tone="warn" />
            <MiniStat label="Total Nominal" value={formatRupiah(orders.reduce((acc, o) => acc + o.totalAmount, 0))} sub="Nilai PO" tone="ok" />
          </>
        ) : isInvoice ? (
          <>
            <MiniStat label="Total Faktur" value={String(invoices.length)} sub="Faktur pembelian" tone="info" />
            <MiniStat label="Belum Lunas" value={String(invoices.filter((i) => i.status !== "Lunas").length)} sub="Tagihan berjalan" tone="warn" />
            <MiniStat label="Total Tagihan" value={formatRupiah(invoices.reduce((acc, i) => acc + i.totalAmount, 0))} sub="Nilai faktur" tone="ok" />
          </>
        ) : (
          <>
            <MiniStat label="Total Realisasi Pembayaran" value={String(payments.length)} sub="Transaksi keluar" tone="info" />
            <MiniStat label="Metode Terbanyak" value="Transfer Bank" sub="BCA & Mandiri" tone="ok" />
            <MiniStat label="Total Nominal Bayar" value={formatRupiah(payments.reduce((acc, p) => acc + p.amount, 0))} sub="Kas terbayar" tone="ok" />
          </>
        )}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: "rgba(35,32,31,0.4)" }}>
            {ic("search", 16, "currentColor", 2)}
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cari ${label.toLowerCase()}...`}
            style={inpStyle}
          />
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleExportExcel}
          style={{
            height: 40, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(35,32,31,0.12)",
            background: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
            color: "rgba(35,32,31,0.65)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
          }}
        >
          {ic("download", 14, "currentColor", 2)}
          Export Excel
        </button>
        <button
          onClick={handleExportPdf}
          style={{
            height: 40, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(35,32,31,0.12)",
            background: "#fff", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600,
            color: "rgba(35,32,31,0.65)", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
          }}
        >
          {ic("download", 14, "currentColor", 2)}
          Export PDF
        </button>
      </div>

      {/* Main Table */}
      <div className="wd-responsive-table" style={CARD}>
        <div style={{ overflowX: "auto" }} className="wd-scroll">
          <div style={{ minWidth: 780 }}>
            {isReq ? (
              <>
                <div style={{ ...HEAD, gridTemplateColumns: reqTmpl }}>
                  <div>No. Req</div>
                  <div>Tanggal</div>
                  <div>Pemohon</div>
                  <div>Outlet</div>
                  <div>Jumlah Item</div>
                  <div>Status</div>
                  <div style={{ textAlign: "right" }}>Aksi</div>
                </div>
                {requisitions
                  .filter((r) => !query || r.code.toLowerCase().includes(query.toLowerCase()) || r.requester.toLowerCase().includes(query.toLowerCase()))
                  .map((r) => (
                    <div key={r.id} style={{ ...ROW, gridTemplateColumns: reqTmpl }}>
                      <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}>{r.code}</div>
                      <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)" }}>{r.date}</div>
                      <div style={{ fontWeight: 700 }}>{r.requester}</div>
                      <div style={{ fontSize: 12.5 }}>{r.outlet}</div>
                      <div style={{ fontFamily: MONO, fontWeight: 600 }}>{r.itemCount} Item</div>
                      <div>
                        <Badge
                          text={r.status}
                          tone={r.status === "Selesai" || r.status === "Disetujui" ? "ok" : r.status === "Menunggu" ? "warn" : "out"}
                        />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <button style={{ border: "1px solid rgba(35,32,31,0.14)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Detail
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            ) : isOrder ? (
              <>
                <div style={{ ...HEAD, gridTemplateColumns: orderTmpl }}>
                  <div>No. PO</div>
                  <div>Tanggal PO</div>
                  <div>Pemasok / Supplier</div>
                  <div>Outlet</div>
                  <div style={{ textAlign: "right" }}>Total Nominal</div>
                  <div>Status</div>
                  <div style={{ textAlign: "right" }}>Aksi</div>
                </div>
                {orders
                  .filter((o) => !query || o.poNumber.toLowerCase().includes(query.toLowerCase()) || o.supplier.toLowerCase().includes(query.toLowerCase()))
                  .map((o) => (
                    <div key={o.id} style={{ ...ROW, gridTemplateColumns: orderTmpl }}>
                      <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}>{o.poNumber}</div>
                      <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)" }}>{o.date}</div>
                      <div style={{ fontWeight: 700 }}>{o.supplier}</div>
                      <div style={{ fontSize: 12.5 }}>{o.outlet}</div>
                      <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}>{formatRupiah(o.totalAmount)}</div>
                      <div>
                        <Badge text={o.status} tone={o.status === "Diterima" || o.status === "Selesai" ? "ok" : o.status === "Terkirim" ? "warn" : "neutral"} />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <button style={{ border: "1px solid rgba(35,32,31,0.14)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Detail
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            ) : isInvoice ? (
              <>
                <div style={{ ...HEAD, gridTemplateColumns: invoiceTmpl }}>
                  <div>No. Faktur</div>
                  <div>No. PO</div>
                  <div>Pemasok / Supplier</div>
                  <div>Tanggal</div>
                  <div>Jatuh Tempo</div>
                  <div style={{ textAlign: "right" }}>Total Tagihan</div>
                  <div>Status</div>
                  <div style={{ textAlign: "right" }}>Aksi</div>
                </div>
                {invoices
                  .filter((inv) => !query || inv.invoiceNumber.toLowerCase().includes(query.toLowerCase()) || inv.supplier.toLowerCase().includes(query.toLowerCase()))
                  .map((inv) => (
                    <div key={inv.id} style={{ ...ROW, gridTemplateColumns: invoiceTmpl }}>
                      <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}>{inv.invoiceNumber}</div>
                      <div style={{ fontFamily: MONO, fontSize: 12, color: "rgba(35,32,31,0.5)" }}>{inv.poNumber}</div>
                      <div style={{ fontWeight: 700 }}>{inv.supplier}</div>
                      <div style={{ fontSize: 12.5 }}>{inv.date}</div>
                      <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)" }}>{inv.dueDate}</div>
                      <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}>{formatRupiah(inv.totalAmount)}</div>
                      <div>
                        <Badge text={inv.status} tone={inv.status === "Lunas" ? "ok" : inv.status === "Sebagian" ? "warn" : "out"} />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <button style={{ border: "1px solid rgba(35,32,31,0.14)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Bayar
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            ) : (
              <>
                <div style={{ ...HEAD, gridTemplateColumns: payTmpl }}>
                  <div>No. Bayar</div>
                  <div>No. Faktur</div>
                  <div>Pemasok / Supplier</div>
                  <div>Tanggal Bayar</div>
                  <div>Metode Pembayaran</div>
                  <div style={{ textAlign: "right" }}>Nominal Bayar</div>
                  <div>Status</div>
                  <div style={{ textAlign: "right" }}>Aksi</div>
                </div>
                {payments
                  .filter((p) => !query || p.paymentNumber.toLowerCase().includes(query.toLowerCase()) || p.supplier.toLowerCase().includes(query.toLowerCase()))
                  .map((p) => (
                    <div key={p.id} style={{ ...ROW, gridTemplateColumns: payTmpl }}>
                      <div style={{ fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}>{p.paymentNumber}</div>
                      <div style={{ fontFamily: MONO, fontSize: 12, color: "rgba(35,32,31,0.5)" }}>{p.invoiceNumber}</div>
                      <div style={{ fontWeight: 700 }}>{p.supplier}</div>
                      <div style={{ fontSize: 12.5 }}>{p.paymentDate}</div>
                      <div style={{ fontSize: 12.5 }}>{p.method}</div>
                      <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#238152" }}>{formatRupiah(p.amount)}</div>
                      <div>
                        <Badge text={p.status} tone="ok" />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <button style={{ border: "1px solid rgba(35,32,31,0.14)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Bukti
                        </button>
                      </div>
                    </div>
                  ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Create Item */}
      {createModalOpen ? (
        <div
          onClick={() => setCreateModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup"
            style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)" }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
              {isReq ? "Buat Permintaan Barang Baru" : isOrder ? "Buat Pemesanan Stok (PO)" : isInvoice ? "Buat Faktur Pembelian Baru" : "Catat Pembayaran Faktur"}
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.5)", marginBottom: 16 }}>
              Isi data formulir berikut untuk transaksi pembelian stok.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Kode Referensi / No Transaksi</label>
                <input value={formCode} onChange={(e) => setFormCode(e.target.value)} style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700 }} />
              </div>

              {isOrder || isInvoice || isPayment ? (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Pemasok / Supplier</label>
                  <select value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} style={inpStyle}>
                    <option value="PT Poultry Nusantara">PT Poultry Nusantara</option>
                    <option value="CV Dimsum Supplier Jaya">CV Dimsum Supplier Jaya</option>
                    <option value="UD Kemasan Packindo">UD Kemasan Packindo</option>
                  </select>
                </div>
              ) : null}

              {isReq || isOrder ? (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Outlet Tujuan</label>
                  <select value={formOutlet} onChange={(e) => setFormOutlet(e.target.value)} style={inpStyle}>
                    <option value="Outlet Utama - Jakarta">Outlet Utama - Jakarta</option>
                    <option value="Cabang Bandung">Cabang Bandung</option>
                    <option value="Cabang Surabaya">Cabang Surabaya</option>
                  </select>
                </div>
              ) : null}

              {isPayment ? (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Metode Pembayaran</label>
                  <select value={formMethod} onChange={(e) => setFormMethod(e.target.value)} style={inpStyle}>
                    <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                    <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                    <option value="Tunai / Kas Tunai">Tunai / Kas Tunai</option>
                  </select>
                </div>
              ) : null}

              {isOrder || isInvoice || isPayment ? (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Nominal Transaksi (Rp)</label>
                  <input
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}
                  />
                </div>
              ) : null}

              {isReq ? (
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Catatan Permintaan</label>
                  <input value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Catatan bahan / keperluan dapur" style={inpStyle} />
                </div>
              ) : null}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveCreate}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
