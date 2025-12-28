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
 * Format: Elo: 3776. Today -> Win: 0 Lose: 0
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

    // Get match history (last 20 matches)
    const historyData = await getPlayerHistory(playerId, 20);
    
    // Calculate today's statistics (wins and losses)
    const todayStats = calculateTodayStats(historyData.items, playerId);
    
    // Format response
    const response = `Elo: ${elo}. Today -> Win: ${todayStats.wins} Lose: ${todayStats.losses}`;
    
    res.send(response);
  })
);

export default router;

