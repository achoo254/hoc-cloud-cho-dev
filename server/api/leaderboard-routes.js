import { Hono } from 'hono';
import db from '../db/sqlite-client.js';

const selectLeaderboard = db.prepare(`
  SELECT
    u.firebase_uid,
    u.display_name,
    u.photo_url,
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
        firebaseUid: r.firebase_uid,
        displayName: r.display_name,
        photoUrl: r.photo_url,
        completedCount: r.completed_count,
        avgScore: r.avg_score != null ? Math.round(r.avg_score) : null,
        lastActive: r.last_active,
      })),
    });
  });
