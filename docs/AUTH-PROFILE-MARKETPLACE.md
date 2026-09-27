# Auth · Profile · Marketplace (NoDAW Suite)

## Architecture choice

| Layer | Choice | Why |
| --- | --- | --- |
| Auth | **Clerk** (`@clerk/react`) | Production OAuth + email, hosted UI, works with Vite SPA + Vercel |
| Local portfolio | **IndexedDB** (`lib/exports-store.ts`) | Works on GH Pages offline; no mock auth |
| Cloud sync | Optional `VITE_NODAW_API_BASE` + `/api/*` stubs | Real JWT bearer; DB TODO |
| Marketplace | **Stripe Connect** behind `VITE_MARKETPLACE_ENABLED` | Application fee = middleman cut |

**Not used:** fake localStorage "login". Without `VITE_CLERK_PUBLISHABLE_KEY` the suite still runs (guest); Sign in shows "Auth setup".

## Env vars

See `.env.example`.

Client (Vite):

- `VITE_CLERK_PUBLISHABLE_KEY`
- `VITE_NODAW_API_BASE`
- `VITE_MARKETPLACE_ENABLED`
- `VITE_MARKETPLACE_FEE_BPS` (default `1000` = 10%)
- `VITE_STRIPE_PUBLISHABLE_KEY`

Server (Vercel / never ship to client):

- `CLERK_SECRET_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_CONNECT_WEBHOOK_SECRET`
- `MARKETPLACE_ENABLED`

## User flows

1. Open `/app` → **Trim** tab (not Split). Demucs loads only when user opens **Split**.
2. Sign in with Clerk (Google / email).
3. Edit → **Save export** → IndexedDB (+ API if configured).
4. `/u/:handle` profile → publish exports publicly.
5. Marketplace (flag on): Connect payouts → list for sale → Checkout stub.

## Deploy notes

- GitHub Pages: static only — auth client works; `/api` needs Vercel (or similar).
- Prefer attaching this repo to Vercel + Clerk + Stripe for full stack.
