/**
 * ELO route
 * Returns the current ELO for the default player with today's statistics
 */

import express from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { cacheMiddleware } from '../middlewares/cache.js';
import { 
  getPlayerData, 
  getPlayerHistory,
  hasCS2Data,
  calculateTodayStats 
} from '../services/faceitService.js';

const router = express.Router();

/**
 * GET /elo
 * Returns current CS2 ELO for default player with today's stats
 * Format: Elo: 3776. Today -> Win: 0 Lose: 0 Elo: 0
 */
router.get('/', 
  cacheMiddleware('elo'),
  asyncHandler(async (req, res) => {
    const playerData = await getPlayerData();
    
    if (!hasCS2Data(playerData)) {
      throw new Error('Dados de CS2 não encontrados para o jogador'); // TODO: Translate to English if needed
    }

    const elo = playerData.games.cs2.faceit_elo;
    const playerId = playerData.player_id;

    // Get match history (limit to 30 matches for performance)
    // Stops when finding a match not from today or when reaching 30 matches
    const historyData = await getPlayerHistory(playerId, 30, 30, true);
    
    // Calculate today's statistics
    const todayStats = calculateTodayStats(historyData.items, playerId, elo);
    
    // Format elo change: 0 without sign, positive with +, negative with -
    const eloChangeStr = todayStats.eloChange === 0 
      ? '0' 
      : todayStats.eloChange > 0 
        ? `+${todayStats.eloChange}` 
        : `${todayStats.eloChange}`;
    
    // Format response
    const response = `Elo: ${elo}. Today -> Win: ${todayStats.wins} Lose: ${todayStats.losses} Elo: ${eloChangeStr}`;
    
    res.send(response);
  })
);

export default router;

