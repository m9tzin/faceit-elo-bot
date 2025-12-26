/**
 * ELO route
 * Returns the current ELO for the default player
 */

import express from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { cacheMiddleware } from '../middlewares/cache.js';
import { getPlayerData, hasCS2Data } from '../services/faceitService.js';

const router = express.Router();

/**
 * GET /elo
 * Returns current CS2 ELO for default player
 */
router.get('/', 
  cacheMiddleware('elo'),
  asyncHandler(async (req, res) => {
    const playerData = await getPlayerData();
    
    if (!hasCS2Data(playerData)) {
      throw new Error('Dados de CS2 não encontrados para o jogador'); // TODO: Translate to English if needed
    }

    const elo = playerData.games.cs2.faceit_elo;
    res.send(elo.toString());
  })
);

export default router;

