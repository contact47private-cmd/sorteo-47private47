const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DRAW_KEY = '47private:drop001:official-result:v1';
const DRAW_ID = '47PRIVATE-DROP001-2026';
const UNLOCK_AT = Date.parse('2026-08-17T17:35:00+02:00');
const EXPECTED_DATA_SHA256 = '7cfe7c6dfb73c79e9fab1ded2e9cf33e53a48cd1290741baa7c47766f1a5cc2b';

function noStore(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function redisConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN');
  return { url: url.replace(/\/$/, ''), token };
}

async function redisCommand(command) {
  const { url, token } = redisConfig();
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
    cache: 'no-store'
  });
  const j = await r.json();
  if (!r.ok || j.error) throw new Error(j.error || `Redis HTTP ${r.status}`);
  return j.result;
}

async function getStoredResult() {
  const raw = await redisCommand(['GET', DRAW_KEY]);
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  return JSON.parse(raw);
}

function loadParticipants() {
  const file = path.join(process.cwd(), 'participaciones_validas.csv');
  const raw = fs.readFileSync(file);
  const sha = crypto.createHash('sha256').update(raw).digest('hex');
  if (sha !== EXPECTED_DATA_SHA256) {
    throw new Error(`La lista oficial no coincide con el SHA-256 comprometido (${sha})`);
  }
  const lines = raw.toString('utf8').trim().split(/\r?\n/).slice(1);
  const data = lines.map((line, idx) => {
    const parts = line.split(',');
    const papeleta = Number(parts.shift());
    const usuario = parts.shift();
    const menciones = parts.join(',');
    if (!Number.isInteger(papeleta) || !usuario) throw new Error(`CSV inválido en línea ${idx + 2}`);
    return [papeleta, usuario, menciones];
  });
  if (data.length !== 307) throw new Error(`Se esperaban 307 papeletas y hay ${data.length}`);
  return data;
}

function safeTokenEqual(provided, expected) {
  if (!provided || !expected) return false;
  const a = Buffer.from(String(provided));
  const b = Buffer.from(String(expected));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function deterministicIndex(seed, role, maxExclusive) {
  const range = 1n << 256n;
  const n = BigInt(maxExclusive);
  const limit = range - (range % n);
  for (let counter = 0; ; counter++) {
    const h = sha256Hex(`${seed}|${DRAW_ID}|${role}|${counter}`);
    const x = BigInt('0x' + h);
    if (x < limit) return Number(x % n);
  }
}

function deriveResult(seed, data) {
  const picked = [];
  const excluded = new Set();
  for (let i = 0; i < 3; i++) {
    const pool = data.filter(d => !excluded.has(d[1]));
    const entry = pool[deterministicIndex(seed, i, pool.length)];
    picked.push(entry);
    excluded.add(entry[1]);
  }
  return picked;
}

module.exports = {
  DRAW_KEY, DRAW_ID, UNLOCK_AT, EXPECTED_DATA_SHA256,
  noStore, redisCommand, getStoredResult, loadParticipants,
  safeTokenEqual, deriveResult
};
