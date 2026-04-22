import { createHash } from 'node:crypto';
import { Session } from '../db/models/index.js';

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

export const sessionMiddleware = async (c, next) => {
  const cookies = parseCookies(c.req.header('cookie'));
  const sid = cookies.sid;

  if (sid) {
    const hash = sha256(sid);
    const session = await Session.findOne({ tokenHash: hash })
      .populate('userId')
      .lean();

    if (session && session.expiresAt > new Date()) {
      const user = session.userId;
      if (user) {
        c.set('user', {
          _id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          displayName: user.displayName,
          photoUrl: user.photoUrl,
        });
      }
    }
  }

  await next();
};
