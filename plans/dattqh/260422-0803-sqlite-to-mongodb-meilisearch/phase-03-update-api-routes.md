# Phase 3: Update API Routes

**Priority:** P0 (blocking)  
**Status:** completed  
**Effort:** 3-4 hours

## Overview

Migrate all API routes from SQLite queries to Mongoose + Meilisearch.

## Files to Update

| File | Changes |
|------|---------|
| `server/api/search-routes.js` | FTS5 → Meilisearch |
| `server/api/progress-routes.js` | SQLite → Mongoose |
| `server/api/leaderboard-routes.js` | SQLite → Mongoose |
| `server/auth/firebase-auth.js` | SQLite → Mongoose |
| `server/auth/session-middleware.js` | SQLite → Mongoose |

## Implementation Steps

### 1. Update `server/api/search-routes.js`

```javascript
import { Hono } from 'hono';
import { getMeiliClient } from '../db/meilisearch-client.js';

export const searchRoutes = new Hono()
  .get('/api/search', async (c) => {
    const raw = c.req.query('q');
    const q = String(raw || '').trim();
    
    if (q.length < 2) {
      return c.json({ results: [] });
    }
    
    try {
      const meili = getMeiliClient();
      const index = meili.index('labs');
      
      const searchResult = await index.search(q, {
        limit: 10,
        attributesToHighlight: ['title', 'tldrTerms', 'tldrDefinitions'],
        highlightPreTag: '<mark>',
        highlightPostTag: '</mark>',
      });
      
      // [RED TEAM] Removed filePath from response - internal path disclosure
      const results = searchResult.hits.map(hit => ({
        slug: hit.slug,
        module: hit.module,
        title: hit.title,
        preview: hit._formatted?.tldrDefinitions?.slice(0, 200) || '',
      }));
      
      return c.json({ results });
    } catch (err) {
      console.error('[search] Meilisearch error:', err.message);
      return c.json({ error: 'search_failed', results: [] }, 500);
    }
  });
```

### 2. Update `server/api/progress-routes.js`

```javascript
import { Hono } from 'hono';
import { Progress } from '../db/models/index.js';
import { anonUuidMiddleware } from '../lib/anon-uuid-cookie.js';
import { requireAuth } from '../auth/require-auth.js';

const SLUG_RE = /^[a-z0-9-]{1,64}$/i;

export const progressRoutes = new Hono()
  .use('/api/progress', anonUuidMiddleware)
  .use('/api/progress/*', anonUuidMiddleware)
  
  .get('/api/me', (c) => {
    const user = c.get('user');
    if (!user) return c.json({ user: null });
    return c.json({
      user: {
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
      },
    });
  })
  
  .get('/api/progress', async (c) => {
    const user = c.get('user');
    const query = user ? { userId: user._id } : { userUuid: c.get('userUuid') };
    
    const rows = await Progress.find(query)
      .select('labSlug openedAt completedAt quizScore lastUpdated')
      .sort({ lastUpdated: -1 })
      .lean();
    
    const progress = rows.map(r => ({
      lab_slug: r.labSlug,
      opened_at: r.openedAt ? Math.floor(r.openedAt.getTime() / 1000) : null,
      completed_at: r.completedAt ? Math.floor(r.completedAt.getTime() / 1000) : null,
      quiz_score: r.quizScore,
      last_updated: r.lastUpdated ? Math.floor(r.lastUpdated.getTime() / 1000) : null,
    }));
    
    return c.json({ progress });
  })
  
  .post('/api/progress', requireAuth, async (c) => {
    const user = c.get('user');
    
    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_json' }, 400); }
    
    if (!body || !SLUG_RE.test(String(body.lab_slug || ''))) {
      return c.json({ error: 'invalid_lab_slug' }, 400);
    }
    
    // [RED TEAM] Use userId as filter for authenticated users, not userUuid
    const update = {
      // [RED TEAM] Use ternary instead of && to handle quiz_score=0
      ...(body.opened_at != null && Number.isFinite(body.opened_at) && body.opened_at > 0 
          ? { openedAt: new Date(body.opened_at * 1000) } : {}),
      ...(body.completed_at != null && Number.isFinite(body.completed_at) && body.completed_at > 0 
          ? { completedAt: new Date(body.completed_at * 1000) } : {}),
      ...(body.quiz_score != null && Number.isFinite(body.quiz_score) 
          ? { quizScore: Math.max(0, Math.min(100, Math.floor(body.quiz_score))) } : {}),
    };
    
    await Progress.findOneAndUpdate(
      { userId: user._id, labSlug: body.lab_slug },
      { $set: update, $setOnInsert: { userId: user._id, labSlug: body.lab_slug } },
      { upsert: true }
    );
    
    return c.json({ ok: true });
  })
  
  .post('/api/progress/migrate', requireAuth, async (c) => {
    const user = c.get('user');
    const uuid = c.get('userUuid');
    
    let body;
    try { body = await c.req.json(); } catch { return c.json({ error: 'invalid_json' }, 400); }
    
    if (!Array.isArray(body?.items)) return c.json({ error: 'items_required' }, 400);
    if (body.items.length > 200) return c.json({ error: 'too_many_items' }, 400);
    
    let imported = 0;
    const bulkOps = [];
    
    for (const it of body.items) {
      if (!SLUG_RE.test(String(it.lab_slug || ''))) continue;
      
      bulkOps.push({
        updateOne: {
          filter: { userUuid: uuid, labSlug: it.lab_slug },
          update: {
            $set: {
              userId: user._id,
              ...(Number.isFinite(it.opened_at) && { openedAt: new Date(it.opened_at * 1000) }),
              ...(Number.isFinite(it.completed_at) && { completedAt: new Date(it.completed_at * 1000) }),
              ...(Number.isFinite(it.quiz_score) && { quizScore: Math.max(0, Math.min(100, it.quiz_score | 0)) }),
            },
            $setOnInsert: { userUuid: uuid, labSlug: it.lab_slug },
          },
          upsert: true,
        },
      });
      imported++;
    }
    
    if (bulkOps.length > 0) {
      await Progress.bulkWrite(bulkOps);
    }
    
    return c.json({ ok: true, imported });
  });
```

### 3. Update `server/api/leaderboard-routes.js`

```javascript
import { Hono } from 'hono';
import { User } from '../db/models/index.js';
import { Progress } from '../db/models/index.js';

export const leaderboardRoutes = new Hono()
  .get('/api/leaderboard', async (c) => {
    const pipeline = [
      {
        $match: { completedAt: { $ne: null } }
      },
      {
        $group: {
          _id: '$userId',
          completedCount: { $sum: 1 },
          avgScore: { $avg: '$quizScore' },
          lastActive: { $max: '$lastUpdated' },
        }
      },
      {
        $match: { _id: { $ne: null }, completedCount: { $gt: 0 } }
      },
      {
        $sort: { completedCount: -1, avgScore: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        // [RED TEAM] preserveNullAndEmptyArrays to handle orphaned progress records
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
          // [RED TEAM] Removed firebaseUid - unnecessary exposure
          displayName: { $ifNull: ['$user.displayName', 'Anonymous'] },
          photoUrl: '$user.photoUrl',
          completedCount: 1,
          avgScore: 1,
          lastActive: 1,
        }
      }
    ];
    
    const rows = await Progress.aggregate(pipeline);
    
    return c.json({
      leaderboard: rows.map((r, idx) => ({
        rank: idx + 1,
        // [RED TEAM] firebaseUid removed from response
        displayName: r.displayName,
        photoUrl: r.photoUrl,
        completedCount: r.completedCount,
        avgScore: r.avgScore != null ? Math.round(r.avgScore) : null,
        lastActive: r.lastActive ? Math.floor(r.lastActive.getTime() / 1000) : null,
      })),
    });
  });
```

### 4. Update `server/auth/firebase-auth.js`

<!-- Updated: Validation Session 1 - Skip transactions, use sequential ops -->

Key changes:
- Replace `db.prepare()` with Mongoose operations
- Use `User.findOneAndUpdate()` for upsert
- Use `Session.create()` for new session
- Use `Progress.updateMany()` for anonymous merge

```javascript
// Sequential ops pattern (no replica set required)
export async function handleFirebaseLogin(firebaseUser, userUuid) {
  // 1. Upsert user
  const user = await User.findOneAndUpdate(
    { firebaseUid: firebaseUser.uid },
    { $set: { email: firebaseUser.email, displayName: firebaseUser.name, photoUrl: firebaseUser.picture } },
    { upsert: true, new: true }
  );
  
  // 2. Merge anonymous progress (best effort - partial failure acceptable)
  await Progress.updateMany(
    { userUuid, userId: null },
    { $set: { userId: user._id } }
  ).catch(err => console.warn('[auth] Progress merge partial failure:', err.message));
  
  // 3. Create session
  const sid = crypto.randomUUID();
  const tokenHash = sha256(sid);
  await Session.create({
    tokenHash,
    userId: user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  
  return { user, sid };
}
```

**NOTE:** Sequential ops, not atomic. Partial failure on progress merge is acceptable for early-stage project.

### 5. Update `server/auth/session-middleware.js`

```javascript
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
      c.set('user', {
        _id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        displayName: user.displayName,
        photoUrl: user.photoUrl,
      });
    }
    // Note: TTL index auto-deletes expired sessions
  }

  await next();
};
```

## Todo List

- [x] Update `server/api/search-routes.js`
- [x] Update `server/api/progress-routes.js`
- [x] Update `server/api/leaderboard-routes.js`
- [x] Update `server/auth/firebase-auth.js`
- [x] Update `server/auth/session-middleware.js`
- [x] **[RED TEAM]** Audit `server/auth/require-auth.js` for `user.id` vs `user._id`
- [x] **[RED TEAM]** Run `grep -r 'user\.id\b' server/` to find all integer id references
- [x] **[VALIDATION]** Update frontend leaderboard to not expect `firebaseUid`
- [x] Test all endpoints manually

## Success Criteria

- `GET /api/search?q=docker` returns Meilisearch results
- `GET /api/progress` returns user progress
- `POST /api/progress` creates/updates progress
- `GET /api/leaderboard` returns top 10 users
- Login/logout works with MongoDB sessions

## Next Steps

→ Phase 4: Sync Scripts
