# Product Requirements Document (PRD)
# Wanna Dimsum — Landing Page & Customer App

**Status Dokumen:** Draft
**Versi:** 1.0
**Jenis Produk:** Customer-facing (Landing Page + Loyalty Web App)
**Platform Utama:** Responsive Web (Landing) + Mobile Web App (PWA-ready)
**Tech Stack:** Next.js, Tailwind CSS, shadcn/ui, Drizzle ORM, SQLite

> Dokumen ini **terpisah** dari PRD *Wanna Dimsum POS* (sistem internal). PRD ini khusus membahas dua produk yang menghadap pelanggan: **Landing Page** dan **Customer App (Loyalty)**. Referensi mockup ada di Lampiran A.

---

## 1. Ringkasan Produk

Wanna Dimsum membangun dua produk yang menghadap pelanggan:

1. **Landing Page** — halaman publik untuk memperkenalkan brand, menu unggulan, promo, dan lokasi outlet. Tujuan utamanya adalah **konversi**: mengajak pengunjung mendaftar ke Customer App.
2. **Customer App (Wanna Rewards)** — aplikasi loyalti berbasis web untuk pelanggan terdaftar. Setiap pembelian menghasilkan poin yang dapat ditukar menjadi voucher atau paket dimsum, sekaligus menjadi kanal informasi promo.

Kedua produk terhubung: CTA utama di Landing Page mengarah ke pendaftaran Customer App.

---

## 2. Product Vision

Menjadikan Wanna Dimsum bukan sekadar tempat beli dimsum, tetapi sebuah **hubungan berkelanjutan** dengan pelanggan. Melalui Landing Page yang meyakinkan dan program loyalti yang sederhana, brand dapat:

- Mengenali siapa pelanggannya (bukan transaksi anonim).
- Mengetahui siapa yang **repeat order** dan memberi penghargaan.
- Mendorong kunjungan ulang lewat poin, voucher, dan promo bertarget.
- Membangun basis data pelanggan (nama, no. telepon, email) untuk komunikasi langsung.

---

## 3. Latar Belakang dan Permasalahan

Saat ini transaksi Wanna Dimsum bersifat anonim: owner tidak tahu siapa yang datang, seberapa sering, dan siapa pelanggan paling loyal. Akibatnya:

- Tidak ada cara memberi penghargaan kepada pelanggan setia.
- Promo disebar secara umum tanpa penargetan.
- Tidak ada kanal komunikasi langsung ke pelanggan.
- Sulit mengukur retensi dan frekuensi kunjungan.
- Tidak ada mekanisme untuk mendorong repeat order secara terstruktur.

Landing Page + Customer App menyelesaikan ini dengan mengubah transaksi anonim menjadi **keanggotaan yang teridentifikasi dan terukur**.

---

## 4. Tujuan Produk

### 4.1 Tujuan Utama

1. Mengonversi pengunjung Landing Page menjadi member terdaftar.
2. Mengumpulkan data pelanggan (nama, no. telepon, email) dengan persetujuan.
3. Mendorong repeat order lewat sistem poin dan reward.
4. Menyediakan kanal promo yang dapat dilihat pelanggan kapan saja.
5. Memberi owner visibilitas atas basis pelanggan dan perilaku belanja.

### 4.2 Tujuan Sekunder

- Meningkatkan average order value lewat penawaran paket & voucher.
- Memperkuat brand recall melalui kehadiran digital yang konsisten.
- Menyiapkan fondasi untuk kampanye pemasaran bertarget di masa depan.

### 4.3 Non-Goal (Di Luar Cakupan Versi Ini)

- Pemesanan/checkout online dan pembayaran dalam app (poin diperoleh & ditukar di outlet/kasir).
- Pengiriman/integrasi kurir pihak ketiga.
- Program referral berjenjang.
- Aplikasi native iOS/Android (versi ini web/PWA).

---

## 5. Persona Pengguna

| Persona | Deskripsi | Kebutuhan Utama |
|---|---|---|
| **Pengunjung baru** | Menemukan brand via sosial media / pencarian | Cepat paham apa itu Wanna Dimsum, tergerak mendaftar |
| **Member baru** | Sudah mendaftar, belum banyak transaksi | Paham cara dapat & pakai poin |
| **Member loyal** | Repeat order, poin banyak | Tukar reward, lihat promo, rasa dihargai |
| **Owner / Marketing** | Pemilik data pelanggan | Lihat daftar member, identifikasi repeat order, sebar promo |

---

## 6. Produk 1 — Landing Page

### 6.1 Tujuan
Menyakinkan pengunjung dan mengarahkan ke pendaftaran Customer App.

### 6.2 Struktur Halaman (Section)

1. **Hero** — headline, value proposition, CTA utama "Daftar & Kumpulkan Poin", gambar hero.
2. **Menu Unggulan** — showcase produk (Hakau, Xiao Long Bao, dsb.) dengan gambar.
3. **Program Loyalti** — penjelasan cara kerja poin (1 : 1.000), tukar reward, promo member.
4. **Promo Berjalan** — highlight promo aktif.
5. **Outlet / Lokasi** — daftar cabang.
6. **Testimoni / Social Proof** — kutipan pelanggan (opsional).
7. **CTA Penutup** — ajakan daftar sekali lagi.
8. **Footer** — kontak, sosial media, link legal.

### 6.3 Persyaratan
- **Responsif**: tersedia versi desktop (full-scroll) dan mobile (390px, hamburger drawer, carousel swipeable, sticky CTA bar bawah).
- Semua gambar sebagai **placeholder drag-drop** yang diisi tim brand.
- CTA utama di setiap bagian mengarah ke alur pendaftaran Customer App.
- Waktu muat cepat; teks minimum terbaca (≥14px mobile).

### 6.4 Metrik Sukses
- Conversion rate pengunjung → daftar.
- Bounce rate hero.
- Klik CTA per section.

---

## 7. Produk 2 — Customer App (Wanna Rewards)

### 7.1 Autentikasi & Pendaftaran

**Daftar (Register)**
- Field wajib: **Nama lengkap, No. telepon, Email**.
- Persetujuan Syarat & Ketentuan + Kebijakan Privasi (checkbox).
- Verifikasi via **OTP 4 digit** (SMS) ke nomor telepon.
- Bonus poin sambutan untuk member baru.

**Masuk (Login)**
- Input no. telepon terdaftar (+62).
- Verifikasi via **OTP 4 digit**.
- Timer kirim ulang OTP (30 detik) + opsi ganti nomor.

**Aturan:**
- No. telepon adalah identitas unik member (satu nomor = satu akun).
- Email digunakan untuk komunikasi & pemulihan akun.
- Tidak ada password di versi ini (OTP-based).

### 7.2 Beranda
- **Kartu Member**: saldo poin, tier (Silver/Gold), progress ke tier berikutnya.
- Aksi cepat: Tukar Poin, Promo, Riwayat, Outlet.
- Statistik ringkas: jumlah kunjungan, total belanja.
- Strip promo (carousel) & preview reward yang bisa langsung ditukar.

### 7.3 Sistem Poin
- **Perolehan**: poin diberikan atas setiap transaksi di outlet/kasir (rasio contoh **1 poin per Rp 1.000**).
- Weekend / event tertentu dapat berlaku **poin ganda**.
- **Penukaran**: poin ditukar menjadi voucher atau paket dimsum via katalog Rewards.
- Setiap perolehan & penukaran tercatat di **Riwayat**.

### 7.4 Rewards (Tukar Poin)
- Katalog reward dengan kategori: **Voucher, Paket, Gratis, Ongkir**.
- Filter kategori.
- Item yang poinnya belum cukup ditampilkan terkunci (tidak bisa ditukar).
- Konfirmasi penukaran via bottom sheet: rincian poin dipakai & sisa poin.
- Hasil penukaran menjadi **voucher** (berlaku 30 hari) di "Voucher saya".

### 7.5 Promo
- Daftar promo aktif dengan ikon, judul, deskripsi, dan masa berlaku.
- Promo bersifat informatif; diklaim saat transaksi di outlet.

### 7.6 Riwayat
- Daftar aktivitas poin: perolehan (+) dan penukaran (−).
- Ringkasan total poin didapat vs ditukar.
- Setiap baris: nama transaksi, outlet, tanggal, jumlah poin.

### 7.7 Akun
- Profil member (nama, no. telepon, email).
- Kartu member.
- Pengaturan: notifikasi, voucher saya, bantuan.
- Keluar (logout).

### 7.8 Tier Keanggotaan (Contoh)
| Tier | Syarat (contoh) | Manfaat |
|---|---|---|
| Silver | Default saat daftar | Poin standar |
| Gold | Akumulasi poin ≥ ambang tertentu | Benefit tambahan / promo eksklusif |

> Ambang & manfaat tier bersifat contoh; ditetapkan tim marketing.

---

## 8. Keterhubungan dengan Sistem POS Internal

- Poin **diperoleh dari transaksi** yang dicatat sistem POS (Kasir). Nomor telepon member menjadi kunci penautan transaksi ke akun.
- Voucher hasil penukaran **diklaim di kasir** saat transaksi berikutnya.
- Owner Dashboard (POS) berpotensi menampilkan daftar member & data repeat order (lihat PRD POS).

> Integrasi teknis (API poin, sinkronisasi transaksi) di luar cakupan mockup ini dan akan didetailkan pada fase implementasi.

---

## 9. Privasi & Kepatuhan

- Pengumpulan data (nama, telepon, email) memerlukan **persetujuan eksplisit** saat daftar.
- Data pelanggan hanya digunakan untuk program loyalti & komunikasi Wanna Dimsum.
- Sediakan mekanisme berhenti berlangganan notifikasi.
- Patuhi ketentuan perlindungan data pribadi yang berlaku.

---

## 10. Metrik Keberhasilan (Produk Customer)

- Jumlah member terdaftar.
- Persentase member aktif (transaksi dalam 30 hari).
- **Repeat rate**: % member dengan ≥2 transaksi.
- Poin ditukar / poin diterbitkan (redemption rate).
- Frekuensi kunjungan rata-rata per member.

---

## 11. Asumsi & Batasan Mockup

- Seluruh data (poin, member, promo, riwayat) adalah **data contoh**, bukan data produksi.
- OTP bersifat demo (isi angka apa saja untuk lanjut).
- Gambar landing page adalah placeholder drag-drop.
- Rasio poin, tier, dan reward adalah contoh dan dapat diubah tim marketing.

---

## Lampiran A — Referensi Mockup

| Mockup | File | Cakupan |
|---|---|---|
| Landing Page (Desktop) | `Wanna Dimsum Landing.dc.html` | Full-scroll, 17 slot gambar |
| Landing Page (Mobile) | `Wanna Dimsum Landing Mobile.dc.html` | 390px, hamburger, carousel, sticky CTA |
| Customer App | `Wanna Dimsum Customer App.dc.html` | Daftar, Login/OTP, Beranda, Rewards, Promo, Riwayat, Akun |

### A.1 Alur Utama Customer App
1. **Landing → Daftar**: CTA landing membuka form pendaftaran (nama, telepon, email).
2. **Daftar → OTP → Beranda**: verifikasi OTP, bonus poin sambutan.
3. **Login → OTP → Beranda**: member lama masuk via nomor telepon.
4. **Beranda → Rewards → Konfirmasi**: pilih reward, tukar poin, dapat voucher.
5. **Beranda → Promo**: lihat promo aktif.
6. **Beranda → Riwayat**: lihat perolehan & penukaran poin.

---

**Riwayat Versi**
- **v1.0** — Dokumen awal, memisahkan produk customer-facing (Landing + Customer App) dari PRD POS internal.
