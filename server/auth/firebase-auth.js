import { Hono } from 'hono';
import { randomBytes, createHash } from 'node:crypto';
import db from '../db/sqlite-client.js';
import { getFirebaseAuth } from './firebase-admin.js';

const app = new Hono();
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

const sha256 = (str) => createHash('sha256').update(str).digest('hex');

const parseCookies = (header) => {
  const out = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return out;
};

const setCookie = (c, name, value, maxAge) => {
  const secure = c.req.header('x-forwarded-proto') === 'https' || process.env.NODE_ENV === 'production';
  const parts = [`${name}=${value}`, 'Path=/', `Max-Age=${maxAge}`, 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  c.header('Set-Cookie', parts.join('; '), { append: true });
};

// Rate limiter (in-memory) — 10 requests/min/IP
const rateLimitMap = new Map();
const RATE_LIMIT = 10;
const RATE_WINDOW = 60 * 1000;

const rateLimit = (c, next) => {
  const ip = c.req.header('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetAt: now + RATE_WINDOW };

  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + RATE_WINDOW;
  }

  entry.count++;
  rateLimitMap.set(ip, entry);

  if (entry.count > RATE_LIMIT) {
    return c.json({ error: 'rate_limited' }, 429);
  }

  return next();
};

setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (entry.resetAt < now) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

app.use('/auth/*', rateLimit);

// POST /auth/firebase/session — exchange Firebase ID token for session cookie
app.post('/auth/firebase/session', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { body = {}; }
  const idToken = body?.idToken;
  if (!idToken || typeof idToken !== 'string') {
    return c.json({ error: 'missing_id_token' }, 400);
  }

  let decoded;
  try {
    decoded = await getFirebaseAuth().verifyIdToken(idToken);
  } catch (err) {
    console.error('[firebase-auth] verify failed:', err?.code || err?.message);
    return c.json({ error: 'invalid_id_token' }, 401);
  }

  const { uid, email, name, picture } = decoded;
  const cookies = parseCookies(c.req.header('cookie'));
  const anonUuid = cookies.hcl_uid;
  const mergeWindowStart = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

  const sessionToken = randomBytes(32).toString('hex');
  const tokenHash = sha256(sessionToken);
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (firebase_uid, email, display_name, photo_url)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(firebase_uid) DO UPDATE SET
        email = excluded.email,
        display_name = excluded.display_name,
        photo_url = excluded.photo_url
    `).run(uid, email ?? null, name ?? null, picture ?? null);

    const user = db.prepare('SELECT id FROM users WHERE firebase_uid = ?').get(uid);

    if (anonUuid) {
      db.prepare(`
        UPDATE progress SET user_id = ?
        WHERE user_uuid = ? AND user_id IS NULL AND last_updated > ?
      `).run(user.id, anonUuid, mergeWindowStart);
    }

    db.prepare(`
      INSERT INTO sessions (token_hash, user_id, expires_at)
      VALUES (?, ?, ?)
    `).run(tokenHash, user.id, expiresAt);

    return user;
  });
  tx();

  setCookie(c, 'sid', sessionToken, SESSION_MAX_AGE);
  return c.json({ ok: true });
});

// POST /auth/logout — clear session
app.post('/auth/logout', (c) => {
  const cookies = parseCookies(c.req.header('cookie'));
  const sid = cookies.sid;

  if (sid) {
    const hash = sha256(sid);
    db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash);
  }

  setCookie(c, 'sid', '', 0);
  return c.json({ ok: true });
});

export const authRoutes = app;
