<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Wanna Dimsum POS

Internal point-of-sale system. This app is a faithful port of four self-contained HTML mockups in `docs/` (`Wanna Dimsum Owner.dc.html`, `Kasir`, `Kitchen`, `Inventory`). The mockups are the visual source of truth.

## Stack
- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict.
- Tailwind v4 — CSS-based config via `@theme` in `src/app/globals.css` (no `tailwind.config.js`).
- shadcn/ui (radix-nova) in `src/components/ui/`, lucide-react for icons.
- Drizzle ORM + better-sqlite3 (`src/db/`). Frontend is mock-driven for now; DB layer is set up and ready.

## Conventions
- Fonts: Plus Jakarta Sans (`--font-sans`) + JetBrains Mono (`--font-mono`), applied in `layout.tsx`. Monospace numbers via `.font-mono` or inline `var(--font-mono)`.
- Design tokens: `src/lib/tokens.ts` (`tokens`, `tones`). Brand primary `#A91F34`, canvas `#FFF9F2`, Owner suite bg `#F5F6F8`.
- Money is integer rupiah; format with `formatRupiah` from `src/lib/format.ts`.
- Shared animations (`wd-blink`, `wd-pop`, `wd-slideup`, `wd-fade`, `wd-fade-up`, `wd-flash`, `wd-grow`) and `.wd-scroll` scrollbar live in `globals.css`.
- Screens are `"use client"` and use inline styles for pixel fidelity with the mockups.

## Routes
`/` role launcher · `/owner` (state-routed Business Suite shell) · `/kasir` · `/kitchen` · `/inventory`.

## Scripts
`npm run dev` · `npm run build` · `npm run typecheck` · `npm run db:generate` · `npm run db:push`.
