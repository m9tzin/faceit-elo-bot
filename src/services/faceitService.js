/**
 * FACEIT API Service
 * Handles all interactions with the FACEIT API
 */

import fetch from 'node-fetch';
import { config } from '../config/index.js';
import { PlayerNotFoundError, FaceitApiError } from '../middlewares/errorHandler.js';
import { matchStatsCache } from '../utils/cache.js';

/**
 * Run an array of task factories with bounded concurrency.
 * Each factory is a () => Promise<T>. Returns results in order.
 * @param {Array<Function>} factories - Array of () => Promise<T>
 * @param {number} concurrency - Max parallel tasks
 * @returns {Promise<Array<T>>}
 */
async function promiseAllSettledLimit(factories, concurrency) {
  const results = new Array(factories.length);
  let next = 0;

  async function worker() {
    while (next < factories.length) {
      const idx = next++;
      results[idx] = await factories[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, factories.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

/**
 * Normalize player nickname (trim whitespace only)
 * @param {string} nickname - Player nickname
 * @returns {string} Normalized nickname
 */
function normalizeNickname(nickname) {
  return (nickname || config.faceit.defaultPlayer).trim();
}

/**
 * Make authenticated request to FACEIT API with timeout
 * @param {string} endpoint - API endpoint
 * @param {number} timeoutMs - Request timeout in milliseconds (default: 4000ms)
 * @returns {Promise<Object>} API response
 */
async function faceitRequest(endpoint, timeoutMs = 4000) {
  const url = `${config.faceit.baseUrl}${endpoint}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${config.faceit.apiKey}`,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new FaceitApiError(`FACEIT API returned status ${response.status}`, response.status);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new FaceitApiError('FACEIT API timeout');
    }

    throw error;
  }
}

/**
 * Get player data by nickname with case-insensitive fallback
 * Tries multiple variations in parallel for faster response
 * @param {string} [nickname] - Player nickname (optional, uses default if not provided)
 * @returns {Promise<Object>} Player data
 */
export async function getPlayerData(nickname) {
  const playerNick = normalizeNickname(nickname);

  const variations = [
    playerNick,
    playerNick.toLowerCase(),
    playerNick.toUpperCase(),
    playerNick.charAt(0).toUpperCase() + playerNick.slice(1).toLowerCase()
  ];

  const uniqueVariations = [...new Set(variations)];

  const requests = uniqueVariations.map(async (variation) => {
    const encodedNickname = encodeURIComponent(variation);
    return faceitRequest(`/players?nickname=${encodedNickname}`);
  });

  try {
    return await Promise.any(requests);
  } catch (aggregateError) {
    const causes = aggregateError.errors || [];
    const hasApiError = causes.some(e => e instanceof FaceitApiError && !e.isNotFound);
    if (hasApiError) {
      throw new FaceitApiError('Erro ao buscar dados da FACEIT');
    }
    throw new PlayerNotFoundError();
  }
}

/**
 * Get player match history
 * @param {string} playerId - Player ID
 * @param {number} [limit=30] - Number of matches to retrieve
 * @returns {Promise<Object>} Match history with all items
 */
export async function getPlayerHistory(playerId, limit = 30) {
  const response = await faceitRequest(`/players/${playerId}/history?game=cs2&offset=0&limit=${limit}`);
  return { items: response.items || [] };
}

/**
 * Get match statistics by match ID
 * @param {string} matchId - Match ID
 * @returns {Promise<Object|null>} Match statistics or null if error
 */
async function getMatchStats(matchId) {
  const cached = matchStatsCache.get(matchId);
  if (cached) return cached;

  try {
    const data = await faceitRequest(`/matches/${matchId}/stats`, 6000);
    matchStatsCache.set(matchId, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Get today's starting point timestamp (like fls-web HUD)
 * The "day" starts at 07:00 local time; matches before that
 * are considered part of the previous day/session.
 * @returns {number} Timestamp in milliseconds
 */
function getTodayStartingPointDate() {
  const STARTING_POINT_HOUR = 7;
  const now = new Date();

  if (now.getHours() < STARTING_POINT_HOUR) {
    now.setDate(now.getDate() - 1);
  }

  now.setHours(STARTING_POINT_HOUR, 0, 0, 0);
  return now.getTime();
}

/**
 * Safely extract the player's team from a match object.
 * @param {Object} match - Match object from FACEIT history
 * @param {string} playerId - Player ID
 * @returns {string|null} 'faction1', 'faction2', or null
 */
function findPlayerTeam(match, playerId) {
  const teams = match?.teams;
  if (!teams) return null;

  if (teams.faction1?.players?.some(p => p.player_id === playerId)) {
    return 'faction1';
  }
  if (teams.faction2?.players?.some(p => p.player_id === playerId)) {
    return 'faction2';
  }
  return null;
}

/**
 * Calculate today's W/L using the same logic as fls-web HUD
 * @param {string} playerId - Player ID
 * @returns {Promise<Object>} Stats: wins, losses
 */
export async function calculateTodayStats(playerId) {
  const historyData = await getPlayerHistory(playerId, 30);
  const matches = historyData.items;

  if (!matches || matches.length === 0) {
    return { wins: 0, losses: 0 };
  }

  const startingPoint = getTodayStartingPointDate();
  const todayMatches = matches.filter(match => (match.started_at * 1000) > startingPoint);

  let wins = 0;
  let losses = 0;

  for (const match of todayMatches) {
    const playerTeam = findPlayerTeam(match, playerId);
    if (!playerTeam) continue;

    if (match.results?.winner === playerTeam) {
      wins += 1;
    } else {
      losses += 1;
    }
  }

  return { wins, losses };
}

/**
 * Calculate statistics from last 30 matches
 * @param {string} playerId - Player ID
 * @returns {Promise<Object>} Calculated statistics
 */
export async function calculateLast30MatchesStats(playerId) {
  const historyData = await getPlayerHistory(playerId, 30);
  const matches = historyData.items;

  if (!matches || matches.length === 0) {
    return { avgKills: 0, kd: 0, hsPercent: 0, winrate: 0 };
  }

  const matchStatsResults = await promiseAllSettledLimit(
    matches.map(match => () => getMatchStats(match.match_id)),
    6
  );

  let totalKills = 0;
  let totalDeaths = 0;
  let totalHsPercent = 0;
  let wins = 0;
  let validMatches = 0;
  let participatedMatches = 0;

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchStats = matchStatsResults[i];

    const playerTeam = findPlayerTeam(match, playerId);
    if (!playerTeam) continue;

    participatedMatches++;

    if (match.results?.winner === playerTeam) {
      wins++;
    }

    if (!matchStats?.rounds?.length) continue;

    const roundData = matchStats.rounds[0];
    if (!roundData?.teams) continue;

    const teamData = roundData.teams.find(t => t.team_id === match.teams[playerTeam]?.team_id);
    if (!teamData?.players) continue;

    const playerData = teamData.players.find(p => p.player_id === playerId);
    if (!playerData?.player_stats) continue;

    const stats = playerData.player_stats;
    totalKills += parseInt(stats['Kills'] || 0);
    totalDeaths += parseInt(stats['Deaths'] || 0);
    totalHsPercent += parseInt(stats['Headshots %'] || 0);

    validMatches++;
  }

  const avgKills = validMatches > 0 ? Math.round(totalKills / validMatches) : 0;
  const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
  const hsPercent = validMatches > 0 ? Math.round(totalHsPercent / validMatches) : 0;
  const winrate = participatedMatches > 0 ? Math.round((wins / participatedMatches) * 100) : 0;

  return { avgKills, kd, hsPercent, winrate };
}

/**
 * Check if player has CS2 data
 * @param {Object} playerData - Player data object
 * @returns {boolean} True if player has CS2 data
 */
export function hasCS2Data(playerData) {
  return playerData?.games?.cs2?.faceit_elo != null;
}

/**
 * Format player statistics for display (based on last 30 matches)
 * Follows Faceit Tracker format: ELO | Level | Avg Kills | K/D | HS% | Winrate
 * @param {Object} playerData - Player data
 * @param {Object} calculatedStats - Calculated statistics from last 30 matches
 * @returns {string} Formatted statistics string
 */
export function formatStatsFromLast30(playerData, calculatedStats) {
  const cs2 = playerData.games?.cs2;
  const elo = cs2?.faceit_elo ?? 0;
  const level = cs2?.skill_level ?? 0;

  return [
    `${playerData.nickname}:`,
    `ELO: ${elo}`,
    `Level: ${level}`,
    `Avg Kills: ${calculatedStats.avgKills}`,
    `K/D: ${calculatedStats.kd}`,
    `HS%: ${calculatedStats.hsPercent}%`,
    `Winrate: ${calculatedStats.winrate}%`
  ].join(' | ');
}

/**
 * Process match history to get W/L streak
 * @param {Array} matches - Match history array
 * @param {string} playerId - Player ID
 * @returns {string} Formatted streak string
 */
export function processMatchStreak(matches, playerId) {
  if (!matches || matches.length === 0) {
    return 'Nenhuma partida encontrada';
  }

  const results = [];
  for (const match of matches) {
    const playerTeam = findPlayerTeam(match, playerId);
    if (!playerTeam) continue;

    const won = match.results?.winner === playerTeam;
    results.push(won ? 'W' : 'L');
  }

  if (results.length === 0) {
    return 'Nenhuma partida encontrada';
  }

  return `Últimas ${results.length} (mais recente → antiga): ${results.join(' ')}`;
}
