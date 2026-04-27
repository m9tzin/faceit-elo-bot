/**
 * Streak route
 * Returns the last 10 match results (W/L) for the default player
 * Supports searching any player via query parameter
 */

import express from "express";
import { asyncHandler, NoCS2DataError } from "../middlewares/errorHandler.js";
import { cache } from "../utils/cache.js";
import { config } from "../config/index.js";
import {
  getPlayerData,
  getPlayerHistory,
  processMatchStreak,
  hasCS2Data,
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
 * GET /streak?player=nickname or ?nick=nickname
 * Returns last 10 match results (W = Win, L = Loss) for default player
 * Optional query: `player` (preferred) or `nick` — if both are set, `player` wins
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const raw = getStringParam(req.query.player) || getStringParam(req.query.nick) || null;
    const playerQuery = isPlaceholder(raw) ? null : raw;

    const cacheKey = playerQuery
      ? `streak:${playerQuery.toLowerCase()}`
      : "streak:default";

    const cachedData = cache.get(cacheKey, config.cache.ttl);
    if (cachedData) {
      return res.send(cachedData);
    }

    const playerData = await getPlayerData(playerQuery);

    if (!hasCS2Data(playerData)) {
      throw new NoCS2DataError();
    }

    const playerId = playerData.player_id;

    const historyData = await getPlayerHistory(playerId, 10);

    const streak = processMatchStreak(historyData.items, playerId);

    cache.set(cacheKey, streak, config.cache.maxEntries);

    res.send(streak);
  }),
);

export default router;
