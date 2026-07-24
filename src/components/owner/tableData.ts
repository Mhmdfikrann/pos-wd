import { formatRupiah } from "@/lib/format";

export type ColumnKind = "badge" | "sub" | "mono" | "strong" | "action";

export interface Column {
  k: string;
  label: string;
  w?: string;
  align?: "left" | "right" | "center";
  kind?: ColumnKind;
}

/** A cell value can be a string, a [text, tone]/[title, sub] pair. */
export type CellValue = string | [string, string];

export type Row = Record<string, CellValue>;

export interface TableData {
  kpis: Array<[string, string, (string | null)?, (string | null)?]>;
  columns: Column[];
  rows: Row[];
  total: number;
  subtitle?: string;
  filters?: string[];
}

const rp = (n: number) => formatRupiah(n);

/** Trailing action column, ported from `const A`. */
const A: Column = { k: "act", label: "", w: "0.7fr", align: "right", kind: "action" };

const mk = (
  kpis: TableData["kpis"],
  columns: Column[],
  rows: Row[],
  total?: number,
): TableData => ({ kpis, columns, rows, total: total ?? rows.length });

/** Port of `tableData(label)` — every branch preserved exactly. */
export function tableData(label: string): TableData {
  const l = label.toLowerCase();

  if (/pelanggan|member|loyalty/.test(l) && !/program|campaign|reward|poin|group loyalty/.test(l))
    return mk(
      [["Total Pelanggan", "1.284", "up"], ["Member Aktif", "842"], ["Baru Bulan Ini", "126", "up"]],
      [
        { k: "n", label: "Nama", w: "2fr", kind: "sub" },
        { k: "hp", label: "No. HP", w: "1.3fr", kind: "mono" },
        { k: "v", label: "Kunjungan", w: "1fr", align: "right", kind: "mono" },
        { k: "t", label: "Total Belanja", w: "1.3fr", align: "right", kind: "mono" },
        { k: "g", label: "Grup", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { n: ["Budi Santoso", "Member sejak 2024"], hp: "0812-3456-7890", v: "42", t: rp(3820000), g: ["Gold", "gold"] },
        { n: ["Siti Rahma", "Member sejak 2023"], hp: "0813-2211-0098", v: "88", t: rp(7640000), g: ["Platinum", "info"] },
        { n: ["Andi Kurnia", "Member sejak 2025"], hp: "0821-9090-1122", v: "12", t: rp(940000), g: ["Silver", "neutral"] },
        { n: ["Dewi Lestari", "Member sejak 2024"], hp: "0857-1200-3344", v: "31", t: rp(2410000), g: ["Gold", "gold"] },
        { n: ["Rian Pratama", "Non-member"], hp: "0819-4455-6677", v: "5", t: rp(320000), g: ["Reguler", "neutral"] },
        { n: ["Maya Putri", "Member sejak 2022"], hp: "0812-8888-1010", v: "156", t: rp(12800000), g: ["Platinum", "info"] },
      ],
    );

  if (/pemasok|mitra/.test(l))
    return mk(
      [["Total Pemasok", "38", null], ["Utang Berjalan", "Rp 18,2 jt", null], ["Jatuh Tempo", "4", "down"]],
      [
        { k: "n", label: "Pemasok", w: "2fr", kind: "sub" },
        { k: "c", label: "Kontak", w: "1.3fr", kind: "mono" },
        { k: "kat", label: "Kategori", w: "1.2fr" },
        { k: "s", label: "Saldo Utang", w: "1.3fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { n: ["CV Sumber Ayam", "Jakarta Barat"], c: "021-555-1200", kat: "Bahan Baku", s: rp(6400000), st: ["Aktif", "ok"] },
        { n: ["UD Laut Segar", "Muara Angke"], c: "0812-7000-1234", kat: "Seafood", s: rp(9200000), st: ["Jatuh Tempo", "danger"] },
        { n: ["Toko Kemasan Jaya", "Tangerang"], c: "021-888-9090", kat: "Kemasan", s: rp(1200000), st: ["Aktif", "ok"] },
        { n: ["PT Gas Nusantara", "Bekasi"], c: "021-444-3322", kat: "Operasional", s: rp(0), st: ["Lunas", "neutral"] },
        { n: ["Kebun Sayur Lestari", "Bogor"], c: "0857-1122-3344", kat: "Bahan Baku", s: rp(1400000), st: ["Aktif", "ok"] },
      ],
    );

  if (/pengeluaran|biaya|tagihan|pembayaran faktur/.test(l))
    return mk(
      [["Total Bulan Ini", "Rp 24,6 jt", "down"], ["Menunggu Bayar", "6", null], ["Terbesar", "Sewa Outlet", null]],
      [
        { k: "d", label: "Tanggal", w: "1.1fr", kind: "mono" },
        { k: "kat", label: "Kategori", w: "1.3fr" },
        { k: "ket", label: "Deskripsi", w: "2fr", kind: "sub" },
        { k: "n", label: "Nominal", w: "1.3fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { d: "18/07/26", kat: "Sewa", ket: ["Sewa outlet Juli", "Bulanan"], n: rp(12000000), st: ["Lunas", "ok"] },
        { d: "17/07/26", kat: "Utilitas", ket: ["Listrik & air", "PLN + PDAM"], n: rp(3400000), st: ["Lunas", "ok"] },
        { d: "16/07/26", kat: "Gaji", ket: ["Payroll paruh waktu", "3 karyawan"], n: rp(4800000), st: ["Menunggu", "warn"] },
        { d: "15/07/26", kat: "Operasional", ket: ["Servis kulkas", "Perbaikan"], n: rp(650000), st: ["Lunas", "ok"] },
        { d: "14/07/26", kat: "Marketing", ket: ["Iklan sosial media", "Kampanye"], n: rp(1200000), st: ["Menunggu", "warn"] },
      ],
    );

  if (/invoice|penawaran|pesanan penjualan|pengiriman penjualan/.test(l))
    return mk(
      [["Total Invoice", "214", null], ["Belum Dibayar", "Rp 32,1 jt", "down"], ["Jatuh Tempo", "9", "down"]],
      [
        { k: "no", label: "No.", w: "1.2fr", kind: "mono" },
        { k: "c", label: "Pelanggan", w: "1.6fr", kind: "strong" },
        { k: "d", label: "Tanggal", w: "1fr", kind: "mono" },
        { k: "due", label: "Jatuh Tempo", w: "1.1fr", kind: "mono" },
        { k: "n", label: "Nominal", w: "1.3fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { no: "INV-2041", c: "PT Boga Rasa", d: "18/07/26", due: "25/07/26", n: rp(4800000), st: ["Terbayar", "ok"] },
        { no: "INV-2040", c: "Kantin Sekolah A", d: "17/07/26", due: "24/07/26", n: rp(2200000), st: ["Menunggu", "warn"] },
        { no: "INV-2039", c: "Event Organizer Nusa", d: "15/07/26", due: "14/07/26", n: rp(9600000), st: ["Terlambat", "danger"] },
        { no: "INV-2038", c: "Cafe Mitra", d: "14/07/26", due: "21/07/26", n: rp(1800000), st: ["Terbayar", "ok"] },
        { no: "INV-2037", c: "Katering Bahagia", d: "12/07/26", due: "19/07/26", n: rp(3200000), st: ["Menunggu", "warn"] },
      ],
    );

  if (/stok opname|opname/.test(l))
    return mk(
      [["Total Opname", "24 Kali", null], ["Selisih Qty", "-14 Item", "down"], ["Total Selisih Rp", "-Rp 420.000", "down"]],
      [
        { k: "no", label: "No. Opname", w: "1.4fr", kind: "mono" },
        { k: "d", label: "Tanggal & Jam", w: "1.5fr", kind: "mono" },
        { k: "o", label: "Outlet", w: "1.6fr" },
        { k: "p", label: "Auditor", w: "1.5fr", kind: "strong" },
        { k: "item", label: "Total Item", w: "1fr", align: "center", kind: "mono" },
        { k: "qty", label: "Selisih Qty", w: "1.4fr", align: "center", kind: "mono" },
        { k: "val", label: "Total Selisih", w: "1.3fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { no: "OP-2026-004", d: "24 Jul 2026 18:00", o: "Outlet Utama - Jakarta", p: "Budi (Inventory Lead)", item: "45 Item", qty: "-4 Qty", val: "-Rp 180.000", st: ["Selesai", "ok"] },
        { no: "OP-2026-003", d: "17 Jul 2026 17:30", o: "Cabang Bandung", p: "Agus (Auditor)", item: "38 Item", qty: "0 Qty", val: "Rp 0", st: ["Selesai", "ok"] },
        { no: "OP-2026-002", d: "10 Jul 2026 18:15", o: "Outlet Utama - Jakarta", p: "Siti (Admin Stok)", item: "52 Item", qty: "-6 Qty", val: "-Rp 240.000", st: ["Selesai", "ok"] },
        { no: "OP-2026-001", d: "03 Jul 2026 17:00", o: "Cabang Bandung", p: "Agus (Auditor)", item: "30 Item", qty: "+2 Qty", val: "+Rp 90.000", st: ["Selesai", "ok"] },
      ],
    );

  if (/stok terbuang|terbuang|waste/.test(l))
    return mk(
      [["Kejadian Waste", "18 Kali", "down"], ["Volume Terbuang", "32.5 kg/pack", null], ["Total Kerugian", "Rp 1.450.000", "down"]],
      [
        { k: "no", label: "No. Waste", w: "1.3fr", kind: "mono" },
        { k: "d", label: "Tanggal & Jam", w: "1.5fr", kind: "mono" },
        { k: "item", label: "Barang / SKU", w: "2fr", kind: "sub" },
        { k: "o", label: "Outlet", w: "1.4fr" },
        { k: "qty", label: "Qty Waste", w: "1fr", align: "center", kind: "mono" },
        { k: "reason", label: "Alasan Terbuang", w: "1.8fr" },
        { k: "val", label: "Kerugian", w: "1.3fr", align: "right", kind: "mono" },
        { k: "p", label: "Pelapor", w: "1.4fr" },
        A,
      ],
      [
        { no: "WST-2026-012", d: "24 Jul 2026 14:15", item: ["Daging Ayam Giling", "SKU: BB-001"], o: "Outlet Utama - Jakarta", qty: "2.5 kg", reason: "Kedaluwarsa / Busuk", val: rp(112500), p: "Budi (Kitchen Lead)" },
        { no: "WST-2026-011", d: "23 Jul 2026 16:30", item: ["Kulit Dimsum Tipis", "SKU: BB-002"], o: "Outlet Utama - Jakarta", qty: "5 pack", reason: "Sobek Saat Olah", val: rp(60000), p: "Siti (Cook)" },
        { no: "WST-2026-010", d: "21 Jul 2026 11:20", item: ["Udang Kupas Fresh", "SKU: BB-003"], o: "Cabang Bandung", qty: "1.8 kg", reason: "Freezer Drop (Basi)", val: rp(171000), p: "Agus (Chef)" },
        { no: "WST-2026-009", d: "19 Jul 2026 20:00", item: ["Box Takeaway L", "SKU: KM-001"], o: "Outlet Utama - Jakarta", qty: "25 pcs", reason: "Ketumpahan Air", val: rp(55000), p: "Rian (Packer)" },
      ],
    );

  if (/acuan produksi/.test(l))
    return mk(
      [["Total Acuan", "14 Acuan", null], ["Bahan Terdaftar", "42 Jenis", null], ["Rata-rata HPP", "Rp 9.500", null]],
      [
        { k: "code", label: "Kode Acuan", w: "1.3fr", kind: "mono" },
        { k: "n", label: "Nama Acuan Produksi", w: "2.2fr", kind: "sub" },
        { k: "output", label: "Hasil Standar Batch", w: "1.6fr" },
        { k: "matCount", label: "Bahan", w: "0.9fr", align: "center", kind: "mono" },
        { k: "estHpp", label: "Estimasi HPP/Porsi", w: "1.4fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { code: "ACU-DIM-01", n: ["Acuan Standar Dimsum Ayam 100 Porsi", "Daging Ayam + Kulit Dimsum"], output: "100 Porsi (400 pcs)", matCount: "6 Bahan", estHpp: rp(9200), st: ["Aktif", "ok"] },
        { code: "ACU-HAK-02", n: ["Acuan Premium Hakau Udang 50 Porsi", "Udang Kupas + Tepung Tangmin"], output: "50 Porsi (200 pcs)", matCount: "5 Bahan", estHpp: rp(12400), st: ["Aktif", "ok"] },
        { code: "ACU-LMP-01", n: ["Acuan Lumpia Kulit Tahu 80 Porsi", "Daging Ayam + Kucai + Kulit Tahu"], output: "80 Porsi (240 pcs)", matCount: "7 Bahan", estHpp: rp(8800), st: ["Aktif", "ok"] },
        { code: "ACU-PAO-03", n: ["Acuan Pao Custard Telur Asin 60 Porsi", "Tepung Pao + Kuning Telur Asin"], output: "60 Porsi (180 pcs)", matCount: "8 Bahan", estHpp: rp(11000), st: ["Aktif", "ok"] },
      ],
    );

  if (/daftar produksi|produksi stok/.test(l))
    return mk(
      [["Total Batch", "36 Batch", "up"], ["Hasil Produksi", "1.420 Porsi", "up"], ["Biaya Bahan", "Rp 18,5 jt", null]],
      [
        { k: "no", label: "No. Batch Produksi", w: "1.5fr", kind: "mono" },
        { k: "d", label: "Tanggal Produksi", w: "1.3fr", kind: "mono" },
        { k: "item", label: "Produk Hasil", w: "2fr", kind: "sub" },
        { k: "o", label: "Outlet Produksi", w: "1.5fr" },
        { k: "target", label: "Target Qty", w: "1fr", align: "center", kind: "mono" },
        { k: "real", label: "Hasil Real", w: "1fr", align: "center", kind: "mono" },
        { k: "hpp", label: "HPP / Porsi", w: "1.2fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { no: "PRD-2026-044", d: "24 Jul 2026", item: ["Dimsum Ayam Original", "Acuan: ACU-DIM-01"], o: "Dapur Pusat - Jakarta", target: "300 porsi", real: "300 porsi", hpp: rp(9200), st: ["Selesai", "ok"] },
        { no: "PRD-2026-043", d: "23 Jul 2026", item: ["Hakau Udang Super", "Acuan: ACU-HAK-02"], o: "Dapur Pusat - Jakarta", target: "200 porsi", real: "195 porsi", hpp: rp(12400), st: ["Selesai", "ok"] },
        { no: "PRD-2026-042", d: "22 Jul 2026", item: ["Lumpia Kulit Tahu", "Acuan: ACU-LMP-01"], o: "Dapur Cabang Bandung", target: "150 porsi", real: "150 porsi", hpp: rp(8800), st: ["Selesai", "ok"] },
        { no: "PRD-2026-041", d: "21 Jul 2026", item: ["Pao Telur Asin Melt", "Acuan: ACU-PAO-03"], o: "Dapur Pusat - Jakarta", target: "100 porsi", real: "98 porsi", hpp: rp(11000), st: ["Selesai", "ok"] },
      ],
    );

  if (/daftar stok|stok|persediaan|bahan|mutasi|transit|retur|pembelian|pemesanan|permintaan|faktur pembelian/.test(l))
    return mk(
      [["Total SKU Stok", "156 SKU", null], ["Nilai Persediaan", "Rp 48,7 jt", null], ["Perlu Restock", "12 SKU", "down"]],
      [
        { k: "n", label: "Bahan / Produk", w: "2fr", kind: "sub" },
        { k: "sku", label: "SKU", w: "1fr", kind: "mono" },
        { k: "s", label: "Stok", w: "1fr", align: "right", kind: "mono" },
        { k: "m", label: "Min.", w: "0.8fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1.1fr", kind: "badge" },
        { k: "v", label: "Nilai", w: "1.2fr", align: "right", kind: "mono" },
        A,
      ],
      [
        { n: ["Kulit Dimsum", "Bahan Baku"], sku: "BB-001", s: "48 pack", m: "30", st: ["Tersedia", "ok"], v: rp(576000) },
        { n: ["Daging Ayam Giling", "Bahan Baku"], sku: "BB-002", s: "14 kg", m: "20", st: ["Menipis", "warn"], v: rp(630000) },
        { n: ["Udang Kupas", "Bahan Baku"], sku: "BB-003", s: "6 kg", m: "10", st: ["Menipis", "warn"], v: rp(570000) },
        { n: ["Jamur Kuping Kering", "Bahan Baku"], sku: "BB-005", s: "0 kg", m: "8", st: ["Habis", "out"], v: rp(0) },
        { n: ["Kemasan Takeaway L", "Kemasan"], sku: "KM-002", s: "140 pcs", m: "200", st: ["Menipis", "warn"], v: rp(308000) },
        { n: ["Gas LPG 12kg", "Operasional"], sku: "OP-001", s: "3 tabung", m: "2", st: ["Tersedia", "ok"], v: rp(630000) },
      ],
    );

  if (/produk|menu|kategori|departemen|paket|resep|ekstra|layanan|barcode|harga berdasarkan/.test(l))
    return mk(
      [["Total Produk", "86", null], ["Kategori", "7", null], ["Nonaktif", "4", null]],
      [
        { k: "n", label: "Produk", w: "2fr", kind: "sub" },
        { k: "kat", label: "Kategori", w: "1.2fr" },
        { k: "sku", label: "SKU", w: "1fr", kind: "mono" },
        { k: "h", label: "Harga", w: "1.1fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1.1fr", kind: "badge" },
        A,
      ],
      [
        { n: ["Dimsum Ayam", "Original"], kat: "Dimsum", sku: "MN-001", h: rp(18000), st: ["Tersedia", "ok"] },
        { n: ["Hakau Udang", "Kukus"], kat: "Kukus", sku: "MN-005", h: rp(24000), st: ["Menipis", "warn"] },
        { n: ["Paket Hemat A", "4 item"], kat: "Paket", sku: "PK-001", h: rp(45000), st: ["Tersedia", "ok"] },
        { n: ["Es Teh Melati", "Minuman"], kat: "Minuman", sku: "MN-014", h: rp(7000), st: ["Tersedia", "ok"] },
        { n: ["Lumpia Kulit Tahu", "Goreng"], kat: "Goreng", sku: "MN-010", h: rp(20000), st: ["Habis", "out"] },
        { n: ["Xiao Long Bao", "Kukus"], kat: "Kukus", sku: "MN-006", h: rp(28000), st: ["Tersedia", "ok"] },
      ],
    );

  if (/karyawan|akses|absensi|komisi|shift|jadwal|kasbon|payroll|gaji|hak akses|dashboard karyawan/.test(l))
    return mk(
      [["Total Karyawan", "24", null], ["Hadir Hari Ini", "18", null], ["Cuti / Izin", "2", null]],
      [
        { k: "n", label: "Karyawan", w: "2fr", kind: "sub" },
        { k: "r", label: "Jabatan", w: "1.2fr", kind: "badge" },
        { k: "o", label: "Outlet", w: "1.2fr" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { n: ["Sinta Dewi", "ID-1024"], r: ["Kasir", "gold"], o: "Kemang", st: ["Hadir", "ok"] },
        { n: ["Rian Pratama", "ID-1019"], r: ["Dapur", "warn"], o: "Kemang", st: ["Hadir", "ok"] },
        { n: ["Dewi Lestari", "ID-1031"], r: ["Inventory", "neutral"], o: "Kemang", st: ["Cuti", "info"] },
        { n: ["Agus Salim", "ID-1008"], r: ["Manager", "danger"], o: "Kemang", st: ["Hadir", "ok"] },
        { n: ["Nina Kartika", "ID-1042"], r: ["Kasir", "gold"], o: "Senayan", st: ["Izin", "warn"] },
      ],
    );

  if (/kupon|promo|poin|reward|campaign|loyalty program|penukaran|advance|basic/.test(l))
    return mk(
      [["Promo Aktif", "8", null], ["Kupon Terpakai", "1.204", "up"], ["Nilai Diskon", "Rp 6,4 jt", null]],
      [
        { k: "n", label: "Nama", w: "2fr", kind: "strong" },
        { k: "t", label: "Tipe", w: "1.2fr", kind: "badge" },
        { k: "v", label: "Nilai", w: "1fr", align: "right", kind: "mono" },
        { k: "per", label: "Periode", w: "1.4fr", kind: "mono" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { n: "Diskon Akhir Pekan", t: ["Persentase", "info"], v: "15%", per: "01–31 Jul", st: ["Aktif", "ok"] },
        { n: "Beli 2 Gratis 1 Dimsum", t: ["Bundling", "gold"], v: "B2G1", per: "10–20 Jul", st: ["Aktif", "ok"] },
        { n: "Poin Member x2", t: ["Poin", "warn"], v: "2x", per: "01–15 Jul", st: ["Berakhir", "neutral"] },
        { n: "Kupon Pelanggan Baru", t: ["Nominal", "info"], v: rp(10000), per: "Sepanjang", st: ["Aktif", "ok"] },
        { n: "Flash Sale Siang", t: ["Persentase", "info"], v: "25%", per: "13:00–15:00", st: ["Terjadwal", "warn"] },
      ],
    );

  if (/terminal|perangkat|soundbox|device/.test(l))
    return mk(
      [["Perangkat", "12", null], ["Online", "10", null], ["Bermasalah", "1", "down"]],
      [
        { k: "n", label: "Perangkat", w: "2fr", kind: "sub" },
        { k: "t", label: "Tipe", w: "1.2fr" },
        { k: "o", label: "Outlet", w: "1.2fr" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { n: ["Terminal 01", "Kasir depan"], t: "POS Tablet", o: "Kemang", st: ["Online", "ok"] },
        { n: ["Terminal 02", "Kasir samping"], t: "POS Tablet", o: "Kemang", st: ["Online", "ok"] },
        { n: ["Printer Dapur", "Thermal 80mm"], t: "Printer", o: "Kemang", st: ["Online", "ok"] },
        { n: ["Soundbox QRIS", "Kasir depan"], t: "Soundbox", o: "Kemang", st: ["Offline", "danger"] },
        { n: ["KDS Dapur", "Layar dapur"], t: "Display", o: "Kemang", st: ["Online", "ok"] },
      ],
    );

  if (/outlet|denah|meja/.test(l))
    return mk(
      [["Total Outlet", "3", null], ["Aktif", "3", null], ["Meja", "42", null]],
      [
        { k: "n", label: "Outlet", w: "2fr", kind: "sub" },
        { k: "k", label: "Kode", w: "1fr", kind: "mono" },
        { k: "a", label: "Alamat", w: "2fr" },
        { k: "st", label: "Status", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { n: ["Outlet Kemang", "Flagship"], k: "WD-KMG", a: "Jl. Kemang Raya No. 12", st: ["Aktif", "ok"] },
        { n: ["Outlet Senayan", "Mall"], k: "WD-SNY", a: "Senayan City Lt. 3", st: ["Aktif", "ok"] },
        { n: ["Outlet BSD", "Ruko"], k: "WD-BSD", a: "BSD Green Office Park", st: ["Aktif", "ok"] },
      ],
    );

  if (/pesanan|order/.test(l))
    return mk(
      [["Pesanan Hari Ini", "184", "up"], ["Diproses", "12", null], ["Selesai", "168", null]],
      [
        { k: "no", label: "No.", w: "1.2fr", kind: "mono" },
        { k: "tp", label: "Tipe", w: "1.2fr", kind: "badge" },
        { k: "i", label: "Item", w: "0.8fr", align: "right", kind: "mono" },
        { k: "n", label: "Total", w: "1.2fr", align: "right", kind: "mono" },
        { k: "st", label: "Status", w: "1.1fr", kind: "badge" },
        { k: "w", label: "Waktu", w: "1fr", align: "right", kind: "mono" },
        A,
      ],
      [
        { no: "TRX-0429", tp: ["Dine-in", "gold"], i: "3", n: rp(94600), st: ["Selesai", "ok"], w: "2 mnt" },
        { no: "TRX-0428", tp: ["Takeaway", "warn"], i: "5", n: rp(128000), st: ["Diproses", "info"], w: "11 mnt" },
        { no: "TRX-0427", tp: ["GoFood", "ok"], i: "2", n: rp(46000), st: ["Selesai", "ok"], w: "18 mnt" },
        { no: "TRX-0426", tp: ["Dine-in", "gold"], i: "8", n: rp(212400), st: ["Diproses", "info"], w: "25 mnt" },
        { no: "TRX-0425", tp: ["Dine-in", "gold"], i: "4", n: rp(71000), st: ["Selesai", "ok"], w: "32 mnt" },
      ],
    );

  if (/buku kas|transfer|kas & bank/.test(l))
    return mk(
      [["Saldo Kas", "Rp 8,4 jt", null], ["Masuk Hari Ini", "Rp 4,8 jt", "up"], ["Keluar Hari Ini", "Rp 1,2 jt", "down"]],
      [
        { k: "d", label: "Tanggal", w: "1.1fr", kind: "mono" },
        { k: "ket", label: "Keterangan", w: "2fr", kind: "sub" },
        { k: "akun", label: "Akun", w: "1.2fr" },
        { k: "n", label: "Nominal", w: "1.2fr", align: "right", kind: "mono" },
        { k: "st", label: "Arah", w: "1fr", kind: "badge" },
        A,
      ],
      [
        { d: "18/07/26", ket: ["Setoran kas shift pagi", "Kasir Sinta"], akun: "Kas Utama", n: rp(4800000), st: ["Masuk", "ok"] },
        { d: "18/07/26", ket: ["Pembelian bahan", "CV Sumber Ayam"], akun: "Kas Utama", n: rp(1200000), st: ["Keluar", "danger"] },
        { d: "17/07/26", ket: ["Transfer ke Bank BCA", "Setoran harian"], akun: "Bank BCA", n: rp(6000000), st: ["Transfer", "info"] },
        { d: "17/07/26", ket: ["Kembalian tambahan", "Modal receh"], akun: "Kas Utama", n: rp(500000), st: ["Masuk", "ok"] },
      ],
    );

  return mk(
    [["Total Data", "128", null], ["Aktif", "112", null], ["Nonaktif", "16", null]],
    [
      { k: "n", label: "Nama", w: "2fr", kind: "sub" },
      { k: "ket", label: "Keterangan", w: "2fr" },
      { k: "d", label: "Diperbarui", w: "1.2fr", kind: "mono" },
      { k: "st", label: "Status", w: "1fr", kind: "badge" },
      A,
    ],
    [
      { n: [label + " 01", "Contoh entri"], ket: "Data " + l, d: "18/07/26", st: ["Aktif", "ok"] },
      { n: [label + " 02", "Contoh entri"], ket: "Data " + l, d: "17/07/26", st: ["Aktif", "ok"] },
      { n: [label + " 03", "Contoh entri"], ket: "Data " + l, d: "15/07/26", st: ["Nonaktif", "neutral"] },
      { n: [label + " 04", "Contoh entri"], ket: "Data " + l, d: "12/07/26", st: ["Aktif", "ok"] },
    ],
  );
}
