/**
 * Stats route
 * Returns comprehensive player statistics based on last 30 matches
 * Supports searching any player via query parameter
 */

import express from "express";
import { asyncHandler, NoCS2DataError } from "../middlewares/errorHandler.js";
import { cache } from "../utils/cache.js";
import { config } from "../config/index.js";
import {
  getPlayerData,
  hasCS2Data,
  calculateLast30MatchesStats,
  formatStatsFromLast30,
} from "../services/faceitService.js";

const router = express.Router();

/**
 * GET /stats?player=nickname or ?nick=nickname
 * Returns comprehensive player statistics
 * `player` or `nick` is required (no default player for this route)
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const getStringParam = (p) =>
      typeof p === "string"
        ? p.trim()
        : Array.isArray(p)
          ? (p[0]?.trim() ?? null)
          : null;
    const rawPlayer =
      getStringParam(req.query.player) ||
      getStringParam(req.query.nick) ||
      null;

    // Nightbot expands `$(1)` para a string literal "null" quando o usuário
    // digita apenas `!stats` sem argumento; tratamos "null"/"undefined" como
    // ausência de nickname para evitar consultar um jogador com esse apelido.
    const isMissing =
      !rawPlayer || ["null", "undefined"].includes(rawPlayer.toLowerCase());

    if (isMissing) {
      return res
        .status(200)
        .send("Indique o nickname FACEIT (ex.: !stats togs)");
    }

    const playerQuery = rawPlayer;

    // Generate cache key based on player
    const cacheKey = `stats:${playerQuery.toLowerCase()}`;

    // Check cache first
    const cachedData = cache.get(cacheKey, config.cache.ttl);

    if (cachedData) {
      return res.send(cachedData);
    }

    // Get player data
    const playerData = await getPlayerData(playerQuery);

    if (!hasCS2Data(playerData)) {
      throw new NoCS2DataError();
    }

    // Calculate statistics from last 30 matches
    const calculatedStats = await calculateLast30MatchesStats(
      playerData.player_id,
    );

    // Format and send response
    const formattedStats = formatStatsFromLast30(playerData, calculatedStats);

    // Cache the response
    cache.set(cacheKey, formattedStats, config.cache.maxEntries);

    res.send(formattedStats);
  }),
);

export default router;
