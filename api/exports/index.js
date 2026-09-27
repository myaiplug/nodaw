/**
 * POST /api/exports - upsert export metadata (Clerk JWT required).
 * TODO: persist to Postgres / Turso / Convex. Currently echoes for wiring.
 */
export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing Clerk bearer token' });
  }
  // TODO: verify with CLERK_SECRET_KEY (clerkBackend.verifyToken)
  if (req.method === 'GET') {
    return res.status(200).json({ exports: [], todo: 'Wire DB list by userId' });
  }
  return res.status(201).json({ ok: true, saved: req.body, todo: 'Persist ExportRecord' });
}
