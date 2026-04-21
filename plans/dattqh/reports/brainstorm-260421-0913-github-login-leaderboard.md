# Brainstorm: GitHub Login + Public Leaderboard

**Date:** 2026-04-21  
**Status:** Approved → Plan creation

## Problem Statement

Add GitHub OAuth login to enable:
- Logged users: quiz tracking, progress, roadmap
- Guests: view-only (content + playground, no tracking)
- Public leaderboard showing all learners' progress

## Requirements Summary

| Aspect | Decision |
|--------|----------|
| Auth provider | GitHub OAuth only |
| Guest access | View content + playground, no tracking |
| Logged access | Full quiz, tracking, roadmap |
| Data migration | Auto-merge anonymous UUID → GitHub account |
| Leaderboard | Public, GitHub username + avatar |
| Roles | No differentiation (all users equal) |

## Current State

- Anonymous tracking via `hcl_uid` cookie (2yr expiry)
- `progress` table keyed by `user_uuid`
- Previous OAuth code existed (commit 6c553c4) but was removed (40486d9)

## Chosen Approach

**C: Fresh implementation** with `@hono/oauth-providers`
- Full control, minimal dependencies
- Match existing Hono stack
- Estimate: 2-3 days

## Technical Design

### Database Schema

```sql
-- New: users table
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  github_id INTEGER UNIQUE NOT NULL,
  username TEXT NOT NULL,
  avatar_url TEXT,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- New: sessions table  
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at INTEGER NOT NULL,
  created_at INTEGER DEFAULT (strftime('%s','now'))
);

-- Modify: progress table
ALTER TABLE progress ADD COLUMN user_id INTEGER REFERENCES users(id);
CREATE INDEX idx_progress_user_id ON progress(user_id);
```

### OAuth Flow

```
Guest → GET /auth/github → GitHub authorize
                            ↓
GitHub → /auth/github/callback
         ├→ Exchange code → access_token
         ├→ Fetch user (username, avatar)
         ├→ Upsert users table
         ├→ Auto-merge: UPDATE progress SET user_id=? WHERE user_uuid=?
         ├→ Create session (sha256 → DB)
         └→ Set cookie `sid`, redirect /
```

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/auth/github` | - | Redirect to GitHub |
| GET | `/auth/github/callback` | - | OAuth callback |
| POST | `/auth/logout` | ✓ | Clear session |
| GET | `/api/me` | ✓ | Current user info |
| GET | `/api/leaderboard` | - | Public rankings |
| GET | `/api/progress` | ✓ | User's progress |
| POST | `/api/progress` | ✓ | Update progress (logged only) |

### Session Storage

SQLite table with:
- `token_hash`: sha256 of session token
- `user_id`: FK to users
- `expires_at`: Unix timestamp
- Cron job to clean expired sessions

### Leaderboard Strategy

Real-time query:
```sql
SELECT u.username, u.avatar_url,
  COUNT(p.completed_at) as completed,
  AVG(p.quiz_score) as avg_score
FROM users u
JOIN progress p ON p.user_id = u.id
GROUP BY u.id
ORDER BY completed DESC
LIMIT 50
```

### Frontend Changes

1. Auth context (React) for user state
2. Login/logout button in header
3. Leaderboard widget on homepage
4. Quiz submission guard (require login)

### Security

- OAuth `state` param (CSRF)
- Session: `crypto.randomBytes(32)`
- DB stores hash, not plaintext
- Cookie: `HttpOnly`, `SameSite=Lax`, `Secure` (prod)
- Rate limit `/auth/*`: 10 req/min/IP

## Environment Variables

```
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
SESSION_SECRET=
```

## Next Steps

Create implementation plan with phases:
1. DB migration
2. OAuth routes
3. Session middleware
4. Progress routes update
5. Leaderboard API
6. Frontend auth UI
7. Testing
