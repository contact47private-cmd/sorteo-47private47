const { noStore, getStoredResult, UNLOCK_AT } = require('./_common');

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Método no permitido' });
  try {
    const result = await getStoredResult();
    return res.status(200).json({
      drawn: Boolean(result),
      result: result || null,
      unlockAt: new Date(UNLOCK_AT).toISOString(),
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
};
