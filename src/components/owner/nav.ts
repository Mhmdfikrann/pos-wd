import type { IconName } from "./icons";

export interface NavItem {
  ic?: IconName;
  label: string;
  children?: NavItem[];
}

/** Full nested nav tree — ported verbatim from the mockup's NAV array. */
export const NAV: NavItem[] = [
  { ic: "dashboard", label: "Dashboard", children: [{ label: "Dashboard Penjualan" }, { label: "Dashboard Keuangan" }] },
  { ic: "cashier", label: "Kasir" },
  { ic: "orders", label: "Daftar Pesanan" },
  { ic: "kitchen", label: "Kitchen Display", children: [{ label: "Pengaturan Kitchen Display" }] },
  {
    ic: "report",
    label: "Laporan",
    children: [
      { label: "Analisa Laporan", children: [{ label: "Kepuasan Pelanggan" }, { label: "Waktu Teramai Penjualan" }, { label: "Perputaran Stok" }, { label: "Pendapatan & Uang Masuk Harian" }] },
      { label: "Laporan Penjualan", children: [{ label: "Penjualan Outlet" }, { label: "Ringkasan Penjualan" }, { label: "Penjualan Per Terminal" }, { label: "Laporan Per Kasir" }, { label: "Penjualan Produk" }, { label: "Laporan Tutup Kasir" }] },
      { label: "Laporan Dapur", children: [{ label: "Waktu Proses Order" }, { label: "Waktu Proses Produk" }] },
      { label: "Laporan Karyawan", children: [{ label: "Absensi" }, { label: "Laporan Komisi Tetap" }, { label: "Laporan Komisi Bertingkat" }] },
      { label: "Laporan Persediaan", children: [{ label: "Ringkasan Persediaan" }, { label: "Stok Kedaluwarsa" }, { label: "Detail Persediaan" }] },
      { label: "Laporan Settlement", children: [{ label: "Order Online" }, { label: "Detail Saldo" }] },
    ],
  },
  {
    ic: "inventory",
    label: "Inventori",
    children: [
      { label: "Kelola Stok", children: [{ label: "Daftar Stok" }, { label: "Faktur Pembelian" }, { label: "Produksi Stok" }, { label: "Stok Opname" }, { label: "Stok Terbuang" }] },
      { label: "Pembelian Stok", children: [{ label: "Daftar Pemasok" }, { label: "Pemesanan Stok" }, { label: "Pengiriman Pembelian" }, { label: "Permintaan Barang" }] },
      { label: "Mutasi Antar Outlet", children: [{ label: "Permintaan Stok" }, { label: "Kirim Stok" }, { label: "Terima Mutasi Stok" }, { label: "Stok Transit" }] },
      { label: "Retur", children: [{ label: "Retur Pembelian" }, { label: "Rekonsiliasi Retur" }] },
      { label: "Daftar Bahan Baku" },
    ],
  },
  {
    ic: "product",
    label: "Produk",
    children: [
      { label: "Buku Menu" }, { label: "Daftar Layanan" }, { label: "Daftar Kategori" }, { label: "Produk Ekstra" },
      { label: "Daftar Departemen" }, { label: "Produk Paket" }, { label: "Master Resep" }, { label: "Cetak Barcode" },
      { label: "Harga Berdasarkan Waktu" },
    ],
  },
  {
    ic: "promo",
    label: "Promosi",
    children: [
      { label: "Kupon Diskon", children: [{ label: "Kupon Campaign" }, { label: "Kupon List" }] },
      { label: "Promo", children: [{ label: "Advance" }, { label: "Basic" }, { label: "Per Total Pembelian" }, { label: "Per Produk" }] },
      { label: "Poin Reward", children: [{ label: "Per Total Pembelian" }, { label: "Per Produk" }, { label: "Penukaran Poin" }] },
      { label: "Loyalty", children: [{ label: "Loyalty Program" }, { label: "Daftar Loyalty" }, { label: "Group Loyalty Pelanggan" }] },
    ],
  },
  {
    ic: "customer",
    label: "Pelanggan",
    children: [
      { label: "Daftar Pelanggan" }, { label: "Grup Pelanggan" }, { label: "Grup Harga Spesial" }, { label: "Kustom Data Pelanggan" }, { label: "Pengaturan Data Pelanggan" },
    ],
  },
  {
    ic: "finance",
    label: "Laporan Keuangan",
    children: [
      { label: "Laba Rugi" }, { label: "Buku Besar" }, { label: "Jurnal" }, { label: "Neraca" }, { label: "Arus Kas" }, { label: "Hutang" }, { label: "Piutang" },
    ],
  },
  {
    ic: "expense",
    label: "Pengeluaran",
    children: [
      { label: "Daftar Pengeluaran" }, { label: "Daftar Biaya" }, { label: "Daftar Pembayaran Faktur" }, { label: "Daftar Tagihan Rutin" }, { label: "Daftar Mitra" },
    ],
  },
  { ic: "cashbook", label: "Buku Kas", children: [{ label: "Daftar Buku Kas & Bank" }, { label: "Daftar Transfer" }] },
  {
    ic: "payroll",
    label: "Gaji",
    children: [
      { label: "Laporan Pembayaran" }, { label: "Struktur Gaji" }, { label: "Pembayaran Payroll" }, { label: "Rekonsiliasi Pembayaran" },
    ],
  },
  {
    ic: "invoice",
    label: "Invoice",
    children: [
      { label: "Daftar Invoice" }, { label: "Daftar Pesanan Penjualan" }, { label: "Daftar Penawaran Penjualan" }, { label: "Daftar Pengiriman Penjualan" },
    ],
  },
  {
    ic: "staff",
    label: "Akses Karyawan",
    children: [
      { label: "Dashboard Karyawan" }, { label: "Akses Karyawan" }, { label: "Akses Absensi" }, { label: "Radius Absensi" }, { label: "Daftar Hak Akses" }, { label: "Jadwal Kerja Karyawan" },
    ],
  },
  { ic: "schedule", label: "Jadwal Kerja", children: [{ label: "Daftar Shift" }, { label: "Jadwal Kerja" }, { label: "Jadwal Kerja Karyawan" }] },
  { ic: "kasbon", label: "Kasbon", children: [{ label: "Daftar Pengajuan Kasbon" }, { label: "Daftar Akses Kasbon" }] },
  {
    ic: "business",
    label: "Pengaturan Bisnis",
    children: [
      { label: "Daftar Outlet" }, { label: "Grup Outlet" }, { label: "Pengaturan Denah dan Meja" }, { label: "Notifikasi" }, { label: "Akses Support" },
    ],
  },
  { ic: "terminal", label: "Terminal", children: [{ label: "Daftar Perangkat" }, { label: "Soundbox Device" }] },
  { ic: "online", label: "Order Online", children: [{ label: "Pengaturan Penjualan" }, { label: "Kustomisasi Toko" }, { label: "Pengaturan Lainnya" }] },
  {
    ic: "settings",
    label: "Pengaturan",
    children: [
      { label: "Pengaturan Produk" }, { label: "Pengaturan Transaksi" }, { label: "Pengaturan Pengiriman" }, { label: "Pengaturan Pembayaran" },
    ],
  },
  { ic: "profile", label: "Akun Profil", children: [{ label: "Informasi Akun" }, { label: "Informasi Bisnis" }, { label: "Rekening Bank" }] },
];

/** Port of `containsActive`. */
export function containsActive(item: NavItem, active: string): boolean {
  if (item.label === active) return true;
  if (!item.children) return false;
  return item.children.some((c) => containsActive(c, active));
}

/** Port of `findPath` — depth-first trail of labels to the target. */
export function findPath(label: string): string[] {
  const dfs = (items: NavItem[], trail: string[]): string[] | null => {
    for (const it of items) {
      const t = trail.concat(it.label);
      if (it.label === label) return t;
      if (it.children) {
        const r = dfs(it.children, t);
        if (r) return r;
      }
    }
    return null;
  };
  return dfs(NAV, []) || [label];
}

/** Port of `pageType(label)` — decides which archetype renderer to use. */
export type PageType = "kasir" | "board" | "report" | "form" | "table";
export function pageType(label: string): PageType {
  if (label === "Kasir") return "kasir";
  if (label === "Kitchen Display") return "board";
  const l = label.toLowerCase();
  const p = findPath(label).join(" / ").toLowerCase();
  if (l.indexOf("dashboard") === 0) return "report";
  if (/^(pengaturan|informasi|kustom|notifikasi|radius|struktur gaji|kustomisasi|rekening|akses support|akun profil)/.test(l)) return "form";
  if (l === "grup outlet" || l === "grup pelanggan" || l === "grup harga spesial") return "table";
  if (p.indexOf("laporan") > -1 || p.indexOf("analisa") > -1 || /^(laporan|analisa|ringkasan|rekonsiliasi|laba rugi|neraca|arus kas|buku besar|jurnal|hutang|piutang|detail saldo)/.test(l)) return "report";
  return "table";
}
