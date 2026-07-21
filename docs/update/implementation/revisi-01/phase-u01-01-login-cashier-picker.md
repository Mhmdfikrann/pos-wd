# U01-01 — Login: Lihat Password & Pilihan Nama Kasir

**Status:** complete (2026-07-21).  
**Update refs:** revisi-01 poin 1–2.  
**Depends on:** U01-00.  
**Blocks:** U01-05.

## Tujuan

Memenuhi permintaan owner pada halaman login tanpa melemahkan better-auth, RBAC, outlet scope, dan audit kasir.

## Kondisi saat ini

- `src/app/login/LoginForm.tsx` memakai username/email + password melalui `authClient.signIn`.
- Password input selalu `type="password"`.
- Kasir yang tampil di `/kasir` berasal dari server session (`session.name`) dan shift user aktif.

## Scope

1. Tambahkan tombol ikon “lihat/sembunyikan password”.
   - Toggle `type=password/text`.
   - Gunakan label aksesibilitas jelas: “Tampilkan password” / “Sembunyikan password”.

2. Implementasi pilihan nama kasir sesuai keputusan U01-00.
   - **Rekomendasi aman MVP:** setelah login, halaman kasir menampilkan chip/selector kasir aktif dari session untuk konfirmasi, bukan teks bebas.
   - Jika owner memang butuh shared device: buat flow pemilihan user kasir yang hanya mengambil `users` role Kasir dari DB, dan tetap server-validated saat buka shift/checkout.

## Non-scope

- Jangan membuat parallel user table.
- Jangan menyimpan nama kasir bebas pada order tanpa FK ke `users.id`.
- Jangan mengganti better-auth handler.

## Data/API impact

- UI lihat password: tidak perlu migration.
- Pilihan kasir shared-device mungkin perlu server action untuk daftar kasir/outlet, tetapi checkout tetap harus memakai actor yang valid dan auditable.

## Acceptance criteria

- [x] User bisa melihat dan menyembunyikan password sebelum submit.
- [x] Toggle password tidak menghapus isi input dan tidak mengubah login error handling.
- [x] Nama kasir yang digunakan transaksi tidak bisa dipalsukan dari client.
- [x] Jika ada daftar kasir, hanya user aktif dengan role kasir/permission relevan yang muncul. (MVP A: tidak ada daftar; hanya chip kasir session.)
- [x] Audit `order.paid` tetap memakai actor canonical yang benar.

## Test/verification

- Unit/component check untuk toggle state bila ada test infra UI.
- Manual: login gagal/berhasil tetap sama; password reveal bekerja.
- Manual: buka `/kasir`, nama kasir sesuai pilihan/session dan shift gate tetap benar.


## Implementation notes

- Login password reveal ditambahkan di `src/app/login/LoginForm.tsx` dengan tombol ikon ber-label aksesibilitas “Tampilkan password” / “Sembunyikan password”. State password tetap sama; hanya `type` input yang berubah.
- Keputusan U01-00 opsi A diterapkan: `/kasir` dan layar buka shift menampilkan chip kasir aktif dari `session.name`; tidak ada input teks bebas atau daftar kasir client-side.
- Checkout/audit tidak diubah: `actionCheckout` masih menyelesaikan cashier dan shift dari server session (`session.userId`) lalu menulis audit `order.paid` dengan actor canonical.

**Status: complete (2026-07-21).**
