// Anonymous UUID cookie middleware — identifies a user across devices via cookie only.
// Cookie: hcl_uid (HttpOnly, SameSite=Lax, 2y). Secure flag toggled by env.
import { randomUUID } from 'node:crypto';

const COOKIE_NAME = 'hcl_uid';
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2; // 2 years
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function parseCookie(header) {
  const out = {};
  if (!header) return out;
  for (const pair of header.split(';')) {
    const idx = pair.indexOf('=');
    if (idx < 0) continue;
    out[pair.slice(0, idx).trim()] = decodeURIComponent(pair.slice(idx + 1).trim());
  }
  return out;
}

export const anonUuidMiddleware = async (c, next) => {
  const cookies = parseCookie(c.req.header('cookie'));
  let uuid = cookies[COOKIE_NAME];
  if (!uuid || !UUID_RE.test(uuid)) {
    uuid = randomUUID();
    const secure = c.req.header('x-forwarded-proto') === 'https' || process.env.COOKIE_SECURE === '1';
    const parts = [
      `${COOKIE_NAME}=${uuid}`,
      'Path=/',
      `Max-Age=${MAX_AGE_SECONDS}`,
      'HttpOnly',
      'SameSite=Lax',
    ];
    if (secure) parts.push('Secure');
    c.header('Set-Cookie', parts.join('; '), { append: true });
  }
  c.set('userUuid', uuid);
  await next();
};
