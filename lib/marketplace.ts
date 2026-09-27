/**
 * Marketplace scaffold (Stripe Connect).
 * Feature-flagged: VITE_MARKETPLACE_ENABLED=true
 *
 * TODO (production):
 * 1. Create Stripe Connect Express accounts via /api/marketplace/connect/onboard
 * 2. Create PaymentIntents with application_fee_amount = price * MARKETPLACE_FEE_BPS / 10000
 * 3. Transfer to connected account on successful payment
 * 4. Webhook: checkout.session.completed / account.updated
 * 5. Enforce ownership attestation before listing
 */
import {
  API_BASE,
  MARKETPLACE_ENABLED,
  MARKETPLACE_FEE_BPS,
  STRIPE_PUBLISHABLE_KEY,
} from './feature-flags';
import { ExportRecord } from '../types';

export type ConnectStatus =
  | { enabled: false; reason: string }
  | {
      enabled: true;
      feeBps: number;
      hasPublishableKey: boolean;
      apiConfigured: boolean;
    };

export function getMarketplaceStatus(): ConnectStatus {
  if (!MARKETPLACE_ENABLED) {
    return { enabled: false; reason: 'Marketplace flag off (VITE_MARKETPLACE_ENABLED)' };
  }
  return {
    enabled: true,
    feeBps: MARKETPLACE_FEE_BPS,
    hasPublishableKey: Boolean(STRIPE_PUBLISHABLE_KEY),
    apiConfigured: Boolean(API_BASE),
  };
}

export function platformFeeCents(priceCents: number): number {
  return Math.round((priceCents * MARKETPLACE_FEE_BPS) / 10_000);
}

/** Stub: start Stripe Connect onboarding for the signed-in seller. */
export async function startConnectOnboarding(
  getToken: () => Promise<string | null>,
): Promise<{ url?: string; error?: string }> {
  const status = getMarketplaceStatus();
  if (status.enabled === false) return { error: status.reason };
  if (!API_BASE) {
    return {
      error:
        'Set VITE_NODAW_API_BASE and deploy api/marketplace/* (Stripe Connect stubs).',
    };
  }
  const token = await getToken();
  if (!token) return { error: 'Sign in required' };
  const res = await fetch(`${API_BASE}/api/marketplace/connect/onboard`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: text || `Onboard failed (${res.status})` };
  }
  return res.json();
}

/** Stub: create a Checkout Session for a listing. */
export async function createListingCheckout(
  exportId: string,
  getToken: () => Promise<string | null>,
): Promise<{ url?: string; error?: string }> {
  const status = getMarketplaceStatus();
  if (status.enabled === false) return { error: status.reason };
  if (!API_BASE) return { error: 'API base not configured' };
  const token = await getToken();
  const res = await fetch(`${API_BASE}/api/marketplace/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ exportId }),
  });
  if (!res.ok) return { error: await res.text() };
  return res.json();
}

export function canListForSale(record: ExportRecord): boolean {
  return Boolean(record.isPublic && record.userId);
}
