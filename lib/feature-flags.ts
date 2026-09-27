/** Client feature flags - set via Vite env. */

export const CLERK_PUBLISHABLE_KEY =
  (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined)?.trim() || '';

export const AUTH_ENABLED = Boolean(CLERK_PUBLISHABLE_KEY);

/** Backend base for profile/export sync (Vercel serverless or custom). */
export const API_BASE =
  (import.meta.env.VITE_NODAW_API_BASE as string | undefined)?.trim().replace(/\/$/, '') ||
  '';

/** Stripe Connect marketplace - off until keys + server wired. */
export const MARKETPLACE_ENABLED =
  String(import.meta.env.VITE_MARKETPLACE_ENABLED || '').toLowerCase() === 'true';

export const STRIPE_PUBLISHABLE_KEY =
  (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim() || '';

/** Platform fee in basis points (e.g. 1000 = 10%). */
export const MARKETPLACE_FEE_BPS = Number(
  import.meta.env.VITE_MARKETPLACE_FEE_BPS || 1000,
);
