"use client";

import { useState, useEffect, useTransition } from "react";
import { formatRupiah } from "@/lib/format";
import { actionLoadCatalog, actionBatchUpdateOnlinePrices } from "@/lib/catalog-actions";
import type { CatalogProduct, CatalogCategory } from "@/lib/catalog";
import { ic } from "./icons";
import { Badge, MONO } from "./shared";

export interface AddonSimple {
  id: string;
  name: string;
  price: number;
  isMandatory?: boolean;
  selectMode?: "single" | "multiple";
}

export interface OjekOnlineChannel {
  id: string;
  name: string;
  description: string;
  outlets: string[];
  active: boolean; // Status untuk menampilkan nama ojek online di user kasir
  productPrices: Record<string, number>; // productId -> harga jual
  addonPrices: Record<string, number>; // addonId -> harga jual
}

const DEFAULT_CHANNELS: OjekOnlineChannel[] = [
  {
    id: "gofood",
    name: "GoFood",
    description: "Layanan pesan antar GoFood (Gojek)",
    outlets: ["Outlet Utama"],
    active: true,
    productPrices: {},
    addonPrices: {},
  },
  {
    id: "grabfood",
    name: "GrabFood",
    description: "Layanan pesan antar GrabFood (Grab)",
    outlets: ["Outlet Utama"],
    active: true,
    productPrices: {},
    addonPrices: {},
  },
  {
    id: "shopeefood",
    name: "ShopeeFood",
    description: "Layanan pesan antar ShopeeFood (Shopee)",
    outlets: ["Outlet Utama"],
    active: true,
    productPrices: {},
    addonPrices: {},
  },
  {
    id: "maxim",
    name: "Maxim Food",
    description: "Layanan pesan antar Maxim Food & Delivery",
    outlets: ["Outlet Utama"],
    active: false,
    productPrices: {},
    addonPrices: {},
  },
];

const AVAILABLE_OUTLETS = ["Outlet Utama - Jakarta", "Cabang Bandung", "Cabang Surabaya"];

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

export function OnlinePricingManager() {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [addons, setAddons] = useState<AddonSimple[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<OjekOnlineChannel[]>(DEFAULT_CHANNELS);
  const [editingChannel, setEditingChannel] = useState<OjekOnlineChannel | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // Form states when editing/creating channel modal is open
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formOutlets, setFormOutlets] = useState<string[]>(["Outlet Utama - Jakarta"]);
  const [formActive, setFormActive] = useState(true);
  const [formTab, setFormTab] = useState<"produk" | "ekstra">("produk");
  const [formProducts, setFormProducts] = useState<Record<string, number>>({});
  const [formAddons, setFormAddons] = useState<Record<string, number>>({});

  // Pickers modal states
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [showAddonPicker, setShowAddonPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "Umum";

  useEffect(() => {
    void actionLoadCatalog().then((res) => {
      if (res.ok) {
        setCategories(res.categories);
        setProducts(res.products.filter((p) => p.active));
        setAddons(res.addons.filter((a) => a.active));

        // Read existing onlinePrices mapping from products to seed default channels
        const loadedChannels = DEFAULT_CHANNELS.map((ch) => {
          const prodPrices: Record<string, number> = {};
          for (const p of res.products) {
            if (p.onlinePrices && typeof p.onlinePrices[ch.id] === "number") {
              prodPrices[p.id] = p.onlinePrices[ch.id];
            }
          }
          return { ...ch, productPrices: prodPrices };
        });
        setChannels(loadedChannels);
      }
      setLoading(false);
    });
  }, []);

  function openCreateModal() {
    setIsCreatingNew(true);
    setEditingChannel(null);
    setFormName("");
    setFormDescription("");
    setFormOutlets(["Outlet Utama - Jakarta"]);
    setFormActive(true);
    setFormTab("produk");

    // Default: seed all existing products with their regular price
    const defaultProds: Record<string, number> = {};
    for (const p of products) {
      defaultProds[p.id] = p.price;
    }
    setFormProducts(defaultProds);

    const defaultAdds: Record<string, number> = {};
    for (const a of addons) {
      defaultAdds[a.id] = a.price;
    }
    setFormAddons(defaultAdds);
  }

  function openEditModal(ch: OjekOnlineChannel) {
    setIsCreatingNew(false);
    setEditingChannel(ch);
    setFormName(ch.name);
    setFormDescription(ch.description);
    setFormOutlets(ch.outlets.length > 0 ? ch.outlets : ["Outlet Utama - Jakarta"]);
    setFormActive(ch.active);
    setFormTab("produk");

    // Populate prices for configured products
    const prodMap: Record<string, number> = { ...ch.productPrices };
    if (Object.keys(prodMap).length === 0) {
      for (const p of products) {
        prodMap[p.id] = p.price;
      }
    }
    setFormProducts(prodMap);

    const addMap: Record<string, number> = { ...ch.addonPrices };
    if (Object.keys(addMap).length === 0) {
      for (const a of addons) {
        addMap[a.id] = a.price;
      }
    }
    setFormAddons(addMap);
  }

  function saveChannelModal() {
    if (!formName.trim()) return;

    const channelId = editingChannel ? editingChannel.id : formName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const updatedChannel: OjekOnlineChannel = {
      id: channelId,
      name: formName.trim(),
      description: formDescription.trim(),
      outlets: formOutlets,
      active: formActive,
      productPrices: formProducts,
      addonPrices: formAddons,
    };

    let nextChannels: OjekOnlineChannel[];
    if (editingChannel) {
      nextChannels = channels.map((c) => (c.id === editingChannel.id ? updatedChannel : c));
    } else {
      nextChannels = [...channels, updatedChannel];
    }
    setChannels(nextChannels);

    // Save product prices back to database using actionBatchUpdateOnlinePrices
    startTransition(async () => {
      const updates = products.map((p) => {
        const existingPrices: Record<string, number> = { ...(p.onlinePrices || {}) };
        if (formProducts[p.id] !== undefined) {
          existingPrices[channelId] = formProducts[p.id];
        }
        return { id: p.id, onlinePrices: existingPrices };
      });

      const res = await actionBatchUpdateOnlinePrices(updates);
      if (res.ok) {
        setMsg({ type: "ok", text: `Pengaturan Ojek Online "${formName}" berhasil disimpan!` });
        setEditingChannel(null);
        setIsCreatingNew(false);
      } else {
        setMsg({ type: "err", text: res.error });
      }
    });
  }

  const shownChannels = channels.filter(
    (c) =>
      !query.trim() ||
      c.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      c.description.toLowerCase().includes(query.trim().toLowerCase())
  );

  const mainTableTmpl = "2fr 2.4fr 1.6fr 1.2fr 1fr 0.8fr";
  const productTableTmpl = "1.2fr 2.2fr 1.3fr 0.8fr 0.9fr 1.2fr 1.5fr 0.5fr";
  const addonTableTmpl = "1.6fr 1.8fr 1.2fr 1.5fr 0.5fr";

  return (
    <div className="wd-owner-online-pricing">
      {/* Head */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.45)", marginBottom: 7 }}>
            <span>Produk</span>
            <span style={{ color: "rgba(35,32,31,0.25)" }}>/</span>
            <span style={{ color: "#A91F34" }}>Harga Ojek Online</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>Harga Ojek Online</div>
          <div style={{ fontSize: 13.5, color: "rgba(35,32,31,0.55)", marginTop: 3 }}>
            Pengaturan channel pengiriman ojek online, outlet terdaftar, status kasir, serta harga khusus produk dan ekstra.
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
            Tambah Ojek Online
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

      {/* Search Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 340 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: "rgba(35,32,31,0.4)" }}>
            {ic("search", 16, "currentColor", 2)}
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari ojek online..."
            style={inpStyle}
          />
        </div>
      </div>

      {/* Main Table: Daftar Ojek Online */}
      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(35,32,31,0.5)" }}>Memuat data ojek online...</div>
      ) : (
        <div className="wd-responsive-table" style={CARD}>
          <div style={{ ...HEAD, gridTemplateColumns: mainTableTmpl }}>
            <div>Nama Ojek Online</div>
            <div>Deskripsi</div>
            <div>Outlet Terdaftar</div>
            <div>Produk Terdaftar</div>
            <div>Status</div>
            <div style={{ textAlign: "right" }}>Aksi</div>
          </div>

          {shownChannels.length === 0 ? (
            <div style={{ padding: 40, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13.5 }}>
              Belum ada channel Ojek Online terdaftar.
            </div>
          ) : (
            shownChannels.map((ch) => {
              const configuredCount = Object.keys(ch.productPrices).length;
              return (
                <div key={ch.id} style={{ ...ROW, gridTemplateColumns: mainTableTmpl }}>
                  <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🛵</span>
                    <span>{ch.name}</span>
                  </div>
                  <div style={{ fontSize: 13, color: "rgba(35,32,31,0.7)" }}>{ch.description || "—"}</div>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                    {ch.outlets.map((o) => (
                      <span key={o} style={{ fontSize: 11, background: "rgba(35,32,31,0.06)", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
                        {o}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontWeight: 700, fontFamily: MONO, fontSize: 13 }}>
                    {configuredCount > 0 ? `${configuredCount} Produk` : "Semua Produk"}
                  </div>
                  <div>
                    {ch.active ? (
                      <Badge text="Aktif (Kasir)" tone="ok" />
                    ) : (
                      <Badge text="Nonaktif" tone="out" />
                    )}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button
                      type="button"
                      onClick={() => openEditModal(ch)}
                      style={{
                        height: 34,
                        padding: "0 14px",
                        borderRadius: 8,
                        border: "1px solid rgba(35,32,31,0.14)",
                        background: "#fff",
                        fontFamily: "inherit",
                        fontSize: 12.5,
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        color: "#2D2022",
                      }}
                      title="Edit Pengaturan Channel & Harga"
                    >
                      {ic("edit", 14, "currentColor", 2)}
                      Edit
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Modal Edit / Tambah Ojek Online */}
      {editingChannel || isCreatingNew ? (
        <div
          onClick={() => {
            setEditingChannel(null);
            setIsCreatingNew(false);
          }}
          style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="wd-slideup"
            style={{
              width: "100%",
              maxWidth: 820,
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Modal Title */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>
                  {isCreatingNew ? "Tambah Ojek Online Baru" : `Edit Pengaturan ${formName}`}
                </div>
                <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.5)", marginTop: 2 }}>
                  Atur outlet terdaftar, status tampilan kasir, serta harga khusus produk dan ekstra.
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingChannel(null);
                  setIsCreatingNew(false);
                }}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(35,32,31,0.5)" }}
              >
                ✕
              </button>
            </div>

            {/* General Info Fields */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12, marginBottom: 14, background: "#FAF8F5", padding: 14, borderRadius: 12, border: "1px solid rgba(35,32,31,0.08)" }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Nama Ojek Online</label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: GoFood, GrabFood, ShopeeFood, Maxim"
                  style={inpStyle}
                />
              </div>
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
              <div style={{ gridColumn: "1 / -1", display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, alignItems: "center" }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, display: "block", marginBottom: 4, color: "rgba(35,32,31,0.7)" }}>Deskripsi</label>
                  <input
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Deskripsi singkat channel pesan antar ini"
                    style={{ ...inpStyle, height: 38 }}
                  />
                </div>
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", height: 38 }}>
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={(e) => setFormActive(e.target.checked)}
                      style={{ width: 18, height: 18, accentColor: "#A91F34" }}
                    />
                    <span>{formActive ? "Aktif (Tampil di Kasir)" : "Nonaktif (Sembunyikan)"}</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sub-Tabs: Atur Produk / Atur Ekstra */}
            <div style={{ display: "flex", gap: 8, marginBottom: 12, borderBottom: "1px solid rgba(35,32,31,0.1)", paddingBottom: 8 }}>
              <button
                type="button"
                onClick={() => setFormTab("produk")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: formTab === "produk" ? "#A91F34" : "rgba(35,32,31,0.05)",
                  color: formTab === "produk" ? "#fff" : "rgba(35,32,31,0.7)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Atur Produk dan Harga ({Object.keys(formProducts).length})
              </button>
              <button
                type="button"
                onClick={() => setFormTab("ekstra")}
                style={{
                  padding: "8px 16px",
                  borderRadius: 9,
                  border: "none",
                  background: formTab === "ekstra" ? "#A91F34" : "rgba(35,32,31,0.05)",
                  color: formTab === "ekstra" ? "#fff" : "rgba(35,32,31,0.7)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Atur Ekstra dan Harga ({Object.keys(formAddons).length})
              </button>
            </div>

            {/* Tab Body */}
            <div style={{ flex: 1, overflowY: "auto", marginBottom: 16 }}>
              {formTab === "produk" ? (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)" }}>
                      Tentukan harga jual khusus channel <strong>{formName || "Ojek Online"}</strong> untuk setiap produk.
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProductPicker(true)}
                      style={{
                        height: 34,
                        padding: "0 12px",
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
                      + Pilih / Tambah Produk
                    </button>
                  </div>

                  {/* Horizontally scrollable table container */}
                  <div style={{ overflowX: "auto", paddingBottom: 6 }} className="wd-scroll">
                    <div style={{ minWidth: 780 }}>
                      <div style={{ display: "grid", gridTemplateColumns: productTableTmpl, gap: 8, padding: "8px 12px", background: "#FFF9F2", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#A91F34", textTransform: "uppercase", marginBottom: 8, alignItems: "center" }}>
                        <div>SKU</div>
                        <div>Produk</div>
                        <div>Kategori</div>
                        <div>Jumlah</div>
                        <div>Satuan</div>
                        <div style={{ textAlign: "right" }}>Harga Awal</div>
                        <div style={{ textAlign: "right" }}>Harga Jual ({formName || "Online"})</div>
                        <div style={{ textAlign: "right" }}>Aksi</div>
                      </div>

                      {Object.keys(formProducts).length === 0 ? (
                        <div style={{ padding: 30, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13 }}>
                          Belum ada produk terdaftar untuk channel ini. Klik <strong>+ Pilih / Tambah Produk</strong> untuk memilih.
                        </div>
                      ) : (
                        Object.entries(formProducts).map(([prodId, priceVal]) => {
                          const prod = products.find((p) => p.id === prodId);
                          if (!prod) return null;
                          return (
                            <div key={prodId} style={{ display: "grid", gridTemplateColumns: productTableTmpl, gap: 8, marginBottom: 8, alignItems: "center", padding: "6px 12px", borderBottom: "1px solid rgba(35,32,31,0.05)" }}>
                              <div style={{ fontSize: 11.5, fontFamily: MONO, color: "rgba(35,32,31,0.6)", fontWeight: 600 }}>{prod.sku}</div>
                              <div style={{ fontWeight: 700, fontSize: 13.5 }}>{prod.name}</div>
                              <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.7)" }}>{catName(prod.categoryId)}</div>
                              <div style={{ fontSize: 12.5, fontFamily: MONO, fontWeight: 600 }}>{prod.minOrder ?? 1}</div>
                              <div style={{ fontSize: 12.5, textTransform: "capitalize" }}>{prod.unit || "porsi"}</div>
                              <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 13, color: "rgba(35,32,31,0.6)" }}>
                                {formatRupiah(prod.price)}
                              </div>
                              <div>
                                <input
                                  value={priceVal || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                    setFormProducts({ ...formProducts, [prodId]: val });
                                  }}
                                  inputMode="numeric"
                                  placeholder={`Rp ${formatRupiah(prod.price)}`}
                                  style={{ ...inpStyle, height: 36, textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}
                                />
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = { ...formProducts };
                                    delete next[prodId];
                                    setFormProducts(next);
                                  }}
                                  style={{ border: "none", background: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                                  title="Hapus dari channel ini"
                                >
                                  {ic("trash", 15, "#B83636", 2)}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)" }}>
                      Tentukan harga jual khusus channel <strong>{formName || "Ojek Online"}</strong> untuk produk ekstra / add-on.
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowAddonPicker(true)}
                      style={{
                        height: 34,
                        padding: "0 12px",
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
                      + Tambah / Pilih Ekstra
                    </button>
                  </div>

                  <div style={{ overflowX: "auto", paddingBottom: 6 }} className="wd-scroll">
                    <div style={{ minWidth: 680 }}>
                      <div style={{ display: "grid", gridTemplateColumns: addonTableTmpl, gap: 8, padding: "8px 12px", background: "#FFF9F2", borderRadius: 8, fontSize: 11, fontWeight: 800, color: "#A91F34", textTransform: "uppercase", marginBottom: 8 }}>
                        <div>Sub Ekstra</div>
                        <div>Produk Ekstra</div>
                        <div style={{ textAlign: "right" }}>Harga Awal</div>
                        <div style={{ textAlign: "right" }}>Harga Jual ({formName || "Online"})</div>
                        <div style={{ textAlign: "right" }}>Aksi</div>
                      </div>

                      {Object.keys(formAddons).length === 0 ? (
                        <div style={{ padding: 30, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13 }}>
                          Belum ada produk ekstra terdaftar untuk channel ini. Klik <strong>+ Tambah / Pilih Ekstra</strong> untuk memilih.
                        </div>
                      ) : (
                        Object.entries(formAddons).map(([addonId, priceVal]) => {
                          const addon = addons.find((a) => a.id === addonId);
                          if (!addon) return null;
                          return (
                            <div key={addonId} style={{ display: "grid", gridTemplateColumns: addonTableTmpl, gap: 8, marginBottom: 8, alignItems: "center", padding: "6px 12px", borderBottom: "1px solid rgba(35,32,31,0.05)" }}>
                              <div>
                                <Badge
                                  text={addon.isMandatory ? "Wajib" : "Opsional"}
                                  tone={addon.isMandatory ? "warn" : "neutral"}
                                />
                              </div>
                              <div style={{ fontWeight: 700, fontSize: 13 }}>{addon.name}</div>
                              <div style={{ textAlign: "right", fontFamily: MONO, fontSize: 13, color: "rgba(35,32,31,0.6)" }}>
                                {formatRupiah(addon.price)}
                              </div>
                              <div>
                                <input
                                  value={priceVal || ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                                    setFormAddons({ ...formAddons, [addonId]: val });
                                  }}
                                  inputMode="numeric"
                                  placeholder={`Rp ${formatRupiah(addon.price)}`}
                                  style={{ ...inpStyle, height: 36, textAlign: "right", fontFamily: MONO, fontWeight: 700, color: "#A91F34" }}
                                />
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = { ...formAddons };
                                    delete next[addonId];
                                    setFormAddons(next);
                                  }}
                                  style={{ border: "none", background: "none", cursor: "pointer", fontSize: 15 }}
                                  title="Hapus dari channel ini"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Buttons */}
            <div style={{ display: "flex", gap: 10, marginTop: "auto", borderTop: "1px solid rgba(35,32,31,0.08)", paddingTop: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setEditingChannel(null);
                  setIsCreatingNew(false);
                }}
                disabled={pending}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={saveChannelModal}
                disabled={pending || !formName.trim()}
                style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer", opacity: pending || !formName.trim() ? 0.6 : 1 }}
              >
                {pending ? "Menyimpan..." : "Simpan Pengaturan Channel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Product Picker Modal */}
      {showProductPicker ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Pilih Produk untuk {formName || "Channel"}</div>
            <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)", marginBottom: 12 }}>Centang produk yang dijual pada channel ini.</div>
            <input
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Cari nama produk / SKU..."
              style={{ ...inpStyle, height: 38, marginBottom: 12 }}
            />
            <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid rgba(35,32,31,0.1)", borderRadius: 10, padding: 8, marginBottom: 14 }}>
              {products
                .filter((p) => !pickerSearch || p.name.toLowerCase().includes(pickerSearch.toLowerCase()) || p.sku.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map((p) => {
                  const isChecked = formProducts[p.id] !== undefined;
                  return (
                    <label key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: isChecked ? "rgba(169,31,52,0.04)" : "#fff" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = { ...formProducts };
                          if (e.target.checked) {
                            next[p.id] = p.price;
                          } else {
                            delete next[p.id];
                          }
                          setFormProducts(next);
                        }}
                        style={{ width: 16, height: 16, accentColor: "#A91F34" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)", fontFamily: MONO }}>{p.sku}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontFamily: MONO, fontSize: 12.5 }}>{formatRupiah(p.price)}</div>
                    </label>
                  );
                })}
            </div>
            <button onClick={() => setShowProductPicker(false)} style={{ width: "100%", height: 40, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>
              Selesai Memilih Produk
            </button>
          </div>
        </div>
      ) : null}

      {/* Addon Picker Modal */}
      {showAddonPicker ? (
        <div style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 16, padding: 20, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)" }}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>Pilih Produk Ekstra untuk {formName || "Channel"}</div>
            <div style={{ fontSize: 12, color: "rgba(35,32,31,0.5)", marginBottom: 12 }}>Centang produk ekstra / add-on yang berlaku pada channel ini.</div>
            <input
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              placeholder="Cari nama ekstra..."
              style={{ ...inpStyle, height: 38, marginBottom: 12 }}
            />
            <div style={{ maxHeight: 280, overflowY: "auto", border: "1px solid rgba(35,32,31,0.1)", borderRadius: 10, padding: 8, marginBottom: 14 }}>
              {addons
                .filter((a) => !pickerSearch || a.name.toLowerCase().includes(pickerSearch.toLowerCase()))
                .map((a) => {
                  const isChecked = formAddons[a.id] !== undefined;
                  return (
                    <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, cursor: "pointer", background: isChecked ? "rgba(169,31,52,0.04)" : "#fff" }}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const next = { ...formAddons };
                          if (e.target.checked) {
                            next[a.id] = a.price;
                          } else {
                            delete next[a.id];
                          }
                          setFormAddons(next);
                        }}
                        style={{ width: 16, height: 16, accentColor: "#A91F34" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{a.name}</div>
                        <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)" }}>{a.isMandatory ? "Wajib" : "Opsional"}</div>
                      </div>
                      <div style={{ fontWeight: 700, fontFamily: MONO, fontSize: 12.5 }}>{formatRupiah(a.price)}</div>
                    </label>
                  );
                })}
            </div>
            <button onClick={() => setShowAddonPicker(false)} style={{ width: "100%", height: 40, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700, cursor: "pointer" }}>
              Selesai Memilih Ekstra
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
