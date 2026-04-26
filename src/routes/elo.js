/**
 * ELO route
 * Returns the current ELO for the default player
 * Supports searching any player via query parameter
 */

import express from "express";
import { asyncHandler, NoCS2DataError } from "../middlewares/errorHandler.js";
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
    const getStringParam = (p) => typeof p === 'string' ? p.trim() : Array.isArray(p) ? p[0]?.trim() ?? null : null;
    const playerQuery = getStringParam(req.query.player) || getStringParam(req.query.nick) || null;

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
      throw new NoCS2DataError();
    }

    const elo = playerData.games.cs2.faceit_elo;

    // Calculate today's stats (W/L)
    const todayStats = await calculateTodayStats(playerData.player_id, elo);

    // Format response: ELO, W: X, L: Y
    const response = `${elo}, W: ${todayStats.wins}, L: ${todayStats.losses}`;

    // Cache the response
    cache.set(cacheKey, response, config.cache.maxEntries);

    res.send(response);
  }),
);

export default router;