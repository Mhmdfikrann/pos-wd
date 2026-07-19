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
import {
  actionLoadCatalog,
  actionCreateProduct,
  actionUpdateProduct,
  actionSetProductAvailability,
  actionDeactivateProduct,
  actionCreateCategory,
  actionUpdateCategory,
  actionDeactivateCategory,
  actionCreateAddon,
  actionUpdateAddon,
  actionDeactivateAddon,
} from "@/lib/catalog-actions";
import type { CatalogProduct, CatalogCategory } from "@/lib/catalog";

type Tab = "produk" | "kategori" | "addon";
type Addon = { id: string; name: string; price: number; active: boolean };

/** Which tab each Owner nav label opens on. */
const LABEL_TAB: Record<string, Tab> = {
  "Buku Menu": "produk",
  "Daftar Kategori": "kategori",
  "Produk Ekstra": "addon",
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

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? "—";

  const q = query.trim().toLowerCase();
  const shownProducts = products.filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
  const shownCategories = categories.filter((c) => !q || c.name.toLowerCase().includes(q));
  const shownAddons = addons.filter((a) => !q || a.name.toLowerCase().includes(q));

  const title = tab === "produk" ? "Buku Menu" : tab === "kategori" ? "Daftar Kategori" : "Produk Ekstra";
  const subtitle =
    tab === "produk"
      ? "Kelola produk: harga, kategori, station dapur, dan ketersediaan."
      : tab === "kategori"
        ? "Kelompok menu yang tampil di kasir."
        : "Add-on / produk ekstra yang bisa ditambahkan ke pesanan.";

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
          onDeactivate={(row) =>
            startTransition(async () => {
              await actionDeactivateProduct(row.id);
              await reload();
            })
          }
        />
      ) : tab === "kategori" ? (
        <CategoryTable
          rows={shownCategories}
          busy={pending}
          onEdit={(row) => setModal({ kind: "kategori", row })}
          onDeactivate={(row) =>
            startTransition(async () => {
              await actionDeactivateCategory(row.id);
              await reload();
            })
          }
        />
      ) : (
        <AddonTable
          rows={shownAddons}
          busy={pending}
          onEdit={(row) => setModal({ kind: "addon", row })}
          onDeactivate={(row) =>
            startTransition(async () => {
              await actionDeactivateAddon(row.id);
              await reload();
            })
          }
        />
      )}

      {modal ? (
        <EditModal
          kind={modal.kind}
          row={modal.row}
          categories={categories}
          onClose={() => setModal(null)}
          onSaved={async () => {
            setModal(null);
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

function ProductTable({
  rows, catName, busy, onEdit, onToggleAvail, onDeactivate,
}: {
  rows: CatalogProduct[];
  catName: (id: string) => string;
  busy: boolean;
  onEdit: (r: CatalogProduct) => void;
  onToggleAvail: (r: CatalogProduct) => void;
  onDeactivate: (r: CatalogProduct) => void;
}) {
  const tmpl = "2fr 1fr 0.9fr 0.9fr 1fr 1.4fr";
  if (rows.length === 0) return <Empty msg="Belum ada produk." />;
  return (
    <div className="wd-responsive-table" style={CARD}>
      <div style={{ ...HEAD, gridTemplateColumns: tmpl }}>
        <div>Produk</div><div>Kategori</div><div style={{ textAlign: "right" }}>Harga</div>
        <div>Station</div><div>Status</div><div style={{ textAlign: "right" }}>Aksi</div>
      </div>
      {rows.map((p) => (
        <div key={p.id} style={{ ...ROW, gridTemplateColumns: tmpl, opacity: p.active ? 1 : 0.55 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</div>
            <div style={{ fontSize: 11.5, color: "rgba(35,32,31,0.5)", fontFamily: MONO }}>{p.sku}</div>
          </div>
          <div>{catName(p.categoryId)}</div>
          <div style={{ textAlign: "right", fontFamily: MONO }}>{formatRupiah(p.price)}</div>
          <div>{p.kitchenStation ?? "—"}</div>
          <div>
            {!p.active ? <Badge text="Nonaktif" tone="neutral" /> : p.available ? <Badge text="Tersedia" tone="ok" /> : <Badge text="Habis" tone="out" />}
          </div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button disabled={busy} onClick={() => onEdit(p)} style={miniBtn()}>Edit</button>
            {p.active ? (
              <>
                <button disabled={busy} onClick={() => onToggleAvail(p)} style={miniBtn()}>
                  {p.available ? "Set Habis" : "Set Ada"}
                </button>
                <button disabled={busy} onClick={() => onDeactivate(p)} style={miniBtn(true)}>Nonaktifkan</button>
              </>
            ) : null}
          </div>
        </div>
      ))}
      <Footer n={rows.length} />
    </div>
  );
}

function CategoryTable({
  rows, busy, onEdit, onDeactivate,
}: {
  rows: CatalogCategory[];
  busy: boolean;
  onEdit: (r: CatalogCategory) => void;
  onDeactivate: (r: CatalogCategory) => void;
}) {
  const tmpl = "2fr 0.8fr 1fr 1.2fr";
  if (rows.length === 0) return <Empty msg="Belum ada kategori." />;
  return (
    <div className="wd-responsive-table" style={CARD}>
      <div style={{ ...HEAD, gridTemplateColumns: tmpl }}>
        <div>Kategori</div><div style={{ textAlign: "right" }}>Urutan</div><div>Status</div><div style={{ textAlign: "right" }}>Aksi</div>
      </div>
      {rows.map((c) => (
        <div key={c.id} style={{ ...ROW, gridTemplateColumns: tmpl, opacity: c.active ? 1 : 0.55 }}>
          <div style={{ fontWeight: 700 }}>{c.name}</div>
          <div style={{ textAlign: "right", fontFamily: MONO }}>{c.sortOrder}</div>
          <div>{c.active ? <Badge text="Aktif" tone="ok" /> : <Badge text="Nonaktif" tone="neutral" />}</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button disabled={busy} onClick={() => onEdit(c)} style={miniBtn()}>Edit</button>
            {c.active ? <button disabled={busy} onClick={() => onDeactivate(c)} style={miniBtn(true)}>Nonaktifkan</button> : null}
          </div>
        </div>
      ))}
      <Footer n={rows.length} />
    </div>
  );
}

function AddonTable({
  rows, busy, onEdit, onDeactivate,
}: {
  rows: Addon[];
  busy: boolean;
  onEdit: (r: Addon) => void;
  onDeactivate: (r: Addon) => void;
}) {
  const tmpl = "2fr 1fr 1fr 1.2fr";
  if (rows.length === 0) return <Empty msg="Belum ada add-on." />;
  return (
    <div className="wd-responsive-table" style={CARD}>
      <div style={{ ...HEAD, gridTemplateColumns: tmpl }}>
        <div>Add-on</div><div style={{ textAlign: "right" }}>Harga</div><div>Status</div><div style={{ textAlign: "right" }}>Aksi</div>
      </div>
      {rows.map((a) => (
        <div key={a.id} style={{ ...ROW, gridTemplateColumns: tmpl, opacity: a.active ? 1 : 0.55 }}>
          <div style={{ fontWeight: 700 }}>{a.name}</div>
          <div style={{ textAlign: "right", fontFamily: MONO }}>{formatRupiah(a.price)}</div>
          <div>{a.active ? <Badge text="Aktif" tone="ok" /> : <Badge text="Nonaktif" tone="neutral" />}</div>
          <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
            <button disabled={busy} onClick={() => onEdit(a)} style={miniBtn()}>Edit</button>
            {a.active ? <button disabled={busy} onClick={() => onDeactivate(a)} style={miniBtn(true)}>Nonaktifkan</button> : null}
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
  kind, row, categories, onClose, onSaved,
}: {
  kind: Tab;
  row?: CatalogProduct | CatalogCategory | Addon;
  categories: CatalogCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!row;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Field state — union across the three kinds; only the relevant ones render.
  const p = kind === "produk" ? (row as CatalogProduct | undefined) : undefined;
  const c = kind === "kategori" ? (row as CatalogCategory | undefined) : undefined;
  const a = kind === "addon" ? (row as Addon | undefined) : undefined;

  const [name, setName] = useState(row?.name ?? "");
  const [sku, setSku] = useState(p?.sku ?? "");
  const [price, setPrice] = useState(String(p?.price ?? a?.price ?? ""));
  const [categoryId, setCategoryId] = useState(p?.categoryId ?? categories[0]?.id ?? "");
  const [station, setStation] = useState(p?.kitchenStation ?? "");
  const [sortOrder, setSortOrder] = useState(String(c?.sortOrder ?? 0));

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    const priceNum = Math.round(Number(price) || 0);

    let res: { ok: true } | { ok: false; error: string };
    if (kind === "produk") {
      res = isEdit
        ? await actionUpdateProduct(p!.id, { name, sku, price: priceNum, categoryId, kitchenStation: station || null })
        : await actionCreateProduct({ name, sku, price: priceNum, categoryId, kitchenStation: station || null });
    } else if (kind === "kategori") {
      const so = Math.round(Number(sortOrder) || 0);
      res = isEdit
        ? await actionUpdateCategory(c!.id, { name, sortOrder: so })
        : await actionCreateCategory({ name, sortOrder: so });
    } else {
      res = isEdit
        ? await actionUpdateAddon(a!.id, { name, price: priceNum })
        : await actionCreateAddon({ name, price: priceNum });
    }

    setSaving(false);
    if (res.ok) onSaved();
    else setError(res.error);
  }

  const label = kind === "produk" ? "Produk" : kind === "kategori" ? "Kategori" : "Add-on";

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(20,16,16,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="wd-slideup"
        style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 30px 60px -20px rgba(0,0,0,0.4)" }}
      >
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
          {isEdit ? `Edit ${label}` : `Tambah ${label}`}
        </div>
        <div style={{ fontSize: 12.5, color: "rgba(35,32,31,0.5)", marginBottom: 18 }}>
          {isEdit ? "Ubah data lalu simpan." : "Isi data baru lalu simpan."}
        </div>

        <Field label="Nama">
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)} style={inp} placeholder={`Nama ${label.toLowerCase()}`} />
        </Field>

        {kind === "produk" ? (
          <>
            <Field label="SKU">
              <input value={sku} onChange={(e) => setSku(e.target.value)} style={inp} placeholder="mis. WD-DIM-01" />
            </Field>
            <Field label="Kategori">
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} style={inp}>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Station Dapur">
              <select value={station} onChange={(e) => setStation(e.target.value)} style={inp}>
                <option value="">— Tanpa station —</option>
                {STATIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </>
        ) : null}

        {kind === "kategori" ? (
          <Field label="Urutan">
            <input value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} inputMode="numeric" style={inp} />
          </Field>
        ) : null}

        {kind === "produk" || kind === "addon" ? (
          <Field label="Harga (Rp)">
            <input value={price} onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" style={{ ...inp, fontFamily: MONO }} placeholder="0" />
          </Field>
        ) : null}

        {error ? (
          <div style={{ background: "#FBE7E7", color: "#B83636", borderRadius: 8, padding: "9px 12px", fontSize: 12.5, fontWeight: 600, marginTop: 4 }} role="alert">
            {error}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
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
