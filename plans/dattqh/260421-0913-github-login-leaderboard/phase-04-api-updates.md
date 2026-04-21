# Phase 4: API Updates

**Priority:** P1 | **Status:** completed | **Effort:** 3h

## Context Links
- [Phase 3: Session Middleware](phase-03-session-middleware.md)
- [Current progress-routes.js](../../../server/api/progress-routes.js)

## Overview

Update progress routes to require auth for POST. Add `/api/me` endpoint for current user. Add `/api/leaderboard` endpoint for public rankings.

## Key Insights

- GET /api/progress: return user's progress if logged in, empty if guest
- POST /api/progress: require auth — guests can't save progress
- Leaderboard: public, shows all users with at least 1 completed lab

## Requirements

**Functional:**
- `GET /api/me` — return current user or null
- `GET /api/progress` — return progress for logged user (empty for guests)
- `POST /api/progress` — require auth, save with user_id
- `GET /api/leaderboard` — public rankings

**Non-functional:**
- Leaderboard query optimized (indexed)
- Progress routes backward-compatible for guests (just can't POST)

## Related Code Files

**Create:**
- `server/api/leaderboard-routes.js`

**Modify:**
- `server/api/progress-routes.js`
- `server/server.js` — mount new routes

## Implementation Steps

1. Create `server/api/leaderboard-routes.js`:
   ```js
   import { Hono } from 'hono';
   import db from '../db/sqlite-client.js';

   // [RED TEAM FIX] Use DISTINCT to prevent duplicate counting, return null for avg_score
   // [RED TEAM FIX] Change LIMIT 50 to LIMIT 10 to match UI
   // [RED TEAM FIX] Add github_id for frontend key/comparison
   const selectLeaderboard = db.prepare(`
     SELECT 
       u.github_id,
       u.username,
       u.avatar_url,
       COUNT(DISTINCT CASE WHEN p.completed_at IS NOT NULL THEN p.lab_slug END) as completed_count,
       AVG(CASE WHEN p.quiz_score IS NOT NULL THEN p.quiz_score END) as avg_score,
       MAX(p.last_updated) as last_active
     FROM users u
     LEFT JOIN progress p ON p.user_id = u.id
     GROUP BY u.id
     HAVING completed_count > 0
     ORDER BY completed_count DESC, avg_score DESC NULLS LAST
     LIMIT 10
   `);

   export const leaderboardRoutes = new Hono()
     .get('/api/leaderboard', (c) => {
       const rows = selectLeaderboard.all();
       return c.json({
         leaderboard: rows.map((r, idx) => ({
           rank: idx + 1,
           githubId: r.github_id, // [RED TEAM FIX] For unique key
           username: r.username,
           avatarUrl: r.avatar_url,
           completedCount: r.completed_count,
           // [RED TEAM FIX] Return null instead of 0 for no quiz data
           avgScore: r.avg_score != null ? Math.round(r.avg_score) : null,
           lastActive: r.last_active,
         })),
       });
     });
   ```

2. Update `server/api/progress-routes.js`:
   ```js
   // Modify existing file:
   
   // Add at top:
   import { requireAuth } from '../auth/require-auth.js';
   
   // Change upsert to use user_id:
   const upsert = db.prepare(`
     INSERT INTO progress (user_id, user_uuid, lab_slug, opened_at, completed_at, quiz_score, last_updated)
     VALUES (@user_id, @user_uuid, @lab_slug, @opened_at, @completed_at, @quiz_score, strftime('%s','now'))
     ON CONFLICT(user_uuid, lab_slug) DO UPDATE SET
       user_id      = COALESCE(excluded.user_id, progress.user_id),
       opened_at    = COALESCE(excluded.opened_at, progress.opened_at),
       completed_at = COALESCE(excluded.completed_at, progress.completed_at),
       quiz_score   = COALESCE(excluded.quiz_score, progress.quiz_score),
       last_updated = strftime('%s','now')
   `);
   
   // GET /api/progress — return user's progress if logged
   .get('/api/progress', (c) => {
     const user = c.get('user');
     if (!user) {
       return c.json({ progress: [] }); // Guest: empty
     }
     const rows = db.prepare(`
       SELECT lab_slug, opened_at, completed_at, quiz_score, last_updated
       FROM progress WHERE user_id = ? ORDER BY last_updated DESC
     `).all(user.id);
     return c.json({ userId: user.id, progress: rows });
   })
   
   // POST /api/progress — require auth
   .post('/api/progress', requireAuth, async (c) => {
     const user = c.get('user');
     const uuid = c.get('userUuid'); // Keep for compat
     // ... rest of existing logic, but use user.id
     upsert.run({
       user_id: user.id,
       user_uuid: uuid,
       lab_slug: body.lab_slug,
       // ...
     });
     return c.json({ ok: true });
   })
   ```

3. Add `/api/me` endpoint (can go in progress-routes or separate):
   ```js
   .get('/api/me', (c) => {
     const user = c.get('user');
     if (!user) {
       return c.json({ user: null });
     }
     // [RED TEAM FIX] Strip internal id from response
     return c.json({ 
       user: {
         githubId: user.githubId,
         username: user.username,
         avatarUrl: user.avatarUrl,
       }
     });
   })
   ```

4. Mount leaderboard routes in `server/server.js`

## Todo List

- [x] Create `server/api/leaderboard-routes.js`
- [x] Update `server/api/progress-routes.js` — require auth for POST
- [x] Add `GET /api/me` endpoint
- [x] Mount new routes in `server/server.js`
- [x] Test: GET /api/progress as guest → empty
- [x] Test: GET /api/progress logged → user's data
- [x] Test: POST /api/progress as guest → 401
- [x] Test: POST /api/progress logged → saves with user_id
- [x] Test: GET /api/leaderboard → public rankings

## Success Criteria

- `/api/me` returns user object or null
- `/api/progress` GET works for logged users, empty for guests
- `/api/progress` POST requires auth (401 for guests)
- `/api/leaderboard` returns top 10 rankings (matching UI)

## Security Considerations

- Leaderboard exposes only public GitHub info (username, avatar)
- Progress data only accessible to owner
- Rate limiting on POST to prevent abuse
