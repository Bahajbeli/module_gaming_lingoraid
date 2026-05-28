const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getMeta, buildQuizSession, LEVELS } = require('../services/vocabService');

const router = express.Router();

/** GET /api/vocab-quiz/meta — counts per level (A1, A2, B1) */
router.get('/meta', authenticateToken, async (req, res) => {
  try {
    const meta = await getMeta();
    res.json({ success: true, ...meta });
  } catch (error) {
    console.error('[vocab-quiz] meta:', error);
    res.status(500).json({ success: false, error: 'Failed to load vocabulary metadata' });
  }
});

/**
 * GET /api/vocab-quiz/session
 * Query: count=10, levels=a1,a2,b1 (default: all levels)
 */
router.get('/session', authenticateToken, async (req, res) => {
  try {
    const levelsParam = req.query.levels;
    let levels;
    if (levelsParam === 'all' || !levelsParam) {
      levels = LEVELS;
    } else {
      levels = String(levelsParam)
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter((l) => LEVELS.includes(l));
      if (levels.length === 0) levels = LEVELS;
    }

    const session = await buildQuizSession({
      levels,
      count: req.query.count || 10,
    });

    res.json({
      success: true,
      ...session,
    });
  } catch (error) {
    console.error('[vocab-quiz] session:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to build quiz session',
    });
  }
});

module.exports = router;
