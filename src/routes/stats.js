/**
 * Stats route
 * Returns comprehensive player statistics
 * Supports searching any player via query parameter
 */

import express from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { cacheMiddleware } from '../middlewares/cache.js';
import { 
  getPlayerData, 
  getPlayerStats, 
  hasCS2Data,
  formatStats 
} from '../services/faceitService.js';

const router = express.Router();

/**
 * GET /stats?player=nickname
 * Returns comprehensive player statistics
 * Optional query parameter 'player' to search any player
 */
router.get('/', 
  cacheMiddleware('stats', (req) => !req.query.player), // Cache only default player
  asyncHandler(async (req, res) => {
    const playerQuery = req.query.player;
    
    // Get player data
    const playerData = await getPlayerData(playerQuery);
    
    if (!hasCS2Data(playerData)) {
      throw new Error('Dados de CS2 não encontrados para o jogador'); // TODO: Translate to English if needed
    }

    // Get player statistics
    const statsData = await getPlayerStats(playerData.player_id);
    
    // Format and send response
    const formattedStats = formatStats(playerData, statsData);
    res.send(formattedStats);
  })
);

export default router;

