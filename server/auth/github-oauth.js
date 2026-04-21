import { Hono } from 'hono';
import { randomBytes, createHash } from 'node:crypto';
import db from '../db/sqlite-client.js';

const app = new Hono();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || 'http://localhost:8387';
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

// Rate limiter (in-memory)
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

// Cleanup stale rate limit entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap) {
    if (entry.resetAt < now) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

app.use('/auth/*', rateLimit);

// GET /auth/github — initiate OAuth
app.get('/auth/github', (c) => {
  if (!GITHUB_CLIENT_ID) {
    return c.json({ error: 'github_not_configured' }, 500);
  }

  const state = randomBytes(32).toString('hex');
  setCookie(c, 'oauth_state', state, 600); // 10 min expiry

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: `${PUBLIC_BASE_URL}/auth/github/callback`,
    scope: 'read:user',
    state,
  });

  return c.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

// GET /auth/github/callback — handle OAuth callback
app.get('/auth/github/callback', async (c) => {
  const { code, state, error: ghError } = c.req.query();
  const cookies = parseCookies(c.req.header('cookie'));

  if (ghError) {
    return c.redirect('/?error=oauth_denied');
  }

  if (!state || state !== cookies.oauth_state) {
    return c.redirect('/?error=invalid_state');
  }

  setCookie(c, 'oauth_state', '', 0);

  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      }),
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      console.error('[oauth] token exchange failed:', tokenData);
      return c.redirect('/?error=token_failed');
    }

    const userRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userRes.ok) {
      console.error('[oauth] GitHub API error:', userRes.status);
      return c.redirect('/?error=github_api_failed');
    }

    const ghUser = await userRes.json();
    if (!ghUser.id || !ghUser.login) {
      console.error('[oauth] Invalid GitHub user response');
      return c.redirect('/?error=invalid_github_user');
    }

    const sessionToken = randomBytes(32).toString('hex');
    const tokenHash = sha256(sessionToken);
    const expiresAt = Math.floor(Date.now() / 1000) + SESSION_MAX_AGE;
    const anonUuid = cookies.hcl_uid;
    const mergeWindowStart = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;

    // Validate avatar URL is from GitHub CDN
    const safeAvatarUrl = ghUser.avatar_url?.startsWith('https://avatars.githubusercontent.com/')
      ? ghUser.avatar_url
      : null;

    const completeLogin = db.transaction(() => {
      db.prepare(`
        INSERT INTO users (github_id, username, avatar_url)
        VALUES (?, ?, ?)
        ON CONFLICT(github_id) DO UPDATE SET
          username = excluded.username,
          avatar_url = excluded.avatar_url
      `).run(ghUser.id, ghUser.login, safeAvatarUrl);

      const user = db.prepare('SELECT id FROM users WHERE github_id = ?').get(ghUser.id);

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

    completeLogin();

    setCookie(c, 'sid', sessionToken, SESSION_MAX_AGE);

    return c.redirect('/');
  } catch (err) {
    console.error('[oauth] callback error:', err);
    return c.redirect('/?error=oauth_failed');
  }
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
