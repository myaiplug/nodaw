/**
 * POST /api/marketplace/checkout { exportId }
 * TODO: Checkout Session with application_fee_amount + transfer_data.destination
 */
export default async function handler(req, res) {
  if (process.env.MARKETPLACE_ENABLED !== 'true' && process.env.VITE_MARKETPLACE_ENABLED !== 'true') {
    return res.status(503).json({ error: 'Marketplace disabled' });
  }
  return res.status(501).json({
    error: 'Checkout stub',
    todo: 'stripe.checkout.sessions.create with application_fee_amount (fee bps) and Connect transfer',
  });
}
