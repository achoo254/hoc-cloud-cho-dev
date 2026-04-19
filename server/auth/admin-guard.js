export function getWhitelist() {
  return (process.env.GITHUB_ADMIN_WHITELIST || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export const adminGuard = async (c, next) => {
  const u = c.get('user');
  const whitelist = getWhitelist();
  if (!u || !whitelist.includes(u.github)) {
    if (c.req.path.startsWith('/admin/api/')) {
      return c.json({ error: 'unauthorized' }, 401);
    }
    return c.redirect('/admin/login');
  }
  await next();
};
