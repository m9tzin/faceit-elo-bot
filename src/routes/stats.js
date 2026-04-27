/**
 * Stats route
 * Returns comprehensive player statistics based on last 30 matches
 * Supports searching any player via query parameter
 */

import express from "express";
import { asyncHandler, MissingNicknameError, CS2DataNotFoundError } from "../middlewares/errorHandler.js";
import { cache } from "../utils/cache.js";
import { config } from "../config/index.js";
import {
  getPlayerData,
  hasCS2Data,
  calculateLast30MatchesStats,
  formatStatsFromLast30,
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
 * GET /stats?player=nickname or ?nick=nickname
 * Returns comprehensive player statistics
 * `player` or `nick` is required (no default player for this route)
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const rawPlayer =
      getStringParam(req.query.player) ||
      getStringParam(req.query.nick) ||
      null;

    if (isPlaceholder(rawPlayer)) {
      throw new MissingNicknameError();
    }

    const playerQuery = rawPlayer;

    const cacheKey = `stats:${playerQuery.toLowerCase()}`;

    const cachedData = cache.get(cacheKey, config.cache.statsTtl);

    if (cachedData) {
      return res.send(cachedData);
    }

    const NIGHTBOT_DEADLINE_MS = 4500;

    const work = (async () => {
      const playerData = await getPlayerData(playerQuery);

      if (!hasCS2Data(playerData)) {
        throw new CS2DataNotFoundError();
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
