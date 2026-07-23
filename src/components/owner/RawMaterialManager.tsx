"use client";

import { useState } from "react";
import { formatRupiah } from "@/lib/format";
import { ic } from "./icons";
import { Badge, MiniStat, MONO } from "./shared";

export interface UnitConversion {
  id: string;
  unit: string;
  conversionFactor: number; // e.g. 1000 (1 kg = 1000 gram)
  purchaseCost: number;
  sku: string;
}

export interface RawMaterialItem {
  id: string;
  name: string;
  sku: string;
  outlets: string[];
  monitorStock: boolean;
  minStockAlert: number;
  currentStock: number;
  primaryUnit: string;
  purchaseCost: number; // integer rupiah
  unitConversions: UnitConversion[];
  status: "Tersedia" | "Menipis" | "Habis";
}

const DEFAULT_MATERIALS: RawMaterialItem[] = [
  {
    id: "rm-1",
    name: "Kulit Dimsum",
    sku: "BB-001",
    outlets: ["Outlet Utama - Jakarta"],
    monitorStock: true,
    minStockAlert: 10,
    currentStock: 32,
    primaryUnit: "pack",
    purchaseCost: 18000,
    unitConversions: [
      { id: "uc-1", unit: "lembar", conversionFactor: 50, purchaseCost: 360, sku: "BB-001-LMB" },
    ],
    status: "Tersedia",
  },
  {
    id: "rm-2",
    name: "Daging Ayam Giling",
    sku: "BB-002",
    outlets: ["Outlet Utama - Jakarta"],
    monitorStock: true,
    minStockAlert: 20,
    currentStock: 14,
    primaryUnit: "kg",
    purchaseCost: 45000,
    unitConversions: [
      { id: "uc-2", unit: "gram", conversionFactor: 1000, purchaseCost: 45, sku: "BB-002-GRM" },
    ],
    status: "Menipis",
  },
  {
    id: "rm-3",
    name: "Udang Kupas",
    sku: "BB-003",
    outlets: ["Outlet Utama - Jakarta"],
    monitorStock: true,
    minStockAlert: 10,
    currentStock: 6,
    primaryUnit: "kg",
    purchaseCost: 95000,
    unitConversions: [
      { id: "uc-3", unit: "gram", conversionFactor: 1000, purchaseCost: 95, sku: "BB-003-GRM" },
    ],
    status: "Menipis",
  },
  {
    id: "rm-4",
    name: "Jamur Kuping Kering",
    sku: "BB-005",
    outlets: ["Outlet Utama - Jakarta"],
    monitorStock: true,
    minStockAlert: 8,
    currentStock: 0,
    primaryUnit: "kg",
    purchaseCost: 60000,
    unitConversions: [],
    status: "Habis",
  },
  {
    id: "rm-5",
    name: "Kemasan Takeaway L",
    sku: "KM-002",
    outlets: ["Outlet Utama - Jakarta"],
    monitorStock: true,
    minStockAlert: 200,
    currentStock: 140,
    primaryUnit: "pcs",
    purchaseCost: 2200,
    unitConversions: [
      { id: "uc-5", unit: "dus", conversionFactor: 100, purchaseCost: 220000, sku: "KM-002-DUS" },
    ],
    status: "Menipis",
  },
];

const AVAILABLE_OUTLETS = [
  "Outlet Utama - Jakarta",
  "Cabang Bandung",
  "Cabang Surabaya",
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

export function RawMaterialManager() {
  const [items, setItems] = useState<RawMaterialItem[]>(DEFAULT_MATERIALS);
  const [query, setQuery] = useState("");
  const [editingItem, setEditingItem] = useState<RawMaterialItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formOutlets, setFormOutlets] = useState<string[]>(["Outlet Utama - Jakarta"]);
  const [formMonitorStock, setFormMonitorStock] = useState(true);
  const [formMinStockAlert, setFormMinStockAlert] = useState("10");
  const [formPrimaryUnit, setFormPrimaryUnit] = useState("kg");
  const [formPurchaseCost, setFormPurchaseCost] = useState("45000");
  const [formConversions, setFormConversions] = useState<UnitConversion[]>([]);

  function openCreateModal() {
    setIsCreatingNew(true);
    setEditingItem(null);
    setFormName("");
    setFormSku(`BB-00${items.length + 1}`);
    setFormOutlets(["Outlet Utama - Jakarta"]);
    setFormMonitorStock(true);
    setFormMinStockAlert("10");
    setFormPrimaryUnit("kg");
    setFormPurchaseCost("0");
    setFormConversions([]);
  }

  function openEditModal(item: RawMaterialItem) {
    setIsCreatingNew(false);
    setEditingItem(item);
    setFormName(item.name);
    setFormSku(item.sku);
    setFormOutlets(item.outlets.length > 0 ? item.outlets : ["Outlet Utama - Jakarta"]);
    setFormMonitorStock(item.monitorStock);
    setFormMinStockAlert(String(item.minStockAlert));
    setFormPrimaryUnit(item.primaryUnit);
    setFormPurchaseCost(String(item.purchaseCost));
    setFormConversions(item.unitConversions ? [...item.unitConversions] : []);
  }

  function saveModal() {
    if (!formName.trim()) return;

    const minAlert = Number(formMinStockAlert) || 0;
    const cost = Number(formPurchaseCost.replace(/[^0-9]/g, "")) || 0;

    let nextStatus: "Tersedia" | "Menipis" | "Habis" = "Tersedia";
    const curStock = editingItem ? editingItem.currentStock : 20;
    if (curStock === 0) nextStatus = "Habis";
    else if (curStock <= minAlert) nextStatus = "Menipis";

    const newItem: RawMaterialItem = {
      id: editingItem ? editingItem.id : `rm-${Date.now()}`,
      name: formName.trim(),
      sku: formSku.trim() || `BB-${Date.now().toString().slice(-4)}`,
      outlets: formOutlets,
      monitorStock: formMonitorStock,
      minStockAlert: minAlert,
      currentStock: curStock,
      primaryUnit: formPrimaryUnit.trim() || "kg",
      purchaseCost: cost,
      unitConversions: formConversions,
      status: nextStatus,
    };

    if (editingItem) {
      setItems(items.map((i) => (i.id === editingItem.id ? newItem : i)));
      setMsg({ type: "ok", text: `Bahan baku "${formName}" berhasil diperbarui!` });
    } else {
      setItems([...items, newItem]);
      setMsg({ type: "ok", text: `Bahan baku "${formName}" berhasil ditambahkan!` });
    }

    setEditingItem(null);
    setIsCreatingNew(false);
  }

  function addConversionRow() {
    const mainCost = Number(formPurchaseCost.replace(/[^0-9]/g, "")) || 0;
    const defaultFactor = 1000;
    const calcCost = Math.round(mainCost / defaultFactor);

    setFormConversions([
      ...formConversions,
      {
        id: `uc-${Date.now()}-${formConversions.length}`,
        unit: "gram",
        conversionFactor: defaultFactor,
        purchaseCost: calcCost,
        sku: `${formSku || "BB"}-${formConversions.length + 1}`,
      },
    ]);
  }

  function handleExportExcel() {
    const headers = ["SKU", "Nama Bahan Baku", "Outlet", "Stok", "Stok Min Alert", "Harga Beli", "Total Nilai", "Status"];
    const rows = items.map((i) => [
      i.sku,
      i.name,
      i.outlets.join(", "),
      `${i.currentStock} ${i.primaryUnit}`,
      i.minStockAlert,
      i.purchaseCost,
      i.currentStock * i.purchaseCost,
      i.status,
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `daftar-bahan-baku-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    const headers = ["SKU", "Nama Bahan Baku", "Outlet", "Persediaan", "Stok Min", "Harga Beli", "Status"];
    const rows = items.map((i) => [
      i.sku,
      i.name,
      i.outlets.join(", "),
      `${i.currentStock} ${i.primaryUnit}`,
      i.minStockAlert,
      `${formatRupiah(i.purchaseCost)} / ${i.primaryUnit}`,
      i.status,
    ]);

    const printWin = window.open("", "_blank");
    if (!printWin) return;

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Export PDF - Daftar Bahan Baku</title>
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
            <div class="subtitle">Laporan Daftar Bahan Baku Inventory</div>
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
                <td>${r[4]}</td>
                <td class="mono">${r[5]}</td>
                <td>${r[6]}</td>
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

  const shownItems = items.filter(
    (i) =>
      !query.trim() ||
      i.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      i.sku.toLowerCase().includes(query.trim().toLowerCase())
  );

  const totalValue = items.reduce((acc, i) => acc + i.currentStock * i.purchaseCost, 0);
  const needRestock = items.filter((i) => i.currentStock <= i.minStockAlert).length;
  const tableTmpl = "1.1fr 2fr 1.6fr 1.1fr 0.9fr 1.4fr 1fr 0.6fr";

  return (
    <div className="wd-owner-raw-material-manager">
      {/* Head */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.45)", marginBottom: 7 }}>
            <span>Inventori</span>
            <span style={{ color: "rgba(35,32,31,0.25)" }}>/</span>
            <span style={{ color: "#A91F34" }}>Daftar Bahan Baku</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Daftar Bahan Baku</div>
          <div style={{ fontSize: 13.5, color: "rgba(35,32,31,0.55)", marginTop: 3 }}>
            Kelola bahan baku, outlet terdaftar, pengingat stok minimum, serta informasi konversi satuan & harga beli.
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
            Tambah Bahan Baku
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
        <MiniStat label="Total SKU Bahan Baku" value={String(items.length)} sub="Semua bahan terdaftar" tone="info" />
        <MiniStat label="Nilai Persediaan Total" value={formatRupiah(totalValue)} sub="Estimasi nilai stok" tone="ok" />
        <MiniStat label="Perlu Restock" value={String(needRestock)} sub={needRestock > 0 ? "Stok di bawah batas minimum" : "Stok aman"} tone={needRestock > 0 ? "warn" : "ok"} />
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
            placeholder="Cari daftar bahan baku..."
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

      {/* Main Table: Daftar Bahan Baku */}
      <div className="wd-responsive-table" style={CARD}>
        <div style={{ overflowX: "auto" }} className="wd-scroll">
          <div style={{ minWidth: 780 }}>
            <div style={{ ...HEAD, gridTemplateColumns: tableTmpl }}>
              <div>SKU</div>
              <div>Bahan / Produk</div>
              <div>Outlet</div>
              <div>Persediaan</div>
              <div>Stok Min</div>
              <div>Harga Beli</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Aksi</div>
            </div>

            {shownItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13.5 }}>
                Belum ada bahan baku terdaftar.
              </div>
            ) : (
              shownItems.map((item) => (
                <div key={item.id} style={{ ...ROW, gridTemplateColumns: tableTmpl }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.6)" }}>{item.sku}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.name}</div>
                    {item.unitConversions.length > 0 ? (
                      <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)", marginTop: 2 }}>
                        {item.unitConversions.length} Konversi Satuan ({item.unitConversions.map((u) => u.unit).join(", ")})
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {item.outlets.map((o) => (
                      <span key={o} style={{ fontSize: 11, background: "rgba(35,32,31,0.06)", padding: "2px 7px", borderRadius: 6, fontWeight: 600 }}>
                        {o.replace(" - Jakarta", "")}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>
                    {item.currentStock} {item.primaryUnit}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 12.5, color: "rgba(35,32,31,0.7)" }}>
                    {item.minStockAlert} {item.primaryUnit}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 12.5, color: "#A91F34", fontWeight: 700 }}>
                    {formatRupiah(item.purchaseCost)} / {item.primaryUnit}
                  </div>
                  <div>
                    {item.status === "Tersedia" ? (
                      <Badge text="Tersedia" tone="ok" />
                    ) : item.status === "Menipis" ? (
                      <Badge text="Menipis" tone="warn" />
                    ) : (
                      <Badge text="Habis" tone="out" />
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button
                      onClick={() => openEditModal(item)}
                      style={{
                        height: 32,
                        padding: "0 12px",
                        borderRadius: 8,
                        border: "1px solid rgba(35,32,31,0.14)",
                        background: "#fff",
                        fontFamily: "inherit",
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: "pointer",
                        color: "#2D2022",
                      }}
                      title="Edit Bahan Baku"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Edit / Tambah Bahan Baku */}
      {editingItem || isCreatingNew ? (
        <div
          onClick={() => {
            setEditingItem(null);
            setIsCreatingNew(false);
          }}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup"
            style={{
              width: "100%",
              maxWidth: 760,
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {isCreatingNew ? "Tambah Daftar Bahan Baku" : `Edit Bahan Baku: ${formName}`}
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.5)", marginTop: 2 }}>
                  Atur outlet, monitor persediaan, pengingat stok minimum, serta informasi konversi satuan & harga beli.
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsCreatingNew(false);
                }}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(35,32,31,0.5)" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div style={{ flex: 1, overflowY: "auto", paddingRight: 4, marginBottom: 16 }}>
              {/* Form Grid Section 1 */}
              <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Daftar Outlet</label>
                  <select
                    value={formOutlets[0] || ""}
                    onChange={(e) => setFormOutlets([e.target.value])}
                    style={inpStyle}
                  >
                    {AVAILABLE_OUTLETS.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Nama Bahan Baku</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Misal: Daging Ayam Giling, Kulit Dimsum"
                    style={inpStyle}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>SKU Bahan Baku</label>
                  <input
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="Misal: BB-001"
                    style={{ ...inpStyle, fontFamily: MONO }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Pengingat Stok Minimum</label>
                  <input
                    value={formMinStockAlert}
                    onChange={(e) => setFormMinStockAlert(e.target.value.replace(/[^0-9]/g, ""))}
                    inputMode="numeric"
                    placeholder="10"
                    style={{ ...inpStyle, fontFamily: MONO }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 16, background: "#FAF8F5", padding: 12, borderRadius: 10, border: "1px solid rgba(35,32,31,0.08)" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={formMonitorStock}
                    onChange={(e) => setFormMonitorStock(e.target.checked)}
                    style={{ width: 18, height: 18, accentColor: "#A91F34" }}
                  />
                  <span>Monitor Persediaan Otomatis (potong stok saat transaksi / resep terpakai)</span>
                </label>
              </div>

              {/* Section: Informasi Satuan Utama */}
              <div style={{ marginBottom: 16, background: "#FFF9F2", padding: 14, borderRadius: 12, border: "1px solid rgba(169,31,52,0.15)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#A91F34", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                  Informasi Satuan Utama & Harga Beli
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Satuan Utama</label>
                    <input
                      value={formPrimaryUnit}
                      onChange={(e) => setFormPrimaryUnit(e.target.value)}
                      placeholder="Misal: kg, pack, pcs, liter, box"
                      style={inpStyle}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Harga Beli Per Satuan Utama (Rp)</label>
                    <input
                      value={formPurchaseCost}
                      onChange={(e) => setFormPurchaseCost(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder="0"
                      style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}
                    />
                  </div>
                </div>
              </div>

              {/* Section: Informasi Satuan Konversi (+ Tambah Satuan) */}
              <div style={{ border: "1px solid rgba(35,32,31,0.1)", borderRadius: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>Informasi Satuan (Konversi Multi-Satuan)</div>
                    <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", marginTop: 2 }}>
                      Atur konversi satuan sekunder (misal 1 {formPrimaryUnit || "kg"} = 1000 gram).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={addConversionRow}
                    style={{
                      height: 34,
                      padding: "0 14px",
                      borderRadius: 8,
                      border: "1px solid rgba(35,32,31,0.14)",
                      background: "#fff",
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      color: "#A91F34",
                    }}
                  >
                    + Tambah Satuan
                  </button>
                </div>

                {formConversions.length === 0 ? (
                  <div style={{ padding: 20, textAlign: "center", color: "rgba(35,32,31,0.4)", fontSize: 12.5, fontStyle: "italic", background: "rgba(35,32,31,0.02)", borderRadius: 8 }}>
                    Belum ada konversi satuan sekunder. Klik <strong>+ Tambah Satuan</strong> untuk menambahkan.
                  </div>
                ) : (
                  <div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.2fr 1.2fr 0.5fr", gap: 8, padding: "6px 8px", background: "rgba(35,32,31,0.04)", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "rgba(35,32,31,0.5)", marginBottom: 8 }}>
                      <div>Satuan</div>
                      <div>Konversi (Per {formPrimaryUnit || "Satuan"})</div>
                      <div>Harga Beli</div>
                      <div>SKU Satuan</div>
                      <div style={{ textAlign: "right" }}>Aksi</div>
                    </div>

                    {formConversions.map((uc, idx) => (
                      <div key={uc.id} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.4fr 1.2fr 1.2fr 0.5fr", gap: 8, marginBottom: 8, alignItems: "center" }}>
                        <input
                          value={uc.unit}
                          onChange={(e) => {
                            const next = [...formConversions];
                            next[idx].unit = e.target.value;
                            setFormConversions(next);
                          }}
                          placeholder="Satuan (gram, pcs)"
                          style={{ ...inpStyle, height: 36 }}
                        />
                        <input
                          value={uc.conversionFactor || ""}
                          onChange={(e) => {
                            const factor = Number(e.target.value.replace(/[^0-9.]/g, "")) || 1;
                            const mainCost = Number(formPurchaseCost.replace(/[^0-9]/g, "")) || 0;
                            const next = [...formConversions];
                            next[idx].conversionFactor = factor;
                            next[idx].purchaseCost = Math.round(mainCost / factor);
                            setFormConversions(next);
                          }}
                          inputMode="numeric"
                          placeholder="Multiplier (1000)"
                          style={{ ...inpStyle, height: 36, fontFamily: MONO }}
                        />
                        <input
                          value={uc.purchaseCost || ""}
                          onChange={(e) => {
                            const cost = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                            const next = [...formConversions];
                            next[idx].purchaseCost = cost;
                            setFormConversions(next);
                          }}
                          inputMode="numeric"
                          placeholder="Harga Beli"
                          style={{ ...inpStyle, height: 36, fontFamily: MONO }}
                        />
                        <input
                          value={uc.sku}
                          onChange={(e) => {
                            const next = [...formConversions];
                            next[idx].sku = e.target.value;
                            setFormConversions(next);
                          }}
                          placeholder="SKU Satuan"
                          style={{ ...inpStyle, height: 36, fontFamily: MONO }}
                        />
                        <div style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() => setFormConversions(formConversions.filter((_, i) => i !== idx))}
                            style={{ border: "none", background: "none", cursor: "pointer", fontSize: 15 }}
                            title="Hapus konversi satuan"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div style={{ display: "flex", gap: 10, borderTop: "1px solid rgba(35,32,31,0.08)", paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setIsCreatingNew(false);
                }}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveModal}
                disabled={!formName.trim()}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer", opacity: !formName.trim() ? 0.6 : 1 }}
              >
                Simpan Bahan Baku
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
