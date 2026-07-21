# LCA-02 — Landing Responsive & Mobile Parity

**Status:** complete (2026-07-21).  
**Depends on:** LCA-01.  
**Blocks:** LCA-07.

## Tujuan

Memastikan landing page faithful ke `Wanna Dimsum Landing Mobile.dc.html` pada mobile, bukan sekadar desktop mengecil.

## Scope

1. Mobile layout
   - Sticky top bar compact.
   - Hero mobile composition.
   - Horizontal scroll sections for menu/gallery/testimoni where mockup uses `wd-hscroll`.
   - Sticky bottom CTA bar.
   - Mobile nav/drawer or anchor menu sesuai mockup.

2. Responsiveness
   - Breakpoints untuk desktop/tablet/mobile.
   - Teks minimum terbaca ≥14px mobile untuk body/action penting.
   - No horizontal overflow selain carousel intentional.

3. Performance/UX
   - Placeholder image slots tidak membuat layout shift besar.
   - Anchor scroll margin benar.
   - CTA tetap jelas di atas fold dan sticky bar.

## Non-scope

- Native app behavior.
- Real image upload management.

## Acceptance criteria

- [x] Mobile width 390px mirip mockup mobile.
- [x] Sticky CTA bawah muncul mobile dan tidak menghalangi konten penting.
- [x] Menu/testimoni/gallery horizontal scroll smooth.
- [x] Desktop dari LCA-01 tidak regress.
- [x] Lighthouse/basic accessibility tidak punya issue besar: labels, contrast, tap target.

## Verification

- Manual `/` at 390x844, 430x932, 768px, 1200px.
- `npm run build`.

## Implementation notes

- Navbar mobile sekarang compact dengan burger menu; drawer berisi anchor Menu, Promo, Tentang, Outlet, Member, CTA Pesan Sekarang, dan Masuk Staff.
- Breakpoint mobile (`max-width: 640px`) menyesuaikan hero menjadi komposisi mobile: headline 40px, hero image 260px, stats compact, badge/halal card disederhanakan.
- Menu, galeri, dan testimoni berubah menjadi horizontal scroll carousel dengan `scroll-snap-type`, scrollbar disembunyikan, dan kartu fixed-width seperti mockup mobile.
- Sticky bottom CTA bar hanya muncul mobile; footer diberi padding bawah agar CTA tidak menutup konten akhir.
- Desktop LCA-01 tetap memakai layout grid existing karena perubahan mobile dibatasi media query.

## Verification result

- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run build` ✅

**Status: complete (2026-07-21).**
