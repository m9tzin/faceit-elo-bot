/**
 * Stats route
 * Returns comprehensive player statistics
 * Supports searching any player via query parameter
 */

import express from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { cache } from '../utils/cache.js';
import { config } from '../config/index.js';
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
  asyncHandler(async (req, res) => {
    const playerQuery = req.query.player?.trim() || null;
    
    // Generate cache key based on player
    const cacheKey = playerQuery ? `stats:${playerQuery.toLowerCase()}` : 'stats:default';
    
    // Check cache first
    const cachedData = cache.get(cacheKey, config.cache.ttl);
    
    if (cachedData) {
      return res.send(cachedData);
    }
    
    // Get player data
    const playerData = await getPlayerData(playerQuery);
    
    if (!hasCS2Data(playerData)) {
      throw new Error('Dados de CS2 não encontrados para o jogador'); // TODO: Translate to English if needed
    }

    // Get player statistics
    const statsData = await getPlayerStats(playerData.player_id);
    
    // Format and send response
    const formattedStats = formatStats(playerData, statsData);
    
    // Cache the response
    cache.set(cacheKey, formattedStats);
    
    res.send(formattedStats);
  })
);

export default router;

