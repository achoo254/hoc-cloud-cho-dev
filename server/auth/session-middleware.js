import { createHash } from 'node:crypto';
import { getCookie } from 'hono/cookie';
import db from '../db/sqlite-client.js';

export const sha256 = (s) => createHash('sha256').update(s).digest('hex');

const findSession = db.prepare(
  'SELECT github_user, expires_at FROM admin_sessions WHERE token_hash = ?'
);
const deleteSession = db.prepare('DELETE FROM admin_sessions WHERE token_hash = ?');

export const sessionMiddleware = async (c, next) => {
  const sid = getCookie(c, 'sid');
  if (sid) {
    const hash = sha256(sid);
    const row = findSession.get(hash);
    if (row) {
      if (row.expires_at > Date.now()) {
        c.set('user', { github: row.github_user });
      } else {
        deleteSession.run(hash);
      }
    }
  }
  await next();
};
