"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { formatRupiah } from "@/lib/format";
import { ic } from "./icons";
import { Badge, MiniStat, MONO } from "./shared";

export interface BankAccountItem {
  id: string;
  accountHolder: string;
  bankName: string;
  accountNumber: string;
}

export interface SupplierItem {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  country: string;
  province: string;
  city: string;
  notes: string;
  bankAccounts: BankAccountItem[];
}

export const DEFAULT_SUPPLIERS: SupplierItem[] = [
  {
    id: "sup-1",
    code: "SUP-001",
    name: "CV Sumber Ayam Segar",
    email: "sumberayam@gmail.com",
    phone: "021-555-1200",
    address: "Jl. Daan Mogot No. 45, Cengkareng",
    country: "Indonesia",
    province: "DKI Jakarta",
    city: "Jakarta Barat",
    notes: "Pemasok utama daging ayam giling segar & karkas",
    bankAccounts: [
      { id: "ba-1", accountHolder: "CV Sumber Ayam Segar", bankName: "BCA", accountNumber: "5420198821" },
      { id: "ba-2", accountHolder: "CV Sumber Ayam Segar", bankName: "Mandiri", accountNumber: "118000992211" },
    ],
  },
  {
    id: "sup-2",
    code: "SUP-002",
    name: "UD Laut Segar Muara Angke",
    email: "lautsegar@muaraangke.com",
    phone: "0812-7000-1234",
    address: "Kawasan Pelabuhan Muara Angke Blok B No. 12",
    country: "Indonesia",
    province: "DKI Jakarta",
    city: "Jakarta Utara",
    notes: "Pemasok udang kupas fresh size L & seafood",
    bankAccounts: [
      { id: "ba-3", accountHolder: "Hadi Laut Segar", bankName: "BRI", accountNumber: "034101002981304" },
    ],
  },
  {
    id: "sup-3",
    code: "SUP-003",
    name: "Toko Kemasan Jaya Plastik",
    email: "kemasanjaya@gmail.com",
    phone: "021-888-9090",
    address: "Jl. Raya Serpong No. 88, Alam Sutera",
    country: "Indonesia",
    province: "Banten",
    city: "Tangerang Selatan",
    notes: "Pemasok box takeaway dimsum L & sumpit bambu",
    bankAccounts: [
      { id: "ba-4", accountHolder: "Toko Kemasan Jaya", bankName: "BCA", accountNumber: "8830112998" },
    ],
  },
  {
    id: "sup-4",
    code: "SUP-004",
    name: "PT Gas Nusantara Indonesia",
    email: "order@gasnusantara.co.id",
    phone: "021-444-3322",
    address: "Jl. Industri Raya No. 10",
    country: "Indonesia",
    province: "Jawa Barat",
    city: "Bekasi",
    notes: "Pemasok refil tabung gas LPG 12kg komersial",
    bankAccounts: [
      { id: "ba-5", accountHolder: "PT Gas Nusantara Indonesia", bankName: "BNI", accountNumber: "0991823772" },
    ],
  },
  {
    id: "sup-5",
    code: "SUP-005",
    name: "Kebun Sayur Lestari Bogor",
    email: "sayurlestari@bogor.id",
    phone: "0857-1122-3344",
    address: "Jl. Raya Puncak Km. 72",
    country: "Indonesia",
    province: "Jawa Barat",
    city: "Bogor",
    notes: "Pemasok daun bawang, kucai, jamur, & sayuran dapur",
    bankAccounts: [
      { id: "ba-6", accountHolder: "Kebun Sayur Lestari", bankName: "BCA", accountNumber: "6780192831" },
    ],
  },
];

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

export function SupplierManager() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>(DEFAULT_SUPPLIERS);
  const [isInitialized, setIsInitialized] = useState(false);
  const [query, setQuery] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Active action menu row id
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);

  // Form modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);

  // Form inputs
  const [formCode, setFormCode] = useState("");
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formCountry, setFormCountry] = useState("Indonesia");
  const [formProvince, setFormProvince] = useState("DKI Jakarta");
  const [formCity, setFormCity] = useState("Jakarta Barat");
  const [formNotes, setFormNotes] = useState("");
  const [formBankAccounts, setFormBankAccounts] = useState<BankAccountItem[]>([]);

  // Hydration safety: load localStorage after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("pos_wd_suppliers");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSuppliers(parsed);
        }
      }
    } catch (e) {}
    setIsInitialized(true);
  }, []);

  // Save suppliers to localStorage on change
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem("pos_wd_suppliers", JSON.stringify(suppliers));
  }, [suppliers, isInitialized]);

  // Click outside to close action menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".wd-action-menu-container")) {
        setActionMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSuppliers = useMemo(() => {
    const q = query.toLowerCase().trim();
    return suppliers.filter(
      (s) =>
        !q ||
        s.code.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.phone.toLowerCase().includes(q) ||
        s.address.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q)
    );
  }, [suppliers, query]);

  function openAddModal() {
    setEditingSupplier(null);
    setFormCode(`SUP-00${suppliers.length + 1}`);
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormAddress("");
    setFormCountry("Indonesia");
    setFormProvince("DKI Jakarta");
    setFormCity("Jakarta Barat");
    setFormNotes("");
    setFormBankAccounts([
      { id: `ba-${Date.now()}`, accountHolder: "", bankName: "BCA", accountNumber: "" },
    ]);
    setIsFormOpen(true);
  }

  function openEditModal(supplier: SupplierItem) {
    setEditingSupplier(supplier);
    setFormCode(supplier.code);
    setFormName(supplier.name);
    setFormEmail(supplier.email || "");
    setFormPhone(supplier.phone || "");
    setFormAddress(supplier.address || "");
    setFormCountry(supplier.country || "Indonesia");
    setFormProvince(supplier.province || "DKI Jakarta");
    setFormCity(supplier.city || "Jakarta Barat");
    setFormNotes(supplier.notes || "");
    setFormBankAccounts(
      supplier.bankAccounts && supplier.bankAccounts.length > 0
        ? [...supplier.bankAccounts]
        : [{ id: `ba-${Date.now()}`, accountHolder: supplier.name, bankName: "BCA", accountNumber: "" }]
    );
    setIsFormOpen(true);
  }

  function handleAddBankAccountRow() {
    setFormBankAccounts([
      ...formBankAccounts,
      { id: `ba-${Date.now()}-${formBankAccounts.length}`, accountHolder: formName || "", bankName: "BCA", accountNumber: "" },
    ]);
  }

  function handleRemoveBankAccountRow(id: string) {
    setFormBankAccounts(formBankAccounts.filter((ba) => ba.id !== id));
  }

  function handleSaveSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) {
      setMsg({ type: "err", text: "Nama Pemasok wajib diisi!" });
      return;
    }

    const newSupplier: SupplierItem = {
      id: editingSupplier ? editingSupplier.id : `sup-${Date.now()}`,
      code: formCode.trim() || `SUP-${String(suppliers.length + 1).padStart(3, "0")}`,
      name: formName.trim(),
      email: formEmail.trim(),
      phone: formPhone.trim(),
      address: formAddress.trim(),
      country: formCountry.trim() || "Indonesia",
      province: formProvince.trim(),
      city: formCity.trim(),
      notes: formNotes.trim(),
      bankAccounts: formBankAccounts.filter((ba) => ba.accountNumber.trim() || ba.accountHolder.trim()),
    };

    let updated: SupplierItem[];
    if (editingSupplier) {
      updated = suppliers.map((s) => (s.id === editingSupplier.id ? newSupplier : s));
      setMsg({ type: "ok", text: `Data pemasok "${newSupplier.name}" (${newSupplier.code}) berhasil diperbarui!` });
    } else {
      updated = [newSupplier, ...suppliers];
      setMsg({ type: "ok", text: `Pemasok baru "${newSupplier.name}" (${newSupplier.code}) berhasil ditambahkan!` });
    }

    setSuppliers(updated);
    setIsFormOpen(false);
  }

  function handleDeleteSupplier(id: string) {
    const target = suppliers.find((s) => s.id === id);
    if (!confirm(`Apakah Anda yakin ingin menghapus pemasok "${target?.name || id}"?`)) return;

    const updated = suppliers.filter((s) => s.id !== id);
    setSuppliers(updated);
    setMsg({ type: "ok", text: `Pemasok "${target?.name || id}" berhasil dihapus.` });
  }

  function handleExportPdf() {
    const printWin = window.open("", "_blank");
    if (!printWin) return;

    const rowsHtml = filteredSuppliers
      .map(
        (s, idx) => `
      <tr>
        <td style="text-align: center;">${idx + 1}</td>
        <td style="font-family: monospace; font-weight: bold;">${s.code}</td>
        <td><strong>${s.name}</strong><br/><span style="color: #666; font-size: 11px;">${s.email}</span></td>
        <td>${s.notes || "-"}</td>
        <td>${s.address || "-"}<br/><span style="color: #666; font-size: 11px;">${s.city}, ${s.province}</span></td>
        <td style="font-family: monospace;">${s.phone || "-"}</td>
        <td>${s.bankAccounts.map((b) => `${b.bankName}: ${b.accountNumber} a/n ${b.accountHolder}`).join("<br/>") || "-"}</td>
      </tr>
    `
      )
      .join("");

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Daftar Pemasok - WANNA DIMSUM</title>
        <style>
          body { font-family: system-ui, sans-serif; padding: 24px; color: #23201F; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
          th, td { border: 1px solid #ddd; padding: 8px 10px; text-align: left; }
          th { background: #FFF9F2; color: #A91F34; font-weight: bold; }
          h2 { color: #A91F34; margin: 0; }
        </style>
      </head>
      <body>
        <h2>WANNA DIMSUM POS - LAPORAN DAFTAR PEMASOK</h2>
        <p style="font-size: 12px; color: #666;">Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")} | Total Pemasok: ${filteredSuppliers.length}</p>
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Kode Pemasok</th>
              <th>Nama Pemasok</th>
              <th>Keterangan</th>
              <th>Alamat</th>
              <th>No Telp</th>
              <th>Informasi Rekening</th>
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

  const tableTmpl = "120px 220px 240px 240px 140px 80px";

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
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.45)", marginBottom: 6 }}>
            <span>Inventori</span>
            <span>/</span>
            <span>Pembelian Stok</span>
            <span>/</span>
            <span style={{ color: "#A91F34" }}>Daftar Pemasok</span>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#23201F", margin: 0 }}>Daftar Pemasok</h1>
          <p style={{ fontSize: 13, color: "rgba(35,32,31,0.6)", margin: "4px 0 0" }}>
            Kelola mitra pemasok bahan baku, kontak, alamat pengiriman, serta rekening pembayaran.
          </p>
        </div>

        <button
          onClick={openAddModal}
          style={{
            height: 42,
            padding: "0 20px",
            borderRadius: 10,
            border: "none",
            background: "#A91F34",
            color: "#fff",
            fontFamily: "inherit",
            fontSize: 13.5,
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(169,31,52,0.25)",
          }}
        >
          {ic("plus", 16, "#fff", 2.4)}
          + Tambah Pemasok
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <MiniStat label="Total Pemasok" value={`${suppliers.length} Pemasok`} sub="Pemasok terdaftar dalam sistem" tone="info" />
        <MiniStat label="Pemasok Aktif" value={`${suppliers.length} Pemasok`} sub="Siap transaksi Pembelian Stok" tone="ok" />
        <MiniStat
          label="Total Rekening Bank"
          value={`${suppliers.reduce((acc, s) => acc + (s.bankAccounts?.length || 0), 0)} Rekening`}
          sub="Terkoneksi ke Pembayaran Faktur"
          tone="neutral"
        />
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 220, maxWidth: 360 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: "rgba(35,32,31,0.4)" }}>
            {ic("search", 16, "currentColor", 2)}
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari kode, nama pemasok, no telp..."
            style={{ ...inpStyle, paddingLeft: 36 }}
          />
        </div>

        <div style={{ flex: 1 }} />

        <button
          onClick={handleExportPdf}
          style={{
            height: 38,
            padding: "0 14px",
            borderRadius: 9,
            border: "1px solid rgba(35,32,31,0.14)",
            background: "#fff",
            fontFamily: "inherit",
            fontSize: 12.5,
            fontWeight: 700,
            color: "rgba(35,32,31,0.75)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {ic("download", 14, "currentColor", 2)}
          Cetak Laporan PDF
        </button>
      </div>

      {/* Table Daftar Pemasok */}
      <div className="wd-responsive-table" style={{ ...CARD, overflow: "visible" }}>
        <div style={{ overflowX: "auto" }} className="wd-scroll">
          <div style={{ minWidth: 1040 }}>
            {/* Table Header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: tableTmpl,
                gap: 12,
                padding: "12px 18px",
                background: "#FFF9F2",
                fontSize: 11,
                fontWeight: 800,
                color: "#A91F34",
                letterSpacing: "0.03em",
                textTransform: "uppercase",
                alignItems: "center",
              }}
            >
              <div>Kode Pemasok</div>
              <div>Nama Pemasok</div>
              <div>Keterangan</div>
              <div>Alamat</div>
              <div>No Telp</div>
              <div style={{ textAlign: "center" }}>Aksi</div>
            </div>

            {/* Table Rows */}
            {filteredSuppliers.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13.5 }}>
                Tidak ada data pemasok yang ditemukan. Klik <strong>+ Tambah Pemasok</strong> di atas.
              </div>
            ) : (
              filteredSuppliers.map((supplier) => (
                <div
                  key={supplier.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: tableTmpl,
                    gap: 12,
                    padding: "14px 18px",
                    borderTop: "1px solid rgba(35,32,31,0.06)",
                    fontSize: 13,
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontFamily: MONO, fontWeight: 700, color: "#23201F" }}>{supplier.code}</div>
                  <div>
                    <div style={{ fontWeight: 800, color: "#A91F34" }}>{supplier.name}</div>
                    {supplier.email ? (
                      <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", marginTop: 2 }}>{supplier.email}</div>
                    ) : null}
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.75)", lineHeight: 1.4 }}>
                    {supplier.notes || "-"}
                  </div>
                  <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.8)", lineHeight: 1.4 }}>
                    {supplier.address || "-"}
                    {supplier.city ? <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)" }}>{supplier.city}, {supplier.province}</div> : null}
                  </div>
                  <div style={{ fontFamily: MONO, fontWeight: 600, color: "rgba(35,32,31,0.85)" }}>
                    {supplier.phone || "-"}
                  </div>

                  {/* Icon Titik 3 Action Button */}
                  <div className="wd-action-menu-container" style={{ textAlign: "center", position: "relative" }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActionMenuId((prev) => (prev === supplier.id ? null : supplier.id));
                      }}
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: 8,
                        border: "1px solid rgba(35,32,31,0.14)",
                        background: actionMenuId === supplier.id ? "#FFF9F2" : "#fff",
                        fontFamily: "inherit",
                        fontSize: 16,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: actionMenuId === supplier.id ? "#A91F34" : "#23201F",
                        boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
                      }}
                      title="Menu Aksi Pemasok"
                    >
                      ⋯
                    </button>

                    {/* Action Dropdown Menu (Ubah & Hapus) */}
                    {actionMenuId === supplier.id ? (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: "absolute",
                          right: 0,
                          top: 40,
                          background: "#fff",
                          borderRadius: 10,
                          border: "1px solid rgba(35,32,31,0.14)",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                          zIndex: 9999,
                          minWidth: 135,
                          overflow: "hidden",
                          padding: "4px 0",
                        }}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(null);
                            openEditModal(supplier);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 14px",
                            border: "none",
                            background: "none",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#23201F",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#FFF9F2")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        >
                          {ic("edit", 14, "#23201F", 2)}
                          Ubah
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActionMenuId(null);
                            handleDeleteSupplier(supplier.id);
                          }}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 14px",
                            border: "none",
                            borderTop: "1px solid rgba(35,32,31,0.06)",
                            background: "none",
                            fontSize: 13,
                            fontWeight: 700,
                            color: "#B83636",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "#FDE8E8")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
                        >
                          {ic("trash", 14, "#B83636", 2)}
                          Hapus
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* --- FORM MODAL TAMBAH / UBAH PEMASOK --- */}
      {isFormOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
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
              borderRadius: 18,
              width: "100%",
              maxWidth: 720,
              maxHeight: "92vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.25)",
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "18px 24px",
                borderBottom: "1px solid rgba(35,32,31,0.08)",
                background: "#FFF9F2",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#A91F34" }}>
                  {editingSupplier ? "Ubah Data Pemasok" : "Tambah Pemasok Baru"}
                </h3>
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "rgba(35,32,31,0.6)" }}>
                  Isi rincian informasi pemasok, alamat lengkap, serta daftar rekening bank pembayaran.
                </p>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                style={{ background: "none", border: "none", fontSize: 18, fontWeight: 800, cursor: "pointer", color: "rgba(35,32,31,0.5)" }}
              >
                ✕
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveSupplier} style={{ padding: 24, overflowY: "auto", flex: 1 }} className="wd-scroll">
              {/* SECTION 1: INFORMASI PEMASOK */}
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#23201F", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
                  {ic("business", 16, "#A91F34", 2)}
                  1. Informasi Pemasok
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                      Kode Pemasok
                    </label>
                    <input
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. SUP-001"
                      style={{ ...inpStyle, fontFamily: MONO, fontWeight: 700 }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                      Nama Pemasok *
                    </label>
                    <input
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. CV Sumber Ayam Segar"
                      style={{ ...inpStyle, fontWeight: 700 }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                      Email
                    </label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="e.g. supplier@gmail.com"
                      style={inpStyle}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                      No Telp
                    </label>
                    <input
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      placeholder="e.g. 021-555-1200 / 0812-xxxx"
                      style={{ ...inpStyle, fontFamily: MONO }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                    Alamat
                  </label>
                  <textarea
                    rows={2}
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Alamat lengkap lokasi atau gudang pemasok..."
                    style={{ ...inpStyle, height: 60, padding: 10, resize: "vertical" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                      Negara
                    </label>
                    <input
                      value={formCountry}
                      onChange={(e) => setFormCountry(e.target.value)}
                      placeholder="Indonesia"
                      style={inpStyle}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                      Provinsi
                    </label>
                    <input
                      value={formProvince}
                      onChange={(e) => setFormProvince(e.target.value)}
                      placeholder="DKI Jakarta"
                      style={inpStyle}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                      Kota
                    </label>
                    <input
                      value={formCity}
                      onChange={(e) => setFormCity(e.target.value)}
                      placeholder="Jakarta Barat"
                      style={inpStyle}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.7)", display: "block", marginBottom: 4 }}>
                    Keterangan
                  </label>
                  <input
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Catatan tambahan mengenai jenis bahan baku atau spesialisasi pemasok..."
                    style={inpStyle}
                  />
                </div>
              </div>

              {/* SECTION 2: INFORMASI REKENING (DYNAMIC LIST) */}
              <div style={{ borderTop: "1px solid rgba(35,32,31,0.08)", paddingTop: 18 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#23201F", display: "flex", alignItems: "center", gap: 8 }}>
                      {ic("card", 16, "#A91F34", 2)}
                      2. Informasi Rekening Bank
                    </div>
                    <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)", marginTop: 2 }}>
                      Daftar rekening bank penerima pembayaran untuk transaksi Pembayaran Faktur.
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddBankAccountRow}
                    style={{
                      height: 34,
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
                    + Tambah Rekening
                  </button>
                </div>

                {/* Bank Account Rows */}
                {formBankAccounts.length === 0 ? (
                  <div style={{ padding: 16, background: "#FAFAFA", borderRadius: 10, textAlign: "center", fontSize: 12.5, color: "rgba(35,32,31,0.45)", fontStyle: "italic" }}>
                    Belum ada rekening bank yang ditambahkan. Klik <strong>+ Tambah Rekening</strong> di atas.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {formBankAccounts.map((ba, idx) => (
                      <div
                        key={ba.id || idx}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1.5fr 1fr 1.5fr 40px",
                          gap: 10,
                          alignItems: "center",
                          background: "#FAFAFA",
                          padding: 12,
                          borderRadius: 10,
                          border: "1px solid rgba(35,32,31,0.08)",
                        }}
                      >
                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(35,32,31,0.6)", display: "block", marginBottom: 3 }}>
                            Nama Pemilik Rekening
                          </label>
                          <input
                            value={ba.accountHolder}
                            onChange={(e) => {
                              const next = [...formBankAccounts];
                              next[idx].accountHolder = e.target.value;
                              setFormBankAccounts(next);
                            }}
                            placeholder="e.g. CV Sumber Ayam Segar"
                            style={{ ...inpStyle, height: 36, fontSize: 12.5 }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(35,32,31,0.6)", display: "block", marginBottom: 3 }}>
                            Bank
                          </label>
                          <select
                            value={ba.bankName}
                            onChange={(e) => {
                              const next = [...formBankAccounts];
                              next[idx].bankName = e.target.value;
                              setFormBankAccounts(next);
                            }}
                            style={{ ...inpStyle, height: 36, fontSize: 12.5, fontWeight: 700 }}
                          >
                            <option value="BCA">BCA</option>
                            <option value="Mandiri">Mandiri</option>
                            <option value="BRI">BRI</option>
                            <option value="BNI">BNI</option>
                            <option value="CIMB Niaga">CIMB Niaga</option>
                            <option value="Permata">Permata</option>
                            <option value="BSI">BSI</option>
                            <option value="Danamon">Danamon</option>
                            <option value="Bank Lainnya">Bank Lainnya</option>
                          </select>
                        </div>

                        <div>
                          <label style={{ fontSize: 11, fontWeight: 700, color: "rgba(35,32,31,0.6)", display: "block", marginBottom: 3 }}>
                            No Rekening
                          </label>
                          <input
                            value={ba.accountNumber}
                            onChange={(e) => {
                              const next = [...formBankAccounts];
                              next[idx].accountNumber = e.target.value;
                              setFormBankAccounts(next);
                            }}
                            placeholder="e.g. 5420198821"
                            style={{ ...inpStyle, height: 36, fontFamily: MONO, fontSize: 12.5, fontWeight: 700 }}
                          />
                        </div>

                        <div style={{ textAlign: "center", paddingTop: 16 }}>
                          <button
                            type="button"
                            onClick={() => handleRemoveBankAccountRow(ba.id)}
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 7,
                              border: "1px solid #E5C3C3",
                              background: "#FFF2F2",
                              color: "#B83636",
                              cursor: "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                            title="Hapus rekening"
                          >
                            {ic("trash", 14, "#B83636", 2)}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div style={{ display: "flex", gap: 12, borderTop: "1px solid rgba(35,32,31,0.08)", paddingTop: 18, marginTop: 22, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  style={{
                    height: 42,
                    padding: "0 22px",
                    borderRadius: 10,
                    border: "1px solid rgba(35,32,31,0.14)",
                    background: "#fff",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  style={{
                    height: 42,
                    padding: "0 28px",
                    borderRadius: 10,
                    border: "none",
                    background: "#A91F34",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 13.5,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Simpan Pemasok
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
