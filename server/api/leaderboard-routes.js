import { Hono } from 'hono';
import { Progress } from '../db/models/index.js';

export const leaderboardRoutes = new Hono()
  .get('/api/leaderboard', async (c) => {
    try {
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
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true }
      },
      {
        $project: {
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
          odid: r._id?.toString() || `anon-${idx}`,
          displayName: r.displayName,
          photoUrl: r.photoUrl,
          completedCount: r.completedCount,
          avgScore: r.avgScore != null ? Math.round(r.avgScore) : null,
          lastActive: r.lastActive ? Math.floor(r.lastActive.getTime() / 1000) : null,
        })),
      });
    } catch (err) {
      console.error('[leaderboard] aggregate error:', err.message);
      return c.json({ error: 'leaderboard_unavailable', leaderboard: [] }, 500);
    }
  });
