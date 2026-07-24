"use client";

import { useState, useEffect, useRef } from "react";
import { formatRupiah } from "@/lib/format";
import { ic } from "./icons";
import { Badge, MiniStat, MONO } from "./shared";
import { syncRawMaterialsToStock } from "@/lib/stock-sync";

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
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("pos_wd_inventory_raw_materials");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setItems(parsed);
        }
      } catch (e) {}
    }
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("pos_wd_inventory_raw_materials", JSON.stringify(items));
    syncRawMaterialsToStock(items);
  }, [items, isInitialized]);

  const [query, setQuery] = useState("");
  const [editingItem, setEditingItem] = useState<RawMaterialItem | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Export dropdown state
  const [exportDropdownOpen, setExportDropdownOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Bulk Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importedFile, setImportedFile] = useState<File | null>(null);
  const [parsedImportItems, setParsedImportItems] = useState<RawMaterialItem[]>([]);
  const [importError, setImportError] = useState<string | null>(null);

  // Form states for Create/Edit Modal
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formOutlets, setFormOutlets] = useState<string[]>(["Outlet Utama - Jakarta"]);
  const [formMonitorStock, setFormMonitorStock] = useState(true);
  const [formMinStockAlert, setFormMinStockAlert] = useState("10");
  const [formPrimaryUnit, setFormPrimaryUnit] = useState("kg");
  const [formPurchaseCost, setFormPurchaseCost] = useState("45000");
  const [formConversions, setFormConversions] = useState<UnitConversion[]>([]);

  // Click outside to close export dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportRef.current && !exportRef.current.contains(event.target as Node)) {
        setExportDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const curStock = editingItem ? editingItem.currentStock : 0;
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

  // --- EXPORT FUNCTIONS ---
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

  // --- BULK IMPORT FUNCTIONS ---
  function handleDownloadTemplate() {
    const headers = [
      "alasan_gagal",
      "data_kode_barang",
      "data_nama_barang",
      "data_harga_beli",
      "data_harga_jual",
      "data_stok",
      "data_barang_jasa",
      "data_show_toko",
      "minimum_stok",
      "tipe_diskon",
      "diskon",
      "berat_dan_satuan",
      "berat",
      "letak_rak",
      "keterangan",
      "kategori",
      "gambar",
    ];

    const sampleRows = [
      ["", "BB-006", "Minyak Wijen Woei Seng 600ml", "58000", "0", "12", "0", "0", "10", "0", "0", "botol", "600", "Rak A-01", "Bumbu olahan dimsum", "Bahan Baku", ""],
      ["", "BB-007", "Kecap Asin Cap Hati Kudus 600ml", "35000", "0", "24", "0", "0", "5", "0", "0", "botol", "600", "Rak A-02", "Bumbu dapur utama", "Bahan Baku", ""],
      ["", "KM-003", "Kantong Plastik Takeaway L", "12000", "0", "150", "0", "0", "50", "0", "0", "pack", "500", "Rak B-01", "Pembungkus takeaway", "Kemasan", ""],
    ];

    const csvContent = [headers.join(","), ...sampleRows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Template_Bahan_Baku_Wanna_Dimsum.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportedFile(file);
    setImportError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) {
          setImportError("File kosong atau tidak dapat dibaca!");
          return;
        }

        const lines = text
          .split(/\r\n|\n/)
          .map((l) => l.trim())
          .filter((l) => l.length > 0);
        if (lines.length < 2) {
          setImportError("File harus memiliki header dan setidaknya 1 baris data!");
          return;
        }

        const rawHeaders = lines[0].split(",").map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

        const skuIdx = rawHeaders.findIndex((h) => h.includes("data_kode_barang") || h.includes("sku") || h.includes("kode"));
        const nameIdx = rawHeaders.findIndex((h) => h.includes("data_nama_barang") || h.includes("nama"));
        const costIdx = rawHeaders.findIndex((h) => h.includes("data_harga_beli") || h.includes("harga_beli") || h.includes("cost"));
        const stockIdx = rawHeaders.findIndex((h) => h.includes("data_stok") || h.includes("stok"));
        const minIdx = rawHeaders.findIndex((h) => h.includes("minimum_stok") || h.includes("min_stok") || h.includes("alert"));
        const unitIdx = rawHeaders.findIndex((h) => h.includes("berat_dan_satuan") || h.includes("satuan") || h.includes("unit"));

        const parsed: RawMaterialItem[] = [];

        for (let i = 1; i < lines.length; i++) {
          const rowCells = lines[i].split(",").map((c) => c.replace(/^["']|["']$/g, "").trim());
          if (rowCells.length < 2) continue;

          const sku = (skuIdx >= 0 ? rowCells[skuIdx] : "") || `BB-IMP-${Date.now()}-${i}`;
          const name = nameIdx >= 0 ? rowCells[nameIdx] : "";
          if (!name) continue;

          const purchaseCost = costIdx >= 0 ? Number(rowCells[costIdx].replace(/[^0-9]/g, "")) || 25000 : 25000;
          const currentStock = stockIdx >= 0 ? Number(rowCells[stockIdx].replace(/[^0-9]/g, "")) || 10 : 10;
          const minStockAlert = minIdx >= 0 ? Number(rowCells[minIdx].replace(/[^0-9]/g, "")) || 5 : 5;
          const primaryUnit = unitIdx >= 0 && rowCells[unitIdx] ? rowCells[unitIdx] : "kg";

          let status: "Tersedia" | "Menipis" | "Habis" = "Tersedia";
          if (currentStock === 0) status = "Habis";
          else if (currentStock <= minStockAlert) status = "Menipis";

          parsed.push({
            id: `rm-imp-${Date.now()}-${i}`,
            sku,
            name,
            outlets: ["Outlet Utama - Jakarta"],
            monitorStock: true,
            minStockAlert,
            currentStock,
            primaryUnit,
            purchaseCost,
            unitConversions: [],
            status,
          });
        }

        if (parsed.length === 0) {
          setImportError("Tidak ada baris data bahan baku yang valid ditemukan!");
        } else {
          setParsedImportItems(parsed);
        }
      } catch (err) {
        setImportError("Gagal membaca format file. Pastikan menggunakan template Excel/CSV yang benar.");
      }
    };

    reader.readAsText(file, "UTF-8");
  }

  function handleProcessImport() {
    if (parsedImportItems.length === 0) return;

    const updated = [...items];
    for (const newItem of parsedImportItems) {
      const idx = updated.findIndex((existing) => existing.sku === newItem.sku || existing.name.toLowerCase() === newItem.name.toLowerCase());
      if (idx >= 0) {
        updated[idx] = { ...updated[idx], ...newItem, id: updated[idx].id };
      } else {
        updated.unshift(newItem);
      }
    }

    setItems(updated);
    setMsg({ type: "ok", text: `🎉 Berhasil mengimpor massal ${parsedImportItems.length} bahan baku ke dalam inventori!` });
    setImportModalOpen(false);
    setImportedFile(null);
    setParsedImportItems([]);
    setImportError(null);
  }

  const shownItems = items.filter(
    (i) =>
      !query.trim() ||
      i.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      i.sku.toLowerCase().includes(query.trim().toLowerCase())
  );

  const totalValue = items.reduce((acc, i) => acc + i.currentStock * i.purchaseCost, 0);
  const needRestock = items.filter((i) => i.currentStock <= i.minStockAlert).length;
  const tableTmpl = "1.2fr 2.4fr 1.8fr 1.2fr 1fr 1.1fr 0.7fr";

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

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Tombol Impor Massal */}
          <button
            onClick={() => {
              setImportModalOpen(true);
              setImportedFile(null);
              setParsedImportItems([]);
              setImportError(null);
            }}
            style={{
              height: 42,
              padding: "0 18px",
              borderRadius: 10,
              border: "1px solid rgba(35,32,31,0.16)",
              background: "#fff",
              color: "#23201F",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
            }}
          >
            {ic("upload", 15, "#23201F", 2.2)}
            + Impor Massal
          </button>

          {/* Tombol Tambah Bahan Baku */}
          <button
            onClick={openCreateModal}
            style={{
              height: 42,
              padding: "0 18px",
              borderRadius: 10,
              border: "none",
              background: "#A91F34",
              color: "#fff",
              fontFamily: "inherit",
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 4px 12px rgba(169,31,52,0.25)",
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
            style={{ ...inpStyle, paddingLeft: 36 }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Dynamic 1-Button Dropdown Export (Cetak / Export ▾) */}
        <div style={{ position: "relative" }} ref={exportRef}>
          <button
            onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
            style={{
              height: 40,
              padding: "0 16px",
              borderRadius: 9,
              border: "1px solid rgba(35,32,31,0.16)",
              background: "#fff",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 700,
              color: "rgba(35,32,31,0.85)",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
            }}
          >
            {ic("download", 15, "#A91F34", 2.2)}
            Cetak / Export
            <span style={{ fontSize: 10, marginLeft: 2 }}>▾</span>
          </button>

          {exportDropdownOpen ? (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: "100%",
                marginTop: 6,
                background: "#fff",
                borderRadius: 10,
                border: "1px solid rgba(35,32,31,0.12)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.12)",
                zIndex: 100,
                minWidth: 170,
                overflow: "hidden",
                padding: "4px 0",
              }}
            >
              <button
                onClick={() => {
                  setExportDropdownOpen(false);
                  handleExportPdf();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 16px",
                  border: "none",
                  background: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#23201F",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF9F2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                {ic("filePlus", 14, "#23201F", 2)}
                Export PDF
              </button>
              <button
                onClick={() => {
                  setExportDropdownOpen(false);
                  handleExportExcel();
                }}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 16px",
                  border: "none",
                  borderTop: "1px solid rgba(35,32,31,0.06)",
                  background: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#23201F",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF9F2")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
              >
                {ic("download", 14, "#23201F", 2)}
                Export Excel
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Main Table */}
      <div className="wd-responsive-table" style={CARD}>
        <div style={{ overflowX: "auto" }} className="wd-scroll">
          <div style={{ minWidth: 920 }}>
            {/* Header */}
            <div style={{ ...HEAD, gridTemplateColumns: tableTmpl }}>
              <div>SKU</div>
              <div>Nama Bahan Baku</div>
              <div>Outlet Terdaftar</div>
              <div style={{ textAlign: "right" }}>Stok Fisik</div>
              <div style={{ textAlign: "right" }}>Min Alert</div>
              <div>Status</div>
              <div style={{ textAlign: "right" }}>Aksi</div>
            </div>

            {/* Rows */}
            {shownItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13.5 }}>
                Tidak ada data bahan baku yang ditemukan.
              </div>
            ) : (
              shownItems.map((item) => {
                const tone = item.status === "Tersedia" ? "ok" : item.status === "Menipis" ? "warn" : "out";
                return (
                  <div key={item.id} style={{ ...ROW, gridTemplateColumns: tableTmpl }}>
                    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12.5 }}>{item.sku}</div>
                    <div>
                      <div style={{ fontWeight: 700, color: "#23201F" }}>{item.name}</div>
                      {item.unitConversions && item.unitConversions.length > 0 ? (
                        <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.45)", marginTop: 2 }}>
                          {item.unitConversions.length} konversi satuan terhubung
                        </div>
                      ) : null}
                    </div>
                    <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.7)", fontWeight: 500 }}>
                      {item.outlets.join(", ")}
                    </div>
                    <div style={{ textAlign: "right", fontFamily: MONO, fontWeight: 800, fontSize: 13.5 }}>
                      {item.currentStock} {item.primaryUnit}
                    </div>
                    <div style={{ textAlign: "right", fontFamily: MONO, color: "rgba(35,32,31,0.5)", fontSize: 12.5 }}>
                      {item.minStockAlert} {item.primaryUnit}
                    </div>
                    <div>
                      <Badge text={item.status} tone={tone} />
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
                        }}
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- MODAL IMPOR MASSAL BAHAN BAKU --- */}
      {importModalOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 620,
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 22px",
                borderBottom: "1px solid rgba(35,32,31,0.08)",
                background: "#FFF9F2",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#A91F34" }}>Impor Massal Bahan Baku</h3>
                <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(35,32,31,0.6)" }}>
                  Upload file Excel/CSV sesuai format template untuk mendaftarkan bahan baku secara cepat.
                </p>
              </div>
              <button
                onClick={() => setImportModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer", color: "rgba(35,32,31,0.5)" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
              {/* Step 1: Download Template */}
              <div
                style={{
                  background: "#F5F6F8",
                  border: "1px solid rgba(35,32,31,0.08)",
                  borderRadius: 12,
                  padding: 16,
                  marginBottom: 18,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                }}
              >
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "#23201F" }}>1. Download Template Excel</div>
                  <div style={{ fontSize: 12, color: "rgba(35,32,31,0.6)", marginTop: 2 }}>
                    Unduh format template Excel resmi dengan kolom data bahan baku & petunjuk pengisian.
                  </div>
                </div>

                <button
                  onClick={handleDownloadTemplate}
                  style={{
                    height: 38,
                    padding: "0 16px",
                    borderRadius: 9,
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
                    whiteSpace: "nowrap",
                  }}
                >
                  {ic("download", 14, "#A91F34", 2.2)}
                  Download Template Excel
                </button>
              </div>

              {/* Step 2: Upload File */}
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 13.5, fontWeight: 800, color: "#23201F", marginBottom: 8 }}>
                  2. Upload File Template Excel / CSV
                </div>

                <div
                  style={{
                    border: "2px dashed rgba(35,32,31,0.18)",
                    borderRadius: 12,
                    padding: "28px 20px",
                    textAlign: "center",
                    background: "#FAFAFA",
                    cursor: "pointer",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <input
                    type="file"
                    accept=".csv, .xls, .xlsx, .txt"
                    onChange={handleFileSelected}
                    style={{
                      position: "absolute",
                      inset: 0,
                      opacity: 0,
                      cursor: "pointer",
                      width: "100%",
                      height: "100%",
                      zIndex: 10,
                    }}
                  />
                  <div style={{ marginBottom: 10, color: "#A91F34", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {ic("upload", 32, "#A91F34", 1.8)}
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: "#23201F" }}>
                    {importedFile ? importedFile.name : "Klik atau seret file Excel/CSV di sini"}
                  </div>
                  <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)", marginTop: 4 }}>
                    Mendukung file format <code>.xlsx</code>, <code>.xls</code>, atau <code>.csv</code>
                  </div>
                </div>
              </div>

              {/* Import Error Message */}
              {importError ? (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 9,
                    background: "#FDE8E8",
                    color: "#B83636",
                    border: "1px solid #F8B4B4",
                    fontSize: 12.5,
                    fontWeight: 600,
                    marginBottom: 16,
                  }}
                >
                  ⚠️ {importError}
                </div>
              ) : null}

              {/* Parsed Preview Table */}
              {parsedImportItems.length > 0 ? (
                <div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: "#238152",
                      marginBottom: 8,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {ic("checkCircle", 16, "#238152", 2)}
                    {parsedImportItems.length} Item Bahan Baku Siap Diimpor
                  </div>

                  <div style={{ border: "1px solid rgba(35,32,31,0.1)", borderRadius: 10, overflow: "hidden", maxHeight: 180, overflowY: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: "#FFF9F2", color: "#A91F34", textAlign: "left" }}>
                          <th style={{ padding: "8px 10px" }}>SKU</th>
                          <th style={{ padding: "8px 10px" }}>Nama Bahan Baku</th>
                          <th style={{ padding: "8px 10px", textAlign: "right" }}>Stok</th>
                          <th style={{ padding: "8px 10px", textAlign: "right" }}>Harga Beli</th>
                        </tr>
                      </thead>
                      <tbody>
                        {parsedImportItems.map((item, idx) => (
                          <tr key={idx} style={{ borderTop: "1px solid rgba(35,32,31,0.06)" }}>
                            <td style={{ padding: "8px 10px", fontFamily: MONO, fontWeight: 700 }}>{item.sku}</td>
                            <td style={{ padding: "8px 10px", fontWeight: 700 }}>{item.name}</td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: MONO }}>
                              {item.currentStock} {item.primaryUnit}
                            </td>
                            <td style={{ padding: "8px 10px", textAlign: "right", fontFamily: MONO }}>
                              {formatRupiah(item.purchaseCost)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div
              style={{
                padding: "14px 22px",
                borderTop: "1px solid rgba(35,32,31,0.08)",
                background: "#FAFAFA",
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                onClick={() => setImportModalOpen(false)}
                style={{
                  height: 40,
                  padding: "0 18px",
                  borderRadius: 9,
                  border: "1px solid rgba(35,32,31,0.14)",
                  background: "#fff",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleProcessImport}
                disabled={parsedImportItems.length === 0}
                style={{
                  height: 40,
                  padding: "0 22px",
                  borderRadius: 9,
                  border: "none",
                  background: "#A91F34",
                  color: "#fff",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  opacity: parsedImportItems.length === 0 ? 0.5 : 1,
                }}
              >
                Proses Impor Massal ({parsedImportItems.length})
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* --- MODAL CREATE / EDIT BAHAN BAKU --- */}
      {isCreatingNew || editingItem ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              width: "100%",
              maxWidth: 680,
              maxHeight: "92vh",
              overflowY: "auto",
              padding: 24,
              boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            }}
            className="wd-scroll"
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#23201F" }}>
                  {editingItem ? "Edit Bahan Baku" : "Tambah Bahan Baku Baru"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgba(35,32,31,0.55)" }}>
                  Isi rincian informasi bahan baku, pengingat stok, dan konversi satuan.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setIsCreatingNew(false);
                }}
                style={{ background: "none", border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer", color: "rgba(35,32,31,0.4)" }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>SKU Bahan Baku</label>
                  <input
                    value={formSku}
                    onChange={(e) => setFormSku(e.target.value)}
                    placeholder="BB-001"
                    style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>Nama Bahan Baku *</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Nama bahan baku"
                    style={{ ...inpStyle, fontWeight: 700 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 6 }}>Outlet Terdaftar</label>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {AVAILABLE_OUTLETS.map((out) => {
                    const checked = formOutlets.includes(out);
                    return (
                      <label key={out} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) setFormOutlets([...formOutlets, out]);
                            else setFormOutlets(formOutlets.filter((o) => o !== out));
                          }}
                        />
                        {out}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>Satuan Utama</label>
                  <input
                    value={formPrimaryUnit}
                    onChange={(e) => setFormPrimaryUnit(e.target.value)}
                    placeholder="kg, pack, pcs"
                    style={inpStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>Stok Min Alert</label>
                  <input
                    value={formMinStockAlert}
                    onChange={(e) => setFormMinStockAlert(e.target.value)}
                    placeholder="10"
                    style={{ ...inpStyle, fontFamily: MONO }}
                  />
                </div>
              </div>

              {/* Konversi Satuan */}
              <div style={{ borderTop: "1px solid rgba(35,32,31,0.08)", paddingTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#23201F" }}>Konversi Satuan Terhubung</div>
                  <button
                    type="button"
                    onClick={addConversionRow}
                    style={{
                      height: 30,
                      padding: "0 12px",
                      borderRadius: 7,
                      border: "1px solid rgba(35,32,31,0.14)",
                      background: "#FFF9F2",
                      color: "#A91F34",
                      fontFamily: "inherit",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    + Tambah Konversi
                  </button>
                </div>

                {formConversions.length === 0 ? (
                  <div style={{ fontSize: 12, color: "rgba(35,32,31,0.45)", fontStyle: "italic" }}>
                    Belum ada konversi satuan. Klik tombol di atas untuk menambah (misal: 1 kg = 1000 gram).
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {formConversions.map((uc, idx) => (
                      <div key={uc.id || idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr 30px", gap: 8, alignItems: "center" }}>
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
                            style={{ border: "none", background: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                            title="Hapus konversi satuan"
                          >
                            {ic("trash", 15, "#B83636", 2)}
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
