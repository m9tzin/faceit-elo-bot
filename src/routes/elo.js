/**
 * ELO route
 * Returns the current ELO for the default player with today's statistics
 * Supports searching any player via query parameter
 */

import express from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { cache } from '../utils/cache.js';
import { config } from '../config/index.js';
import { 
  getPlayerData, 
  getPlayerHistory,
  hasCS2Data,
  calculateTodayStats 
} from '../services/faceitService.js';

const router = express.Router();

/**
 * GET /elo?nick=nickname
 * Returns current CS2 ELO for default player with today's stats
 * Optional query parameter 'nick' to search any player
 * Format: Elo: 3776. Today -> Win: 0 Lose: 0
 */
router.get('/', 
  asyncHandler(async (req, res) => {
    const playerQuery = req.query.nick?.trim() || null;
    
    // Generate cache key based on player
    const cacheKey = playerQuery ? `elo:${playerQuery.toLowerCase()}` : 'elo:default';
    
    // Check cache first
    const cachedData = cache.get(cacheKey, config.cache.ttl);
    if (cachedData) {
      return res.send(cachedData);
    }
    
    // Get player data (uses default player if no query provided)
    const playerData = await getPlayerData(playerQuery);
    
    if (!hasCS2Data(playerData)) {
      throw new Error('Dados de CS2 não encontrados para o jogador'); // TODO: Translate to English if needed
    }

    const elo = playerData.games.cs2.faceit_elo;
    const playerId = playerData.player_id;

    // Get match history (last 20 matches)
    const historyData = await getPlayerHistory(playerId, 20);
    
    // Calculate today's statistics (wins and losses)
    const todayStats = calculateTodayStats(historyData.items, playerId);
    
    // Format response
    const response = `Elo: ${elo}. Today -> Win: ${todayStats.wins} Lose: ${todayStats.losses}`;
    
    // Cache the response
    cache.set(cacheKey, response);
    
    res.send(response);
  })
);

export default router;

