/**
 * ELO route
 * Returns the current ELO for the default player
 * Supports searching any player via query parameter
 */

import express from "express";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { cache } from "../utils/cache.js";
import { config } from "../config/index.js";
import {
  getPlayerData,
  hasCS2Data,
  calculateTodayStats,
} from "../services/faceitService.js";

const router = express.Router();

/**
 * GET /elo?player=nickname or ?nick=nickname
 * Returns current CS2 ELO for default player
 * Optional query: `player` (preferred) or `nick` — same meaning; if both are set, `player` wins
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    // Safely extract player query, handling arrays and ensuring string type
    let playerQuery = null;
    if (typeof req.query.player === 'string') {
      playerQuery = req.query.player.trim();
    } else if (Array.isArray(req.query.player) && typeof req.query.player[0] === 'string') {
      playerQuery = req.query.player[0].trim();
    } else if (typeof req.query.nick === 'string') {
      playerQuery = req.query.nick.trim();
    } else if (Array.isArray(req.query.nick) && typeof req.query.nick[0] === 'string') {
      playerQuery = req.query.nick[0].trim();
    }

    // Generate cache key based on player
    const cacheKey = playerQuery
      ? `elo:${playerQuery.toLowerCase()}`
      : "elo:default";

    // Check cache first
    const cachedData = cache.get(cacheKey, config.cache.ttl);
    if (cachedData) {
      return res.send(cachedData);
    }

    // Get player data (uses default player if no query provided)
    const playerData = await getPlayerData(playerQuery);

    if (!hasCS2Data(playerData)) {
      throw new Error("Dados de CS2 não encontrados para o jogador");
    }

    const elo = playerData.games.cs2.faceit_elo;

    // Calculate today's stats (W/L)
    const todayStats = await calculateTodayStats(playerData.player_id, elo);

    // Format response: ELO, W: X, L: Y
    const response = `${elo}, W: ${todayStats.wins}, L: ${todayStats.losses}`;

    // Cache the response
    cache.set(cacheKey, response);

    res.send(response);
  }),
);

export default router;