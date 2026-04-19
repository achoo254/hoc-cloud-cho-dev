import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getCookie, setCookie } from 'hono/cookie';

const secret = () => process.env.SESSION_SECRET || 'dev-csrf-secret-change-me';

export function issueCsrfToken(c) {
  let raw = getCookie(c, 'csrf_raw');
  if (!raw) {
    raw = randomBytes(24).toString('hex');
    setCookie(c, 'csrf_raw', raw, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  return createHmac('sha256', secret()).update(raw).digest('hex');
}

export const csrfGuard = async (c, next) => {
  const method = c.req.method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return next();
  }
  const raw = getCookie(c, 'csrf_raw') || '';
  const expected = createHmac('sha256', secret()).update(raw).digest('hex');
  const got = c.req.header('X-CSRF-Token') || '';
  if (!raw || got.length !== expected.length) {
    return c.json({ error: 'invalid_csrf' }, 403);
  }
  try {
    if (!timingSafeEqual(Buffer.from(got, 'hex'), Buffer.from(expected, 'hex'))) {
      return c.json({ error: 'invalid_csrf' }, 403);
    }
  } catch {
    return c.json({ error: 'invalid_csrf' }, 403);
  }
  return next();
};
