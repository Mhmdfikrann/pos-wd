# LCA-00 — Analysis & Decisions: Landing + Customer App

**Status:** complete (2026-07-21).  
**Source:** `docs/landing-page-dan-customer-app/PRD-Customer.md` and 3 HTML mockups.  
**Depends on:** —  
**Blocks:** LCA-01 through LCA-07.

## Tujuan

Mengunci interpretasi produk customer-facing sebelum coding supaya implementasi tidak merusak POS internal dan tetap faithful ke mockup HTML.

## Dokumen yang sudah dibaca

- `AGENTS.md` project root.
- Next.js App Router docs: `node_modules/next/dist/docs/01-app/index.md`.
- `docs/landing-page-dan-customer-app/PRD-Customer.md`.
- `docs/landing-page-dan-customer-app/Wanna Dimsum Landing.dc.html`.
- `docs/landing-page-dan-customer-app/Wanna Dimsum Landing Mobile.dc.html`.
- `docs/landing-page-dan-customer-app/Wanna Dimsum Customer App.dc.html`.
- Current routing guard: `src/app/page.tsx` and `src/proxy.ts`.

## Analisis awal

### Produk baru

1. **Landing Page** publik untuk brand, menu, promo, outlet, testimoni, loyalty CTA.
2. **Customer App / Wanna Rewards** untuk member loyalty berbasis email + password: daftar, login, home, points, rewards/promo/history/account.

### Mockup visual

- **Desktop landing:** full responsive content width ±1200px, sticky nav, hero split, menu cards, promo strip, about, gallery, testimonials, outlet map, loyalty/member, FAQ, CTA, footer.
- **Mobile landing:** 390px visual with sticky top bar, mobile menu affordance, horizontal scroll menu/testimoni/gallery, sticky CTA bar.
- **Customer app:** mobile web-app shell/phone feel, status bar/top area, member card, quick actions, rewards/promo/history/account screens.

### Kondisi route project saat ini

- `src/app/page.tsx` sekarang melakukan server redirect berdasarkan internal POS session/role.
- Protected internal POS routes saat ini tetap dijaga oleh `src/proxy.ts`: `/owner`, `/manager`, `/kasir`, `/kitchen`, `/inventory`.
- `/login` tetap login staff/POS via better-auth.

## Keputusan final routing MVP

| Route | Purpose | Decision |
|---|---|---|
| `/` | Public landing page | **Final:** root menjadi landing page customer-facing. Auth-entry redirect lama di root diganti. |
| `/login` | Internal POS staff login | **Final:** tetap staff login. Landing wajib punya link “Masuk Staff” ke sini. |
| `/owner`, `/manager`, `/kasir`, `/kitchen`, `/inventory` | Internal POS shells | **Final:** tetap protected via proxy + server `requireRoute`. |
| `/member` | Customer App home | **Final:** guarded by customer session; redirect ke `/member/login` bila belum login. |
| `/member/register` | Customer registration | **Final:** CTA landing utama mengarah ke sini. |
| `/member/login` | Customer login | **Final:** login via email + password customer, bukan better-auth internal staff. |
| `/member/otp` | Legacy compatibility | **Final:** tidak ada flow OTP/WA aktif; route lama redirect ke `/member/login`. |
| `/member/rewards`, `/member/promos`, `/member/history`, `/member/account` | Customer app sub-screens | **Decision:** boleh route-based bila ergonomis; untuk visual fidelity mobile MVP, state-routed shell under `/member` juga diterima. |

## Risiko root route menggantikan POS auth redirect

### Risiko

User internal yang terbiasa membuka `localhost:3000/` tidak lagi otomatis masuk ke dashboard role POS; mereka akan melihat landing page.

### Mitigasi

- Landing desktop/mobile wajib punya link jelas **“Masuk Staff”** menuju `/login`.
- `/login` tetap mendukung `next` param dan flow better-auth existing.
- Protected POS routes tetap dapat dibuka langsung via URL; jika belum login akan diarahkan ke `/login?next=...` oleh proxy.
- Dokumentasi lokal: `localhost:3000` = landing; `localhost:3000/login` = POS internal.

## Keputusan auth/customer identity

- **Final:** jangan pakai internal `users` table untuk customer/member.
- Customer/member harus punya tabel sendiri; internal better-auth/RBAC POS tidak boleh dicampur.
- Email adalah identity login customer; phone tetap disimpan dan unique untuk POS lookup/linkage.
- Tidak ada konfirmasi WA/OTP aktif untuk MVP. Setelah daftar akun, customer diarahkan ke login email + password.
- Customer session harus terpisah dari better-auth staff session cookie agar logout/customer login tidak mengganggu POS staff login.

## Keputusan visual fidelity

- Landing desktop dan mobile harus mengikuti HTML mockup sebagai visual source of truth.
- Customer App harus mobile-first dan mengikuti `Wanna Dimsum Customer App.dc.html`.
- Gunakan font existing Plus Jakarta Sans + JetBrains Mono dari layout.
- Gunakan tokens brand existing: primary `#A91F34`, canvas `#FFF9F2`, yellow `#FFD84D`, ink `#2D2022`.
- Untuk placeholder gambar, buat komponen repo-native seperti `ImageSlot` yang meniru custom element `image-slot` HTML.
- Jangan mengejar CMS/admin dulu; konten static/data arrays cukup untuk visual MVP.
- Prefer client components + inline styles bila dibutuhkan untuk pixel fidelity, mengikuti konvensi screen POS saat ini.

## Keputusan scope MVP vs deferred

### MVP masuk scope fase LCA

- Public landing responsive sesuai desktop/mobile HTML.
- Customer register + login email/password.
- Customer home/dashboard loyalty.
- Rewards catalog, redeem demo, voucher saya, promo, history, account.
- Basic POS/customer linkage untuk points/voucher bila sampai LCA-06.
- Basic Owner reporting hooks untuk member/points bila sampai LCA-06.

### Deferred / bukan MVP awal

- Online ordering/checkout customer.
- Payment online customer app.
- WA/SMS/OTP confirmation provider.
- Referral campaign.
- Full CMS/editor konten landing.
- Advanced campaign engine, segmentation, push/email blast.
- Native iOS/Android app.

## Data model final untuk LCA-03

Minimal migration target:

1. `customer_members`
   - `id text primary key`
   - `full_name text not null`
   - `phone text not null unique`
   - `email text not null`
   - `password_hash text nullable` (wajib untuk akun baru; nullable hanya untuk kompatibilitas data lama)
   - `terms_accepted_at text not null`
   - `privacy_accepted_at text not null`
   - `marketing_opt_in integer boolean default false`
   - `points_balance integer not null default 0`
   - `tier text enum-ish silver|gold default silver`
   - timestamps

2. `customer_otp_attempts` (legacy/deferred; tidak dipakai flow aktif)
   - `id text primary key`
   - `phone text not null`
   - `purpose text register|login not null`
   - `code_hash text nullable` for future external OTP only.
   - `expires_at text not null`
   - `verified_at text nullable`
   - timestamps

3. `customer_point_events`
   - `id text primary key`
   - `member_id text not null references customer_members.id`
   - `kind text bonus|earn|redeem|adjust not null`
   - `points integer not null` (positive for earn/bonus, negative for redeem)
   - `source_order_id text nullable references orders.id`
   - `source_voucher_id text nullable`
   - `note text nullable`
   - timestamps

4. `customer_rewards`
   - `id text primary key`
   - `name text not null`
   - `category text voucher|paket|gratis|ongkir not null`
   - `points_cost integer not null`
   - `description text nullable`
   - `active boolean default true`
   - timestamps

5. `customer_vouchers`
   - `id text primary key`
   - `member_id text not null references customer_members.id`
   - `reward_id text nullable references customer_rewards.id`
   - `code text unique not null`
   - `status text active|used|expired not null default active`
   - `issued_at text not null`
   - `expires_at text not null`
   - `used_order_id text nullable references orders.id`
   - timestamps

6. `customer_promos`
   - `id text primary key`
   - `title text not null`
   - `description text not null`
   - `badge text nullable`
   - `starts_at text nullable`
   - `ends_at text nullable`
   - `active boolean default true`
   - timestamps

## Phase unlock decision

Dengan keputusan di atas, fase berikut boleh dimulai:

- LCA-01: implement `/` landing desktop dan ubah root redirect lama.
- LCA-02: responsive/mobile landing fidelity.
- LCA-03: migration + customer email/password auth.
- LCA-04 sampai LCA-07 mengikuti dependency masing-masing.

## Acceptance criteria

- [x] Route contract disetujui.
- [x] Customer/member data dipisah dari POS internal users.
- [x] Visual source of truth dan placeholder strategy jelas.
- [x] Scope MVP vs deferred tertulis.
- [x] Fase LCA-01 sampai LCA-07 boleh mulai tanpa ambigu.

## Definition of Done

- [x] Update README phase bila keputusan berubah.
- [x] Catat risiko root route menggantikan POS auth redirect dan mitigasinya.
- [x] Catat migration/data entities final sebelum LCA-03 coding.

**Status: complete (2026-07-21).**
