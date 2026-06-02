// Owner-gate: chỉ cho phép tài khoản trong OWNER_EMAIL (allowlist, comma-separated)
// truy cập. Đọc env per-request để không phụ thuộc thứ tự load env ở import time.
// Phải chạy SAU sessionMiddleware (cần c.get('user')).
export const requireOwner = (c, next) => {
  const user = c.get('user');
  if (!user) return c.json({ error: 'unauthorized' }, 401);

  const owners = (process.env.OWNER_EMAIL || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const email = (user.email || '').toLowerCase();
  if (owners.length === 0 || !owners.includes(email)) {
    return c.json({ error: 'forbidden' }, 403);
  }
  return next();
};
