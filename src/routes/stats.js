/**
 * Stats route
 * Returns comprehensive player statistics based on last 30 matches
 * Supports searching any player via query parameter
 */

import express from "express";
import { asyncHandler } from "../middlewares/errorHandler.js";
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
        .send("Indique o nickname FACEIT (ex.: !stats s1mple)");
    }

    const playerQuery = rawPlayer;

    // Generate cache key based on player
    const cacheKey = `stats:${playerQuery.toLowerCase()}`;

    // Check cache first (stats use a longer TTL — historical data changes rarely)
    const cachedData = cache.get(cacheKey, config.cache.statsTtl);

    if (cachedData) {
      return res.send(cachedData);
    }

    // Race the actual work against a 4.5s deadline so Nightbot (5s timeout)
    // always gets a response instead of silently dropping it.
    const NIGHTBOT_DEADLINE_MS = 4500;

    const work = (async () => {
      const playerData = await getPlayerData(playerQuery);

      if (!hasCS2Data(playerData)) {
        throw new Error("Dados de CS2 não encontrados para o jogador");
      }

      const calculatedStats = await calculateLast30MatchesStats(
        playerData.player_id,
      );

      return formatStatsFromLast30(playerData, calculatedStats);
    })();

    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("__DEADLINE__")), NIGHTBOT_DEADLINE_MS),
    );

    let formattedStats;
    try {
      formattedStats = await Promise.race([work, timeout]);
    } catch (err) {
      if (err.message === "__DEADLINE__") {
        return res
          .status(200)
          .send("Stats demorou demais, tente novamente em instantes.");
      }
      throw err;
    }

    cache.set(cacheKey, formattedStats);

    res.send(formattedStats);
  }),
);

export default router;
