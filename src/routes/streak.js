/**
 * Streak route
 * Returns the last 10 match results (W/L) for the default player
 * Supports searching any player via query parameter
 */

import express from "express";
import { asyncHandler } from "../middlewares/errorHandler.js";
import { cache } from "../utils/cache.js";
import { config } from "../config/index.js";
import {
  getPlayerData,
  getPlayerHistory,
  processMatchStreak,
} from "../services/faceitService.js";

const router = express.Router();

/**
 * GET /streak?player=nickname or ?nick=nickname
 * Returns last 10 match results (W = Win, L = Loss) for default player
 * Optional query: `player` (preferred) or `nick` — if both are set, `player` wins
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
      ? `streak:${playerQuery.toLowerCase()}`
      : "streak:default";

    // Check cache first
    const cachedData = cache.get(cacheKey, config.cache.ttl);
    if (cachedData) {
      return res.send(cachedData);
    }

    // Get player data (uses default player if no query provided)
    const playerData = await getPlayerData(playerQuery);
    const playerId = playerData.player_id;

    // Get match history
    const historyData = await getPlayerHistory(playerId, 10);

    // Process and format streak
    const streak = processMatchStreak(historyData.items, playerId);

    // Cache the response
    cache.set(cacheKey, streak);

    res.send(streak);
  }),
);

export default router;