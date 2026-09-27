/**
 * POST /api/marketplace/connect/onboard
 * TODO: stripe.accounts.create({ type: 'express' }) + accountLinks.create
 * Guard with Clerk JWT. Store stripeAccountId on user publicMetadata.
 */
export default async function handler(req, res) {
  if (process.env.VITE_MARKETPLACE_ENABLED !== 'true' && process.env.MARKETPLACE_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Marketplace disabled' });
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(501).json({
      error: 'STRIPE_SECRET_KEY not set',
      todo: 'Create Connect Express account + Account Link, return { url }',
    });
  }
  return res.status(501).json({
    error: 'Stripe Connect onboard not implemented',
    todo: 'accounts.create + accountLinks.create -> { url }',
  });
}
