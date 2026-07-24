"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { formatRupiah } from "@/lib/format";
import { ic } from "./icons";
import { Badge, MiniStat, MONO } from "./shared";
import {
  INITIAL_STOCK_ITEMS,
  getStoredStockItems,
  saveStoredStockItems,
  type StockItem,
} from "@/lib/stock-sync";

const CARD: React.CSSProperties = {
  background: "#fff",
  border: "1px solid rgba(35,32,31,0.06)",
  borderRadius: 14,
  overflow: "hidden",
};

const inpStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  border: "1px solid rgba(35,32,31,0.14)",
  borderRadius: 9,
  padding: "0 12px",
  fontFamily: "inherit",
  fontSize: 13.5,
  background: "#fff",
  outline: "none",
};

export function StockManager() {
  const [items, setItems] = useState<StockItem[]>(INITIAL_STOCK_ITEMS);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Semua Kategori");
  const [stockStatusFilter, setStockStatusFilter] = useState("Semua Stok");
  const [datePreset, setDatePreset] = useState("Hari Ini");
  const [startDate, setStartDate] = useState("2026-07-24");
  const [endDate, setEndDate] = useState("2026-07-24");

  const [detailItem, setDetailItem] = useState<StockItem | null>(null);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Adjust stock states for detail modal
  const [adjustQty, setAdjustQty] = useState("5");
  const [adjustReason, setAdjustReason] = useState("Stok Terbuang / Rusak");

  // Load localStorage state after hydration
  useEffect(() => {
    setItems(getStoredStockItems());
  }, []);

  // Sync state on localStorage changes / custom events
  useEffect(() => {
    function sync() {
      setItems(getStoredStockItems());
    }
    window.addEventListener("pos_wd_stock_updated", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("pos_wd_stock_updated", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchCat = categoryFilter === "Semua Kategori" || item.category === categoryFilter;

      const isLow = item.currentStock <= item.minStock && item.currentStock > 0;
      const isOut = item.currentStock === 0;
      const isOk = item.currentStock > item.minStock;

      let matchStatus = true;
      if (stockStatusFilter === "Tersedia") matchStatus = isOk;
      else if (stockStatusFilter === "Menipis") matchStatus = isLow;
      else if (stockStatusFilter === "Habis") matchStatus = isOut;

      const q = query.toLowerCase().trim();
      const matchQuery =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.outlet.toLowerCase().includes(q);

      return matchCat && matchStatus && matchQuery;
    });
  }, [items, query, categoryFilter, stockStatusFilter]);

  // KPIs
  const totalSku = items.length;
  const totalValue = items.reduce((acc, i) => acc + i.currentStock * i.defaultPrice, 0);
  const lowStockCount = items.filter((i) => i.currentStock <= i.minStock).length;

  function handleAdjustStock(delta: number) {
    if (!detailItem) return;
    const qtyChange = parseFloat(adjustQty) || 0;
    if (qtyChange <= 0) return;

    const actualChange = delta * qtyChange;
    const newStock = Math.max(0, detailItem.currentStock + actualChange);

    const updated = items.map((i) => {
      if (i.id === detailItem.id) {
        const isWaste = adjustReason.includes("Terbuang") || adjustReason.includes("Rusak");
        return {
          ...i,
          currentStock: newStock,
          stockTerbuang: isWaste && delta < 0 ? (i.stockTerbuang || 0) + qtyChange : i.stockTerbuang || 0,
          stockKeluar: !isWaste && delta < 0 ? (i.stockKeluar || 0) + qtyChange : i.stockKeluar || 0,
          stockMasuk: delta > 0 ? (i.stockMasuk || 0) + qtyChange : i.stockMasuk || 0,
          lastUpdated: new Date().toISOString().slice(0, 10),
        };
      }
      return i;
    });

    setItems(updated);
    saveStoredStockItems(updated);

    const updatedDetail = updated.find((i) => i.id === detailItem.id) || { ...detailItem, currentStock: newStock };
    setDetailItem(updatedDetail);
    setMsg({
      type: "ok",
      text: `Stok "${detailItem.name}" berhasil disesuaikan (${actualChange > 0 ? "+" : ""}${actualChange} ${detailItem.unit}). Total stok saat ini: ${newStock} ${detailItem.unit}.`,
    });
  }

  function handleExportPdf() {
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const rowsHtml = filteredItems
      .map(
        (i, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold;">${i.code}</td>
        <td><strong>${i.name}</strong></td>
        <td>${i.category}</td>
        <td style="text-align: right; font-family: monospace;">${i.stockAwal || 0}</td>
        <td style="text-align: right; font-family: monospace; color: green;">+${i.stockMasuk || 0}</td>
        <td style="text-align: right; font-family: monospace; color: red;">-${i.stockKeluar || 0}</td>
        <td style="text-align: right; font-family: monospace; color: #238152;">+${i.stockTerproduksi || 0}</td>
        <td style="text-align: right; font-family: monospace;">${i.stockTerjual || 0}</td>
        <td style="text-align: right; font-family: monospace; color: #B83636;">-${i.stockTerbuang || 0}</td>
        <td style="text-align: right; font-family: monospace;">${i.stockTransit || 0}</td>
        <td style="text-align: right; font-family: monospace; font-weight: bold;">${i.currentStock}</td>
        <td style="text-align: center;">${i.unit}</td>
      </tr>
    `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Laporan Mutasi & Daftar Stok - WANNA DIMSUM</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #23201F; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 11.5px; }
          th, td { border: 1px solid #ddd; padding: 7px 8px; text-align: left; }
          th { background: #FFF9F2; color: #A91F34; font-weight: bold; }
          h2 { color: #A91F34; margin: 0; }
        </style>
      </head>
      <body>
        <h2>WANNA DIMSUM POS - LAPORAN MUTASI & DAFTAR STOK</h2>
        <p style="font-size: 12px; color: #666;">Periode: <strong>${startDate} s/d ${endDate}</strong> | Filter Kategori: <strong>${categoryFilter}</strong> | Total SKU: <strong>${filteredItems.length}</strong></p>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>SKU</th>
              <th>Nama Barang</th>
              <th>Jenis</th>
              <th>Awal</th>
              <th>Masuk</th>
              <th>Keluar</th>
              <th>Terproduksi</th>
              <th>Terjual</th>
              <th>Terbuang</th>
              <th>Transit</th>
              <th>Akhir</th>
              <th>Satuan</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  function handleExportExcel() {
    const headers = ["SKU", "Nama Barang", "Jenis/Kategori", "Awal", "Masuk", "Keluar", "Terproduksi", "Terjual", "Terbuang", "Transit", "Akhir", "Satuan"];
    const rows = filteredItems.map((i) => [
      i.code,
      i.name,
      i.category,
      i.stockAwal || 0,
      i.stockMasuk || 0,
      i.stockKeluar || 0,
      i.stockTerproduksi || 0,
      i.stockTerjual || 0,
      i.stockTerbuang || 0,
      i.stockTransit || 0,
      i.currentStock,
      i.unit,
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))].join("\r\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Laporan_Daftar_Stok_Wanna_Dimsum_${startDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Column Template Layout requested by User:
  // SKU | NAMA | JENIS | AWAL | MASUK | KELUAR | TERPRODUKSI | TERJUAL | TERBUANG | TRANSIT | AKHIR | SATUAN | AKSI
  const tableTmpl = "100px 200px 120px 80px 80px 80px 105px 85px 85px 80px 85px 80px 70px";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Toast Notification */}
      {msg ? (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            background: msg.type === "ok" ? "#EDF7F1" : "#FDE8E8",
            color: msg.type === "ok" ? "#238152" : "#B83636",
            border: `1px solid ${msg.type === "ok" ? "#C2E6D1" : "#F8B4B4"}`,
            fontSize: 13.5,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {ic(msg.type === "ok" ? "checkCircle" : "ban", 18, "currentColor", 2)}
            {msg.text}
          </div>
          <button onClick={() => setMsg(null)} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800, color: "inherit" }}>
            ✕
          </button>
        </div>
      ) : null}

      {/* Header & Title */}
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.45)", marginBottom: 6 }}>
          <span>Inventori</span>
          <span>/</span>
          <span>Kelola Stok</span>
          <span>/</span>
          <span style={{ color: "#A91F34" }}>Daftar Stok</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#23201F", margin: 0 }}>Daftar Stok (Laporan Mutasi Persediaan)</h1>
        <p style={{ fontSize: 13, color: "rgba(35,32,31,0.6)", margin: "4px 0 0" }}>
          Laporan rincian saldo persediaan stok (Awal, Masuk, Keluar, Terproduksi, Terjual, Terbuang, Transit, & Akhir) secara real-time.
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <MiniStat label="Total SKU Stok" value={`${totalSku} SKU`} sub="Katalog bahan terdaftar" tone="info" />
        <MiniStat label="Nilai Total Persediaan" value={formatRupiah(totalValue)} sub="Akumulasi nilai modal stok" tone="ok" />
        <MiniStat label="Perlu Restock" value={`${lowStockCount} SKU`} sub="Stok di bawah batas minimal" tone={lowStockCount > 0 ? "warn" : "ok"} />
      </div>

      {/* Toolbar: Export, Date Picker, Filters (Jumlah Stok / Kategori / Search) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", background: "#FAF8F6", padding: 14, borderRadius: 12, border: "1px solid rgba(35,32,31,0.08)" }}>
        {/* Search Input */}
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 280 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: "rgba(35,32,31,0.4)" }}>
            {ic("search", 15, "currentColor", 2)}
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari SKU, nama barang..."
            style={{ ...inpStyle, height: 36, paddingLeft: 34, fontSize: 12.5 }}
          />
        </div>

        {/* Filter Kategori */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.6)" }}>Jenis:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ ...inpStyle, height: 36, width: 145, fontSize: 12.5, fontWeight: 600 }}
          >
            <option value="Semua Kategori">Semua Kategori</option>
            <option value="Bahan Baku">Bahan Baku</option>
            <option value="Kemasan">Kemasan</option>
            <option value="Operasional">Operasional</option>
            <option value="Aset">Aset</option>
          </select>
        </div>

        {/* Filter Jumlah Stok / Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.6)" }}>Status Stok:</span>
          <select
            value={stockStatusFilter}
            onChange={(e) => setStockStatusFilter(e.target.value)}
            style={{ ...inpStyle, height: 36, width: 135, fontSize: 12.5, fontWeight: 600 }}
          >
            <option value="Semua Stok">Semua Stok</option>
            <option value="Tersedia">Tersedia</option>
            <option value="Menipis">Menipis</option>
            <option value="Habis">Habis</option>
          </select>
        </div>

        {/* Date Picker Filter */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.6)", display: "flex", alignItems: "center", gap: 4 }}>
            {ic("schedule", 14, "#A91F34", 2)}
            Tanggal:
          </span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={{ ...inpStyle, height: 36, width: 135, fontSize: 12, fontFamily: MONO }}
          />
          <span style={{ fontSize: 12, color: "rgba(35,32,31,0.4)" }}>s/d</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ ...inpStyle, height: 36, width: 135, fontSize: 12, fontFamily: MONO }}
          />
        </div>

        <div style={{ flex: 1 }} />

        {/* Export Buttons (PDF & Excel) */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <button
            onClick={handleExportExcel}
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid rgba(35,32,31,0.14)",
              background: "#fff",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              color: "#23201F",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {ic("download", 14, "#23201F", 2)}
            Excel
          </button>
          <button
            onClick={handleExportPdf}
            style={{
              height: 36,
              padding: "0 12px",
              borderRadius: 8,
              border: "none",
              background: "#A91F34",
              color: "#fff",
              fontFamily: "inherit",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            {ic("download", 14, "#fff", 2)}
            Cetak PDF
          </button>
        </div>
      </div>

      {/* Reactive Stock Table Sesuai Urutan Kolom yang Diminta User */}
      <div className="wd-responsive-table" style={CARD}>
        <div style={{ overflowX: "auto" }} className="wd-scroll">
          <div style={{ minWidth: 1270 }}>
            {/* Table Header: SKU | NAMA | JENIS | AWAL | MASUK | KELUAR | TERPRODUKSI | TERJUAL | TERBUANG | TRANSIT | AKHIR | SATUAN | AKSI (Icon Mata 👁️) */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: tableTmpl,
                gap: 8,
                padding: "12px 16px",
                background: "#FFF9F2",
                fontSize: 11,
                fontWeight: 800,
                color: "#A91F34",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                alignItems: "center",
              }}
            >
              <div>SKU</div>
              <div>NAMA</div>
              <div>JENIS</div>
              <div style={{ textAlign: "right" }}>AWAL</div>
              <div style={{ textAlign: "right" }}>MASUK</div>
              <div style={{ textAlign: "right" }}>KELUAR</div>
              <div style={{ textAlign: "right" }}>TERPRODUKSI</div>
              <div style={{ textAlign: "right" }}>TERJUAL</div>
              <div style={{ textAlign: "right" }}>TERBUANG</div>
              <div style={{ textAlign: "right" }}>TRANSIT</div>
              <div style={{ textAlign: "right" }}>AKHIR</div>
              <div style={{ textAlign: "center" }}>SATUAN</div>
              <div style={{ textAlign: "center" }}>AKSI</div>
            </div>

            {/* Table Rows */}
            {filteredItems.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13.5 }}>
                Tidak ada data stok yang cocok dengan kriteria pencarian.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isLow = item.currentStock <= item.minStock;
                const isOut = item.currentStock === 0;

                return (
                  <div
                    key={item.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: tableTmpl,
                      gap: 8,
                      padding: "12px 16px",
                      borderTop: "1px solid rgba(35,32,31,0.06)",
                      fontSize: 13,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontFamily: MONO, fontWeight: 700, color: "#23201F", fontSize: 12 }}>{item.code}</div>
                    <div style={{ fontWeight: 700, color: "#23201F" }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(35,32,31,0.6)" }}>{item.category}</div>

                    <div style={{ textAlign: "right", fontFamily: MONO, color: "rgba(35,32,31,0.65)" }}>
                      {item.stockAwal || 0}
                    </div>

                    <div style={{ textAlign: "right", fontFamily: MONO, color: "#238152", fontWeight: 700 }}>
                      +{item.stockMasuk || 0}
                    </div>

                    <div style={{ textAlign: "right", fontFamily: MONO, color: "#B83636", fontWeight: 600 }}>
                      -{item.stockKeluar || 0}
                    </div>

                    <div style={{ textAlign: "right", fontFamily: MONO, color: "#1C6B42", fontWeight: 700 }}>
                      +{item.stockTerproduksi || 0}
                    </div>

                    <div style={{ textAlign: "right", fontFamily: MONO, color: "rgba(35,32,31,0.8)" }}>
                      {item.stockTerjual || 0}
                    </div>

                    <div style={{ textAlign: "right", fontFamily: MONO, color: "#B83636", fontWeight: 600 }}>
                      -{item.stockTerbuang || 0}
                    </div>

                    <div style={{ textAlign: "right", fontFamily: MONO, color: "rgba(35,32,31,0.6)" }}>
                      {item.stockTransit || 0}
                    </div>

                    <div
                      style={{
                        textAlign: "right",
                        fontFamily: MONO,
                        fontWeight: 800,
                        fontSize: 13.5,
                        color: isOut ? "#B83636" : isLow ? "#D97706" : "#23201F",
                      }}
                    >
                      {item.currentStock}
                    </div>

                    <div style={{ textAlign: "center", fontSize: 12, color: "rgba(35,32,31,0.65)" }}>
                      {item.unit}
                    </div>

                    {/* Icon Mata (👁️) Action Button */}
                    <div style={{ textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={() => setDetailItem(item)}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          border: "1px solid rgba(35,32,31,0.14)",
                          background: "#fff",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "#23201F",
                        }}
                        title="Lihat Detail & Mutasi Stok"
                      >
                        {ic("eye", 15, "#23201F", 2)}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* --- DETAIL & MUTASI STOK MODAL (KLIK ICON MATA 👁️) --- */}
      {detailItem ? (
        <div
          onClick={() => setDetailItem(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 18,
              width: "100%",
              maxWidth: 780,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
            }}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 24px", borderBottom: "1px solid rgba(35,32,31,0.08)", background: "#FFF9F2" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#A91F34", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Rincian Mutasi & Kartu Stok
                </div>
                <h3 style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 800, color: "#23201F" }}>
                  {detailItem.name} <span style={{ fontFamily: MONO, fontSize: 14, color: "rgba(35,32,31,0.5)" }}>({detailItem.code})</span>
                </h3>
              </div>
              <button onClick={() => setDetailItem(null)} style={{ background: "none", border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer", color: "rgba(35,32,31,0.5)" }}>
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: 24, overflowY: "auto", flex: 1 }} className="wd-scroll">
              {/* Summary KPIs */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
                <div style={{ background: "#FAFAFA", padding: 12, borderRadius: 10, border: "1px solid rgba(35,32,31,0.08)" }}>
                  <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)", fontWeight: 700 }}>STOK AWAL</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, marginTop: 4 }}>
                    {detailItem.stockAwal || 0} {detailItem.unit}
                  </div>
                </div>

                <div style={{ background: "#EDF7F1", padding: 12, borderRadius: 10, border: "1px solid #C2E6D1" }}>
                  <div style={{ fontSize: 11, color: "#238152", fontWeight: 700 }}>STOK MASUK / PRODUKSI</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, marginTop: 4, color: "#238152" }}>
                    +{(detailItem.stockMasuk || 0) + (detailItem.stockTerproduksi || 0)} {detailItem.unit}
                  </div>
                </div>

                <div style={{ background: "#FDE8E8", padding: 12, borderRadius: 10, border: "1px solid #F8B4B4" }}>
                  <div style={{ fontSize: 11, color: "#B83636", fontWeight: 700 }}>TERJUAL / TERBUANG / KELUAR</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, marginTop: 4, color: "#B83636" }}>
                    -{(detailItem.stockKeluar || 0) + (detailItem.stockTerjual || 0) + (detailItem.stockTerbuang || 0)} {detailItem.unit}
                  </div>
                </div>

                <div style={{ background: "#FFF9F2", padding: 12, borderRadius: 10, border: "1px solid #E5C3C3" }}>
                  <div style={{ fontSize: 11, color: "#A91F34", fontWeight: 700 }}>STOK AKHIR SAAT INI</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: MONO, marginTop: 4, color: "#A91F34" }}>
                    {detailItem.currentStock} {detailItem.unit}
                  </div>
                </div>
              </div>

              {/* Rincian Komponen Mutasi */}
              <div style={{ background: "#FFF9F2", borderRadius: 12, padding: 16, marginBottom: 20, border: "1px solid rgba(35,32,31,0.08)" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#A91F34", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  {ic("report", 15, "#A91F34", 2)}
                  Rincian Komponen Pergerakan Stok (Bulan Ini)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, fontSize: 12.5 }}>
                  <div>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Masuk (Pembelian):</span>{" "}
                    <strong style={{ fontFamily: MONO, color: "#238152" }}>+{detailItem.stockMasuk || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Hasil Produksi:</span>{" "}
                    <strong style={{ fontFamily: MONO, color: "#1C6B42" }}>+{detailItem.stockTerproduksi || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Terjual Kasir POS:</span>{" "}
                    <strong style={{ fontFamily: MONO }}>-{detailItem.stockTerjual || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Stok Terbuang:</span>{" "}
                    <strong style={{ fontFamily: MONO, color: "#B83636" }}>-{detailItem.stockTerbuang || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Stok Transit:</span>{" "}
                    <strong style={{ fontFamily: MONO }}>{detailItem.stockTransit || 0}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Minimal Alert:</span>{" "}
                    <strong style={{ fontFamily: MONO }}>{detailItem.minStock} {detailItem.unit}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Harga Beli Modal:</span>{" "}
                    <strong style={{ fontFamily: MONO }}>{formatRupiah(detailItem.defaultPrice)}</strong>
                  </div>
                  <div>
                    <span style={{ color: "rgba(35,32,31,0.6)" }}>Outlet Terdaftar:</span>{" "}
                    <strong>{detailItem.outlet}</strong>
                  </div>
                </div>
              </div>

              {/* Quick Adjust Stock Form */}
              <div style={{ borderTop: "1px solid rgba(35,32,31,0.08)", paddingTop: 18 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#23201F", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                  {ic("settings", 15, "#23201F", 2)}
                  Penyesuaian Stok Fisik / Opname Manual
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr 1fr 1fr", gap: 10, alignItems: "center" }}>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    placeholder="Jumlah"
                    style={{ ...inpStyle, height: 38, fontFamily: MONO, fontWeight: 700 }}
                  />
                  <select
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    style={{ ...inpStyle, height: 38, fontSize: 12.5 }}
                  >
                    <option value="Stok Terbuang / Rusak">Stok Terbuang / Rusak</option>
                    <option value="Hasil Produksi Dapur">Hasil Produksi Dapur</option>
                    <option value="Pembelian Masuk Direct">Pembelian Masuk Direct</option>
                    <option value="Koreksi Opname Manual">Koreksi Opname Manual</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(1)}
                    style={{
                      height: 38,
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
                    + Tambah Stok
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustStock(-1)}
                    style={{
                      height: 38,
                      borderRadius: 8,
                      border: "none",
                      background: "#B83636",
                      color: "#fff",
                      fontFamily: "inherit",
                      fontSize: 12.5,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    - Kurangi Stok
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(35,32,31,0.08)", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setDetailItem(null)}
                style={{ height: 38, padding: "0 22px", borderRadius: 9, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontSize: 13, fontWeight: 800, cursor: "pointer" }}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
