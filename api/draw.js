const crypto = require('crypto');
const {
  DRAW_KEY, DRAW_ID, UNLOCK_AT, EXPECTED_DATA_SHA256,
  noStore, redisCommand, getStoredResult, loadParticipants,
  safeTokenEqual, deriveResult
} = require('./_common');

module.exports = async function handler(req, res) {
  noStore(res);
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  try {
    if (Date.now() < UNLOCK_AT) {
      return res.status(423).json({ error: 'El sorteo está bloqueado hasta las 17:35:00 (hora peninsular).' });
    }

    const expectedToken = process.env.DRAW_ADMIN_TOKEN;
    if (!expectedToken) return res.status(500).json({ error: 'Falta configurar DRAW_ADMIN_TOKEN en Vercel.' });
    const providedToken = req.headers['x-draw-token'];
    if (!safeTokenEqual(providedToken, expectedToken)) {
      return res.status(401).json({ error: 'Código privado incorrecto.' });
    }

    // Si ya existe, JAMÁS generamos otro resultado.
    const existing = await getStoredResult();
    if (existing) return res.status(200).json({ ok: true, alreadyExisted: true, result: existing });

    const data = loadParticipants();
    const seed = crypto.randomBytes(32).toString('hex'); // 256 bits, generado SOLO ahora, tras el clic autorizado.
    const picked = deriveResult(seed, data);
    const payload = {
      drawId: DRAW_ID,
      createdAt: new Date().toISOString(),
      unlockAt: new Date(UNLOCK_AT).toISOString(),
      dataSha256: EXPECTED_DATA_SHA256,
      seed,
      picked
    };

    // Operación atómica write-once: solo gana el primer SET NX.
    const setResult = await redisCommand(['SET', DRAW_KEY, JSON.stringify(payload), 'NX']);
    if (setResult === 'OK') {
      return res.status(200).json({ ok: true, alreadyExisted: false, result: payload });
    }

    // Si otra petición ganó la carrera, devolvemos ese primer resultado y NO el nuestro.
    const winner = await getStoredResult();
    if (!winner) throw new Error('No se pudo recuperar el resultado oficial tras SET NX.');
    return res.status(200).json({ ok: true, alreadyExisted: true, result: winner });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err.message || err) });
  }
};
