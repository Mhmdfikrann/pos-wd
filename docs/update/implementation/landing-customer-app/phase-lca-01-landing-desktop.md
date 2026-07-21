# LCA-01 — Public Landing Desktop Visual Port

**Status:** complete (2026-07-21).  
**Depends on:** LCA-00.  
**Blocks:** LCA-02, LCA-07.

## Tujuan

Membuat landing page publik desktop yang mirip dengan `Wanna Dimsum Landing.dc.html` dan siap menjadi entry customer-facing.

## Scope

1. Route & shell
   - Implement route `/` sebagai public landing.
   - Pastikan akses internal staff tetap jelas via CTA/link `/login`.
   - Jika ada logic root auth redirect lama, pindahkan/ubah tanpa merusak `/login`, `/owner`, `/manager`, `/kasir`, `/kitchen`, `/inventory`.

2. Visual sections desktop
   - Sticky nav: logo, menu anchors, CTA.
   - Hero: headline, badge, CTA, stats, hero image composition.
   - Marquee strip.
   - Menu Unggulan cards.
   - Promo/Paket section.
   - Tentang / brand story.
   - Gallery grid.
   - Testimoni.
   - Outlet/Lokasi.
   - Member/Loyalty CTA.
   - FAQ, CTA strip, footer.

3. Data/content
   - Gunakan arrays static di component/data file.
   - Copywriting mengikuti HTML/PRD dulu.
   - Image placeholders memakai komponen `ImageSlot`/placeholder visual.

## Non-scope

- Customer registration backend.
- CMS/admin editable content.
- Analytics production integration.

## Acceptance criteria

- [x] `/` render landing publik desktop.
- [x] Semua section utama dari mockup desktop ada.
- [x] CTA customer mengarah ke `/member/register` atau anchor yang disepakati LCA-00.
- [x] Link staff/internal ke `/login` tersedia.
- [x] Pixel feel mengikuti HTML: canvas, red/yellow brand, rounded cards, shadows, nav spacing.
- [x] Internal POS protected routes tetap bisa dibuka via URL setelah login.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Manual render `/` desktop widths 1200/1440.

## Implementation notes

- `/` sekarang me-render landing publik lewat `src/app/page.tsx` dan `src/app/landing/LandingPage.tsx`; root auth redirect lama tidak dipakai lagi.
- Link internal staff tersedia di navbar sebagai **Masuk Staff** menuju `/login`.
- CTA member di section Wanna Rewards mengarah ke `/member/register`; cek poin mengarah ke `/member/login`.
- Protected POS routes tetap tidak diubah dan masih dijaga `src/proxy.ts`.
- Placeholder gambar memakai komponen repo-native `ImageSlot` yang meniru `image-slot` dari HTML source.

## Verification result

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

**Status: complete (2026-07-21).**
