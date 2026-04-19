import { Hono } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { randomBytes } from 'node:crypto';
import db from '../db/sqlite-client.js';
import { sha256 } from './session-middleware.js';
import { getWhitelist } from './admin-guard.js';

const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

const insertSession = db.prepare(
  'INSERT INTO admin_sessions (token_hash, github_user, expires_at) VALUES (?, ?, ?)'
);
const deleteSessionByHash = db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?');

function cookieOpts(extra = {}) {
  return {
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    ...extra,
  };
}

export const oauthRoutes = new Hono();

oauthRoutes.get('/auth/github', (c) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) return c.text('GITHUB_CLIENT_ID not configured', 500);

  const state = randomBytes(16).toString('hex');
  setCookie(c, 'oauth_state', state, cookieOpts({ maxAge: 600 }));

  const base = process.env.PUBLIC_BASE_URL || `${new URL(c.req.url).origin}`;
  const redirectUri = `${base}/auth/github/callback`;

  const url = new URL('https://github.com/login/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', state);
  return c.redirect(url.toString());
});

oauthRoutes.get('/auth/github/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const savedState = getCookie(c, 'oauth_state');
  deleteCookie(c, 'oauth_state', { path: '/' });

  if (!code || !state || state !== savedState) {
    return c.text('Invalid OAuth state', 400);
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.GITHUB_CLIENT_ID,
      client_secret: process.env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    return c.text('OAuth token exchange failed', 400);
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      'User-Agent': 'hoc-cloud-cms',
      Accept: 'application/vnd.github+json',
    },
  });
  const user = await userRes.json();
  if (!user.login) return c.text('Failed to fetch GitHub user', 400);

  const whitelist = getWhitelist();
  if (!whitelist.includes(user.login)) {
    return c.html(
      `<html><body style="font-family:sans-serif;padding:40px">
        <h1>403 — Not authorized</h1>
        <p>GitHub user <code>${user.login}</code> is not in the admin whitelist.</p>
        <p><a href="/">Back</a></p>
      </body></html>`,
      403
    );
  }

  const token = randomBytes(32).toString('hex');
  const tokenHash = sha256(token);
  const expires = Date.now() + SESSION_MS;
  insertSession.run(tokenHash, user.login, expires);

  setCookie(c, 'sid', token, cookieOpts({ maxAge: SESSION_DAYS * 86400 }));
  return c.redirect('/admin');
});

oauthRoutes.post('/auth/logout', (c) => {
  const sid = getCookie(c, 'sid');
  if (sid) deleteSessionByHash.run(sha256(sid));
  deleteCookie(c, 'sid', { path: '/' });
  return c.redirect('/admin/login');
});

// Housekeeping: purge expired sessions every hour.
setInterval(() => {
  try {
    db.prepare('DELETE FROM admin_sessions WHERE expires_at < ?').run(Date.now());
  } catch {}
}, 60 * 60 * 1000).unref?.();
