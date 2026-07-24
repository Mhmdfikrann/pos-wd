"use client";

import { useState, useMemo, useEffect } from "react";
import { formatRupiah } from "@/lib/format";
import { ic } from "./icons";
import { Badge, MiniStat, MONO } from "./shared";
import { addOrIncrementStockItems, getStoredStockItems, saveStoredStockItems } from "@/lib/stock-sync";

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

// --- Mock Data Types ---

interface RequisitionItem {
  id: string;
  code: string;
  date: string;
  requester: string;
  outlet: string;
  itemCount: number;
  status: "Menunggu" | "Disetujui" | "Ditolak" | "Selesai" | "Dibatalkan";
  notes?: string;
}

interface PurchaseOrderItem {
  id: string;
  poNumber: string;
  date: string;
  supplier: string;
  outlet: string;
  totalAmount: number;
  status: "Draft" | "Terkirim" | "Diterima" | "Selesai" | "Dibatalkan";
  orderType?: "Pemesanan Barang Jual" | "Pemesanan Aset";
  stockSource?: "Tanpa Referensi" | "Referensikan Permintaan Barang";
  requisitionRef?: string;
  downPayment?: number;
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
  status: "Belum Lunas" | "Sebagian" | "Lunas" | "Dibatalkan";
}

interface InvoicePaymentItem {
  id: string;
  paymentNumber: string;
  invoiceNumber: string;
  supplier: string;
  paymentDate: string;
  method: string;
  amount: number;
  status: "Sukses" | "Pending" | "Dibatalkan";
}

// Supplier model for integration with Daftar Pemasok (/owner/inventori/pembelian-stok/daftar-pemasok)
interface Supplier {
  id: string;
  name: string;
  category: string;
  phone: string;
  address: string;
}

const MOCK_SUPPLIERS: Supplier[] = [
  { id: "sup-1", name: "PT Poultry Nusantara", category: "Bahan Baku (Ayam)", phone: "021-555-1200", address: "Jl. Raya Daan Mogot No. 45, Jakarta Barat" },
  { id: "sup-2", name: "CV Dimsum Supplier Jaya", category: "Bahan Baku & Olahan", phone: "0812-7000-1234", address: "Kawasan Industri Jatake Blok C3, Tangerang" },
  { id: "sup-3", name: "UD Kemasan Packindo", category: "Kemasan Takeaway", phone: "021-888-9090", address: "Jl. Industri Jababeka V No. 12, Cikarang, Bekasi" },
  { id: "sup-4", name: "Kebun Sayur Segar", category: "Sayur & Bumbu", phone: "0857-1122-3344", address: "Jl. Raya Puncak KM 72, Bogor" },
  { id: "sup-5", name: "PT Equipmart Indonesia", category: "Aset & Mesin Kitchen", phone: "021-444-3322", address: "Gedung Central Kitchen Equipment, Jakarta Selatan" },
];

// Inventory Stock items sourced from /owner/inventori/kelola-stok/daftar-stok
interface InventoryStockItem {
  id: string;
  code: string;
  name: string;
  category: "Bahan Baku" | "Kemasan" | "Operasional" | "Aset";
  unit: string;
  defaultPrice: number;
  currentStock: number;
}

const MOCK_INVENTORY_ITEMS: InventoryStockItem[] = [
  { id: "stk-1", code: "BB-001", name: "Daging Ayam Giling Premium", category: "Bahan Baku", unit: "kg", defaultPrice: 45000, currentStock: 14 },
  { id: "stk-2", code: "BB-002", name: "Kulit Dimsum Tipis Super", category: "Bahan Baku", unit: "pack", defaultPrice: 12000, currentStock: 48 },
  { id: "stk-3", code: "BB-003", name: "Udang Kupas Fresh Size L", category: "Bahan Baku", unit: "kg", defaultPrice: 95000, currentStock: 6 },
  { id: "stk-4", code: "BB-004", name: "Jamur Kuping Kering Select", category: "Bahan Baku", unit: "kg", defaultPrice: 65000, currentStock: 0 },
  { id: "stk-5", code: "BB-005", name: "Tepung Sagu Tani High Grade", category: "Bahan Baku", unit: "sak", defaultPrice: 240000, currentStock: 8 },
  { id: "stk-6", code: "BB-006", name: "Minyak Wijen Woei Seng 600ml", category: "Bahan Baku", unit: "botol", defaultPrice: 58000, currentStock: 12 },
  { id: "stk-7", code: "KM-001", name: "Box Takeaway Dimsum L Eco", category: "Kemasan", unit: "pcs", defaultPrice: 2200, currentStock: 140 },
  { id: "stk-8", code: "KM-002", name: "Sumpit Bambu Steril Pack", category: "Kemasan", unit: "pack", defaultPrice: 8500, currentStock: 25 },
  { id: "stk-9", code: "OP-001", name: "Gas LPG 12kg Refill", category: "Operasional", unit: "tabung", defaultPrice: 210000, currentStock: 3 },
  { id: "stk-10", code: "AS-001", name: "Freezer Commercial 4 Door Stainless", category: "Aset", unit: "unit", defaultPrice: 14500000, currentStock: 2 },
  { id: "stk-11", code: "AS-002", name: "Steamer Dimsum Gas 3 Deck", category: "Aset", unit: "unit", defaultPrice: 8200000, currentStock: 1 },
];

const DEFAULT_REQUISITIONS: RequisitionItem[] = [
  { id: "req-1", code: "REQ-2026-001", date: "24 Jul 2026", requester: "Budi (Kitchen Lead)", outlet: "Outlet Utama - Jakarta", itemCount: 5, status: "Menunggu", notes: "Stok daging ayam dan kulit dimsum menipis" },
  { id: "req-2", code: "REQ-2026-002", date: "23 Jul 2026", requester: "Siti (Barista)", outlet: "Outlet Utama - Jakarta", itemCount: 3, status: "Disetujui", notes: "Sirup dan kemasan gelas takeaway" },
  { id: "req-3", code: "REQ-2026-003", date: "21 Jul 2026", requester: "Agus (Inventory)", outlet: "Cabang Bandung", itemCount: 8, status: "Selesai", notes: "Restock bulanan bahan baku" },
];

const DEFAULT_ORDERS: PurchaseOrderItem[] = [
  { id: "po-1", poNumber: "PO-2026-089", date: "24 Jul 2026", supplier: "PT Poultry Nusantara", outlet: "Outlet Utama - Jakarta", totalAmount: 4500000, status: "Terkirim", orderType: "Pemesanan Barang Jual", stockSource: "Tanpa Referensi" },
  { id: "po-2", poNumber: "PO-2026-088", date: "23 Jul 2026", supplier: "CV Dimsum Supplier Jaya", outlet: "Outlet Utama - Jakarta", totalAmount: 2800000, status: "Diterima", orderType: "Pemesanan Barang Jual", stockSource: "Referensikan Permintaan Barang", requisitionRef: "REQ-2026-002" },
  { id: "po-3", poNumber: "PO-2026-087", date: "22 Jul 2026", supplier: "UD Kemasan Packindo", outlet: "Cabang Bandung", totalAmount: 1200000, status: "Selesai", orderType: "Pemesanan Barang Jual", stockSource: "Tanpa Referensi" },
];

const DEFAULT_INVOICES: PurchaseInvoiceItem[] = [
  { id: "inv-1", invoiceNumber: "PO-2026-089/0001", poNumber: "PO-2026-089", supplier: "PT Poultry Nusantara", date: "24 Jul 2026", dueDate: "07 Agt 2026", totalAmount: 4500000, paidAmount: 0, status: "Belum Lunas" },
  { id: "inv-2", invoiceNumber: "PO-2026-088/0002", poNumber: "PO-2026-088", supplier: "CV Dimsum Supplier Jaya", date: "23 Jul 2026", dueDate: "30 Jul 2026", totalAmount: 2800000, paidAmount: 1400000, status: "Sebagian" },
  { id: "inv-3", invoiceNumber: "PO-2026-087/0003", poNumber: "PO-2026-087", supplier: "UD Kemasan Packindo", date: "22 Jul 2026", dueDate: "29 Jul 2026", totalAmount: 1200000, paidAmount: 1200000, status: "Lunas" },
];

const DEFAULT_PAYMENTS: InvoicePaymentItem[] = [
  { id: "pay-1", paymentNumber: "PAY-2026-042", invoiceNumber: "PO-2026-088/0002", supplier: "CV Dimsum Supplier Jaya", paymentDate: "23 Jul 2026", method: "Transfer Bank BCA", amount: 1400000, status: "Sukses" },
  { id: "pay-2", paymentNumber: "PAY-2026-041", invoiceNumber: "PO-2026-087/0003", supplier: "UD Kemasan Packindo", paymentDate: "22 Jul 2026", method: "Transfer Bank Mandiri", amount: 1200000, status: "Sukses" },
];

// Detail Item Line in PO Modal Step 2
interface SelectedPOItem {
  id: string;
  code: string;
  name: string;
  unit: string;
  qty: number;
  unitPrice: number;
  discountType: "nominal" | "persen";
  discountVal: number;
  notes: string;
}

interface AdditionalFee {
  id: string;
  name: string;
  amount: number;
}

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
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    try {
      const savedReq = localStorage.getItem("pos_wd_purchase_requisitions");
      if (savedReq) setRequisitions(JSON.parse(savedReq));

      const savedOrd = localStorage.getItem("pos_wd_purchase_orders");
      if (savedOrd) setOrders(JSON.parse(savedOrd));

      const savedInv = localStorage.getItem("pos_wd_purchase_invoices");
      if (savedInv) setInvoices(JSON.parse(savedInv));

      const savedPay = localStorage.getItem("pos_wd_purchase_payments");
      if (savedPay) setPayments(JSON.parse(savedPay));
    } catch (e) {}
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("pos_wd_purchase_requisitions", JSON.stringify(requisitions));
  }, [requisitions, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("pos_wd_purchase_orders", JSON.stringify(orders));
  }, [orders, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("pos_wd_purchase_invoices", JSON.stringify(invoices));
  }, [invoices, isInitialized]);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("pos_wd_purchase_payments", JSON.stringify(payments));
  }, [payments, isInitialized]);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState<{ type: "req" | "order" | "invoice" | "payment"; data: any } | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // --- PO PREVIEW & INVOICE CREATION STATES ---
  const [poPreviewModal, setPoPreviewModal] = useState<{
    order: PurchaseOrderItem;
    items: SelectedPOItem[];
    fees: AdditionalFee[];
    calculations: {
      rawSubtotal: number;
      mainDiscount: number;
      subtotalAfterDiscount: number;
      withoutTaxAmount: number;
      taxAmount: number;
      totalFees: number;
      grandTotal: number;
      remainingBalance: number;
    };
  } | null>(null);
  const [tindakanDropdownOpen, setTindakanDropdownOpen] = useState(false);

  // --- INVOICE PREVIEW MODAL STATE ---
  const [invoicePreviewModal, setInvoicePreviewModal] = useState<{
    invoice: PurchaseInvoiceItem;
    items: typeof invItems;
    calculations: typeof invCalculations;
    notes: string;
    files: typeof invFiles;
    supplierAddress: string;
    supplierPhone: string;
    supplierEmail: string;
    jenisPembelian: string;
    sumberStok: string;
    orderDate: string;
  } | null>(null);
  const [invTindakanDropdownOpen, setInvTindakanDropdownOpen] = useState(false);

  // --- TAMBAH PEMBAYARAN FAKTUR MODAL STATES ---
  const [createPaymentModalOpen, setCreatePaymentModalOpen] = useState(false);
  const [payOutlet, setPayOutlet] = useState("Outlet Utama - Jakarta");
  const [payMethod, setPayMethod] = useState("Transfer Bank BCA");
  const [payTransactionType, setPayTransactionType] = useState<"Pemesanan Stok" | "Tanpa Nomor Referensi">("Pemesanan Stok");
  const [paySupplierName, setPaySupplierName] = useState("PT Poultry Nusantara");
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payTransactionNo, setPayTransactionNo] = useState("");
  const [payNotes, setPayNotes] = useState("");
  const [payFiles, setPayFiles] = useState<{ id: string; name: string; size: number }[]>([]);

  // Selected invoices for payment table
  const [payInvoiceItems, setPayInvoiceItems] = useState<{
    id: string;
    invoiceNumber: string;
    dateWithTime: string;
    dueDate: string;
    totalAmount: number;
    discount: number;
    paymentAmount: number;
  }[]>([]);

  const [selectInvoicePickerOpen, setSelectInvoicePickerOpen] = useState(false);

  // --- COMPREHENSIVE TAMBAH FAKTUR PEMBELIAN MODAL STATES ---
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [invJenisPembelian, setInvJenisPembelian] = useState<"Pembelian Barang Jual" | "Pembelian Aset">("Pembelian Barang Jual");
  const [invSumberStok, setInvSumberStok] = useState<"Tanpa Nomor Referensi" | "Referensikan Pemesanan Stok">("Referensikan Pemesanan Stok");
  const [invPoNumber, setInvPoNumber] = useState("");
  const [invInvoiceNumber, setInvInvoiceNumber] = useState("");
  const [invSupplierName, setInvSupplierName] = useState("PT Poultry Nusantara");
  const [invOutlet, setInvOutlet] = useState("Outlet Utama - Jakarta");
  const [invSupplierAddress, setInvSupplierAddress] = useState("Jl. Raya Daan Mogot No. 45, Jakarta Barat");
  const [invSupplierPhone, setInvSupplierPhone] = useState("021-555-1200");
  const [invSupplierEmail, setInvSupplierEmail] = useState("supplier@poultry.co.id");
  const [invOrderDate, setInvOrderDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invInvoiceDate, setInvInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invDueDate, setInvDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [invItems, setInvItems] = useState<{
    id: string;
    code: string;
    name: string;
    unit: string;
    qtyOrdered: number;
    qtyReceived: number;
    unitPrice: number;
    discountType: "nominal" | "persen";
    discountVal: number;
    selected: boolean;
  }[]>([
    { id: "stk-1", code: "BB-001", name: "Daging Ayam Giling Premium", unit: "kg", qtyOrdered: 50, qtyReceived: 50, unitPrice: 45000, discountType: "nominal", discountVal: 0, selected: true },
    { id: "stk-2", code: "BB-002", name: "Kulit Dimsum Tipis Super", unit: "pack", qtyOrdered: 80, qtyReceived: 80, unitPrice: 12000, discountType: "nominal", discountVal: 0, selected: true },
  ]);
  const [invReceiveStock, setInvReceiveStock] = useState(true);
  const [invDiscountType, setInvDiscountType] = useState<"nominal" | "persen">("nominal");
  const [invDiscountVal, setInvDiscountVal] = useState(0);
  const [invTaxType, setInvTaxType] = useState<"non_pajak" | "eksklusi" | "inklusi">("non_pajak");
  const [invTaxPercent, setInvTaxPercent] = useState(11);
  const [invOtherFees, setInvOtherFees] = useState<AdditionalFee[]>([]);
  const [invNotes, setInvNotes] = useState("");
  const [invFiles, setInvFiles] = useState<{ id: string; name: string; size: number; error?: string }[]>([]);
  const [aturBarangModalOpen, setAturBarangModalOpen] = useState(false);

  // --- STANDARD FORM STATES (For Req, Invoice, Payment) ---
  const [formCode, setFormCode] = useState("");
  const [formSupplier, setFormSupplier] = useState("PT Poultry Nusantara");
  const [formOutlet, setFormOutlet] = useState("Outlet Utama - Jakarta");
  const [formAmount, setFormAmount] = useState("1500000");
  const [formMethod, setFormMethod] = useState("Transfer Bank BCA");
  const [formNotes, setFormNotes] = useState("");

  // --- ADVANCED 2-STEP PO MODAL STATES (For Pemesanan Stok) ---
  const [poStep, setPoStep] = useState<1 | 2>(1);
  const [poJenisPemesanan, setPoJenisPemesanan] = useState<"Pemesanan Barang Jual" | "Pemesanan Aset">("Pemesanan Barang Jual");
  const [poSumberStok, setPoSumberStok] = useState<"Tanpa Referensi" | "Referensikan Permintaan Barang">("Tanpa Referensi");
  const [poRequisitionRef, setPoRequisitionRef] = useState("REQ-2026-001");
  const [poOutlet, setPoOutlet] = useState("Outlet Utama - Jakarta");
  const [poSupplierId, setPoSupplierId] = useState(MOCK_SUPPLIERS[0].id);
  const [poAddress, setPoAddress] = useState(MOCK_SUPPLIERS[0].address);
  const [poNumber, setPoNumber] = useState("");
  const [poDate, setPoDate] = useState(() => new Date().toISOString().slice(0, 10));

  // Step 2 Item table & Calculations
  const [poItems, setPoItems] = useState<SelectedPOItem[]>([
    { id: "stk-1", code: "BB-001", name: "Daging Ayam Giling Premium", unit: "kg", qty: 50, unitPrice: 45000, discountType: "nominal", discountVal: 0, notes: "Segar dingin" },
    { id: "stk-2", code: "BB-002", name: "Kulit Dimsum Tipis Super", unit: "pack", qty: 100, unitPrice: 12000, discountType: "nominal", discountVal: 0, notes: "Pengiriman pagi" },
  ]);
  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [itemPickerSearch, setItemPickerSearch] = useState("");
  const [itemPickerCategory, setItemPickerCategory] = useState<string>("Semua");

  // Summary & Adjustments
  const [poDiscountType, setPoDiscountType] = useState<"nominal" | "persen">("nominal");
  const [poDiscountVal, setPoDiscountVal] = useState<number>(0);
  const [poTaxType, setPoTaxType] = useState<"non_pajak" | "eksklusi" | "inklusi">("non_pajak");
  const [poTaxPercent, setPoTaxPercent] = useState<number>(11);
  const [poOtherFees, setPoOtherFees] = useState<AdditionalFee[]>([]);
  const [poShippingFee, setPoShippingFee] = useState<number>(0);
  const [poDownPayment, setPoDownPayment] = useState<number>(0);

  // Auto-fill address when supplier changes
  function handleSupplierSelect(supId: string) {
    setPoSupplierId(supId);
    const sup = MOCK_SUPPLIERS.find((s) => s.id === supId);
    if (sup) {
      setPoAddress(sup.address);
    }
  }

  function openCreateModal() {
    if (isInvoice) {
      const defaultPo = "PO-2026-089";
      const nextSeq = String(invoices.length + 1).padStart(4, "0");
      const nextInvNo = `${defaultPo}/${nextSeq}`;
      setInvJenisPembelian("Pembelian Barang Jual");
      setInvSumberStok("Tanpa Nomor Referensi");
      setInvPoNumber(defaultPo);
      setInvInvoiceNumber(nextInvNo);
      setInvSupplierName(MOCK_SUPPLIERS[0].name);
      setInvOutlet("Outlet Utama - Jakarta");
      setInvSupplierAddress(MOCK_SUPPLIERS[0].address);
      setInvSupplierPhone(MOCK_SUPPLIERS[0].phone);
      setInvSupplierEmail("supplier@poultry.co.id");
      setInvOrderDate(new Date().toISOString().slice(0, 10));
      setInvInvoiceDate(new Date().toISOString().slice(0, 10));
      setInvItems([
        { id: "stk-1", code: "BB-001", name: "Daging Ayam Giling Premium", unit: "kg", qtyOrdered: 50, qtyReceived: 50, unitPrice: 45000, discountType: "nominal", discountVal: 0, selected: true },
        { id: "stk-2", code: "BB-002", name: "Kulit Dimsum Tipis Super", unit: "pack", qtyOrdered: 80, qtyReceived: 80, unitPrice: 12000, discountType: "nominal", discountVal: 0, selected: true },
      ]);
      setInvReceiveStock(true);
      setInvNotes("");
      setInvFiles([]);
      setCreateInvoiceModalOpen(true);
      return;
    }

    setCreateModalOpen(true);
    if (isReq) {
      setFormCode(`REQ-2026-${String(requisitions.length + 1).padStart(3, "0")}`);
      setFormNotes("");
    } else if (isOrder) {
      // Initialize PO Modal Step 1
      setPoStep(1);
      const nextPoNo = `PO-2026-${String(orders.length + 90).padStart(3, "0")}`;
      setPoNumber(nextPoNo);
      setPoJenisPemesanan("Pemesanan Barang Jual");
      setPoSumberStok("Tanpa Referensi");
      setPoOutlet("Outlet Utama - Jakarta");
      setPoSupplierId(MOCK_SUPPLIERS[0].id);
      setPoAddress(MOCK_SUPPLIERS[0].address);
      setPoDate(new Date().toISOString().slice(0, 10));

      // Reset items and totals
      setPoItems([
        { id: "stk-1", code: "BB-001", name: "Daging Ayam Giling Premium", unit: "kg", qty: 50, unitPrice: 45000, discountType: "nominal", discountVal: 0, notes: "Kualitas grade A" },
        { id: "stk-2", code: "BB-002", name: "Kulit Dimsum Tipis Super", unit: "pack", qty: 80, unitPrice: 12000, discountType: "nominal", discountVal: 0, notes: "Kemasan rapi" },
      ]);
      setPoDiscountType("nominal");
      setPoDiscountVal(0);
      setPoTaxType("non_pajak");
      setPoTaxPercent(11);
      setPoOtherFees([]);
      setPoDownPayment(0);
    } else {
      setFormCode(`PAY-2026-${String(payments.length + 43).padStart(3, "0")}`);
      setFormSupplier("PT Poultry Nusantara");
      setFormAmount("1500000");
      setFormMethod("Transfer Bank BCA");
    }
  }

  // Helper calculations for Step 2 PO
  const poCalculations = useMemo(() => {
    const rawSubtotal = poItems.reduce((acc, item) => {
      let itemDisc = 0;
      if (item.discountType === "persen") {
        itemDisc = (item.qty * item.unitPrice * (item.discountVal || 0)) / 100;
      } else {
        itemDisc = item.discountVal || 0;
      }
      const lineTotal = Math.max(0, item.qty * item.unitPrice - itemDisc);
      return acc + lineTotal;
    }, 0);

    let mainDiscount = 0;
    if (poDiscountType === "persen") {
      mainDiscount = (rawSubtotal * (poDiscountVal || 0)) / 100;
    } else {
      mainDiscount = poDiscountVal || 0;
    }

    const subtotalAfterDiscount = Math.max(0, rawSubtotal - mainDiscount);

    let taxAmount = 0;
    let withoutTaxAmount = subtotalAfterDiscount;

    if (poTaxType === "eksklusi") {
      taxAmount = (subtotalAfterDiscount * (poTaxPercent || 0)) / 100;
      withoutTaxAmount = subtotalAfterDiscount;
    } else if (poTaxType === "inklusi") {
      taxAmount = subtotalAfterDiscount - subtotalAfterDiscount / (1 + (poTaxPercent || 0) / 100);
      withoutTaxAmount = subtotalAfterDiscount - taxAmount;
    } else {
      taxAmount = 0;
      withoutTaxAmount = subtotalAfterDiscount;
    }

    const totalFees = poOtherFees.reduce((sum, f) => sum + (f.amount || 0), 0);
    const grandTotal = Math.max(0, (poTaxType === "eksklusi" ? subtotalAfterDiscount + taxAmount : subtotalAfterDiscount) + totalFees);
    const remainingBalance = Math.max(0, grandTotal - (poDownPayment || 0));

    return {
      rawSubtotal,
      mainDiscount,
      subtotalAfterDiscount,
      withoutTaxAmount,
      taxAmount,
      totalFees,
      grandTotal,
      remainingBalance,
    };
  }, [poItems, poDiscountType, poDiscountVal, poTaxType, poTaxPercent, poOtherFees, poDownPayment]);

  function openCreateInvoiceFromPO(poData: NonNullable<typeof poPreviewModal>) {
    const mappedJenis = poData.order.orderType === "Pemesanan Aset" ? "Pembelian Aset" : "Pembelian Barang Jual";
    const poNum = poData.order.poNumber;
    const nextSeq = String(invoices.length + 1).padStart(4, "0");
    setInvJenisPembelian(mappedJenis);
    setInvSumberStok("Referensikan Pemesanan Stok");
    setInvPoNumber(poNum);
    setInvInvoiceNumber(`${poNum}/${nextSeq}`);
    setInvSupplierName(poData.order.supplier);
    setInvOutlet(poData.order.outlet);
    const sup = MOCK_SUPPLIERS.find((s) => s.name === poData.order.supplier);
    if (sup) {
      setInvSupplierAddress(sup.address);
      setInvSupplierPhone(sup.phone);
    } else {
      setInvSupplierAddress("Jl. Raya Daan Mogot No. 45, Jakarta Barat");
      setInvSupplierPhone("021-555-1200");
    }
    setInvSupplierEmail("supplier@poultry.co.id");
    setInvOrderDate(new Date(poData.order.date).toISOString().slice(0, 10) || new Date().toISOString().slice(0, 10));
    setInvInvoiceDate(new Date().toISOString().slice(0, 10));

    const items = poData.items.map((i) => ({
      id: i.id,
      code: i.code,
      name: i.name,
      unit: i.unit,
      qtyOrdered: i.qty,
      qtyReceived: i.qty,
      unitPrice: i.unitPrice,
      discountType: i.discountType,
      discountVal: i.discountVal,
      selected: true,
    }));
    setInvItems(items);
    setInvReceiveStock(true);
    setInvNotes(`Faktur pembelian berdasarkan Pemesanan Stok ${poData.order.poNumber}`);
    setInvFiles([]);
    setPoPreviewModal(null);
    setCreateInvoiceModalOpen(true);
  }

  const invCalculations = useMemo(() => {
    const activeItems = invItems.filter((i) => i.selected);
    const rawSubtotal = activeItems.reduce((acc, item) => {
      let itemDisc = 0;
      if (item.discountType === "persen") {
        itemDisc = (item.qtyReceived * item.unitPrice * (item.discountVal || 0)) / 100;
      } else {
        itemDisc = item.discountVal || 0;
      }
      return acc + Math.max(0, item.qtyReceived * item.unitPrice - itemDisc);
    }, 0);

    let mainDiscount = 0;
    if (invDiscountType === "persen") {
      mainDiscount = (rawSubtotal * (invDiscountVal || 0)) / 100;
    } else {
      mainDiscount = invDiscountVal || 0;
    }

    const subtotalAfterDiscount = Math.max(0, rawSubtotal - mainDiscount);

    let taxAmount = 0;
    let withoutTaxAmount = subtotalAfterDiscount;

    if (invTaxType === "eksklusi") {
      taxAmount = (subtotalAfterDiscount * (invTaxPercent || 0)) / 100;
      withoutTaxAmount = subtotalAfterDiscount;
    } else if (invTaxType === "inklusi") {
      taxAmount = subtotalAfterDiscount - subtotalAfterDiscount / (1 + (invTaxPercent || 0) / 100);
      withoutTaxAmount = subtotalAfterDiscount - taxAmount;
    } else {
      taxAmount = 0;
      withoutTaxAmount = subtotalAfterDiscount;
    }

    const totalFees = invOtherFees.reduce((sum, f) => sum + (f.amount || 0), 0);
    const grandTotal = Math.max(0, (invTaxType === "eksklusi" ? subtotalAfterDiscount + taxAmount : subtotalAfterDiscount) + totalFees);

    return {
      rawSubtotal,
      mainDiscount,
      subtotalAfterDiscount,
      withoutTaxAmount,
      taxAmount,
      totalFees,
      grandTotal,
    };
  }, [invItems, invDiscountType, invDiscountVal, invTaxType, invTaxPercent, invOtherFees]);

  function handleInvFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const newFiles = [...invFiles];

    for (const file of selectedFiles) {
      if (newFiles.length >= 5) {
        setMsg({ type: "err", text: "Maksimal 5 file pre-order yang diperbolehkan." });
        break;
      }
      if (file.size > 2 * 1024 * 1024) {
        setMsg({ type: "err", text: `File "${file.name}" melebihi ukuran maksimal 2MB (${(file.size / (1024 * 1024)).toFixed(2)} MB).` });
        continue;
      }
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (!["pdf", "xlsx", "xls", "docx", "doc", "jpg", "jpeg", "png", "zip"].includes(ext || "")) {
        setMsg({ type: "err", text: `Ekstensi file ".${ext}" tidak didukung. Format didukung: PDF, Excel, Word, JPG, PNG, ZIP.` });
        continue;
      }
      newFiles.push({
        id: `file-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
      });
    }
    setInvFiles(newFiles);
  }

  function handleSaveInvoiceSubmit() {
    const selectedSup = invSupplierName || "Pemasok Terdaftar";
    const todayStr = new Date(invInvoiceDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const poRef = invPoNumber && invPoNumber !== "-" ? invPoNumber : "PO-2026-089";
    const nextSeq = String(invoices.length + 1).padStart(4, "0");
    const newInvNo = invInvoiceNumber || `${poRef}/${nextSeq}`;
    const newInv: PurchaseInvoiceItem = {
      id: `inv-${Date.now()}`,
      invoiceNumber: newInvNo,
      poNumber: invPoNumber || "-",
      supplier: selectedSup,
      date: todayStr,
      dueDate: invDueDate || "14 Hari",
      totalAmount: invCalculations.grandTotal,
      paidAmount: 0,
      status: "Belum Lunas",
    };

    setInvoices([newInv, ...invoices]);

    if (invReceiveStock) {
      addOrIncrementStockItems(
        invItems
          .filter((i) => i.selected)
          .map((i) => ({
            code: i.code,
            name: i.name,
            qty: i.qtyReceived,
            unitPrice: i.unitPrice,
            unit: i.unit,
            outlet: invOutlet,
          }))
      );
    }

    if (invPoNumber && invPoNumber !== "-") {
      setOrders((prev) =>
        prev.map((o) => (o.poNumber === invPoNumber ? { ...o, status: "Diterima" } : o))
      );
    }

    setMsg({
      type: "ok",
      text: `Faktur Pembelian "${newInv.invoiceNumber}" berhasil dibuat${invReceiveStock ? " & stok otomatis ditambahkan ke inventori!" : "!"}`,
    });
    setCreateInvoiceModalOpen(false);

    // Direct to Preview Faktur Pembelian Modal!
    setInvoicePreviewModal({
      invoice: newInv,
      items: invItems.filter((i) => i.selected),
      calculations: { ...invCalculations },
      notes: invNotes,
      files: [...invFiles],
      supplierAddress: invSupplierAddress,
      supplierPhone: invSupplierPhone,
      supplierEmail: invSupplierEmail,
      jenisPembelian: invJenisPembelian,
      sumberStok: invSumberStok,
      orderDate: invOrderDate,
    });
  }

  function openCreatePaymentFromInvoice(inv: PurchaseInvoiceItem) {
    setPayOutlet("Outlet Utama - Jakarta");
    setPayMethod("Transfer Bank BCA");
    setPayTransactionType("Pemesanan Stok");
    setPaySupplierName(inv.supplier);
    setPayDate(new Date().toISOString().slice(0, 10));
    setPayTransactionNo(`PAY-2026-${String(payments.length + 44).padStart(4, "0")}`);
    setPayNotes(`Pembayaran untuk Faktur ${inv.invoiceNumber}`);
    setPayFiles([]);

    const invoiceDateStr = `${inv.date} 14:30 WIB`;
    const remaining = inv.totalAmount - inv.paidAmount;

    setPayInvoiceItems([
      {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dateWithTime: invoiceDateStr,
        dueDate: inv.dueDate,
        totalAmount: inv.totalAmount,
        discount: 0,
        paymentAmount: remaining > 0 ? remaining : inv.totalAmount,
      },
    ]);

    setInvoicePreviewModal(null);
    setCreatePaymentModalOpen(true);
  }

  const payCalculations = useMemo(() => {
    const totalTagihan = payInvoiceItems.reduce((acc, i) => acc + (i.totalAmount || 0), 0);
    const totalPotongan = payInvoiceItems.reduce((acc, i) => acc + (i.discount || 0), 0);
    const totalPembayaran = payInvoiceItems.reduce((acc, i) => acc + (i.paymentAmount || 0), 0);
    const totalSisa = Math.max(0, totalTagihan - totalPotongan - totalPembayaran);
    return { totalTagihan, totalPotongan, totalPembayaran, totalSisa };
  }, [payInvoiceItems]);

  function handlePayFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);
    const newFiles = [...payFiles];
    for (const file of selectedFiles) {
      if (newFiles.length >= 5) {
        setMsg({ type: "err", text: "Maksimal 5 file bukti pembayaran yang diperbolehkan." });
        break;
      }
      if (file.size > 2 * 1024 * 1024) {
        setMsg({ type: "err", text: `File "${file.name}" melebihi ukuran maksimal 2MB.` });
        continue;
      }
      newFiles.push({
        id: `payfile-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
      });
    }
    setPayFiles(newFiles);
  }

  function handleSavePaymentSubmit() {
    const payNo = payTransactionNo || `PAY-2026-${String(payments.length + 44).padStart(4, "0")}`;
    const todayStr = new Date(payDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

    const newPayment: InvoicePaymentItem = {
      id: `pay-${Date.now()}`,
      paymentNumber: payNo,
      invoiceNumber: payInvoiceItems.map((i) => i.invoiceNumber).join(", ") || "PO-2026-088/0002",
      supplier: paySupplierName,
      paymentDate: todayStr,
      method: payMethod,
      amount: payCalculations.totalPembayaran,
      status: "Sukses",
    };
    setPayments([newPayment, ...payments]);

    setInvoices((prev) =>
      prev.map((inv) => {
        const item = payInvoiceItems.find((p) => p.invoiceNumber === inv.invoiceNumber);
        if (item) {
          const newPaid = inv.paidAmount + item.paymentAmount;
          const status = newPaid >= inv.totalAmount ? "Lunas" : newPaid > 0 ? "Sebagian" : "Belum Lunas";
          return { ...inv, paidAmount: newPaid, status };
        }
        return inv;
      })
    );

    setCreatePaymentModalOpen(false);
    setMsg({
      type: "ok",
      text: `Pembayaran Faktur "${payNo}" sebesar ${formatRupiah(payCalculations.totalPembayaran)} berhasil dicatat!`,
    });
  }

  function handleSavePOSubmit() {
    const selectedSup = MOCK_SUPPLIERS.find((s) => s.id === poSupplierId);
    const todayStr = new Date(poDate).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
    const newPoNo = poNumber || `PO-2026-${orders.length + 90}`;
    const newPo: PurchaseOrderItem = {
      id: `po-${Date.now()}`,
      poNumber: newPoNo,
      date: todayStr,
      supplier: selectedSup ? selectedSup.name : "Pemasok Terdaftar",
      outlet: poOutlet,
      totalAmount: poCalculations.grandTotal,
      status: "Draft",
      orderType: poJenisPemesanan,
      stockSource: poSumberStok,
      requisitionRef: poSumberStok === "Referensikan Permintaan Barang" ? poRequisitionRef : undefined,
      downPayment: poDownPayment,
    };

    setOrders([newPo, ...orders]);
    setMsg({ type: "ok", text: `Pemesanan Stok "${newPo.poNumber}" (${poJenisPemesanan}) berhasil dibuat!` });
    setCreateModalOpen(false);

    // Save last purchase prices to stock items in localStorage for future auto-fill
    if (typeof window !== "undefined") {
      const currentStocks = getStoredStockItems();
      const updated = currentStocks.map((stk) => {
        const match = poItems.find(
          (pi) => pi.id === stk.id || (pi.code && pi.code === stk.code) || pi.name.toLowerCase() === stk.name.toLowerCase()
        );
        if (match && match.unitPrice > 0) {
          return { ...stk, defaultPrice: match.unitPrice, lastUpdated: new Date().toISOString().slice(0, 10) };
        }
        return stk;
      });
      saveStoredStockItems(updated);
    }

    // Direct to PO Preview modal!
    setPoPreviewModal({
      order: newPo,
      items: [...poItems],
      fees: [...poOtherFees],
      calculations: { ...poCalculations },
    });
  }

  function handleSaveCreate() {
    if (isOrder) {
      handleSavePOSubmit();
      return;
    }
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

  // Add/Remove Item to PO Step 2
  function togglePickerItem(stk: InventoryStockItem) {
    setPoItems((prev) => {
      const exists = prev.find((i) => i.id === stk.id);
      if (exists) {
        return prev.filter((i) => i.id !== stk.id);
      } else {
        return [
          ...prev,
          {
            id: stk.id,
            code: stk.code,
            name: stk.name,
            unit: stk.unit,
            qty: 10,
            unitPrice: stk.defaultPrice,
            discountType: "nominal",
            discountVal: 0,
            notes: "",
          },
        ];
      }
    });
  }

  function updatePOItem<K extends keyof SelectedPOItem>(id: string, field: K, val: SelectedPOItem[K]) {
    setPoItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [field]: val } : i))
    );
  }

  function removePOItem(id: string) {
    setPoItems((prev) => prev.filter((i) => i.id !== id));
  }

  function addOtherFee() {
    setPoOtherFees((prev) => [
      ...prev,
      { id: `fee-${Date.now()}`, name: `Biaya Lainnya #${prev.length + 1}`, amount: 0 },
    ]);
  }

  function removeOtherFee(id: string) {
    setPoOtherFees((prev) => prev.filter((f) => f.id !== id));
  }

  function updateOtherFee<K extends keyof AdditionalFee>(id: string, field: K, val: AdditionalFee[K]) {
    setPoOtherFees((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: val } : f))
    );
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

  function handlePrintInvoiceDoc(data: {
    invoice: PurchaseInvoiceItem;
    items: { id: string; code: string; name: string; unit: string; qtyReceived: number; unitPrice: number; discountVal?: number; discountType?: string }[];
    calculations: { rawSubtotal: number; mainDiscount: number; taxAmount: number; grandTotal: number };
    notes?: string;
    supplierAddress?: string;
    supplierPhone?: string;
    supplierEmail?: string;
    jenisPembelian?: string;
    sumberStok?: string;
  }) {
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const rowsHtml = data.items
      .map((item, idx) => {
        let itemDisc = 0;
        if (item.discountType === "persen") {
          itemDisc = (item.qtyReceived * item.unitPrice * (item.discountVal || 0)) / 100;
        } else {
          itemDisc = item.discountVal || 0;
        }
        const lineTotal = Math.max(0, item.qtyReceived * item.unitPrice - itemDisc);
        return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>
            <strong>${item.name}</strong><br/>
            <span style="font-size: 10px; color: #666; font-family: monospace;">SKU: ${item.code}</span>
          </td>
          <td style="text-align: right; font-family: monospace;">${formatRupiah(item.unitPrice)}</td>
          <td style="text-align: center;">${item.unit}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold;">${item.qtyReceived}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold; color: #A91F34;">${formatRupiah(lineTotal)}</td>
        </tr>
      `;
      })
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Faktur Pembelian - ${data.invoice.invoiceNumber}</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 32px; color: #23201F; background: #fff; line-height: 1.4; }
          .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #A91F34; padding-bottom: 16px; margin-bottom: 24px; }
          .brand { font-size: 22px; font-weight: 800; color: #A91F34; letter-spacing: -0.5px; }
          .brand-sub { font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
          .doc-title { font-size: 20px; font-weight: 800; color: #23201F; text-align: right; text-transform: uppercase; }
          .doc-no { font-size: 14px; font-weight: 700; color: #A91F34; font-family: monospace; text-align: right; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #FFF9F2; border: 1px solid rgba(35,32,31,0.12); padding: 18px; border-radius: 12px; margin-bottom: 24px; }
          .info-box h4 { margin: 0 0 6px 0; font-size: 11px; color: #A91F34; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }
          .info-box p { margin: 2px 0; font-size: 12.5px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #F5F6F8; color: #23201F; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 12px; border: 1px solid rgba(35,32,31,0.14); text-align: left; }
          td { font-size: 12px; padding: 10px 12px; border: 1px solid rgba(35,32,31,0.12); }
          
          .summary-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
          .notes-box { width: 55%; background: #F5F6F8; padding: 14px; border-radius: 8px; border: 1px solid rgba(35,32,31,0.08); font-size: 12px; }
          .totals-box { width: 40%; font-size: 13px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals-row.grand { border-top: 2px solid #A91F34; padding-top: 10px; font-weight: 800; font-size: 15px; color: #A91F34; }
          
          .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; margin-top: 40px; font-size: 12px; }
          .sig-box { height: 70px; border-bottom: 1px solid #ccc; margin-bottom: 6px; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <div class="top-bar">
          <div>
            <div class="brand">WANNA DIMSUM</div>
            <div class="brand-sub">Point of Sale & Business Suite</div>
          </div>
          <div>
            <div class="doc-title">Faktur Pembelian</div>
            <div class="doc-no">${data.invoice.invoiceNumber}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>Pemasok / Supplier</h4>
            <p><strong>${data.invoice.supplier}</strong></p>
            <p>${data.supplierAddress || "Jl. Raya Daan Mogot No. 45, Jakarta Barat"}</p>
            <p>Telepon: ${data.supplierPhone || "021-555-1200"}</p>
          </div>
          <div class="info-box">
            <h4>Detail Tagihan & Referensi</h4>
            <p>Tanggal Faktur: <strong>${data.invoice.date}</strong></p>
            <p>Jatuh Tempo: <strong>${data.invoice.dueDate}</strong></p>
            <p>No. Pemesanan (PO): <strong style="font-family: monospace;">${data.invoice.poNumber}</strong></p>
            <p>Jenis Pembelian: ${data.jenisPembelian || "Pembelian Barang Jual"}</p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">No</th>
              <th>Deskripsi Produk</th>
              <th style="text-align: right;">Harga Beli</th>
              <th style="text-align: center;">Satuan</th>
              <th style="text-align: center;">Diterima</th>
              <th style="text-align: right;">Total (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-container">
          <div class="notes-box">
            <strong>Catatan Faktur:</strong><br/>
            ${data.notes || "Faktur pembelian stok resmi dari supplier."}
          </div>
          <div class="totals-box">
            <div class="totals-row">
              <span>Subtotal Barang:</span>
              <span style="font-family: monospace;">${formatRupiah(data.calculations.rawSubtotal)}</span>
            </div>
            <div class="totals-row">
              <span>Total Diskon:</span>
              <span style="font-family: monospace; color: #238152;">- ${formatRupiah(data.calculations.mainDiscount)}</span>
            </div>
            <div class="totals-row">
              <span>Total Pajak:</span>
              <span style="font-family: monospace;">${formatRupiah(data.calculations.taxAmount)}</span>
            </div>
            <div class="totals-row grand">
              <span>Total Tagihan:</span>
              <span style="font-family: monospace;">${formatRupiah(data.calculations.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div class="sig-section">
          <div>
            <p>Diterima & Disetujui Oleh,</p>
            <div class="sig-box"></div>
            <p><strong>Bagian Penerimaan / Kasir</strong></p>
          </div>
          <div>
            <p>Hormat Kami,</p>
            <div class="sig-box"></div>
            <p><strong>Pemasok / Supplier</strong></p>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  function handlePrintPODoc(data: {
    order: PurchaseOrderItem;
    items: SelectedPOItem[];
    calculations: { rawSubtotal: number; mainDiscount: number; taxAmount: number; totalFees?: number; grandTotal: number };
  }) {
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const rowsHtml = data.items
      .map((item, idx) => {
        let itemDisc = 0;
        if (item.discountType === "persen") {
          itemDisc = (item.qty * item.unitPrice * (item.discountVal || 0)) / 100;
        } else {
          itemDisc = item.discountVal || 0;
        }
        const lineTotal = Math.max(0, item.qty * item.unitPrice - itemDisc);
        return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td>
            <strong>${item.name}</strong><br/>
            <span style="font-size: 10px; color: #666; font-family: monospace;">SKU: ${item.code}</span>
          </td>
          <td style="text-align: right; font-family: monospace;">${formatRupiah(item.unitPrice)}</td>
          <td style="text-align: center;">${item.unit}</td>
          <td style="text-align: center; font-family: monospace; font-weight: bold;">${item.qty}</td>
          <td style="text-align: right; font-family: monospace; font-weight: bold; color: #A91F34;">${formatRupiah(lineTotal)}</td>
        </tr>
      `;
      })
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Surat Pemesanan Stok - ${data.order.poNumber}</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 32px; color: #23201F; background: #fff; line-height: 1.4; }
          .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #A91F34; padding-bottom: 16px; margin-bottom: 24px; }
          .brand { font-size: 22px; font-weight: 800; color: #A91F34; letter-spacing: -0.5px; }
          .brand-sub { font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
          .doc-title { font-size: 20px; font-weight: 800; color: #23201F; text-align: right; text-transform: uppercase; }
          .doc-no { font-size: 14px; font-weight: 700; color: #A91F34; font-family: monospace; text-align: right; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #FFF9F2; border: 1px solid rgba(35,32,31,0.12); padding: 18px; border-radius: 12px; margin-bottom: 24px; }
          .info-box h4 { margin: 0 0 6px 0; font-size: 11px; color: #A91F34; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }
          .info-box p { margin: 2px 0; font-size: 12.5px; }
          
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #F5F6F8; color: #23201F; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 10px 12px; border: 1px solid rgba(35,32,31,0.14); text-align: left; }
          td { font-size: 12px; padding: 10px 12px; border: 1px solid rgba(35,32,31,0.12); }
          
          .summary-container { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 36px; }
          .notes-box { width: 55%; background: #F5F6F8; padding: 14px; border-radius: 8px; border: 1px solid rgba(35,32,31,0.08); font-size: 12px; }
          .totals-box { width: 40%; font-size: 13px; }
          .totals-row { display: flex; justify-content: space-between; padding: 4px 0; }
          .totals-row.grand { border-top: 2px solid #A91F34; padding-top: 10px; font-weight: 800; font-size: 15px; color: #A91F34; }
          
          .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; margin-top: 40px; font-size: 12px; }
          .sig-box { height: 70px; border-bottom: 1px solid #ccc; margin-bottom: 6px; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <div class="top-bar">
          <div>
            <div class="brand">WANNA DIMSUM</div>
            <div class="brand-sub">Point of Sale & Business Suite</div>
          </div>
          <div>
            <div class="doc-title">SURAT PEMESANAN STOK (PO)</div>
            <div class="doc-no">${data.order.poNumber}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>Pemasok / Supplier</h4>
            <p><strong>${data.order.supplier}</strong></p>
            <p>Status PO: <strong>${data.order.status}</strong></p>
          </div>
          <div class="info-box">
            <h4>Outlet Tujuan & Tanggal</h4>
            <p>Outlet: <strong>${data.order.outlet}</strong></p>
            <p>Tanggal Pesan: <strong>${data.order.date}</strong></p>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">No</th>
              <th>Deskripsi Produk</th>
              <th style="text-align: right;">Harga Beli</th>
              <th style="text-align: center;">Satuan</th>
              <th style="text-align: center;">Jumlah Pesan</th>
              <th style="text-align: right;">Subtotal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="summary-container">
          <div class="notes-box">
            <strong>Catatan Pemesanan:</strong><br/>
            Mohon pengiriman barang disesuaikan dengan kuantitas dan spesifikasi di atas.
          </div>
          <div class="totals-box">
            <div class="totals-row">
              <span>Subtotal:</span>
              <span style="font-family: monospace;">${formatRupiah(data.calculations.rawSubtotal)}</span>
            </div>
            <div class="totals-row">
              <span>Diskon:</span>
              <span style="font-family: monospace; color: #238152;">- ${formatRupiah(data.calculations.mainDiscount)}</span>
            </div>
            <div class="totals-row">
              <span>Pajak:</span>
              <span style="font-family: monospace;">${formatRupiah(data.calculations.taxAmount)}</span>
            </div>
            <div class="totals-row grand">
              <span>Total Nominal PO:</span>
              <span style="font-family: monospace;">${formatRupiah(data.calculations.grandTotal)}</span>
            </div>
          </div>
        </div>

        <div class="sig-section">
          <div>
            <p>Pemohon (Purchasing),</p>
            <div class="sig-box"></div>
            <p><strong>Manager / Owner</strong></p>
          </div>
          <div>
            <p>Disetujui Pemasok,</p>
            <div class="sig-box"></div>
            <p><strong>Supplier Representative</strong></p>
          </div>
        </div>

        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  function handlePrintPaymentDoc(data: {
    payment: InvoicePaymentItem;
  }) {
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bukti Pembayaran Faktur - ${data.payment.paymentNumber}</title>
        <style>
          body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; padding: 32px; color: #23201F; background: #fff; line-height: 1.4; }
          .top-bar { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #238152; padding-bottom: 16px; margin-bottom: 24px; }
          .brand { font-size: 22px; font-weight: 800; color: #A91F34; letter-spacing: -0.5px; }
          .brand-sub { font-size: 12px; color: #666; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
          .doc-title { font-size: 20px; font-weight: 800; color: #238152; text-align: right; text-transform: uppercase; }
          .doc-no { font-size: 14px; font-weight: 700; color: #23201F; font-family: monospace; text-align: right; }
          
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; background: #EDF7F1; border: 1px solid #C2E6D1; padding: 18px; border-radius: 12px; margin-bottom: 24px; }
          .info-box h4 { margin: 0 0 6px 0; font-size: 11px; color: #238152; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 800; }
          .info-box p { margin: 2px 0; font-size: 12.5px; }
          
          .amount-box { background: #FFF9F2; border: 2px solid #A91F34; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px; }
          .amount-title { font-size: 12px; font-weight: 800; color: #A91F34; text-transform: uppercase; letter-spacing: 0.05em; }
          .amount-val { font-size: 26px; font-weight: 800; font-family: monospace; color: #A91F34; margin-top: 4px; }
          
          .sig-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; text-align: center; margin-top: 40px; font-size: 12px; }
          .sig-box { height: 70px; border-bottom: 1px solid #ccc; margin-bottom: 6px; }
          @media print { body { padding: 16px; } }
        </style>
      </head>
      <body>
        <div class="top-bar">
          <div>
            <div class="brand">WANNA DIMSUM</div>
            <div class="brand-sub">Point of Sale & Business Suite</div>
          </div>
          <div>
            <div class="doc-title">BUKTI PEMBAYARAN FAKTUR</div>
            <div class="doc-no">${data.payment.paymentNumber}</div>
          </div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <h4>Pemasok / Supplier</h4>
            <p><strong>${data.payment.supplier}</strong></p>
            <p>Status Transaksi: <strong style="color: #238152;">${data.payment.status}</strong></p>
          </div>
          <div class="info-box">
            <h4>Detail Transaksi</h4>
            <p>No. Referensi Faktur: <strong style="font-family: monospace;">${data.payment.invoiceNumber}</strong></p>
            <p>Tanggal Bayar: <strong>${data.payment.paymentDate}</strong></p>
            <p>Metode Pembayaran: <strong>${data.payment.method}</strong></p>
          </div>
        </div>

        <div class="amount-box">
          <div class="amount-title">Nominal Terbayar (Kas Terbayar)</div>
          <div class="amount-val">${formatRupiah(data.payment.amount)}</div>
        </div>

        <div class="sig-section">
          <div>
            <p>Dikeluarkan Oleh,</p>
            <div class="sig-box"></div>
            <p><strong>Owner / Kasir / Manager</strong></p>
          </div>
          <div>
            <p>Diterima Oleh,</p>
            <div class="sig-box"></div>
            <p><strong>Pemasok / Supplier</strong></p>
          </div>
        </div>

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
                        <button
                          onClick={() => setDetailModalItem({ type: "req", data: r })}
                          style={{ border: "1px solid rgba(35,32,31,0.14)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
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
                      <div style={{ fontWeight: 700 }}>
                        {o.supplier}
                        {o.orderType ? (
                          <div style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", fontWeight: 500 }}>
                            {o.orderType} • {o.stockSource}
                          </div>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 12.5 }}>{o.outlet}</div>
                      <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}>{formatRupiah(o.totalAmount)}</div>
                      <div>
                        <Badge text={o.status} tone={o.status === "Diterima" || o.status === "Selesai" ? "ok" : o.status === "Terkirim" ? "warn" : "neutral"} />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <button
                          onClick={() => setDetailModalItem({ type: "order", data: o })}
                          style={{ border: "1px solid rgba(35,32,31,0.14)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
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
                        <button
                          onClick={() => setDetailModalItem({ type: "invoice", data: inv })}
                          style={{ border: "1px solid rgba(35,32,31,0.14)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
                          Detail
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
                        <Badge text={p.status} tone={p.status === "Sukses" ? "ok" : p.status === "Pending" ? "warn" : "out"} />
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <button
                          onClick={() => setDetailModalItem({ type: "payment", data: p })}
                          style={{ border: "1px solid rgba(35,32,31,0.14)", background: "#fff", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                        >
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

      {/* --- DETAIL POPUP MODAL --- */}
      {detailModalItem ? (
        <div
          onClick={() => setDetailModalItem(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup wd-scroll"
            style={{
              width: "100%",
              maxWidth: 680,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 18,
              padding: 28,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.45)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid rgba(35,32,31,0.08)", paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#A91F34", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: 4 }}>
                  {detailModalItem.type === "req"
                    ? "Detail Permintaan Barang"
                    : detailModalItem.type === "order"
                    ? "Detail Pemesanan Stok (PO)"
                    : detailModalItem.type === "invoice"
                    ? "Detail Faktur Pembelian"
                    : "Detail Pembayaran Faktur"}
                </div>
                <div style={{ fontSize: 20, fontWeight: 800, fontFamily: MONO, color: "#23201F" }}>
                  {detailModalItem.type === "req"
                    ? detailModalItem.data.code
                    : detailModalItem.type === "order"
                    ? detailModalItem.data.poNumber
                    : detailModalItem.type === "invoice"
                    ? detailModalItem.data.invoiceNumber
                    : detailModalItem.data.paymentNumber}
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Badge
                  text={detailModalItem.data.status}
                  tone={
                    detailModalItem.data.status === "Selesai" || detailModalItem.data.status === "Disetujui" || detailModalItem.data.status === "Diterima" || detailModalItem.data.status === "Lunas" || detailModalItem.data.status === "Sukses"
                      ? "ok"
                      : detailModalItem.data.status === "Menunggu" || detailModalItem.data.status === "Terkirim" || detailModalItem.data.status === "Sebagian"
                      ? "warn"
                      : "neutral"
                  }
                />
                <button
                  onClick={() => setDetailModalItem(null)}
                  style={{ background: "#F5F6F8", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontWeight: 800, fontSize: 14, color: "rgba(35,32,31,0.6)" }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Info Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, background: "#FFF9F2", borderRadius: 12, padding: 16, border: "1px solid rgba(35,32,31,0.08)", marginBottom: 20 }}>
              {detailModalItem.type === "req" ? (
                <>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Kode Referensi</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: MONO }}>{detailModalItem.data.code}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Tanggal Pengajuan</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{detailModalItem.data.date}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Pemohon</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{detailModalItem.data.requester}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Outlet Tujuan</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{detailModalItem.data.outlet}</div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Catatan Permintaan</div>
                    <div style={{ fontSize: 13, color: "rgba(35,32,31,0.8)" }}>{detailModalItem.data.notes || "Tidak ada catatan khas"}</div>
                  </div>
                </>
              ) : detailModalItem.type === "order" ? (
                <>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>No. Pemesanan (PO)</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: MONO }}>{detailModalItem.data.poNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Tanggal PO</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{detailModalItem.data.date}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Pemasok / Supplier</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{detailModalItem.data.supplier}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Outlet</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{detailModalItem.data.outlet}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Jenis Pemesanan</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{detailModalItem.data.orderType || "Pemesanan Barang Jual"}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Sumber Stok</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>
                      {detailModalItem.data.stockSource || "Tanpa Referensi"}
                      {detailModalItem.data.requisitionRef ? ` (${detailModalItem.data.requisitionRef})` : ""}
                    </div>
                  </div>
                  {detailModalItem.data.downPayment ? (
                    <div>
                      <div style={{ fontSize: 11.5, color: "#238152", fontWeight: 600 }}>Uang Muka (DP)</div>
                      <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: MONO, color: "#238152" }}>
                        {formatRupiah(detailModalItem.data.downPayment)}
                      </div>
                    </div>
                  ) : null}
                  <div>
                    <div style={{ fontSize: 11.5, color: "#A91F34", fontWeight: 600 }}>Total Nominal PO</div>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: MONO, color: "#A91F34" }}>
                      {formatRupiah(detailModalItem.data.totalAmount)}
                    </div>
                  </div>
                </>
              ) : detailModalItem.type === "invoice" ? (
                <>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>No. Faktur Pembelian</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: MONO }}>{detailModalItem.data.invoiceNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Referensi No. PO</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: MONO }}>{detailModalItem.data.poNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Pemasok / Supplier</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{detailModalItem.data.supplier}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Tanggal & Jatuh Tempo</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{detailModalItem.data.date} (Jatuh Tempo: {detailModalItem.data.dueDate})</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Total Tagihan</div>
                    <div style={{ fontSize: 14, fontWeight: 800, fontFamily: MONO, color: "#A91F34" }}>{formatRupiah(detailModalItem.data.totalAmount)}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "#238152", fontWeight: 600 }}>Terbayar / Sisa</div>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: MONO }}>
                      {formatRupiah(detailModalItem.data.paidAmount)} / <span style={{ color: "#B83636" }}>{formatRupiah(detailModalItem.data.totalAmount - detailModalItem.data.paidAmount)}</span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>No. Bukti Pembayaran</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: MONO }}>{detailModalItem.data.paymentNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Referensi No. Faktur</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700, fontFamily: MONO }}>{detailModalItem.data.invoiceNumber}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Pemasok / Supplier</div>
                    <div style={{ fontSize: 13.5, fontWeight: 700 }}>{detailModalItem.data.supplier}</div>
                    <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)" }}>Jl. Raya Daan Mogot No. 45</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Tanggal & Metode Bayar</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{detailModalItem.data.paymentDate} 14:30 WIB • {detailModalItem.data.method}</div>
                  </div>
                  <div style={{ gridColumn: "span 2" }}>
                    <div style={{ fontSize: 11.5, color: "#238152", fontWeight: 600 }}>Nominal Pembayaran (Kas Terbayar)</div>
                    <div style={{ fontSize: 18, fontWeight: 800, fontFamily: MONO, color: "#238152" }}>{formatRupiah(detailModalItem.data.amount)}</div>
                  </div>
                </>
              )}
            </div>

            {/* Rincian Barang / Items Table for Order, Invoice & Payment */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 12.5, fontWeight: 800, color: "#A91F34", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Rincian Item Transaksi & Produk
              </div>
              <div style={{ border: "1px solid rgba(35,32,31,0.12)", borderRadius: 10, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1.2fr 1.3fr", gap: 8, padding: "8px 12px", background: "#FFF9F2", fontSize: 11, fontWeight: 800, color: "#A91F34" }}>
                  <div>Nama Barang</div>
                  <div>Jumlah</div>
                  <div style={{ textAlign: "right" }}>Harga Satuan</div>
                  <div style={{ textAlign: "right" }}>Total</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1.2fr 1.3fr", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(35,32,31,0.06)", fontSize: 12.5 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Daging Ayam Giling Premium</div>
                    <div style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>SKU: BB-001</div>
                  </div>
                  <div style={{ fontFamily: MONO, fontWeight: 700 }}>50 kg</div>
                  <div style={{ textAlign: "right", fontFamily: MONO }}>Rp 45.000</div>
                  <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}>Rp 2.250.000</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1.2fr 1.3fr", gap: 8, padding: "10px 12px", borderTop: "1px solid rgba(35,32,31,0.06)", fontSize: 12.5 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>Kulit Dimsum Tipis Super</div>
                    <div style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>SKU: BB-002</div>
                  </div>
                  <div style={{ fontFamily: MONO, fontWeight: 700 }}>80 pack</div>
                  <div style={{ textAlign: "right", fontFamily: MONO }}>Rp 12.000</div>
                  <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}>Rp 960.000</div>
                </div>
              </div>
            </div>

            {/* Action Footer */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  if (detailModalItem.type === "payment") {
                    handlePrintPaymentDoc({ payment: detailModalItem.data });
                  } else if (detailModalItem.type === "invoice") {
                    handlePrintInvoiceDoc({
                      invoice: detailModalItem.data,
                      items: invItems,
                      calculations: invCalculations,
                    });
                  } else if (detailModalItem.type === "order") {
                    handlePrintPODoc({
                      order: detailModalItem.data,
                      items: poItems,
                      calculations: poCalculations,
                    });
                  } else {
                    handleExportPdf();
                  }
                }}
                style={{
                  height: 38, padding: "0 16px", borderRadius: 9, border: "1px solid rgba(35,32,31,0.14)",
                  background: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: 6
                }}
              >
                {ic("printer", 14, "currentColor", 2)}
                Cetak PDF
              </button>

              {/* Tombol Void Pembatalan Transaksi */}
              <button
                type="button"
                onClick={() => {
                  if (detailModalItem.type === "payment") {
                    const payData = detailModalItem.data as InvoicePaymentItem;
                    setPayments((prev) => prev.map((p) => (p.id === payData.id ? { ...p, status: "Dibatalkan" } : p)));
                    setInvoices((prev) =>
                      prev.map((inv) => {
                        if (inv.invoiceNumber === payData.invoiceNumber || payData.invoiceNumber.includes(inv.invoiceNumber)) {
                          const newPaid = Math.max(0, inv.paidAmount - payData.amount);
                          return { ...inv, paidAmount: newPaid, status: newPaid > 0 ? "Sebagian" : "Belum Lunas" };
                        }
                        return inv;
                      })
                    );
                    setMsg({ type: "ok", text: `Pembayaran "${payData.paymentNumber}" telah di-void (dibatalkan). Tagihan faktur dikembalikan ke Belum Lunas.` });
                  } else if (detailModalItem.type === "invoice") {
                    const invData = detailModalItem.data as PurchaseInvoiceItem;
                    setInvoices((prev) => prev.map((i) => (i.id === invData.id ? { ...i, status: "Dibatalkan" } : i)));
                    if (invData.poNumber && invData.poNumber !== "-") {
                      setOrders((prev) => prev.map((o) => (o.poNumber === invData.poNumber ? { ...o, status: "Draft" } : o)));
                    }
                    setMsg({ type: "ok", text: `Faktur Pembelian "${invData.invoiceNumber}" telah di-void (dibatalkan). Status PO dikembalikan.` });
                  } else if (detailModalItem.type === "order") {
                    const orderData = detailModalItem.data as PurchaseOrderItem;
                    setOrders((prev) => prev.map((o) => (o.id === orderData.id ? { ...o, status: "Draft" } : o)));
                    setMsg({ type: "ok", text: `Pemesanan Stok "${orderData.poNumber}" telah di-void (dibatalkan).` });
                  } else {
                    const reqData = detailModalItem.data as RequisitionItem;
                    setRequisitions((prev) => prev.map((r) => (r.id === reqData.id ? { ...r, status: "Dibatalkan" } : r)));
                    setMsg({ type: "ok", text: `Permintaan Barang "${reqData.code}" telah di-void (dibatalkan).` });
                  }
                  setDetailModalItem(null);
                }}
                style={{
                  height: 38,
                  padding: "0 16px",
                  borderRadius: 9,
                  border: "1px solid #E5C3C3",
                  background: "#FFF2F2",
                  color: "#B83636",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                {ic("ban", 14, "#B83636", 2)}
                Void Pembatalan
              </button>

              {/* Tombol Selanjutnya ke Preview PO / Preview Faktur */}
              {detailModalItem.type === "order" ? (
                <button
                  type="button"
                  onClick={() => {
                    const orderData = detailModalItem.data as PurchaseOrderItem;
                    setDetailModalItem(null);
                    setPoPreviewModal({
                      order: orderData,
                      items: poItems,
                      fees: poOtherFees,
                      calculations: poCalculations,
                    });
                  }}
                  style={{
                    height: 38,
                    padding: "0 18px",
                    borderRadius: 9,
                    border: "none",
                    background: "#238152",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Selanjutnya (Preview PO) →
                </button>
              ) : detailModalItem.type === "invoice" ? (
                <button
                  type="button"
                  onClick={() => {
                    const invData = detailModalItem.data as PurchaseInvoiceItem;
                    setDetailModalItem(null);
                    setInvoicePreviewModal({
                      invoice: invData,
                      items: invItems,
                      calculations: invCalculations,
                      notes: "",
                      files: [],
                      supplierAddress: "Jl. Raya Daan Mogot No. 45, Jakarta Barat",
                      supplierPhone: "021-555-1200",
                      supplierEmail: "supplier@poultry.co.id",
                      jenisPembelian: "Pembelian Barang Jual",
                      sumberStok: "Referensikan Pemesanan Stok",
                      orderDate: invData.date,
                    });
                  }}
                  style={{
                    height: 38,
                    padding: "0 18px",
                    borderRadius: 9,
                    border: "none",
                    background: "#238152",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Selanjutnya (Preview Faktur) →
                </button>
              ) : null}

              <button
                onClick={() => setDetailModalItem(null)}
                style={{ height: 38, padding: "0 20px", borderRadius: 9, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- PO PREVIEW MODAL (DIRECT AFTER SAVE PO) --- */}
      {poPreviewModal ? (
        <div
          onClick={() => setPoPreviewModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 85, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup wd-scroll"
            style={{
              width: "100%",
              maxWidth: 880,
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Top Banner Status */}
            <div style={{ background: "#EDF7F1", border: "1px solid #C2E6D1", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {ic("checkCircle", 20, "#1C6B42", 2.2)}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1C6B42" }}>
                    Pemesanan Stok {poPreviewModal.order.poNumber} Berhasil Dibuat!
                  </div>
                  <div style={{ fontSize: 12, color: "#238152", marginTop: 2 }}>
                    Status saat ini: <strong>{poPreviewModal.order.status}</strong> • Silakan lakukan tindakan seperti buat faktur atau cetak.
                  </div>
                </div>
              </div>
            </div>

            {/* Header & Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(35,32,31,0.08)", paddingBottom: 16, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#A91F34", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Preview Pemesanan Stok (PO)
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: MONO, color: "#23201F" }}>
                  {poPreviewModal.order.poNumber}
                </div>
              </div>

              {/* Action Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
                {/* Dropdown Tindakan */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setTindakanDropdownOpen((v) => !v)}
                    style={{
                      height: 40,
                      padding: "0 16px",
                      borderRadius: 10,
                      border: "none",
                      background: "#A91F34",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {ic("settings", 15, "#fff", 2.2)}
                    Tindakan
                    {ic("chevronDown", 14, "#fff", 2)}
                  </button>

                  {tindakanDropdownOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 46,
                        width: 220,
                        background: "#fff",
                        borderRadius: 12,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                        border: "1px solid rgba(35,32,31,0.1)",
                        overflow: "hidden",
                        zIndex: 95,
                      }}
                    >
                      <button
                        onClick={() => {
                          setTindakanDropdownOpen(false);
                          handlePrintPODoc(poPreviewModal);
                        }}
                        style={{ width: "100%", padding: "11px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(35,32,31,0.05)" }}
                      >
                        {ic("printer", 15, "currentColor", 2)}
                        Cetak Pemesanan Stok
                      </button>
                      <button
                        onClick={() => {
                          setTindakanDropdownOpen(false);
                          setMsg({ type: "ok", text: `Pemesanan Stok "${poPreviewModal.order.poNumber}" berhasil dikirim via Email ke ${poPreviewModal.order.supplier}!` });
                        }}
                        style={{ width: "100%", padding: "11px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(35,32,31,0.05)" }}
                      >
                        {ic("mail", 15, "currentColor", 2)}
                        Kirim Email
                      </button>
                      <button
                        onClick={() => {
                          setTindakanDropdownOpen(false);
                          openCreateInvoiceFromPO(poPreviewModal);
                        }}
                        style={{ width: "100%", padding: "11px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "#A91F34", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(35,32,31,0.05)" }}
                      >
                        {ic("filePlus", 15, "#A91F34", 2)}
                        Buat Faktur Pembelian
                      </button>
                      <button
                        onClick={() => {
                          setTindakanDropdownOpen(false);
                          setMsg({ type: "ok", text: `Pengiriman Pembelian untuk ${poPreviewModal.order.poNumber} berhasil dibuat!` });
                        }}
                        style={{ width: "100%", padding: "11px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                      >
                        {ic("truck", 15, "currentColor", 2)}
                        Buat Pengiriman Pembelian
                      </button>
                    </div>
                  ) : null}
                </div>

                {/* Tombol Void */}
                <button
                  type="button"
                  onClick={() => {
                    setOrders((prev) => prev.map((o) => (o.id === poPreviewModal.order.id ? { ...o, status: "Draft" } : o)));
                    setMsg({ type: "ok", text: `Pemesanan Stok "${poPreviewModal.order.poNumber}" telah di-void / dibatalkan.` });
                    setPoPreviewModal(null);
                  }}
                  style={{
                    height: 40,
                    padding: "0 14px",
                    borderRadius: 10,
                    border: "1px solid #E5C3C3",
                    background: "#FFF2F2",
                    color: "#B83636",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {ic("ban", 15, "#B83636", 2)}
                  Void
                </button>

                {/* Tombol Tutup */}
                <button
                  type="button"
                  onClick={() => setPoPreviewModal(null)}
                  style={{
                    height: 40,
                    padding: "0 16px",
                    borderRadius: 10,
                    border: "1px solid rgba(35,32,31,0.14)",
                    background: "#fff",
                    color: "rgba(35,32,31,0.8)",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Detail PO Info Card */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, background: "#FFF9F2", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Pemasok / Supplier</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{poPreviewModal.order.supplier}</div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>Jl. Raya Daan Mogot No. 45</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Outlet Tujuan</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{poPreviewModal.order.outlet}</div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>Tanggal: {poPreviewModal.order.date}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Jenis & Sumber Stok</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2 }}>{poPreviewModal.order.orderType || "Pemesanan Barang Jual"}</div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>{poPreviewModal.order.stockSource || "Tanpa Referensi"}</div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#A91F34", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Rincian Barang Pemesanan ({poPreviewModal.items.length} Items)
              </div>
              <div style={{ border: "1px solid rgba(35,32,31,0.12)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1.3fr 1.3fr 1.4fr", gap: 8, padding: "10px 14px", background: "#FFF9F2", fontSize: 11, fontWeight: 800, color: "#A91F34", textTransform: "uppercase" }}>
                  <div>Barang</div>
                  <div>Jumlah</div>
                  <div>Satuan</div>
                  <div style={{ textAlign: "right" }}>Harga Satuan</div>
                  <div style={{ textAlign: "right" }}>Diskon</div>
                  <div style={{ textAlign: "right" }}>Total</div>
                </div>
                {poPreviewModal.items.map((item) => {
                  let itemDisc = 0;
                  if (item.discountType === "persen") {
                    itemDisc = (item.qty * item.unitPrice * (item.discountVal || 0)) / 100;
                  } else {
                    itemDisc = item.discountVal || 0;
                  }
                  const lineTotal = Math.max(0, item.qty * item.unitPrice - itemDisc);
                  return (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1fr 1fr 1.3fr 1.3fr 1.4fr", gap: 8, padding: "12px 14px", borderTop: "1px solid rgba(35,32,31,0.06)", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>SKU: {item.code}</div>
                        {item.notes ? <div style={{ fontSize: 11, color: "rgba(35,32,31,0.6)", fontStyle: "italic", marginTop: 2 }}>{item.notes}</div> : null}
                      </div>
                      <div style={{ fontFamily: MONO, fontWeight: 700 }}>{item.qty}</div>
                      <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.7)" }}>{item.unit}</div>
                      <div style={{ textAlign: "right", fontFamily: MONO }}>{formatRupiah(item.unitPrice)}</div>
                      <div style={{ textAlign: "right", fontFamily: MONO, color: itemDisc > 0 ? "#238152" : "inherit" }}>
                        {itemDisc > 0 ? `- ${formatRupiah(itemDisc)}` : "Rp 0"}
                      </div>
                      <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}>
                        {formatRupiah(lineTotal)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Summary Grand Total */}
            <div style={{ background: "#FAFAFA", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)", display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(35,32,31,0.6)" }}>Subtotal Barang</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(poPreviewModal.calculations.rawSubtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(35,32,31,0.6)" }}>Total Diskon</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, color: "#238152" }}>- {formatRupiah(poPreviewModal.calculations.mainDiscount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(35,32,31,0.6)" }}>Total Pajak</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(poPreviewModal.calculations.taxAmount)}</span>
                </div>
                {poPreviewModal.fees.map((f) => (
                  <div key={f.id} style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>{f.name}</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(f.amount)}</span>
                  </div>
                ))}
                <div style={{ borderTop: "2px solid #A91F34", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>Total Harga (Grand Total)</span>
                  <span style={{ fontSize: 18, fontWeight: 800, fontFamily: MONO, color: "#A91F34" }}>
                    {formatRupiah(poPreviewModal.calculations.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- INVOICE PREVIEW MODAL (DIRECT AFTER SAVE INVOICE) --- */}
      {invoicePreviewModal ? (
        <div
          onClick={() => setInvoicePreviewModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 85, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup wd-scroll"
            style={{
              width: "100%",
              maxWidth: 880,
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Top Banner Status */}
            <div style={{ background: "#EDF7F1", border: "1px solid #C2E6D1", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {ic("checkCircle", 20, "#1C6B42", 2.2)}
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13.5, color: "#1C6B42" }}>
                    Faktur Pembelian {invoicePreviewModal.invoice.invoiceNumber} Berhasil Dibuat!
                  </div>
                  <div style={{ fontSize: 12, color: "#238152", marginTop: 2 }}>
                    Status Tagihan: <strong>{invoicePreviewModal.invoice.status}</strong> • Nilai Tagihan: {formatRupiah(invoicePreviewModal.invoice.totalAmount)}
                  </div>
                </div>
              </div>
            </div>

            {/* Header & Actions */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(35,32,31,0.08)", paddingBottom: 16, marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#A91F34", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Preview Faktur Pembelian
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: MONO, color: "#23201F" }}>
                  {invoicePreviewModal.invoice.invoiceNumber}
                </div>
              </div>

              {/* Action Buttons & Dropdown Tindakan */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
                {/* Dropdown Tindakan */}
                <div style={{ position: "relative" }}>
                  <button
                    type="button"
                    onClick={() => setInvTindakanDropdownOpen((v) => !v)}
                    style={{
                      height: 40,
                      padding: "0 16px",
                      borderRadius: 10,
                      border: "none",
                      background: "#A91F34",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {ic("settings", 15, "#fff", 2.2)}
                    Tindakan
                    {ic("chevronDown", 14, "#fff", 2)}
                  </button>

                  {invTindakanDropdownOpen ? (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 46,
                        width: 220,
                        background: "#fff",
                        borderRadius: 12,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.18)",
                        border: "1px solid rgba(35,32,31,0.1)",
                        overflow: "hidden",
                        zIndex: 95,
                      }}
                    >
                      <button
                        onClick={() => {
                          setInvTindakanDropdownOpen(false);
                          handlePrintInvoiceDoc(invoicePreviewModal);
                        }}
                        style={{ width: "100%", padding: "11px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(35,32,31,0.05)" }}
                      >
                        {ic("printer", 15, "currentColor", 2)}
                        Cetak Faktur PDF
                      </button>
                      <button
                        onClick={() => {
                          setInvTindakanDropdownOpen(false);
                          setMsg({ type: "ok", text: `Faktur "${invoicePreviewModal.invoice.invoiceNumber}" telah dikirimkan via Email.` });
                        }}
                        style={{ width: "100%", padding: "11px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(35,32,31,0.05)" }}
                      >
                        {ic("mail", 15, "currentColor", 2)}
                        Kirim Email
                      </button>
                      <button
                        onClick={() => {
                          setInvTindakanDropdownOpen(false);
                          openCreatePaymentFromInvoice(invoicePreviewModal.invoice);
                        }}
                        style={{ width: "100%", padding: "11px 16px", textAlign: "left", background: "none", border: "none", fontSize: 13, fontWeight: 700, color: "#238152", cursor: "pointer", display: "flex", alignItems: "center", gap: 10 }}
                      >
                        {ic("wallet", 15, "#238152", 2)}
                        Bayar Faktur
                      </button>
                    </div>
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => setInvoicePreviewModal(null)}
                  style={{
                    height: 40,
                    padding: "0 18px",
                    borderRadius: 10,
                    border: "none",
                    background: "#23201F",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* Detail Info Card */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, background: "#FFF9F2", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)", marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Pemasok / Supplier</div>
                <div style={{ fontSize: 14, fontWeight: 800, marginTop: 2 }}>{invoicePreviewModal.invoice.supplier}</div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>{invoicePreviewModal.supplierAddress}</div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>HP: {invoicePreviewModal.supplierPhone}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Tanggal & Jatuh Tempo</div>
                <div style={{ fontSize: 13.5, fontWeight: 700, marginTop: 2 }}>{invoicePreviewModal.invoice.date}</div>
                <div style={{ fontSize: 12, color: "#A91F34", fontWeight: 700 }}>Jatuh Tempo: {invoicePreviewModal.invoice.dueDate}</div>
              </div>
              <div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontWeight: 600 }}>Referensi & Jenis</div>
                <div style={{ fontSize: 13, fontWeight: 700, marginTop: 2, fontFamily: MONO }}>Ref PO: {invoicePreviewModal.invoice.poNumber}</div>
                <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>{invoicePreviewModal.jenisPembelian} • {invoicePreviewModal.sumberStok}</div>
              </div>
            </div>

            {/* Items Table */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#A91F34", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Rincian Barang Faktur ({invoicePreviewModal.items.length} Items)
              </div>
              <div style={{ border: "1px solid rgba(35,32,31,0.12)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.5fr 1.2fr 1fr 1fr 1.4fr", gap: 8, padding: "10px 14px", background: "#FFF9F2", fontSize: 11, fontWeight: 800, color: "#A91F34", textTransform: "uppercase" }}>
                  <div>Produk</div>
                  <div style={{ textAlign: "right" }}>Harga Beli</div>
                  <div>Satuan</div>
                  <div>Diterima</div>
                  <div style={{ textAlign: "right" }}>Total</div>
                </div>
                {invoicePreviewModal.items.map((item) => {
                  let itemDisc = 0;
                  if (item.discountType === "persen") {
                    itemDisc = (item.qtyReceived * item.unitPrice * (item.discountVal || 0)) / 100;
                  } else {
                    itemDisc = item.discountVal || 0;
                  }
                  const lineTotal = Math.max(0, item.qtyReceived * item.unitPrice - itemDisc);
                  return (
                    <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2.5fr 1.2fr 1fr 1fr 1.4fr", gap: 8, padding: "12px 14px", borderTop: "1px solid rgba(35,32,31,0.06)", alignItems: "center" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>SKU: {item.code}</div>
                      </div>
                      <div style={{ textAlign: "right", fontFamily: MONO }}>{formatRupiah(item.unitPrice)}</div>
                      <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.7)" }}>{item.unit}</div>
                      <div style={{ fontFamily: MONO, fontWeight: 700 }}>{item.qtyReceived}</div>
                      <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}>
                        {formatRupiah(lineTotal)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes & Pre-Order Files */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
              {invoicePreviewModal.notes ? (
                <div style={{ background: "#F5F6F8", padding: 14, borderRadius: 10, border: "1px solid rgba(35,32,31,0.08)" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(35,32,31,0.6)", marginBottom: 4 }}>Catatan Faktur:</div>
                  <div style={{ fontSize: 12.5, color: "#238152" }}>{invoicePreviewModal.notes}</div>
                </div>
              ) : null}

              {invoicePreviewModal.files.length > 0 ? (
                <div style={{ background: "#F5F6F8", padding: 14, borderRadius: 10, border: "1px solid rgba(35,32,31,0.08)" }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: "rgba(35,32,31,0.6)", marginBottom: 6 }}>File Pre-Order Terlampir ({invoicePreviewModal.files.length}):</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {invoicePreviewModal.files.map((f) => (
                      <div key={f.id} style={{ fontSize: 12, fontWeight: 600, color: "#A91F34", display: "flex", alignItems: "center", gap: 6 }}>
                        {ic("invoice", 14, "#A91F34", 2)} {f.name} <span style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>({(f.size / 1024).toFixed(1)} KB)</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Summary Grand Total */}
            <div style={{ background: "#FAFAFA", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)", display: "flex", justifyContent: "flex-end" }}>
              <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(35,32,31,0.6)" }}>Subtotal Barang</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(invoicePreviewModal.calculations.rawSubtotal)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(35,32,31,0.6)" }}>Total Diskon</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700, color: "#238152" }}>- {formatRupiah(invoicePreviewModal.calculations.mainDiscount)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(35,32,31,0.6)" }}>Total Pajak</span>
                  <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(invoicePreviewModal.calculations.taxAmount)}</span>
                </div>
                <div style={{ borderTop: "2px solid #A91F34", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: 14, fontWeight: 800 }}>Total Harga (Grand Total)</span>
                  <span style={{ fontSize: 18, fontWeight: 800, fontFamily: MONO, color: "#A91F34" }}>
                    {formatRupiah(invoicePreviewModal.calculations.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- COMPREHENSIVE TAMBAH FAKTUR PEMBELIAN MODAL --- */}
      {createInvoiceModalOpen ? (
        <div
          onClick={() => setCreateInvoiceModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup wd-scroll"
            style={{
              width: "100%",
              maxWidth: 960,
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
              display: "flex",
              flexDirection: "column",
              gap: 22,
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(35,32,31,0.08)", paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#A91F34", letterSpacing: "-0.01em" }}>
                  Form Tambah Faktur Pembelian
                </div>
                <div style={{ fontSize: 13, color: "rgba(35,32,31,0.55)", marginTop: 2 }}>
                  Isi informasi distribusi, rincian barang diterima, termin tagihan & unggah file pre-order.
                </div>
              </div>
              <button
                onClick={() => setCreateInvoiceModalOpen(false)}
                style={{ background: "#F5F6F8", border: "none", borderRadius: "50%", width: 34, height: 34, cursor: "pointer", fontWeight: 800, fontSize: 14, color: "rgba(35,32,31,0.6)" }}
              >
                ✕
              </button>
            </div>

            {/* 1. Jenis Pembelian & Sumber Stok */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "#FFF9F2", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)" }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 800, display: "block", marginBottom: 8, color: "#23201F" }}>
                  Jenis Pembelian <span style={{ color: "#A91F34" }}>*</span>
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <label
                    onClick={() => setInvJenisPembelian("Pembelian Barang Jual")}
                    style={{
                      flex: 1, padding: "10px 12px", borderRadius: 10, border: invJenisPembelian === "Pembelian Barang Jual" ? "2px solid #A91F34" : "1px solid rgba(35,32,31,0.14)",
                      background: invJenisPembelian === "Pembelian Barang Jual" ? "#fff" : "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8
                    }}
                  >
                    <input type="radio" checked={invJenisPembelian === "Pembelian Barang Jual"} onChange={() => {}} style={{ accentColor: "#A91F34" }} />
                    Pembelian Barang Jual
                  </label>
                  <label
                    onClick={() => setInvJenisPembelian("Pembelian Aset")}
                    style={{
                      flex: 1, padding: "10px 12px", borderRadius: 10, border: invJenisPembelian === "Pembelian Aset" ? "2px solid #A91F34" : "1px solid rgba(35,32,31,0.14)",
                      background: invJenisPembelian === "Pembelian Aset" ? "#fff" : "transparent", cursor: "pointer", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8
                    }}
                  >
                    <input type="radio" checked={invJenisPembelian === "Pembelian Aset"} onChange={() => {}} style={{ accentColor: "#A91F34" }} />
                    Pembelian Aset
                  </label>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 800, display: "block", marginBottom: 8, color: "#23201F" }}>
                  Sumber Stok <span style={{ color: "#A91F34" }}>*</span>
                </label>
                <select
                  value={invSumberStok}
                  onChange={(e) => setInvSumberStok(e.target.value as any)}
                  style={{ ...inpStyle, height: 42, fontWeight: 700 }}
                >
                  <option value="Tanpa Nomor Referensi">Tanpa Nomor Referensi</option>
                  <option value="Referensikan Pemesanan Stok">Referensikan Pemesanan Stok</option>
                </select>
              </div>
            </div>

            {/* 2. Detail Stok & Distribusi */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>No. Pemesanan Stok (PO)</label>
                <input
                  value={invPoNumber}
                  onChange={(e) => {
                    const val = e.target.value;
                    setInvPoNumber(val);
                    if (val && val !== "-") {
                      const nextSeq = String(invoices.length + 1).padStart(4, "0");
                      setInvInvoiceNumber(`${val}/${nextSeq}`);
                    }
                  }}
                  placeholder="e.g. PO-2026-089"
                  style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>No. Faktur Pembelian (Sistem)</label>
                <input
                  value={invInvoiceNumber}
                  onChange={(e) => setInvInvoiceNumber(e.target.value)}
                  placeholder="e.g. PO-2026-089/0004"
                  style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Nama Pemasok / Supplier</label>
                <input
                  value={invSupplierName}
                  onChange={(e) => setInvSupplierName(e.target.value)}
                  style={{ ...inpStyle, fontWeight: 700 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Outlet Tujuan</label>
                <select value={invOutlet} onChange={(e) => setInvOutlet(e.target.value)} style={inpStyle}>
                  <option value="Outlet Utama - Jakarta">Outlet Utama - Jakarta</option>
                  <option value="Cabang Bandung">Cabang Bandung</option>
                  <option value="Cabang Surabaya">Cabang Surabaya</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>No. Ponsel Pemasok</label>
                <input value={invSupplierPhone} onChange={(e) => setInvSupplierPhone(e.target.value)} style={inpStyle} />
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Email Pemasok</label>
                <input value={invSupplierEmail} onChange={(e) => setInvSupplierEmail(e.target.value)} style={inpStyle} />
              </div>

              <div style={{ gridColumn: "span 3" }}>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Alamat Pemasok</label>
                <input value={invSupplierAddress} onChange={(e) => setInvSupplierAddress(e.target.value)} style={inpStyle} />
              </div>
            </div>

            {/* 3. Tanggal & Termin Pembayaran */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Tanggal Pesan</label>
                <input type="date" value={invOrderDate} onChange={(e) => setInvOrderDate(e.target.value)} style={{ ...inpStyle, fontFamily: MONO }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Tanggal Pembuatan Faktur</label>
                <input type="date" value={invInvoiceDate} onChange={(e) => setInvInvoiceDate(e.target.value)} style={{ ...inpStyle, fontFamily: MONO }} />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Termin Pembayaran (Jatuh Tempo)</label>
                <input type="date" value={invDueDate} onChange={(e) => setInvDueDate(e.target.value)} style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700, color: "#A91F34" }} />
              </div>
            </div>

            {/* 4. Tabel Barang Diterima (Ngelink Pemesanan Stok) */}
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#23201F" }}>Rincian Barang Faktur</div>
                  <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)" }}>Item yang difakturkan dari Pemesanan Stok</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAturBarangModalOpen(true)}
                  style={{
                    height: 36, padding: "0 14px", borderRadius: 8, border: "1.5px solid #A91F34",
                    background: "#FFF9F2", color: "#A91F34", fontFamily: "inherit", fontSize: 12.5, fontWeight: 800,
                    cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6
                  }}
                >
                  {ic("plus", 14, "#A91F34", 2.4)}
                  Atur Barang Diterima
                </button>
              </div>

              {/* Table */}
              <div style={{ border: "1px solid rgba(35,32,31,0.12)", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 0.8fr 1fr 0.8fr 1.2fr 1.3fr 0.4fr", gap: 8, padding: "10px 14px", background: "#FFF9F2", fontSize: 11, fontWeight: 800, color: "#A91F34", textTransform: "uppercase" }}>
                  <div>Produk</div>
                  <div style={{ textAlign: "right" }}>Harga Beli (Rp)</div>
                  <div>Satuan</div>
                  <div>Diterima</div>
                  <div>Sisa</div>
                  <div style={{ textAlign: "right" }}>Diskon</div>
                  <div style={{ textAlign: "right" }}>Total</div>
                  <div style={{ textAlign: "center" }}>Hapus</div>
                </div>

                {invItems.filter((i) => i.selected).length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "rgba(35,32,31,0.45)", fontSize: 13 }}>
                    Belum ada barang yang dipilih. Klik <strong>&quot;Atur Barang Diterima&quot;</strong> untuk memilih item dari PO.
                  </div>
                ) : (
                  invItems
                    .filter((i) => i.selected)
                    .map((item) => {
                      let itemDisc = 0;
                      if (item.discountType === "persen") {
                        itemDisc = (item.qtyReceived * item.unitPrice * (item.discountVal || 0)) / 100;
                      } else {
                        itemDisc = item.discountVal || 0;
                      }
                      const lineTotal = Math.max(0, item.qtyReceived * item.unitPrice - itemDisc);
                      const sisaQty = Math.max(0, item.qtyOrdered - item.qtyReceived);

                      return (
                        <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2.2fr 1.2fr 0.8fr 1fr 0.8fr 1.2fr 1.3fr 0.4fr", gap: 8, padding: "10px 14px", borderTop: "1px solid rgba(35,32,31,0.06)", alignItems: "center" }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                            <div style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>SKU: {item.code} • Dipesan: {item.qtyOrdered} {item.unit}</div>
                          </div>

                          <div>
                            <input
                              type="number"
                              value={item.unitPrice}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setInvItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, unitPrice: val } : x)));
                              }}
                              style={{ ...inpStyle, height: 32, fontFamily: MONO, textAlign: "right" }}
                            />
                          </div>

                          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.7)" }}>{item.unit}</div>

                          <div>
                            <input
                              type="number"
                              min={0}
                              value={item.qtyReceived}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                setInvItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, qtyReceived: val } : x)));
                              }}
                              style={{ ...inpStyle, height: 32, fontFamily: MONO, fontWeight: 700, textAlign: "center" }}
                            />
                          </div>

                          <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: sisaQty > 0 ? "#B83636" : "#238152" }}>
                            {sisaQty}
                          </div>

                          <div style={{ display: "flex", gap: 4 }}>
                            <select
                              value={item.discountType}
                              onChange={(e) => {
                                const val = e.target.value as "nominal" | "persen";
                                setInvItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, discountType: val } : x)));
                              }}
                              style={{ height: 32, fontSize: 10, borderRadius: 6, border: "1px solid rgba(35,32,31,0.14)" }}
                            >
                              <option value="nominal">Rp</option>
                              <option value="persen">%</option>
                            </select>
                            <input
                              type="number"
                              value={item.discountVal || ""}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setInvItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, discountVal: val } : x)));
                              }}
                              placeholder="0"
                              style={{ ...inpStyle, height: 32, fontFamily: MONO, textAlign: "right", padding: "0 6px" }}
                            />
                          </div>

                          <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, fontSize: 13, color: "#A91F34" }}>
                            {formatRupiah(lineTotal)}
                          </div>

                          <div style={{ textAlign: "center" }}>
                            <button
                              type="button"
                              onClick={() => {
                                setInvItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, selected: false } : x)));
                              }}
                              style={{ background: "none", border: "none", color: "#B83636", cursor: "pointer", fontWeight: 800, fontSize: 14 }}
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Toggle ON/OFF Terima Stok */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F5F6F8", borderRadius: 10, padding: "10px 14px", marginTop: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#23201F" }}>
                  Otomatis Tambahkan Jumlah Stok ke Inventori (Kelola Stok)
                </div>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={invReceiveStock}
                    onChange={(e) => setInvReceiveStock(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "#238152" }}
                  />
                  <span style={{ fontSize: 12, fontWeight: 800, color: invReceiveStock ? "#238152" : "rgba(35,32,31,0.5)" }}>
                    {invReceiveStock ? "ON (Terima Stok)" : "OFF"}
                  </span>
                </label>
              </div>
            </div>

            {/* 5. Rincian Tagihan & Keterangan */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, background: "#FAFAFA", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)" }}>
              {/* Left: Input Keterangan & File Upload */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 700, display: "block", marginBottom: 6 }}>Keterangan / Catatan Faktur (Diisi Manual)</label>
                  <textarea
                    value={invNotes}
                    onChange={(e) => setInvNotes(e.target.value)}
                    placeholder="Catatan faktur pembelian, nomor resi pengiriman, atau instruksi penerimaan..."
                    rows={3}
                    style={{ ...inpStyle, height: "auto", padding: "10px 12px", fontSize: 12.5 }}
                  />
                </div>

                {/* Unggah File Pre-Order */}
                <div>
                  <label style={{ fontSize: 12.5, fontWeight: 800, display: "block", marginBottom: 6 }}>
                    Unggah File Pre-Order (Format: PDF, Excel, Word, JPG, PNG, ZIP — Maks 5 File, Max 2MB/File)
                  </label>
                  <div style={{ border: "2px dashed rgba(35,32,31,0.18)", borderRadius: 10, padding: 14, textAlign: "center", background: "#fff" }}>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.zip"
                      onChange={handleInvFileUpload}
                      style={{ display: "none" }}
                      id="preorder-file-input"
                    />
                    <label htmlFor="preorder-file-input" style={{ cursor: "pointer", fontSize: 12.5, fontWeight: 700, color: "#A91F34" }}>
                      📁 Klik atau Tarik File Pre-Order ke Sini untuk Mengunggah
                    </label>

                    {invFiles.length > 0 ? (
                      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6, textAlign: "left" }}>
                        {invFiles.map((f) => (
                          <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#F5F6F8", padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>
                            <span style={{ fontWeight: 600, color: "#23201F", display: "inline-flex", alignItems: "center", gap: 6 }}>
                              {ic("invoice", 14, "#A91F34", 2)} {f.name} <span style={{ color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>({(f.size / 1024).toFixed(1)} KB)</span>
                            </span>
                            <button type="button" onClick={() => setInvFiles((prev) => prev.filter((x) => x.id !== f.id))} style={{ background: "none", border: "none", color: "#B83636", cursor: "pointer", fontWeight: 800 }}>✕</button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Right: Rincian Calculation Preview */}
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid rgba(35,32,31,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#A91F34", marginBottom: 10, borderBottom: "1px dashed rgba(35,32,31,0.12)", paddingBottom: 6 }}>
                  Rincian Tagihan Faktur
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Subtotal Barang</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(invCalculations.rawSubtotal)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Total Diskon</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700, color: "#238152" }}>- {formatRupiah(invCalculations.mainDiscount)}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Total Pajak</span>
                    <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(invCalculations.taxAmount)}</span>
                  </div>

                  <div style={{ borderTop: "2px solid #A91F34", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: 14, fontWeight: 800 }}>Total Harga (Grand Total)</span>
                    <span style={{ fontSize: 18, fontWeight: 800, fontFamily: MONO, color: "#A91F34" }}>
                      {formatRupiah(invCalculations.grandTotal)}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <button
                    type="button"
                    onClick={() => setCreateInvoiceModalOpen(false)}
                    style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveInvoiceSubmit}
                    style={{ flex: 1.5, height: 42, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}
                  >
                    Simpan Faktur Pembelian
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- SUB-MODAL ATUR BARANG DITERIMA --- */}
      {aturBarangModalOpen ? (
        <div
          onClick={() => setAturBarangModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup"
            style={{ width: "100%", maxWidth: 540, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 25px 50px rgba(0,0,0,0.3)" }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: "#A91F34", marginBottom: 4 }}>
              Atur Barang Diterima (Item Faktur)
            </div>
            <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.55)", marginBottom: 16 }}>
              Pilih dan ceklis item mana saja dari Pemesanan Stok yang akan difakturkan (misal: 2 dari 5 item).
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 320, overflowY: "auto", marginBottom: 18 }}>
              {invItems.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FFF9F2", border: "1px solid rgba(35,32,31,0.08)", padding: "10px 12px", borderRadius: 10 }}>
                  <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", flex: 1 }}>
                    <input
                      type="checkbox"
                      checked={item.selected}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setInvItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, selected: checked } : x)));
                      }}
                      style={{ width: 18, height: 18, accentColor: "#A91F34" }}
                    />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{item.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)", fontFamily: MONO }}>SKU: {item.code} • Order: {item.qtyOrdered} {item.unit}</div>
                    </div>
                  </label>
                  {item.selected ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>Terima:</span>
                      <input
                        type="number"
                        value={item.qtyReceived}
                        onChange={(e) => {
                          const val = Math.max(0, Number(e.target.value));
                          setInvItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, qtyReceived: val } : x)));
                        }}
                        style={{ width: 60, height: 32, borderRadius: 6, border: "1px solid rgba(35,32,31,0.14)", fontFamily: MONO, textAlign: "center", fontWeight: 700 }}
                      />
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  // Select all
                  setInvItems((prev) => prev.map((x) => ({ ...x, selected: true })));
                }}
                style={{ height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Ceklis Semua (5/5)
              </button>
              <button
                type="button"
                onClick={() => setAturBarangModalOpen(false)}
                style={{ height: 38, padding: "0 18px", borderRadius: 8, border: "none", background: "#A91F34", color: "#fff", fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {createModalOpen ? (
        <div
          onClick={() => setCreateModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
        >
          {isOrder ? (
            /* --- 2-STEP PO MODAL WIZARD FOR PEMESANAN STOK --- */
            <div
              onClick={(e) => e.stopPropagation()}
              className="wd-slideup wd-scroll"
              style={{
                width: "100%",
                maxWidth: 940,
                maxHeight: "90vh",
                overflowY: "auto",
                background: "#fff",
                borderRadius: 18,
                padding: 28,
                boxShadow: "0 30px 60px -20px rgba(0,0,0,0.45)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Header with Step Indicator */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(35,32,31,0.08)", paddingBottom: 16, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#A91F34", letterSpacing: "-0.01em" }}>
                    Form Pemesanan Stok (Purchase Order)
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(35,32,31,0.55)", marginTop: 2 }}>
                    Langkah {poStep} dari 2 — {poStep === 1 ? "Informasi Pemesanan Stok" : "Detail Pemesanan Stok & Rincian Barang"}
                  </div>
                </div>

                {/* Step Bar */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    onClick={() => setPoStep(1)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 20,
                      background: poStep === 1 ? "#A91F34" : "#F5F6F8", color: poStep === 1 ? "#fff" : "rgba(35,32,31,0.6)",
                      fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: poStep === 1 ? "#fff" : "rgba(35,32,31,0.15)", color: poStep === 1 ? "#A91F34" : "rgba(35,32,31,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>1</span>
                    Informasi
                  </div>
                  <div style={{ width: 20, height: 2, background: "rgba(35,32,31,0.12)" }} />
                  <div
                    onClick={() => setPoStep(2)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7, padding: "6px 14px", borderRadius: 20,
                      background: poStep === 2 ? "#A91F34" : "#F5F6F8", color: poStep === 2 ? "#fff" : "rgba(35,32,31,0.6)",
                      fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 20, height: 20, borderRadius: "50%", background: poStep === 2 ? "#fff" : "rgba(35,32,31,0.15)", color: poStep === 2 ? "#A91F34" : "rgba(35,32,31,0.7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800 }}>2</span>
                    Detail Barang
                  </div>
                </div>
              </div>

              {/* STEP 1: INFORMASI PEMESANAN STOK */}
              {poStep === 1 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* 1. Jenis Pemesanan */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 800, display: "block", marginBottom: 8, color: "#23201F" }}>
                      1. Jenis Pemesanan <span style={{ color: "#A91F34" }}>*</span>
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div
                        onClick={() => setPoJenisPemesanan("Pemesanan Barang Jual")}
                        style={{
                          border: poJenisPemesanan === "Pemesanan Barang Jual" ? "2px solid #A91F34" : "1px solid rgba(35,32,31,0.14)",
                          background: poJenisPemesanan === "Pemesanan Barang Jual" ? "#FFF9F2" : "#fff",
                          borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                        }}
                      >
                        <input type="radio" checked={poJenisPemesanan === "Pemesanan Barang Jual"} onChange={() => {}} style={{ accentColor: "#A91F34" }} />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Pemesanan Barang Jual</div>
                          <div style={{ fontSize: 12, color: "rgba(35,32,31,0.55)", marginTop: 2 }}>Restock bahan baku, kemasan, & persediaan jualan</div>
                        </div>
                      </div>

                      <div
                        onClick={() => setPoJenisPemesanan("Pemesanan Aset")}
                        style={{
                          border: poJenisPemesanan === "Pemesanan Aset" ? "2px solid #A91F34" : "1px solid rgba(35,32,31,0.14)",
                          background: poJenisPemesanan === "Pemesanan Aset" ? "#FFF9F2" : "#fff",
                          borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                        }}
                      >
                        <input type="radio" checked={poJenisPemesanan === "Pemesanan Aset"} onChange={() => {}} style={{ accentColor: "#A91F34" }} />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Pemesanan Aset</div>
                          <div style={{ fontSize: 12, color: "rgba(35,32,31,0.55)", marginTop: 2 }}>Pembelian peralatan dapur, mesin, & inventaris outlet</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Sumber Stok */}
                  <div>
                    <label style={{ fontSize: 13, fontWeight: 800, display: "block", marginBottom: 8, color: "#23201F" }}>
                      2. Sumber Stok <span style={{ color: "#A91F34" }}>*</span>
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 8 }}>
                      <div
                        onClick={() => setPoSumberStok("Tanpa Referensi")}
                        style={{
                          border: poSumberStok === "Tanpa Referensi" ? "2px solid #A91F34" : "1px solid rgba(35,32,31,0.14)",
                          background: poSumberStok === "Tanpa Referensi" ? "#FFF9F2" : "#fff",
                          borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                        }}
                      >
                        <input type="radio" checked={poSumberStok === "Tanpa Referensi"} onChange={() => {}} style={{ accentColor: "#A91F34" }} />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Tanpa Referensi</div>
                          <div style={{ fontSize: 12, color: "rgba(35,32,31,0.55)", marginTop: 2 }}>Buat pemesanan langsung tanpa mengacu pada PR</div>
                        </div>
                      </div>

                      <div
                        onClick={() => setPoSumberStok("Referensikan Permintaan Barang")}
                        style={{
                          border: poSumberStok === "Referensikan Permintaan Barang" ? "2px solid #A91F34" : "1px solid rgba(35,32,31,0.14)",
                          background: poSumberStok === "Referensikan Permintaan Barang" ? "#FFF9F2" : "#fff",
                          borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                        }}
                      >
                        <input type="radio" checked={poSumberStok === "Referensikan Permintaan Barang"} onChange={() => {}} style={{ accentColor: "#A91F34" }} />
                        <div>
                          <div style={{ fontSize: 13.5, fontWeight: 700 }}>Referensikan Permintaan Barang</div>
                          <div style={{ fontSize: 12, color: "rgba(35,32,31,0.55)", marginTop: 2 }}>Hubungkan dengan nomor Requisition yang disetujui</div>
                        </div>
                      </div>
                    </div>

                    {poSumberStok === "Referensikan Permintaan Barang" ? (
                      <div style={{ background: "#F5F6F8", borderRadius: 10, padding: 12, border: "1px solid rgba(35,32,31,0.08)" }}>
                        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Pilih Nomor Permintaan Barang (PR)</label>
                        <select value={poRequisitionRef} onChange={(e) => setPoRequisitionRef(e.target.value)} style={inpStyle}>
                          {requisitions.map((req) => (
                            <option key={req.id} value={req.code}>
                              {req.code} — {req.requester} ({req.itemCount} Items, {req.date})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}
                  </div>

                  {/* 3. Informasi Pemesanan Stok (Form Field Grid) */}
                  <div style={{ background: "#FAFAFA", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)" }}>
                    <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 14, color: "#A91F34" }}>
                      3. Informasi Pemesanan Stok
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Daftar Outlet <span style={{ color: "#A91F34" }}>*</span></label>
                        <select value={poOutlet} onChange={(e) => setPoOutlet(e.target.value)} style={inpStyle}>
                          <option value="Outlet Utama - Jakarta">Outlet Utama - Jakarta</option>
                          <option value="Cabang Bandung">Cabang Bandung</option>
                          <option value="Cabang Surabaya">Cabang Surabaya</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                          Pemasok / Supplier <span style={{ color: "#A91F34" }}>*</span>
                        </label>
                        <select value={poSupplierId} onChange={(e) => handleSupplierSelect(e.target.value)} style={inpStyle}>
                          {MOCK_SUPPLIERS.map((sup) => (
                            <option key={sup.id} value={sup.id}>
                              {sup.name} ({sup.category})
                            </option>
                          ))}
                        </select>
                        <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)", marginTop: 4 }}>
                          Terkoneksi ke <a href="/owner/inventori/pembelian-stok/daftar-pemasok" target="_blank" style={{ color: "#A91F34", fontWeight: 700, textDecoration: "underline" }}>Daftar Pemasok</a>
                        </div>
                      </div>

                      <div style={{ gridColumn: "1 / -1" }}>
                        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Alamat Pemasok / Alamat Pengiriman</label>
                        <input value={poAddress} onChange={(e) => setPoAddress(e.target.value)} placeholder="Alamat lengkap supplier" style={inpStyle} />
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>
                          Nomor Pemesanan Stok (No. PO) <span style={{ color: "#A91F34" }}>*</span>
                        </label>
                        <input
                          value={poNumber}
                          onChange={(e) => setPoNumber(e.target.value)}
                          placeholder="Generate otomatis oleh sistem..."
                          style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}
                        />
                        <div style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", marginTop: 2 }}>Diisi otomatis oleh sistem (dapat disesuaikan)</div>
                      </div>

                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Tanggal Pemesanan Stok <span style={{ color: "#A91F34" }}>*</span></label>
                        <input type="date" value={poDate} onChange={(e) => setPoDate(e.target.value)} style={{ ...inpStyle, fontFamily: MONO }} />
                      </div>
                    </div>
                  </div>

                  {/* Actions for Step 1 */}
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
                    <button
                      type="button"
                      onClick={() => setCreateModalOpen(false)}
                      style={{ height: 42, padding: "0 20px", borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoStep(2)}
                      style={{ height: 42, padding: "0 24px", borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}
                    >
                      Selanjutnya
                      {ic("chevron", 15, "#fff", 2.4)}
                    </button>
                  </div>
                </div>
              ) : (
                /* STEP 2: DETAIL PEMESANAN STOK & RINCIAN BARANG */
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {/* Top Bar for Step 2 */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 800 }}>Rincian Barang Pemesanan</div>
                      <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)" }}>
                        Item terpilih dari inventori: <strong style={{ color: "#A91F34" }}>{poItems.length} barang</strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setItemPickerOpen(true)}
                      style={{
                        height: 38, padding: "0 16px", borderRadius: 9, border: "1.5px solid #A91F34",
                        background: "#FFF9F2", color: "#A91F34", fontFamily: "inherit", fontSize: 13, fontWeight: 800,
                        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                      }}
                    >
                      {ic("plus", 14, "#A91F34", 2.4)}
                      Atur Barang (Daftar Stok)
                    </button>
                  </div>

                  {/* Table Rincian Barang */}
                  <div style={{ border: "1px solid rgba(35,32,31,0.12)", borderRadius: 12, overflow: "hidden" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 0.9fr 1.3fr 1.3fr 1.3fr 0.5fr", gap: 8, padding: "10px 14px", background: "#FFF9F2", fontSize: 11, fontWeight: 800, color: "#A91F34", textTransform: "uppercase" }}>
                      <div>Barang</div>
                      <div>Jumlah</div>
                      <div>Satuan</div>
                      <div style={{ textAlign: "right" }}>Harga Satuan</div>
                      <div style={{ textAlign: "right" }}>Diskon</div>
                      <div style={{ textAlign: "right" }}>Total</div>
                      <div style={{ textAlign: "center" }}>Hapus</div>
                    </div>

                    {poItems.length === 0 ? (
                      <div style={{ padding: 30, textAlign: "center", color: "rgba(35,32,31,0.45)", fontSize: 13 }}>
                        Belum ada barang yang dipilih. Klik <strong>&quot;Atur Barang&quot;</strong> untuk menambahkan barang dari kelola stok.
                      </div>
                    ) : (
                      poItems.map((item) => {
                        let itemDisc = 0;
                        if (item.discountType === "persen") {
                          itemDisc = (item.qty * item.unitPrice * (item.discountVal || 0)) / 100;
                        } else {
                          itemDisc = item.discountVal || 0;
                        }
                        const lineTotal = Math.max(0, item.qty * item.unitPrice - itemDisc);

                        return (
                          <div key={item.id} style={{ display: "grid", gridTemplateColumns: "2.2fr 1fr 0.9fr 1.3fr 1.3fr 1.3fr 0.5fr", gap: 8, padding: "12px 14px", borderTop: "1px solid rgba(35,32,31,0.06)", alignItems: "center" }}>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{item.name}</div>
                              <div style={{ fontSize: 11, color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>SKU: {item.code}</div>
                              <input
                                value={item.notes}
                                onChange={(e) => updatePOItem(item.id, "notes", e.target.value)}
                                placeholder="Catatan item..."
                                style={{ width: "100%", height: 28, fontSize: 11.5, marginTop: 4, border: "1px solid rgba(35,32,31,0.1)", borderRadius: 6, padding: "0 8px" }}
                              />
                            </div>

                            <div>
                              <input
                                type="number"
                                min={1}
                                value={item.qty}
                                onChange={(e) => updatePOItem(item.id, "qty", Math.max(1, Number(e.target.value)))}
                                style={{ ...inpStyle, height: 34, fontFamily: MONO, fontWeight: 700, textAlign: "center" }}
                              />
                            </div>

                            <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(35,32,31,0.7)" }}>{item.unit}</div>

                            <div>
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => updatePOItem(item.id, "unitPrice", Number(e.target.value))}
                                style={{ ...inpStyle, height: 34, fontFamily: MONO, textAlign: "right" }}
                              />
                            </div>

                            <div style={{ display: "flex", gap: 4 }}>
                              <select
                                value={item.discountType}
                                onChange={(e) => updatePOItem(item.id, "discountType", e.target.value as "nominal" | "persen")}
                                style={{ height: 34, fontSize: 11, borderRadius: 6, border: "1px solid rgba(35,32,31,0.14)", background: "#fff" }}
                              >
                                <option value="nominal">Rp</option>
                                <option value="persen">%</option>
                              </select>
                              <input
                                type="number"
                                value={item.discountVal || ""}
                                onChange={(e) => updatePOItem(item.id, "discountVal", Number(e.target.value))}
                                placeholder="0"
                                style={{ ...inpStyle, height: 34, fontFamily: MONO, textAlign: "right", padding: "0 6px" }}
                              />
                            </div>

                            <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, fontSize: 13, color: "#A91F34" }}>
                              {formatRupiah(lineTotal)}
                            </div>

                            <div style={{ textAlign: "center" }}>
                              <button
                                onClick={() => removePOItem(item.id)}
                                style={{ background: "none", border: "none", color: "#B83636", cursor: "pointer", fontWeight: 800, fontSize: 14 }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Financial & Fee Summary Section */}
                  <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 18, background: "#FAFAFA", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)" }}>
                    {/* Left: Discounts, Taxes, Other Fees, DP */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#23201F" }}>Pengaturan Potongan, Pajak & Biaya Extra</div>

                      {/* Diskon Utama */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 8, alignItems: "center" }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Diskon Tambahan (Order)</label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <select value={poDiscountType} onChange={(e) => setPoDiscountType(e.target.value as "nominal" | "persen")} style={{ height: 36, fontSize: 12, borderRadius: 8, border: "1px solid rgba(35,32,31,0.14)" }}>
                            <option value="nominal">Rp</option>
                            <option value="persen">%</option>
                          </select>
                          <input
                            type="number"
                            value={poDiscountVal || ""}
                            onChange={(e) => setPoDiscountVal(Number(e.target.value))}
                            placeholder="Nominal diskon"
                            style={{ ...inpStyle, height: 36, fontFamily: MONO }}
                          />
                        </div>
                      </div>

                      {/* Pajak */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 8, alignItems: "center" }}>
                        <label style={{ fontSize: 12, fontWeight: 700 }}>Jenis Pajak</label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <select value={poTaxType} onChange={(e) => setPoTaxType(e.target.value as "non_pajak" | "eksklusi" | "inklusi")} style={{ flex: 1, height: 36, fontSize: 12, borderRadius: 8, border: "1px solid rgba(35,32,31,0.14)" }}>
                            <option value="non_pajak">Tanpa Pajak</option>
                            <option value="eksklusi">Pajak Eksklusi (+PPN)</option>
                            <option value="inklusi">Pajak Inklusi (Sudah PPN)</option>
                          </select>
                          {poTaxType !== "non_pajak" ? (
                            <input
                              type="number"
                              value={poTaxPercent}
                              onChange={(e) => setPoTaxPercent(Number(e.target.value))}
                              placeholder="%"
                              style={{ width: 60, height: 36, borderRadius: 8, border: "1px solid rgba(35,32,31,0.14)", fontFamily: MONO, textAlign: "center" }}
                            />
                          ) : null}
                        </div>
                      </div>

                      {/* Biaya Lainnya */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <label style={{ fontSize: 12, fontWeight: 700 }}>Biaya Lainnya</label>
                          <button
                            type="button"
                            onClick={addOtherFee}
                            style={{ background: "none", border: "none", color: "#A91F34", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                          >
                            + Tambah Biaya Lainnya
                          </button>
                        </div>
                        {poOtherFees.map((fee) => (
                          <div key={fee.id} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                            <input
                              value={fee.name}
                              onChange={(e) => updateOtherFee(fee.id, "name", e.target.value)}
                              placeholder="Nama biaya (misal: Admin/Packing)"
                              style={{ ...inpStyle, height: 32, fontSize: 12, flex: 1.2 }}
                            />
                            <input
                              type="number"
                              value={fee.amount || ""}
                              onChange={(e) => updateOtherFee(fee.id, "amount", Number(e.target.value))}
                              placeholder="Nominal (Rp)"
                              style={{ ...inpStyle, height: 32, fontSize: 12, fontFamily: MONO, flex: 1 }}
                            />
                            <button onClick={() => removeOtherFee(fee.id)} style={{ background: "none", border: "none", color: "#B83636", cursor: "pointer", fontWeight: 800 }}>
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Uang Muka (DP) */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 8, alignItems: "center", marginTop: 4 }}>
                        <label style={{ fontSize: 12, fontWeight: 700, color: "#238152" }}>Uang Muka (Down Payment)</label>
                        <input
                          type="number"
                          value={poDownPayment || ""}
                          onChange={(e) => setPoDownPayment(Number(e.target.value))}
                          placeholder="Rp 0"
                          style={{ ...inpStyle, height: 36, fontFamily: MONO, fontWeight: 700, color: "#238152" }}
                        />
                      </div>
                    </div>

                    {/* Right: Grand Calculation Summary Table */}
                    <div style={{ background: "#fff", borderRadius: 12, padding: 16, border: "1px solid rgba(35,32,31,0.1)", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#A91F34", marginBottom: 10, borderBottom: "1px dashed rgba(35,32,31,0.12)", paddingBottom: 6 }}>
                        Rincian Subtotal & Grand Total
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "rgba(35,32,31,0.6)" }}>Subtotal Barang</span>
                          <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(poCalculations.rawSubtotal)}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "rgba(35,32,31,0.6)" }}>Total Diskon</span>
                          <span style={{ fontFamily: MONO, fontWeight: 700, color: "#238152" }}>- {formatRupiah(poCalculations.mainDiscount)}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "rgba(35,32,31,0.6)" }}>Tanpa Pajak (Subtotal Stlh Diskon)</span>
                          <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(poCalculations.withoutTaxAmount)}</span>
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ color: "rgba(35,32,31,0.6)" }}>Total Pajak ({poTaxType === "non_pajak" ? "0%" : `${poTaxPercent}%`})</span>
                          <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(poCalculations.taxAmount)}</span>
                        </div>

                        {poOtherFees.map((fee) => (
                          <div key={fee.id} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "rgba(35,32,31,0.6)" }}>{fee.name.trim() || "Biaya Lainnya"}</span>
                            <span style={{ fontFamily: MONO, fontWeight: 700 }}>{formatRupiah(fee.amount || 0)}</span>
                          </div>
                        ))}

                        <div style={{ borderTop: "2px solid #A91F34", paddingTop: 10, marginTop: 4, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                          <span style={{ fontSize: 14, fontWeight: 800 }}>Total Harga (Grand Total)</span>
                          <span style={{ fontSize: 18, fontWeight: 800, fontFamily: MONO, color: "#A91F34" }}>
                            {formatRupiah(poCalculations.grandTotal)}
                          </span>
                        </div>

                        {poDownPayment > 0 ? (
                          <div style={{ background: "#EDF7F1", padding: "8px 10px", borderRadius: 8, display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 4 }}>
                            <span style={{ fontWeight: 700, color: "#238152" }}>Sisa Tagihan (Setelah DP)</span>
                            <span style={{ fontFamily: MONO, fontWeight: 800, color: "#238152" }}>{formatRupiah(poCalculations.remainingBalance)}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Step 2 Action Buttons */}
                      <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                        <button
                          type="button"
                          onClick={() => setPoStep(1)}
                          style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
                        >
                          Kembali
                        </button>
                        <button
                          type="button"
                          onClick={handleSavePOSubmit}
                          style={{ flex: 1.5, height: 42, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}
                        >
                          Simpan Pemesanan (PO)
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Standard Modal for Req, Invoice, Payment */
            <div
              onClick={(e) => e.stopPropagation()}
              className="wd-slideup"
              style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)" }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
                {isReq ? "Buat Permintaan Barang Baru" : isInvoice ? "Buat Faktur Pembelian Baru" : "Catat Pembayaran Faktur"}
              </div>
              <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.5)", marginBottom: 16 }}>
                Isi data formulir berikut untuk transaksi pembelian stok.
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Kode Referensi / No Transaksi</label>
                  <input value={formCode} onChange={(e) => setFormCode(e.target.value)} style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700 }} />
                </div>

                {isInvoice || isPayment ? (
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Pemasok / Supplier</label>
                    <select value={formSupplier} onChange={(e) => setFormSupplier(e.target.value)} style={inpStyle}>
                      <option value="PT Poultry Nusantara">PT Poultry Nusantara</option>
                      <option value="CV Dimsum Supplier Jaya">CV Dimsum Supplier Jaya</option>
                      <option value="UD Kemasan Packindo">UD Kemasan Packindo</option>
                    </select>
                  </div>
                ) : null}

                {isReq ? (
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

                {isInvoice || isPayment ? (
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
          )}
        </div>
      ) : null}

      {/* --- ATUR BARANG MODAL / ITEM PICKER FROM KELOLA STOK (DAFTAR STOK) --- */}
      {itemPickerOpen ? (
        <div
          onClick={() => setItemPickerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup"
            style={{ width: "100%", maxWidth: 680, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 24px 48px rgba(0,0,0,0.3)" }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: "#A91F34" }}>Pilih Barang dari Inventori (Daftar Stok)</div>
                <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)" }}>
                  Terhubung dengan data <a href="/owner/inventori/kelola-stok/daftar-stok" target="_blank" style={{ color: "#A91F34", textDecoration: "underline" }}>/owner/inventori/kelola-stok/daftar-stok</a>
                </div>
              </div>
              <button onClick={() => setItemPickerOpen(false)} style={{ background: "none", border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer", color: "rgba(35,32,31,0.4)" }}>
                ✕
              </button>
            </div>

            {/* Filter toolbar */}
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <input
                value={itemPickerSearch}
                onChange={(e) => setItemPickerSearch(e.target.value)}
                placeholder="Cari SKU atau nama barang stok..."
                style={{ ...inpStyle, flex: 1, height: 38 }}
              />
              <select
                value={itemPickerCategory}
                onChange={(e) => setItemPickerCategory(e.target.value)}
                style={{ height: 38, fontSize: 12.5, borderRadius: 9, border: "1px solid rgba(35,32,31,0.14)", padding: "0 10px" }}
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Bahan Baku">Bahan Baku</option>
                <option value="Kemasan">Kemasan</option>
                <option value="Operasional">Operasional</option>
                <option value="Aset">Aset</option>
              </select>
            </div>

            {/* Item Selector List (Synced with Daftar Bahan Baku & Daftar Stok) */}
            <div className="wd-scroll" style={{ maxHeight: 360, overflowY: "auto", border: "1px solid rgba(35,32,31,0.1)", borderRadius: 10 }}>
              {(() => {
                const liveItems = (typeof window !== "undefined" ? getStoredStockItems() : null) || MOCK_INVENTORY_ITEMS;
                const filteredList = liveItems.filter((item) => {
                  const matchSearch =
                    !itemPickerSearch ||
                    item.name.toLowerCase().includes(itemPickerSearch.toLowerCase()) ||
                    item.code.toLowerCase().includes(itemPickerSearch.toLowerCase());
                  const matchCat = itemPickerCategory === "Semua" || item.category === itemPickerCategory;
                  return matchSearch && matchCat;
                });

                if (filteredList.length === 0) {
                  return (
                    <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "rgba(35,32,31,0.5)" }}>
                      Tidak ada barang stok yang cocok. Tambahkan item baru di <strong>Daftar Bahan Baku</strong>.
                    </div>
                  );
                }

                return filteredList.map((stk) => {
                  const isChecked = poItems.some((i) => i.id === stk.id);
                  return (
                    <div
                      key={stk.id}
                      onClick={() => togglePickerItem(stk)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        borderBottom: "1px solid rgba(35,32,31,0.06)",
                        cursor: "pointer",
                        background: isChecked ? "#FFF9F2" : "#fff",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ width: 18, height: 18, accentColor: "#A91F34" }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#23201F" }}>{stk.name}</div>
                          <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)" }}>
                            <span style={{ fontFamily: MONO, fontWeight: 600 }}>{stk.code}</span> • {stk.category} • Stok: {stk.currentStock} {stk.unit}
                          </div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34", fontSize: 13 }}>
                        {formatRupiah(stk.defaultPrice)} / {stk.unit}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "rgba(35,32,31,0.6)" }}>
                {poItems.length} barang dipilih untuk PO
              </div>
              <button
                type="button"
                onClick={() => setItemPickerOpen(false)}
                style={{ height: 40, padding: "0 20px", borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}
              >
                Selesai Pilih Barang
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- TAMBAH PEMBAYARAN FAKTUR MODAL --- */}
      {createPaymentModalOpen ? (
        <div
          onClick={() => setCreatePaymentModalOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup wd-scroll"
            style={{
              width: "100%",
              maxWidth: 960,
              maxHeight: "92vh",
              overflowY: "auto",
              background: "#fff",
              borderRadius: 20,
              padding: 28,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.5)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, borderBottom: "1px solid rgba(35,32,31,0.08)", paddingBottom: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#238152", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Tambah Pembayaran Faktur
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#23201F" }}>
                  Informasi Pembayaran Faktur Pembelian
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreatePaymentModalOpen(false)}
                style={{ background: "#F5F6F8", border: "none", borderRadius: "50%", width: 32, height: 32, cursor: "pointer", fontWeight: 800 }}
              >
                ✕
              </button>
            </div>

            {/* Form Info Section Grid */}
            <div style={{ background: "#FFF9F2", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)", marginBottom: 20 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#A91F34", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                Informasi Transaksi & Pemasok
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Pilih Outlet</label>
                  <select value={payOutlet} onChange={(e) => setPayOutlet(e.target.value)} style={inpStyle}>
                    <option value="Outlet Utama - Jakarta">Outlet Utama - Jakarta</option>
                    <option value="Cabang Bandung">Cabang Bandung</option>
                    <option value="Cabang Surabaya">Cabang Surabaya</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Jenis Pembayaran</label>
                  <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} style={inpStyle}>
                    <option value="Transfer Bank BCA">Transfer Bank BCA</option>
                    <option value="Transfer Bank Mandiri">Transfer Bank Mandiri</option>
                    <option value="Kas Outlet / Tunai">Kas Outlet / Tunai</option>
                    <option value="QRIS / Digital">QRIS / Digital</option>
                    <option value="Kasir Cash">Kasir Cash</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Jenis Transaksi</label>
                  <select value={payTransactionType} onChange={(e) => setPayTransactionType(e.target.value as any)} style={inpStyle}>
                    <option value="Pemesanan Stok">Pemesanan Stok (PO)</option>
                    <option value="Tanpa Nomor Referensi">Tanpa Nomor Referensi</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Pemasok / Supplier</label>
                  <select value={paySupplierName} onChange={(e) => setPaySupplierName(e.target.value)} style={inpStyle}>
                    {MOCK_SUPPLIERS.map((s) => (
                      <option key={s.id} value={s.name}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Tanggal Transaksi</label>
                  <input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} style={{ ...inpStyle, fontFamily: MONO }} />
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4 }}>Nomor Transaksi Pembayaran</label>
                  <input
                    value={payTransactionNo}
                    onChange={(e) => setPayTransactionNo(e.target.value)}
                    placeholder="PAY-2026-XXXX (Otomatis)"
                    style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700 }}
                  />
                </div>
              </div>
            </div>

            {/* Table Daftar Pembelian Section */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#23201F" }}>Daftar Pembelian & Faktur</div>
                  <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)" }}>Pilih dan atur potongan serta nominal pembayaran faktur.</div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSelectInvoicePickerOpen(true)}
                    style={{
                      height: 36,
                      padding: "0 14px",
                      borderRadius: 8,
                      border: "1px solid #A91F34",
                      background: "#FFF9F2",
                      color: "#A91F34",
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    + Tambah Faktur Pembelian
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayInvoiceItems((prev) =>
                        prev.map((i) => ({ ...i, paymentAmount: Math.max(0, i.totalAmount - (i.discount || 0)) }))
                      );
                    }}
                    style={{
                      height: 36,
                      padding: "0 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#238152",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    Bayar Semua
                  </button>
                </div>
              </div>

              {/* Invoices Payment Table */}
              <div style={{ border: "1px solid rgba(35,32,31,0.12)", borderRadius: 12, overflow: "hidden" }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.4fr 1.2fr 1fr 1.2fr 1fr 1.2fr 1.2fr 0.4fr",
                    gap: 6,
                    padding: "10px 12px",
                    background: "#F5F6F8",
                    fontSize: 11,
                    fontWeight: 800,
                    color: "rgba(35,32,31,0.7)",
                    textTransform: "uppercase",
                  }}
                >
                  <div>Tgl Pembelian</div>
                  <div>No. Faktur</div>
                  <div>Jatuh Tempo</div>
                  <div style={{ textAlign: "right" }}>Tagihan (Rp)</div>
                  <div style={{ textAlign: "right" }}>Potongan (Rp)</div>
                  <div style={{ textAlign: "right" }}>Pembayaran (Rp)</div>
                  <div style={{ textAlign: "right" }}>Sisa Tagihan</div>
                  <div style={{ textAlign: "center" }}>Hapus</div>
                </div>

                {payInvoiceItems.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", fontSize: 13, color: "rgba(35,32,31,0.45)" }}>
                    Belum ada faktur yang dipilih untuk dibayar. Klik "+ Tambah Faktur Pembelian" di atas.
                  </div>
                ) : (
                  payInvoiceItems.map((item) => {
                    const sisa = Math.max(0, item.totalAmount - (item.discount || 0) - (item.paymentAmount || 0));
                    return (
                      <div
                        key={item.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.4fr 1.2fr 1fr 1.2fr 1fr 1.2fr 1.2fr 0.4fr",
                          gap: 6,
                          padding: "10px 12px",
                          borderTop: "1px solid rgba(35,32,31,0.06)",
                          alignItems: "center",
                          fontSize: 12.5,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700 }}>{item.dateWithTime}</div>
                        </div>
                        <div style={{ fontFamily: MONO, fontWeight: 700 }}>{item.invoiceNumber}</div>
                        <div style={{ fontSize: 12, color: "#A91F34", fontWeight: 700 }}>{item.dueDate}</div>
                        <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700 }}>
                          {formatRupiah(item.totalAmount)}
                        </div>
                        <div>
                          <input
                            type="number"
                            value={item.discount || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPayInvoiceItems((prev) =>
                                prev.map((p) => (p.id === item.id ? { ...p, discount: val } : p))
                              );
                            }}
                            placeholder="0"
                            style={{ ...inpStyle, height: 32, fontSize: 12, fontFamily: MONO, textAlign: "right" }}
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={item.paymentAmount || ""}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPayInvoiceItems((prev) =>
                                prev.map((p) => (p.id === item.id ? { ...p, paymentAmount: val } : p))
                              );
                            }}
                            placeholder="0"
                            style={{ ...inpStyle, height: 32, fontSize: 12, fontFamily: MONO, fontWeight: 700, color: "#238152", textAlign: "right" }}
                          />
                        </div>
                        <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 700, color: sisa > 0 ? "#A91F34" : "#238152" }}>
                          {formatRupiah(sisa)}
                        </div>
                        <div style={{ textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => setPayInvoiceItems((prev) => prev.filter((p) => p.id !== item.id))}
                            style={{ background: "none", border: "none", color: "#B83636", cursor: "pointer", fontWeight: 800 }}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Table Total Row */}
                {payInvoiceItems.length > 0 ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.4fr 1.2fr 1fr 1.2fr 1fr 1.2fr 1.2fr 0.4fr",
                      gap: 6,
                      padding: "12px",
                      background: "#FFF9F2",
                      borderTop: "2px solid rgba(35,32,31,0.12)",
                      fontWeight: 800,
                      fontSize: 12.5,
                    }}
                  >
                    <div style={{ gridColumn: "span 3" }}>TOTAL PEMBAYARAN FAKTUR</div>
                    <div style={{ textAlign: "right", fontFamily: MONO }}>{formatRupiah(payCalculations.totalTagihan)}</div>
                    <div style={{ textAlign: "right", fontFamily: MONO, color: "#238152" }}>- {formatRupiah(payCalculations.totalPotongan)}</div>
                    <div style={{ textAlign: "right", fontFamily: MONO, color: "#238152" }}>{formatRupiah(payCalculations.totalPembayaran)}</div>
                    <div style={{ textAlign: "right", fontFamily: MONO, color: "#A91F34" }}>{formatRupiah(payCalculations.totalSisa)}</div>
                    <div></div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Unggah File Bukti Pembayaran Section */}
            <div style={{ background: "#F5F6F8", borderRadius: 14, padding: 18, border: "1px solid rgba(35,32,31,0.08)", marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: "#23201F", marginBottom: 4 }}>
                Unggah File Bukti Pembayaran (Format: PDF, Excel, Word, JPG, PNG, ZIP — Maks 5 File, Max 2MB/File)
              </div>
              <div
                style={{
                  border: "2px dashed rgba(35,32,31,0.2)",
                  borderRadius: 12,
                  padding: 20,
                  textAlign: "center",
                  background: "#fff",
                  cursor: "pointer",
                }}
                onClick={() => document.getElementById("payFileInput")?.click()}
              >
                <input
                  id="payFileInput"
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,.docx,.doc,.jpg,.jpeg,.png,.zip"
                  style={{ display: "none" }}
                  onChange={handlePayFileUpload}
                />
                <div style={{ fontSize: 13, fontWeight: 700, color: "#A91F34" }}>
                  📁 Klik atau Tarik File Bukti Pembayaran ke Sini untuk Mengunggah
                </div>
              </div>

              {payFiles.length > 0 ? (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {payFiles.map((f) => (
                    <div key={f.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "6px 10px", borderRadius: 6, fontSize: 12 }}>
                      <span style={{ fontWeight: 600, color: "#23201F", display: "inline-flex", alignItems: "center", gap: 6 }}>
                        {ic("invoice", 14, "#A91F34", 2)} {f.name} <span style={{ color: "rgba(35,32,31,0.45)", fontFamily: MONO }}>({(f.size / 1024).toFixed(1)} KB)</span>
                      </span>
                      <button type="button" onClick={() => setPayFiles((prev) => prev.filter((x) => x.id !== f.id))} style={{ background: "none", border: "none", color: "#B83636", cursor: "pointer", fontWeight: 800 }}>✕</button>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Modal Actions */}
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setCreatePaymentModalOpen(false)}
                style={{ height: 42, padding: "0 22px", borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePaymentSubmit}
                style={{ height: 42, padding: "0 26px", borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}
              >
                Simpan Pembayaran Faktur
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- SELECT INVOICE PICKER SUB-MODAL --- */}
      {selectInvoicePickerOpen ? (
        <div
          onClick={() => setSelectInvoicePickerOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 90, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup wd-scroll"
            style={{ width: "100%", maxWidth: 640, maxHeight: "85vh", overflowY: "auto", background: "#fff", borderRadius: 18, padding: 24 }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#23201F" }}>Pilih Faktur Pembelian</div>
                <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)" }}>Daftar faktur belum lunas dari pemasok: <strong>{paySupplierName}</strong></div>
              </div>
              <button onClick={() => setSelectInvoicePickerOpen(false)} style={{ background: "#F5F6F8", border: "none", borderRadius: "50%", width: 30, height: 30, cursor: "pointer", fontWeight: 800 }}>✕</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto" }}>
              {invoices
                .filter((inv) => inv.supplier === paySupplierName || true)
                .map((inv) => {
                  const isChecked = payInvoiceItems.some((p) => p.invoiceNumber === inv.invoiceNumber);
                  return (
                    <div
                      key={inv.id}
                      onClick={() => {
                        if (isChecked) {
                          setPayInvoiceItems((prev) => prev.filter((p) => p.invoiceNumber !== inv.invoiceNumber));
                        } else {
                          setPayInvoiceItems((prev) => [
                            ...prev,
                            {
                              id: inv.id,
                              invoiceNumber: inv.invoiceNumber,
                              dateWithTime: `${inv.date} 14:30 WIB`,
                              dueDate: inv.dueDate,
                              totalAmount: inv.totalAmount,
                              discount: 0,
                              paymentAmount: Math.max(0, inv.totalAmount - inv.paidAmount),
                            },
                          ]);
                        }
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: 12,
                        borderRadius: 10,
                        border: isChecked ? "2px solid #A91F34" : "1px solid rgba(35,32,31,0.1)",
                        background: isChecked ? "#FFF9F2" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input type="checkbox" checked={isChecked} onChange={() => {}} style={{ width: 16, height: 16, accentColor: "#A91F34" }} />
                        <div>
                          <div style={{ fontWeight: 800, fontSize: 13, fontFamily: MONO }}>{inv.invoiceNumber}</div>
                          <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>Ref PO: {inv.poNumber} • Tgl: {inv.date}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 800, fontFamily: MONO, color: "#A91F34" }}>{formatRupiah(inv.totalAmount)}</div>
                        <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)" }}>Jatuh Tempo: {inv.dueDate}</div>
                      </div>
                    </div>
                  );
                })}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
              <button
                type="button"
                onClick={() => setSelectInvoicePickerOpen(false)}
                style={{ height: 40, padding: "0 20px", borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 800, cursor: "pointer" }}
              >
                Selesai Pilih Faktur ({payInvoiceItems.length})
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
