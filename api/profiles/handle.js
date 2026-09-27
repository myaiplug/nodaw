/**
 * GET /api/profiles/handle?handle=beez
 * TODO: resolve handle -> Clerk userId, query public exports from DB.
 */
export default async function handler(req, res) {
  const handle = req.query.handle;
  return res.status(200).json({
    handle,
    displayName: handle,
    exports: [],
    todo: 'Resolve Clerk username + public ExportRecords',
  });
}
