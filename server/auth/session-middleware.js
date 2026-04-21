import { createHash } from 'node:crypto';
import db from '../db/sqlite-client.js';

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

const selectSession = db.prepare(`
  SELECT u.id, u.github_id, u.username, u.avatar_url, s.expires_at
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  WHERE s.token_hash = ?
`);

const deleteExpired = db.prepare('DELETE FROM sessions WHERE token_hash = ?');

export const sessionMiddleware = async (c, next) => {
  const cookies = parseCookies(c.req.header('cookie'));
  const sid = cookies.sid;

  if (sid) {
    const hash = sha256(sid);
    const row = selectSession.get(hash);

    if (row) {
      const now = Math.floor(Date.now() / 1000);
      if (row.expires_at > now) {
        c.set('user', {
          id: row.id,
          githubId: row.github_id,
          username: row.username,
          avatarUrl: row.avatar_url,
        });
      } else {
        deleteExpired.run(hash);
      }
    }
  }

  await next();
};
