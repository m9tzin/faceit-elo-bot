/**
 * Streak route
 * Returns the last 10 match results (W/L) for the default player
 */

import express from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { cacheMiddleware } from '../middlewares/cache.js';
import { 
  getPlayerData, 
  getPlayerHistory,
  processMatchStreak 
} from '../services/faceitService.js';

const router = express.Router();

/**
 * GET /streak
 * Returns last 10 match results (W = Win, L = Loss) for default player
 */
router.get('/', 
  cacheMiddleware('streak'),
  asyncHandler(async (req, res) => {
    const playerData = await getPlayerData();
    const playerId = playerData.player_id;

    // Get match history
    const historyData = await getPlayerHistory(playerId, 10);
    
    // Process and format streak
    const streak = processMatchStreak(historyData.items, playerId);
    res.send(streak);
  })
);

export default router;

