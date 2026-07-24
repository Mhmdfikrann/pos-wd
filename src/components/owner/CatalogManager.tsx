"use client";

/**
 * Bespoke catalog manager for the Owner suite (Phase 3, PRD §8.3, FR-003).
 *
 * Replaces the archetype TablePage for the three catalog labels (Buku Menu,
 * Daftar Kategori, Produk Ekstra) with a real DB-backed CRUD surface. Reuses the
 * shared design components (PageHead/Toolbar/Badge/TableCard styling) so it looks
 * native to the suite.
 *
 * All mutations go through the server actions in `@/lib/catalog-actions`, which
 * are the authoritative gate (`catalog.manage`) — this component only reflects
 * their result. Soft delete only (BR-012): "Nonaktifkan" flips `active`, never
 * removes the row; deactivated rows stay visible with a badge so they can be
 * reactivated.
 */
import { useEffect, useState, useTransition } from "react";
import { ic } from "@/components/owner/icons";
import { Badge, MONO } from "@/components/owner/shared";
import { formatRupiah } from "@/lib/format";
import { arrayToCsv, csvToArray } from "@/lib/csv";
import {
  actionLoadCatalog,
  actionCreateProduct,
  actionUpdateProduct,
  actionSetProductAvailability,
  actionDeleteProduct,
  actionCreateCategory,
  actionUpdateCategory,
  actionDeleteCategory,
  actionCreateAddon,
  actionUpdateAddon,
  actionDeactivateAddon,
  actionImportProducts,
  actionGetProductDetails,
  actionSaveProductDetails,
  type BulkProductInput,
} from "@/lib/catalog-actions";
import type { CatalogProduct, CatalogCategory, InventoryItemSimple } from "@/lib/catalog";

type Tab = "produk" | "kategori" | "addon";
type Addon = { id: string; name: string; price: number; isMandatory?: boolean; selectMode?: "single" | "multiple"; active: boolean };

/** Which tab each Owner nav label opens on. */
const LABEL_TAB: Record<string, Tab> = {
  "Buku Menu": "produk",
  "Daftar Kategori": "kategori",
  "Produk Ekstra": "addon",
  "Produk Paket": "produk",
};

/** Nav labels routed to this manager (consumed by the Owner PageEl router). */
export const CATALOG_LABELS = Object.keys(LABEL_TAB);

const STATIONS = ["Kukus", "Goreng", "Minuman"];

export function CatalogManager({ label }: { label: string }) {
  const initialTab = LABEL_TAB[label] ?? "produk";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  // Edit modal state: null = closed. `kind` selects the form; `row` is the
  // record being edited (undefined = create).
  const [modal, setModal] = useState<{ kind: Tab; row?: CatalogProduct | CatalogCategory | Addon } | null>(null);

  // No label→tab sync effect: the owner page remounts this component per label
  // (key={active}), so the useState initializer above already picks the tab.

  async function reload() {
    // All setState happens AFTER the await, so this is safe to call from an
    // effect without triggering synchronous cascading renders. Manual refreshes
    // after a mutation use the `pending` transition for their busy state.
    const res = await actionLoadCatalog();
    if (res.ok) {
      setProducts(res.products);
      setCategories(res.categories);
      setAddons(res.addons);
      setError(null);
    } else {
      setError(res.error);
    }
    setLoading(false);
  }

  useEffect(() => {
    // Fetch-on-mount from the DB (an external system) — the legitimate effect
    // case. reload() only setStates after its await, so no synchronous cascade;
    // the rule can't see across the async boundary, hence the scoped disable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void reload();
  }, []);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "produk" | "kategori" | "addon";
    id: string;
    name: string;
  } | null>(null);

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const q = query.trim().toLowerCase();
  const shownProducts = products.filter((p) => {
    if (!p.active) return false;
    if (label === "Produk Paket" && p.type !== "package") return false;
    return !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
  });
  const shownCategories = categories.filter((c) => c.active && (!q || c.name.toLowerCase().includes(q)));
  const shownAddons = addons.filter((a) => a.active && (!q || a.name.toLowerCase().includes(q)));

  function confirmDelete() {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    startTransition(async () => {
      if (type === "produk") {
        await actionDeleteProduct(id);
      } else if (type === "kategori") {
        await actionDeleteCategory(id);
      } else {
        await actionDeactivateAddon(id);
      }
      setDeleteTarget(null);
      await reload();
    });
  }

  const title =
    tab === "produk"
      ? label === "Produk Paket"
        ? "Produk Paket"
        : "Buku Menu"
      : tab === "kategori"
        ? "Daftar Kategori"
        : "Produk Ekstra";

  const subtitle =
    tab === "produk"
      ? label === "Produk Paket"
        ? "Kelola produk paket combo, komponen penyusun, minimal pembelian, dan harga."
        : "Kelola produk: harga, kategori, station dapur, dan ketersediaan."
      : tab === "kategori"
        ? "Kelompok menu yang tampil di kasir."
        : "Add-on / produk ekstra yang bisa ditambahkan ke pesanan.";

  const [showImportModal, setShowImportModal] = useState(false);

  function handleExportExcel() {
    const headers = ["SKU", "Nama Produk", "Kategori", "Tipe Menu", "Harga Jual", "Harga Modal (HPP)", "Satuan", "Minimal Pembelian", "Favorit", "Tampil di Bar", "Station Dapur", "Status"];
    const exportProducts = label === "Produk Paket"
      ? products.filter((p) => p.active && p.type === "package")
      : products.filter((p) => p.active);

    const rows = exportProducts.map((p) => [
      p.sku,
      p.name,
      catName(p.categoryId),
      p.type === "package" ? "Menu Paket (Combo)" : "Menu Biasa (Single)",
      p.price,
      p.costPrice ?? 0,
      p.unit ?? "porsi",
      p.minOrder ?? 1,
      p.isFavorite ? "Ya" : "Tidak",
      p.showInBar ? "Ya" : "Tidak",
      p.kitchenStation ?? "",
      p.active ? "Aktif" : "Nonaktif",
    ]);
    const csv = arrayToCsv(headers, rows);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `katalog-${label.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    const exportProducts = label === "Produk Paket"
      ? products.filter((p) => p.active && p.type === "package")
      : products.filter((p) => p.active);

    const headers = ["SKU", "Nama Produk", "Kategori", "Tipe Menu", "Harga Jual", "Harga Modal", "Min Order", "Status"];
    const rows = exportProducts.map((p) => [
      p.sku,
      p.name,
      catName(p.categoryId),
      p.type === "package" ? "Menu Paket" : "Menu Biasa",
      formatRupiah(p.price),
      formatRupiah(p.costPrice ?? 0),
      `${p.minOrder ?? 1} ${p.unit ?? "porsi"}`,
      p.active ? "Aktif" : "Nonaktif",
    ]);

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
          .badge { display: inline-block; padding: 3px 8px; border-radius: 6px; font-size: 10.5px; font-weight: 700; background: #E4F4EC; color: #238152; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="brand">WANNA DIMSUM POS</div>
            <div class="subtitle">Laporan Data ${label}</div>
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
                <td class="mono">${r[5]}</td>
                <td>${r[6]}</td>
                <td><span class="badge">${r[7]}</span></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWin.document.close();
  }

  const [exportOpen, setExportOpen] = useState(false);

  return (
    <div className="wd-owner-catalog-manager">
      {/* Head */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.45)", marginBottom: 7 }}>
            <span>Produk</span>
            <span style={{ color: "rgba(35,32,31,0.25)" }}>/</span>
            <span style={{ color: "#A91F34" }}>{title}</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em" }}>{title}</div>
          <div style={{ fontSize: 13.5, color: "rgba(35,32,31,0.55)", marginTop: 3 }}>{subtitle}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {tab === "produk" ? (
            <>
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  onClick={() => setExportOpen(!exportOpen)}
                  style={{
                    height: 42, padding: "0 16px", borderRadius: 10, border: "1px solid rgba(35,32,31,0.16)",
                    background: "#fff", color: "rgba(35,32,31,0.85)", fontFamily: "inherit", fontWeight: 700,
                    fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  Export ▾
                </button>

                {exportOpen ? (
                  <>
                    <div
                      style={{ position: "fixed", inset: 0, zIndex: 30 }}
                      onClick={() => setExportOpen(false)}
                    />
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: 46,
                        zIndex: 40,
                        width: 200,
                        background: "#fff",
                        borderRadius: 10,
                        padding: "6px 0",
                        boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 0 0 1px rgba(35,32,31,0.08)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setExportOpen(false);
                          handleExportExcel();
                        }}
                        style={{
                          width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none",
                          fontSize: 13, fontWeight: 600, color: "rgba(35,32,31,0.85)", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                        }}
                      >
                        {ic("download", 14, "#23201F", 2)}
                        Export ke Excel (.xlsx)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setExportOpen(false);
                          handleExportPdf();
                        }}
                        style={{
                          width: "100%", padding: "9px 14px", textAlign: "left", background: "none", border: "none",
                          fontSize: 13, fontWeight: 600, color: "rgba(35,32,31,0.85)", cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                        }}
                      >
                        {ic("download", 14, "#23201F", 2)}
                        Export ke PDF (.pdf)
                      </button>
                    </div>
                  </>
                ) : null}
              </div>

              <button
                onClick={() => setShowImportModal(true)}
                style={{
                  height: 42, padding: "0 14px", borderRadius: 10, border: "1px solid rgba(35,32,31,0.16)",
                  background: "#fff", color: "rgba(35,32,31,0.8)", fontFamily: "inherit", fontWeight: 700,
                  fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
                }}
              >
                Import CSV
              </button>
            </>
          ) : null}
          <button
            onClick={() => setModal({ kind: tab })}
            style={{
              height: 42, padding: "0 18px", borderRadius: 10, border: "none",
              background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700,
              fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
            }}
          >
            {ic("plus", 15, "#fff", 2.4)}
            Tambah
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["produk", "kategori", "addon"] as Tab[]).map((t) => {
          const on = tab === t;
          const tl = t === "produk" ? "Produk" : t === "kategori" ? "Kategori" : "Add-on";
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                height: 36, padding: "0 15px", borderRadius: 9,
                border: on ? "none" : "1px solid rgba(35,32,31,0.12)",
                background: on ? "#A91F34" : "#fff", color: on ? "#fff" : "rgba(35,32,31,0.65)",
                fontFamily: "inherit", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              {tl}
            </button>
          );
        })}
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ position: "relative", flex: 1, minWidth: 200, maxWidth: 320 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", display: "flex", color: "rgba(35,32,31,0.4)" }}>
            {ic("search", 16, "currentColor", 2)}
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Cari ${title.toLowerCase()}…`}
            style={{
              width: "100%", height: 40, border: "1px solid rgba(35,32,31,0.12)", borderRadius: 9,
              padding: "0 12px 0 36px", fontFamily: "inherit", fontSize: 13, background: "#fff", outline: "none",
            }}
          />
        </div>
      </div>

      {error ? (
        <div style={{ background: "#FBE7E7", color: "#B83636", borderRadius: 10, padding: "12px 16px", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div style={{ padding: 60, textAlign: "center", color: "rgba(35,32,31,0.5)" }}>Memuat katalog…</div>
      ) : tab === "produk" ? (
        <ProductTable
          rows={shownProducts}
          catName={catName}
          busy={pending}
          onEdit={(row) => setModal({ kind: "produk", row })}
          onToggleAvail={(row) =>
            startTransition(async () => {
              await actionSetProductAvailability(row.id, !row.available);
              await reload();
            })
          }
          onDelete={(row) => setDeleteTarget({ type: "produk", id: row.id, name: row.name })}
        />
      ) : tab === "kategori" ? (
        <CategoryTable
          rows={shownCategories}
          busy={pending}
          onEdit={(row) => setModal({ kind: "kategori", row })}
          onDelete={(row) => setDeleteTarget({ type: "kategori", id: row.id, name: row.name })}
        />
      ) : (
        <AddonTable
          rows={shownAddons}
          busy={pending}
          onEdit={(row) => setModal({ kind: "addon", row })}
          onDelete={(row) => setDeleteTarget({ type: "addon", id: row.id, name: row.name })}
        />
      )}

      {deleteTarget ? (
        <ConfirmDeleteModal
          target={deleteTarget}
          busy={pending}
          onClose={() => setDeleteTarget(null)}
          onConfirm={confirmDelete}
        />
      ) : null}

      {modal ? (
        <EditModal
          kind={modal.kind}
          row={modal.row}
          categories={categories}
          allProducts={shownProducts}
          allAddons={shownAddons}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
            await reload();
          }}
        />
      ) : null}

      {showImportModal ? (
        <ImportModal
          onClose={() => setShowImportModal(false)}
          onImported={async () => {
            setShowImportModal(false);
            await reload();
          }}
        />
      ) : null}
    </div>
  );
}

// ===== Tables =====
const HEAD: React.CSSProperties = {
  display: "grid", gap: 10, padding: "11px 20px", background: "#FAFAFA",
  fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase",
  color: "rgba(35,32,31,0.42)",
};
const ROW: React.CSSProperties = {
  display: "grid", gap: 10, padding: "13px 20px", fontSize: 13.5,
  borderTop: "1px solid rgba(35,32,31,0.05)", alignItems: "center",
};
const CARD: React.CSSProperties = {
  background: "#fff", border: "1px solid rgba(35,32,31,0.06)", borderRadius: 14, overflow: "hidden",
};
const miniBtn = (danger?: boolean): React.CSSProperties => ({
  height: 30, padding: "0 12px", borderRadius: 7,
  border: `1px solid ${danger ? "rgba(184,54,54,0.3)" : "rgba(35,32,31,0.14)"}`,
  background: "#fff", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
  cursor: "pointer", color: danger ? "#B83636" : "#2D2022",
});
const dropdownItemStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  textAlign: "left",
  background: "none",
  border: "none",
  fontSize: 12.5,
  fontWeight: 600,
  color: "rgba(35,32,31,0.85)",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  gap: 8,
};

function ActionMenu({
  available,
  busy,
  onEdit,
  onToggleAvail,
  onDelete,
}: {
  available?: boolean;
  busy: boolean;
  onEdit: () => void;
  onToggleAvail?: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        disabled={busy}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: "1px solid rgba(35,32,31,0.14)",
          background: open ? "rgba(35,32,31,0.06)" : "#fff",
          color: "rgba(35,32,31,0.8)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          fontSize: 16,
          fontWeight: 700,
        }}
        title="Opsi Aksi"
      >
        ⋮
      </button>

      {open ? (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 30 }}
            onClick={() => setOpen(false)}
          />
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute",
              right: 0,
              top: 36,
              zIndex: 40,
              width: 145,
              background: "#fff",
              borderRadius: 10,
              padding: "4px 0",
              boxShadow: "0 10px 25px -5px rgba(0,0,0,0.2), 0 0 0 1px rgba(35,32,31,0.08)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              style={dropdownItemStyle}
            >
              {ic("edit", 14, "currentColor", 2)}
              Edit
            </button>
            {onToggleAvail ? (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onToggleAvail();
                }}
                style={dropdownItemStyle}
              >
                {available ? (
                  <>
                    {ic("ban", 14, "currentColor", 2)}
                    Set Habis
                  </>
                ) : (
                  <>
                    {ic("check", 14, "currentColor", 2)}
                    Set Ada
                  </>
                )}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              style={{ ...dropdownItemStyle, color: "#B83636" }}
            >
              {ic("trash", 14, "#B83636", 2)}
              Hapus
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}

function ProductTable({
  rows, catName, busy, onEdit, onToggleAvail, onDelete,
}: {
  rows: CatalogProduct[];
  catName: (id: string) => string;
  busy: boolean;
  onEdit: (r: CatalogProduct) => void;
  onToggleAvail: (r: CatalogProduct) => void;
  onDelete: (r: CatalogProduct) => void;
}) {
  const tmpl = "2.6fr 1.2fr 1.1fr 0.9fr 0.8fr 1fr 0.5fr";
  if (rows.length === 0) return <Empty msg="Belum ada produk." />;
  return (
    <div className="wd-responsive-table" style={CARD}>
      <div style={{ ...HEAD, gridTemplateColumns: tmpl }}>
        <div>Produk</div><div>Kategori</div><div style={{ textAlign: "right" }}>Harga Jual</div>
        <div style={{ textAlign: "right" }}>HPP</div><div>Satuan</div><div>Ketersediaan</div><div style={{ textAlign: "right" }}>Aksi</div>
      </div>
      {rows.map((p) => (
        <div key={p.id} style={{ ...ROW, gridTemplateColumns: tmpl }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              <span>{p.name}</span>
              {p.type === "package" ? <Badge text="Paket" tone="info" /> : null}
            </div>
            <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontFamily: MONO }}>{p.sku}</div>
          </div>
          <div style={{ fontSize: 13, color: "rgba(35,32,31,0.7)" }}>{catName(p.categoryId)}</div>
          <div style={{ textAlign: "right", fontFamily: MONO }}>{formatRupiah(p.price)}</div>
          <div style={{ textAlign: "right", fontFamily: MONO, color: "rgba(35,32,31,0.65)" }}>{formatRupiah(p.costPrice ?? 0)}</div>
          <div style={{ textTransform: "capitalize", fontSize: 13 }}>{p.unit ?? "porsi"}</div>
          <div>
            {p.available ? <Badge text="Tersedia" tone="ok" /> : <Badge text="Habis" tone="out" />}
          </div>
          <div style={{ textAlign: "right" }}>
            <ActionMenu
              available={p.available}
              busy={busy}
              onEdit={() => onEdit(p)}
              onToggleAvail={() => onToggleAvail(p)}
              onDelete={() => onDelete(p)}
            />
          </div>
        </div>
      ))}
      <Footer n={rows.length} />
    </div>
  );
}

function CategoryTable({
  rows, busy, onEdit, onDelete,
}: {
  rows: CatalogCategory[];
  busy: boolean;
  onEdit: (r: CatalogCategory) => void;
  onDelete: (r: CatalogCategory) => void;
}) {
  const tmpl = "2.2fr 1fr 0.5fr";
  if (rows.length === 0) return <Empty msg="Belum ada kategori." />;
  return (
    <div className="wd-responsive-table" style={CARD}>
      <div style={{ ...HEAD, gridTemplateColumns: tmpl }}>
        <div>Kategori</div><div style={{ textAlign: "right" }}>Urutan</div><div style={{ textAlign: "right" }}>Aksi</div>
      </div>
      {rows.map((c) => (
        <div key={c.id} style={{ ...ROW, gridTemplateColumns: tmpl }}>
          <div style={{ fontWeight: 700 }}>{c.name}</div>
          <div style={{ textAlign: "right", fontFamily: MONO }}>{c.sortOrder}</div>
          <div style={{ textAlign: "right" }}>
            <ActionMenu
              busy={busy}
              onEdit={() => onEdit(c)}
              onDelete={() => onDelete(c)}
            />
          </div>
        </div>
      ))}
      <Footer n={rows.length} />
    </div>
  );
}

function AddonTable({
  rows, busy, onEdit, onDelete,
}: {
  rows: Addon[];
  busy: boolean;
  onEdit: (r: Addon) => void;
  onDelete: (r: Addon) => void;
}) {
  const tmpl = "2fr 1.1fr 1.3fr 1fr 0.5fr";
  if (rows.length === 0) return <Empty msg="Belum ada add-on." />;
  return (
    <div className="wd-responsive-table" style={CARD}>
      <div style={{ ...HEAD, gridTemplateColumns: tmpl }}>
        <div>Add-on</div><div>Jenis</div><div>Cara Pilih</div><div style={{ textAlign: "right" }}>Harga</div><div style={{ textAlign: "right" }}>Aksi</div>
      </div>
      {rows.map((a) => (
        <div key={a.id} style={{ ...ROW, gridTemplateColumns: tmpl }}>
          <div style={{ fontWeight: 700 }}>{a.name}</div>
          <div>
            <Badge text={a.isMandatory ? "Wajib" : "Opsional"} tone={a.isMandatory ? "warn" : "neutral"} />
          </div>
          <div style={{ fontSize: 13, color: "rgba(35,32,31,0.7)" }}>
            {a.selectMode === "single" ? "Pilih 1 (Radio)" : "Pilih Beberapa"}
          </div>
          <div style={{ textAlign: "right", fontFamily: MONO }}>{formatRupiah(a.price)}</div>
          <div style={{ textAlign: "right" }}>
            <ActionMenu
              busy={busy}
              onEdit={() => onEdit(a)}
              onDelete={() => onDelete(a)}
            />
          </div>
        </div>
      ))}
      <Footer n={rows.length} />
    </div>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div style={{ ...CARD, padding: 50, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 14 }}>{msg}</div>;
}
function Footer({ n }: { n: number }) {
  return (
    <div style={{ padding: "12px 20px", borderTop: "1px solid rgba(35,32,31,0.06)", fontSize: 12.5, color: "rgba(35,32,31,0.5)" }}>
      {n} data
    </div>
  );
}

// ===== Edit / create modal =====
function EditModal({
  kind, row, categories, allProducts = [], allAddons = [], onClose, onSaved,
}: {
  kind: Tab;
  row?: CatalogProduct | CatalogCategory | Addon;
  categories: CatalogCategory[];
  allProducts?: CatalogProduct[];
  allAddons?: Addon[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!row;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const p = kind === "produk" ? (row as CatalogProduct | undefined) : undefined;
  const c = kind === "kategori" ? (row as CatalogCategory | undefined) : undefined;
  const a = kind === "addon" ? (row as Addon | undefined) : undefined;

  const [name, setName] = useState(row?.name ?? "");
  const [sku, setSku] = useState(p?.sku ?? "");
  const [price, setPrice] = useState(String(p?.price ?? a?.price ?? ""));
  const [costPrice, setCostPrice] = useState(String(p?.costPrice ?? "0"));
  const [unit, setUnit] = useState(p?.unit ?? "porsi");
  const [productType, setProductType] = useState<"single" | "package">(p?.type ?? "single");
  const [categoryId, setCategoryId] = useState(p?.categoryId ?? categories[0]?.id ?? "");
  const [station, setStation] = useState(p?.kitchenStation ?? "");
  const [sortOrder, setSortOrder] = useState(String(c?.sortOrder ?? 0));
  const [minOrder, setMinOrder] = useState(String(p?.minOrder ?? 1));
  const [isFavorite, setIsFavorite] = useState(p?.isFavorite ?? false);
  const [showInBar, setShowInBar] = useState(p?.showInBar ?? false);
  const [isMandatory, setIsMandatory] = useState(a?.isMandatory ?? false);
  const [selectMode, setSelectMode] = useState<"single" | "multiple">(a?.selectMode ?? "multiple");
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
  const [subTab, setSubTab] = useState<"umum" | "varian" | "addon" | "resep" | "paket">("umum");
  const [variantsList, setVariantsList] = useState<{ id?: string; name: string; priceDelta: number }[]>([]);
  const [recipeList, setRecipeList] = useState<
    { inventoryItemId: string; quantity: number; cost?: number; unit?: string }[]
  >([]);
  const [packageItemsList, setPackageItemsList] = useState<{ itemProductId: string; quantity: number; unit?: string }[]>([]);
  const [inventoryItemList, setInventoryItemList] = useState<InventoryItemSimple[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(kind === "produk" && !!p?.id);

  useEffect(() => {
    let isMounted = true;
    if (kind === "produk" && p?.id) {
      void actionGetProductDetails(p.id).then((res) => {
        if (!isMounted) return;
        if (res.ok) {
          setVariantsList(res.variants.map((v) => ({ id: v.id, name: v.name, priceDelta: v.priceDelta })));
          setRecipeList(res.recipe.map((r) => ({ inventoryItemId: r.inventoryItemId, quantity: r.quantity })));
          setPackageItemsList(res.packageItems.map((pi) => ({ itemProductId: pi.itemProductId, quantity: pi.quantity, unit: (pi as { unit?: string }).unit })));
          setInventoryItemList(res.inventoryItems);
          setSelectedAddonIds(res.productAddonIds ?? []);
        }
        setLoadingDetails(false);
      });
    } else if (kind === "produk") {
      void actionGetProductDetails("new").then((res) => {
        if (!isMounted) return;
        if (res.ok) {
          setInventoryItemList(res.inventoryItems);
        }
      });
    }
    return () => { isMounted = false; };
  }, [kind, p?.id]);

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const priceNum = Math.round(Number(price) || 0);
    const costNum = Math.round(Number(costPrice) || 0);
    const minOrdNum = Math.max(1, Math.round(Number(minOrder) || 1));

    let res: { ok: true; id?: string } | { ok: false; error: string };
    if (kind === "produk") {
      let productId = p?.id;
      if (isEdit && productId) {
        res = await actionUpdateProduct(productId, {
          name, sku, price: priceNum, costPrice: costNum, unit, type: productType, categoryId, kitchenStation: station || null,
          minOrder: minOrdNum, isFavorite, showInBar,
        });
      } else {
        res = await actionCreateProduct({
          name, sku, price: priceNum, costPrice: costNum, unit, type: productType, categoryId, kitchenStation: station || null,
          minOrder: minOrdNum, isFavorite, showInBar,
        });
        if (res.ok) productId = res.id;
      }
      if (res.ok && productId) {
        await actionSaveProductDetails(
          productId,
          variantsList,
          recipeList.map((r) => ({ inventoryItemId: r.inventoryItemId, quantity: r.quantity })),
          productType === "package" ? packageItemsList : undefined,
          selectedAddonIds,
        );
      }
    } else if (kind === "kategori") {
      const so = Math.round(Number(sortOrder) || 0);
      res = isEdit
        ? await actionUpdateCategory(c!.id, { name, sortOrder: so })
        : await actionCreateCategory({ name, sortOrder: so });
    } else {
      res = isEdit
        ? await actionUpdateAddon(a!.id, { name, price: priceNum, isMandatory, selectMode })
        : await actionCreateAddon({ name, price: priceNum, isMandatory, selectMode });
    }

    setSaving(false);
    if (res.ok) onSaved();
    else setError(res.error);
  }

  const label = kind === "produk" ? "Produk" : kind === "kategori" ? "Kategori" : "Add-on";

  const calculatedHpp = recipeList.reduce((acc, r) => {
    const item = inventoryItemList.find((inv) => inv.id === r.inventoryItemId);
    const itemCost = r.cost !== undefined ? r.cost : (item ? item.cost : 0);
    return acc + itemCost * (r.quantity || 0);
  }, 0);

  const calculatedPackageHpp = packageItemsList.reduce((acc, pi) => {
    const itemProd = allProducts.find((item) => item.id === pi.itemProductId);
    return acc + (itemProd ? (itemProd.costPrice ?? 0) * pi.quantity : 0);
  }, 0);

  const availableSingleProducts = allProducts.filter((item) => item.type !== "package" && item.id !== p?.id);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wd-slideup"
        style={{ width: "100%", maxWidth: kind === "produk" ? 760 : 460, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          {isEdit ? `Edit ${label}` : `Tambah ${label}`}
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.5)", marginBottom: 14 }}>
          {isEdit ? "Ubah data lalu simpan." : "Isi data baru lalu simpan."}
        </div>

        {kind === "produk" ? (
          <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1px solid rgba(35,32,31,0.1)", paddingBottom: 10, flexWrap: "wrap" }}>
            {productType === "package" ? (
              (["umum", "paket", "addon"] as const).map((st) => {
                const activeTab = subTab === st;
                const titleTab =
                  st === "umum"
                    ? "Informasi Umum"
                    : st === "paket"
                    ? `Isi Komponen Paket (${packageItemsList.length})`
                    : `Produk Ekstra (${selectedAddonIds.length})`;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSubTab(st)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: "none",
                      background: activeTab ? "#A91F34" : "rgba(35,32,31,0.05)",
                      color: activeTab ? "#fff" : "rgba(35,32,31,0.7)",
                      fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {titleTab}
                  </button>
                );
              })
            ) : (
              (["umum", "varian", "addon", "resep"] as const).map((st) => {
                const activeTab = subTab === st;
                const titleTab =
                  st === "umum"
                    ? "Informasi Umum"
                    : st === "varian"
                    ? `Varian (${variantsList.length})`
                    : st === "addon"
                    ? `Produk Ekstra (${selectedAddonIds.length})`
                    : `Resep Inventory (${recipeList.length})`;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setSubTab(st)}
                    style={{
                      padding: "6px 12px", borderRadius: 8, border: "none",
                      background: activeTab ? "#A91F34" : "rgba(35,32,31,0.05)",
                      color: activeTab ? "#fff" : "rgba(35,32,31,0.7)",
                      fontFamily: "inherit", fontSize: 12, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    {titleTab}
                  </button>
                );
              })
            )}
          </div>
        ) : null}

        <div style={{ flex: 1, overflowY: "auto", paddingRight: 4 }}>
          {loadingDetails ? (
            <div style={{ padding: 30, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13 }}>Memuat rincian...</div>
          ) : kind === "produk" && subTab === "addon" ? (
            <div>
              <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)", marginBottom: 12 }}>
                Pilih produk ekstra (add-on) mana saja yang berlaku / dapat dipesan bersama produk ini.
              </div>
              {allAddons.length === 0 ? (
                <div style={{ padding: 20, textAlign: "center", color: "rgba(35,32,31,0.5)", fontSize: 13 }}>
                  Belum ada produk ekstra terdaftar.
                </div>
              ) : (
                allAddons.map((addon) => {
                  const isChecked = selectedAddonIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                        background: isChecked ? "rgba(169,31,52,0.04)" : "#fff",
                        border: `1px solid ${isChecked ? "rgba(169,31,52,0.3)" : "rgba(35,32,31,0.12)"}`,
                        borderRadius: 10, marginBottom: 8, cursor: "pointer",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAddonIds([...selectedAddonIds, addon.id]);
                          } else {
                            setSelectedAddonIds(selectedAddonIds.filter((id) => id !== addon.id));
                          }
                        }}
                        style={{ width: 18, height: 18, accentColor: "#A91F34" }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{addon.name}</div>
                        <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>
                          {addon.isMandatory ? "Wajib" : "Opsional"} • {addon.selectMode === "single" ? "Pilih 1" : "Pilih Beberapa"}
                        </div>
                      </div>
                      <div style={{ fontWeight: 700, fontFamily: MONO, fontSize: 13, color: "#A91F34" }}>
                        +{formatRupiah(addon.price)}
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          ) : kind === "produk" && subTab === "paket" && productType === "package" ? (
            <div>
              <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)", marginBottom: 10 }}>
                Pilih menu-menu penyusun paket combo beserta jumlah porsi/unitnya.
              </div>
              {calculatedPackageHpp > 0 ? (
                <div style={{ background: "rgba(169,31,52,0.06)", border: "1px solid rgba(169,31,52,0.15)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)", fontWeight: 700 }}>ESTIMASI HPP PAKET</div>
                    <div style={{ fontSize: 14, color: "#A91F34", fontWeight: 800, fontFamily: MONO }}>{formatRupiah(calculatedPackageHpp)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCostPrice(String(calculatedPackageHpp))}
                    style={{ ...miniBtn(), background: "#A91F34", color: "#fff", border: "none", padding: "6px 12px" }}
                  >
                    Gunakan HPP Ini
                  </button>
                </div>
              ) : null}
              {packageItemsList.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 0.9fr 1.1fr 0.6fr", gap: 8, padding: "6px 8px", background: "rgba(35,32,31,0.04)", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "rgba(35,32,31,0.5)", marginBottom: 8, alignItems: "center" }}>
                  <div>Nama Produk</div>
                  <div>Jumlah</div>
                  <div>Satuan</div>
                  <div style={{ textAlign: "right" }}>Aksi</div>
                </div>
              ) : null}

              {packageItemsList.map((pi, idx) => {
                const itemProd = allProducts.find((i) => i.id === pi.itemProductId);
                const currentUnit = pi.unit !== undefined ? pi.unit : (itemProd?.unit ?? "porsi");

                return (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2fr 0.9fr 1.1fr 0.6fr", gap: 8, marginBottom: 10, alignItems: "center" }}>
                    <select
                      value={pi.itemProductId}
                      onChange={(e) => {
                        const selProd = allProducts.find((i) => i.id === e.target.value);
                        const next = [...packageItemsList];
                        next[idx].itemProductId = e.target.value;
                        if (selProd?.unit) next[idx].unit = selProd.unit;
                        setPackageItemsList(next);
                      }}
                      style={{ ...inp, height: 38 }}
                    >
                      <option value="">— Pilih Item Produk —</option>
                      {availableSingleProducts.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({formatRupiah(item.price)})
                        </option>
                      ))}
                    </select>
                    <input
                      value={pi.quantity || ""}
                      onChange={(e) => {
                        const next = [...packageItemsList];
                        next[idx].quantity = Number(e.target.value) || 0;
                        setPackageItemsList(next);
                      }}
                      inputMode="numeric"
                      placeholder="Qty"
                      style={{ ...inp, height: 38, fontFamily: MONO }}
                    />
                    <input
                      value={currentUnit}
                      onChange={(e) => {
                        const next = [...packageItemsList];
                        next[idx].unit = e.target.value;
                        setPackageItemsList(next);
                      }}
                      placeholder="Satuan (porsi, pcs)"
                      style={{ ...inp, height: 38 }}
                    />
                    <div style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setPackageItemsList(packageItemsList.filter((_, i) => i !== idx))}
                        style={{ ...miniBtn(true), height: 36, padding: "0 10px", display: "inline-flex", alignItems: "center", gap: 6 }}
                        title="Hapus produk dari paket"
                      >
                        {ic("trash", 14, "#B83636", 2)}
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setPackageItemsList([...packageItemsList, { itemProductId: "", quantity: 1 }])}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px dashed #A91F34", background: "transparent", color: "#A91F34", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, cursor: "pointer", width: "100%", marginTop: 6 }}
              >
                + Tambah Item Komponen Paket
              </button>
            </div>
          ) : kind === "produk" && subTab === "varian" ? (
            <div>
              <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)", marginBottom: 12 }}>
                Tambahkan pilihan varian beserta tambahan harganya (mis. Level Pedas, Porsi, Toping).
              </div>
              {variantsList.map((v, idx) => (
                <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "center" }}>
                  <input
                    value={v.name}
                    onChange={(e) => {
                      const next = [...variantsList];
                      next[idx].name = e.target.value;
                      setVariantsList(next);
                    }}
                    placeholder="Nama Varian (mis. Level 2)"
                    style={{ ...inp, flex: 2 }}
                  />
                  <div style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(35,32,31,0.5)" }}>+Rp</span>
                    <input
                      value={v.priceDelta}
                      onChange={(e) => {
                        const next = [...variantsList];
                        next[idx].priceDelta = Number(e.target.value.replace(/[^0-9]/g, "") || "0");
                        setVariantsList(next);
                      }}
                      inputMode="numeric"
                      placeholder="0"
                      style={{ ...inp, fontFamily: MONO }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setVariantsList(variantsList.filter((_, i) => i !== idx))}
                    style={{ ...miniBtn(true), height: 44 }}
                  >
                    Hapus
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setVariantsList([...variantsList, { name: "", priceDelta: 0 }])}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px dashed #A91F34", background: "transparent", color: "#A91F34", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, cursor: "pointer", width: "100%", marginTop: 6 }}
              >
                + Tambah Varian
              </button>
            </div>
          ) : kind === "produk" && subTab === "resep" ? (
            <div>
              <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.6)", marginBottom: 12 }}>
                Hubungkan produk ini dengan bahan baku di Inventory untuk pemotongan stok otomatis & kalkulasi HPP presisi.
              </div>
              {calculatedHpp > 0 ? (
                <div style={{ background: "rgba(169,31,52,0.06)", border: "1px solid rgba(169,31,52,0.15)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 11, color: "rgba(35,32,31,0.5)", fontWeight: 700, letterSpacing: 0.5 }}>TOTAL ESTIMASI HPP BAHAN BAKU</div>
                    <div style={{ fontSize: 16, color: "#A91F34", fontWeight: 800, fontFamily: MONO }}>{formatRupiah(calculatedHpp)}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCostPrice(String(calculatedHpp))}
                    style={{ ...miniBtn(), background: "#A91F34", color: "#fff", border: "none", padding: "8px 14px", height: "auto" }}
                  >
                    Gunakan HPP Ini
                  </button>
                </div>
              ) : null}

              {recipeList.length > 0 ? (
                <div style={{ display: "grid", gridTemplateColumns: "2.2fr 1.3fr 0.9fr 1.1fr 1.2fr 0.5fr", gap: 8, padding: "6px 8px", background: "rgba(35,32,31,0.04)", borderRadius: 8, fontSize: 11, fontWeight: 700, color: "rgba(35,32,31,0.5)", marginBottom: 8, alignItems: "center" }}>
                  <div>Bahan Baku</div>
                  <div>Harga Modal (Rp)</div>
                  <div>Takaran</div>
                  <div>Satuan</div>
                  <div style={{ textAlign: "right" }}>Subtotal HPP</div>
                  <div style={{ textAlign: "right" }}>Aksi</div>
                </div>
              ) : null}

              {recipeList.map((r, idx) => {
                const invItem = inventoryItemList.find((i) => i.id === r.inventoryItemId);
                const itemCost = r.cost !== undefined ? r.cost : (invItem ? invItem.cost : 0);
                const itemUnit = r.unit !== undefined ? r.unit : (invItem ? invItem.unit : "");
                const subtotal = itemCost * (r.quantity || 0);

                return (
                  <div key={idx} style={{ display: "grid", gridTemplateColumns: "2.2fr 1.3fr 0.9fr 1.1fr 1.2fr 0.5fr", gap: 8, marginBottom: 10, alignItems: "center" }}>
                    <select
                      value={r.inventoryItemId}
                      onChange={(e) => {
                        const selectedId = e.target.value;
                        const selectedInv = inventoryItemList.find((i) => i.id === selectedId);
                        const next = [...recipeList];
                        next[idx] = {
                          ...next[idx],
                          inventoryItemId: selectedId,
                          cost: selectedInv ? selectedInv.cost : next[idx].cost,
                          unit: selectedInv ? selectedInv.unit : next[idx].unit,
                        };
                        setRecipeList(next);
                      }}
                      style={{ ...inp, height: 38 }}
                    >
                      <option value="">— Pilih Bahan Baku —</option>
                      {inventoryItemList.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} ({formatRupiah(item.cost)}/{item.unit})
                        </option>
                      ))}
                    </select>
                    <input
                      value={r.cost !== undefined ? r.cost : (invItem?.cost ?? "")}
                      onChange={(e) => {
                        const next = [...recipeList];
                        next[idx].cost = Number(e.target.value.replace(/[^0-9]/g, "")) || 0;
                        setRecipeList(next);
                      }}
                      inputMode="numeric"
                      placeholder="Harga Modal"
                      style={{ ...inp, height: 38, fontFamily: MONO }}
                    />
                    <input
                      value={r.quantity || ""}
                      onChange={(e) => {
                        const next = [...recipeList];
                        next[idx].quantity = Number(e.target.value) || 0;
                        setRecipeList(next);
                      }}
                      inputMode="decimal"
                      placeholder="Takaran"
                      style={{ ...inp, height: 38, fontFamily: MONO }}
                    />
                    <input
                      value={itemUnit}
                      onChange={(e) => {
                        const next = [...recipeList];
                        next[idx].unit = e.target.value;
                        setRecipeList(next);
                      }}
                      placeholder="Satuan (gram, ml)"
                      style={{ ...inp, height: 38 }}
                    />
                    <div style={{ fontSize: 12.5, fontWeight: 700, fontFamily: MONO, color: "#A91F34", textAlign: "right" }}>
                      {formatRupiah(subtotal)}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <button
                        type="button"
                        onClick={() => setRecipeList(recipeList.filter((_, i) => i !== idx))}
                        style={{ ...miniBtn(true), height: 36, padding: "0 8px", display: "inline-flex", alignItems: "center", justifyContent: "center" }}
                        title="Hapus bahan dari resep"
                      >
                        {ic("trash", 14, "#B83636", 2)}
                      </button>
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setRecipeList([...recipeList, { inventoryItemId: "", quantity: 1 }])}
                style={{ height: 36, padding: "0 14px", borderRadius: 8, border: "1px dashed #A91F34", background: "transparent", color: "#A91F34", fontFamily: "inherit", fontWeight: 700, fontSize: 12.5, cursor: "pointer", width: "100%", marginTop: 6 }}
              >
                + Tambah Bahan Baku
              </button>
            </div>
          ) : (
            <>
              <Field label="Nama">
                <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder={`Nama ${label.toLowerCase()}`} />
              </Field>

              {kind === "produk" ? (
                <>
                  <Field label="Tipe Menu">
                    <select value={productType} onChange={(e) => setProductType(e.target.value as "single" | "package")} style={inp}>
                      <option value="single">Menu Biasa (Single)</option>
                      <option value="package">Menu Paket (Combo)</option>
                    </select>
                  </Field>
                  <Field label="Kode / SKU">
                    <div style={{ display: "flex", gap: 8 }}>
                      <input value={sku} onChange={(e) => setSku(e.target.value)} style={{ ...inp, flex: 1, fontFamily: MONO }} placeholder={productType === "package" ? "mis. PKT-001" : "mis. WD-DIM-01"} />
                      <button
                        type="button"
                        onClick={() => {
                          const prefix = productType === "package" ? "PKT" : "WD";
                          const rnd = Math.floor(1000 + Math.random() * 9000);
                          setSku(`${prefix}-${rnd}`);
                        }}
                        style={{ ...miniBtn(), height: 44, padding: "0 14px", background: "rgba(35,32,31,0.06)", border: "none" }}
                      >
                        Auto Kode
                      </button>
                    </div>
                  </Field>
                  <Field label="Kategori">
                    <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inp}>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Jenis Satuan">
                    <div style={{ display: "flex", gap: 8 }}>
                      <select value={["porsi", "pcs", "piring", "mangkuk", "paket", "gelas", "box"].includes(unit.toLowerCase()) ? unit.toLowerCase() : "custom"} onChange={(e) => { if (e.target.value !== "custom") setUnit(e.target.value); }} style={{ ...inp, flex: 1 }}>
                        <option value="porsi">Porsi</option>
                        <option value="pcs">Pcs</option>
                        <option value="piring">Piring</option>
                        <option value="mangkuk">Mangkuk</option>
                        <option value="paket">Paket</option>
                        <option value="gelas">Gelas</option>
                        <option value="box">Box</option>
                        <option value="custom">Lainnya...</option>
                      </select>
                      <input
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        placeholder="Satuan (porsi, pcs)"
                        style={{ ...inp, flex: 1 }}
                      />
                    </div>
                  </Field>
                  <Field label="Station Dapur">
                    <select value={station} onChange={(e) => setStation(e.target.value)} style={inp}>
                      <option value="">— Tanpa station —</option>
                      {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>

                  <div style={{ display: "flex", gap: 10, marginTop: 4, marginBottom: 14 }}>
                    <div style={{ flex: 1 }}>
                      <Field label="Minimal Pembelian">
                        <input value={minOrder} onChange={(e) => setMinOrder(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" style={{ ...inp, fontFamily: MONO }} placeholder="1" />
                      </Field>
                    </div>
                    <div style={{ flex: 1.5, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6, paddingTop: 14 }}>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "rgba(35,32,31,0.85)" }}>
                        <input type="checkbox" checked={showInBar} onChange={(e) => setShowInBar(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#A91F34" }} />
                        <span>Tampilkan di Bar / Station</span>
                      </label>
                      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, fontWeight: 600, cursor: "pointer", color: "rgba(35,32,31,0.85)" }}>
                        <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} style={{ width: 16, height: 16, accentColor: "#A91F34" }} />
                        <span>Produk Favorit</span>
                      </label>
                    </div>
                  </div>
                </>
              ) : null}

              {kind === "kategori" ? (
                <Field label="Urutan">
                  <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" style={inp} />
                </Field>
              ) : null}

              {kind === "produk" ? (
                <div style={{ display: "flex", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <Field label="Harga Jual (Rp)">
                      <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" style={{ ...inp, fontFamily: MONO }} placeholder="0" />
                    </Field>
                  </div>
                  <div style={{ flex: 1 }}>
                    <Field label="Harga Modal HPP (Rp)">
                      <input value={costPrice} onChange={(e) => setCostPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" style={{ ...inp, fontFamily: MONO }} placeholder="0" />
                    </Field>
                  </div>
                </div>
              ) : kind === "addon" ? (
                <>
                  <Field label="Harga (Rp)">
                    <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" style={{ ...inp, fontFamily: MONO }} placeholder="0" />
                  </Field>
                  <Field label="Jenis Ekstra">
                    <select value={isMandatory ? "true" : "false"} onChange={(e) => setIsMandatory(e.target.value === "true")} style={inp}>
                      <option value="false">Opsional (Pembeli boleh memilih atau tidak)</option>
                      <option value="true">Wajib (Pembeli harus memilih)</option>
                    </select>
                  </Field>
                  <Field label="Cara Pilih">
                    <select value={selectMode} onChange={(e) => setSelectMode(e.target.value as "single" | "multiple")} style={inp}>
                      <option value="multiple">Pilih Beberapa (Multiple Checkbox)</option>
                      <option value="single">Pilih Salah Satu (Single Radio)</option>
                    </select>
                  </Field>
                </>
              ) : null}
            </>
          )}
        </div>

        {error ? (
          <div style={{ background: "#FBE7E7", color: "#B83636", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, fontWeight: 600, marginTop: 10 }} role="alert">
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button onClick={onClose} disabled={saving} style={{ flex: 1, height: 44, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
            Batal
          </button>
          <button onClick={save} disabled={saving || !name} style={{ flex: 1, height: 44, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, cursor: "pointer", opacity: saving || !name ? 0.6 : 1 }}>
            {saving ? "Menyimpan…" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp: React.CSSProperties = {
  width: "100%", height: 44, border: "1px solid rgba(35,32,31,0.14)", borderRadius: 10,
  padding: "0 13px", fontFamily: "inherit", fontSize: 14, background: "#fff", outline: "none",
};
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.6)", marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function ImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<BulkProductInput[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const raw = csvToArray(text);
        if (raw.length < 2) {
          setError("File CSV kosong atau tidak memiliki baris data.");
          setParsedRows([]);
          return;
        }

        const headers = raw[0].map((h) => h.toLowerCase().trim());
        const skuIdx = headers.findIndex((h) => h.includes("sku"));
        const nameIdx = headers.findIndex((h) => h.includes("nama"));
        const catIdx = headers.findIndex((h) => h.includes("kategori"));
        const priceIdx = headers.findIndex((h) => h.includes("harga jual") || (h.includes("harga") && !h.includes("modal")));
        const costIdx = headers.findIndex((h) => h.includes("modal") || h.includes("hpp"));
        const unitIdx = headers.findIndex((h) => h.includes("satuan") || h.includes("unit"));
        const stationIdx = headers.findIndex((h) => h.includes("station") || h.includes("dapur"));

        if (nameIdx === -1 || priceIdx === -1) {
          setError("CSV harus memiliki kolom 'Nama Produk' dan 'Harga Jual'.");
          setParsedRows([]);
          return;
        }

        const items: BulkProductInput[] = [];
        for (let i = 1; i < raw.length; i++) {
          const row = raw[i];
          if (!row || row.length === 0 || !row.some((cell) => cell.length > 0)) continue;

          const name = row[nameIdx] || "";
          const price = Number(row[priceIdx]?.replace(/[^0-9]/g, "") || "0");
          if (!name || isNaN(price)) continue;

          const sku = skuIdx !== -1 && row[skuIdx] ? row[skuIdx] : `WD-IMP-${Date.now().toString(36).toUpperCase()}-${i}`;
          const categoryName = catIdx !== -1 && row[catIdx] ? row[catIdx] : "Umum";
          const costPrice = costIdx !== -1 && row[costIdx] ? Number(row[costIdx]?.replace(/[^0-9]/g, "") || "0") : 0;
          const unit = unitIdx !== -1 && row[unitIdx] ? row[unitIdx] : "porsi";
          const kitchenStation = stationIdx !== -1 && row[stationIdx] ? row[stationIdx] : null;

          items.push({ name, sku, categoryName, price, costPrice, unit, kitchenStation });
        }

        if (items.length === 0) {
          setError("Tidak ada baris produk valid yang dapat diimpor.");
          setParsedRows([]);
        } else {
          setParsedRows(items);
        }
      } catch {
        setError("Gagal membaca format CSV.");
        setParsedRows([]);
      }
    };
    reader.readAsText(file);
  }

  async function submitImport() {
    if (parsedRows.length === 0 || submitting) return;
    setSubmitting(true);
    setError(null);

    const res = await actionImportProducts(parsedRows);
    setSubmitting(false);

    if (res.ok) {
      onImported();
    } else {
      setError(res.error);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wd-slideup"
        style={{ width: "100%", maxWidth: 640, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)", maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          Import Menu Massal (CSV)
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.5)", marginBottom: 16 }}>
          Unggah file CSV berisi data menu. Produk dengan SKU yang sama akan diperbarui, produk baru akan ditambahkan.
        </div>

        <div style={{ marginBottom: 16, padding: 14, border: "2px dashed rgba(35,32,31,0.15)", borderRadius: 12, textAlign: "center", background: "#FAF8F5" }}>
          <input type="file" accept=".csv" onChange={handleFileChange} style={{ display: "none" }} id="csv-upload-input" />
          <label htmlFor="csv-upload-input" style={{ cursor: "pointer", display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#A91F34" }}>
              {fileName ? `File terpilih: ${fileName}` : "Pilih File CSV (.csv)"}
            </span>
            <span style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)" }}>
              Klik untuk memilih file dari komputer Anda
            </span>
          </label>
        </div>

        {error ? (
          <div style={{ background: "#FBE7E7", color: "#B83636", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, fontWeight: 600, marginBottom: 12 }} role="alert">
            {error}
          </div>
        ) : null}

        {parsedRows.length > 0 ? (
          <div style={{ flex: 1, overflowY: "auto", marginBottom: 16, border: "1px solid rgba(35,32,31,0.1)", borderRadius: 10 }}>
            <div style={{ padding: "8px 12px", background: "rgba(35,32,31,0.03)", fontSize: 12, fontWeight: 700, color: "rgba(35,32,31,0.6)", borderBottom: "1px solid rgba(35,32,31,0.08)" }}>
              Preview Data ({parsedRows.length} Produk Valid)
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#FAFAFA", textAlign: "left" }}>
                  <th style={{ padding: "8px 12px" }}>SKU</th>
                  <th style={{ padding: "8px 12px" }}>Nama Produk</th>
                  <th style={{ padding: "8px 12px" }}>Kategori</th>
                  <th style={{ padding: "8px 12px", textAlign: "right" }}>Harga</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((row, idx) => (
                  <tr key={idx} style={{ borderBottom: "1px solid rgba(35,32,31,0.05)" }}>
                    <td style={{ padding: "8px 12px", fontFamily: MONO }}>{row.sku}</td>
                    <td style={{ padding: "8px 12px", fontWeight: 600 }}>{row.name}</td>
                    <td style={{ padding: "8px 12px" }}>{row.categoryName}</td>
                    <td style={{ padding: "8px 12px", textAlign: "right", fontFamily: MONO }}>{formatRupiah(row.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {parsedRows.length > 10 ? (
              <div style={{ padding: "8px 12px", fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontStyle: "italic" }}>
                ... dan {parsedRows.length - 10} produk lainnya.
              </div>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: "auto" }}>
          <button onClick={onClose} disabled={submitting} style={{ flex: 1, height: 44, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}>
            Batal
          </button>
          <button onClick={submitImport} disabled={submitting || parsedRows.length === 0} style={{ flex: 1, height: 44, borderRadius: 10, border: "none", background: "#A91F34", color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, cursor: "pointer", opacity: submitting || parsedRows.length === 0 ? 0.6 : 1 }}>
            {submitting ? "Memproses..." : `Impor ${parsedRows.length} Produk`}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  target,
  busy,
  onClose,
  onConfirm,
}: {
  target: { type: "produk" | "kategori" | "addon"; id: string; name: string };
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const typeLabel = target.type === "produk" ? "menu" : target.type === "kategori" ? "kategori" : "add-on";
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 60, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wd-slideup"
        style={{ width: "100%", maxWidth: 400, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)" }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, color: "#B83636", marginBottom: 8 }}>
          Hapus {typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)}?
        </div>
        <div style={{ fontSize: 13.5, color: "rgba(35,32,31,0.7)", marginBottom: 20, lineHeight: 1.5 }}>
          Apakah Anda yakin ingin menghapus {typeLabel} <strong>{target.name}</strong>? Item yang sudah dihapus tidak akan ditampilkan lagi.
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{ flex: 1, height: 42, borderRadius: 10, border: "1px solid rgba(35,32,31,0.14)", background: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{ flex: 1, height: 42, borderRadius: 10, border: "none", background: "#B83636", color: "#fff", fontFamily: "inherit", fontWeight: 700, fontSize: 13.5, cursor: "pointer", opacity: busy ? 0.6 : 1 }}
          >
            {busy ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}
