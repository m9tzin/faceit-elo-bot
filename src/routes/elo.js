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

const NIGHTBOT_PLACEHOLDERS = ["null", "undefined", "$(1)", "$(2)"];

function getStringParam(p) {
  if (typeof p === "string") return p.trim();
  if (Array.isArray(p)) return p[0]?.trim() ?? null;
  return null;
}

function isPlaceholder(value) {
  return !value || NIGHTBOT_PLACEHOLDERS.includes(value.toLowerCase());
}

/**
 * GET /elo?player=nickname or ?nick=nickname
 * Returns current CS2 ELO for default player
 * Optional query: `player` (preferred) or `nick` — same meaning; if both are set, `player` wins
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const raw = getStringParam(req.query.player) || getStringParam(req.query.nick) || null;
    const playerQuery = isPlaceholder(raw) ? null : raw;

    const cacheKey = playerQuery
      ? `elo:${playerQuery.toLowerCase()}`
      : "elo:default";

    const cachedData = cache.get(cacheKey, config.cache.ttl);
    if (cachedData) {
      return res.send(cachedData);
    }

    const playerData = await getPlayerData(playerQuery);

    if (!hasCS2Data(playerData)) {
      throw new NoCS2DataError();
    }

    const elo = playerData.games.cs2.faceit_elo;

    const todayStats = await calculateTodayStats(playerData.player_id);

    const response = `${elo}, W: ${todayStats.wins}, L: ${todayStats.losses}`;

    cache.set(cacheKey, response, config.cache.maxEntries);

    res.send(response);
  }),
);

export default router;
