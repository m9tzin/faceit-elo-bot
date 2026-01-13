/**
 * FACEIT API Service
 * Handles all interactions with the FACEIT API
 */

import fetch from 'node-fetch';
import { config } from '../config/index.js';
import { PlayerNotFoundError } from '../middlewares/errorHandler.js';

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
  
  // Create AbortController for timeout
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
      throw new Error(`FACEIT API returned status ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Handle timeout errors
    if (error.name === 'AbortError') {
      throw new Error('FACEIT API timeout');
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
  
  // Try variations: original, lowercase, uppercase, capitalize
  const variations = [
    playerNick,
    playerNick.toLowerCase(),
    playerNick.toUpperCase(),
    playerNick.charAt(0).toUpperCase() + playerNick.slice(1).toLowerCase()
  ];
  
  // Remove duplicates
  const uniqueVariations = [...new Set(variations)];
  
  // Try all variations in parallel (faster response, respects Nightbot 5s timeout)
  const requests = uniqueVariations.map(async (variation) => {
    try {
      const encodedNickname = encodeURIComponent(variation);
      const data = await faceitRequest(`/players?nickname=${encodedNickname}`);
      return { success: true, data };
    } catch (error) {
      return { success: false, error };
    }
  });
  
  // Wait for all requests to complete
  const results = await Promise.all(requests);
  
  // Return first successful result
  const successResult = results.find(r => r.success);
  if (successResult) {
    return successResult.data;
  }
  
  // If all variations failed, throw player not found error
  throw new PlayerNotFoundError();
}

/**
 * Get player statistics for CS2
 * @param {string} playerId - Player ID
 * @returns {Promise<Object>} Player statistics
 */
export async function getPlayerStats(playerId) {
  try {
    return await faceitRequest(`/players/${playerId}/stats/cs2`);
  } catch (error) {
    // If stats not found, it means player has no CS2 data
    if (error.message.includes('404')) {
      throw new Error('Jogador não possui dados de CS2');
    }
    throw error;
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
  try {
    return await faceitRequest(`/matches/${matchId}/stats`, 6000);
  } catch (error) {
    // Return null if match stats not available
    return null;
  }
}

/**
 * Calculate statistics from last 30 matches
 * @param {string} playerId - Player ID
 * @returns {Promise<Object>} Calculated statistics
 */
export async function calculateLast30MatchesStats(playerId) {
  // Get last 30 matches
  const historyData = await getPlayerHistory(playerId, 30);
  const matches = historyData.items;
  
  if (!matches || matches.length === 0) {
    return {
      avgKills: 0,
      kd: 0,
      hsPercent: 0,
      winrate: 0
    };
  }

  // Fetch match stats in parallel
  const matchStatsPromises = matches.map(match => getMatchStats(match.match_id));
  const matchStatsResults = await Promise.all(matchStatsPromises);
  
  let totalKills = 0;
  let totalDeaths = 0;
  let totalHeadshots = 0;
  let totalHeadshotKills = 0;
  let wins = 0;
  let validMatches = 0;

  // Process each match
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const matchStats = matchStatsResults[i];
    
    if (!matchStats || !matchStats.rounds || matchStats.rounds.length === 0) {
      continue;
    }

    // Find player team
    let playerTeam = null;
    if (match.teams.faction1.players.some(p => p.player_id === playerId)) {
      playerTeam = 'faction1';
    } else if (match.teams.faction2.players.some(p => p.player_id === playerId)) {
      playerTeam = 'faction2';
    }
    
    if (!playerTeam) continue;

    // Check win
    if (match.results.winner === playerTeam) {
      wins++;
    }

    // Get player stats from the match
    const roundData = matchStats.rounds[0]; // Use first round to get player stats
    if (!roundData || !roundData.teams) continue;

    const teamData = roundData.teams.find(t => t.team_id === match.teams[playerTeam].team_id);
    if (!teamData || !teamData.players) continue;

    const playerData = teamData.players.find(p => p.player_id === playerId);
    if (!playerData || !playerData.player_stats) continue;

    const stats = playerData.player_stats;
    totalKills += parseInt(stats['Kills'] || 0);
    totalDeaths += parseInt(stats['Deaths'] || 0);
    totalHeadshotKills += parseInt(stats['Headshots'] || 0);
    totalHeadshots += parseInt(stats['Headshots %'] || 0);
    
    validMatches++;
  }

  // Calculate averages
  const avgKills = validMatches > 0 ? Math.round(totalKills / validMatches) : 0;
  const kd = totalDeaths > 0 ? (totalKills / totalDeaths).toFixed(2) : totalKills.toFixed(2);
  const hsPercent = validMatches > 0 ? Math.round(totalHeadshots / validMatches) : 0;
  const winrate = matches.length > 0 ? Math.round((wins / matches.length) * 100) : 0;

  return {
    avgKills,
    kd,
    hsPercent,
    winrate
  };
}

/**
 * Check if player has CS2 data
 * @param {Object} playerData - Player data object
 * @returns {boolean} True if player has CS2 data
 */
export function hasCS2Data(playerData) {
  return !!(playerData?.games?.cs2?.faceit_elo);
}

/**
 * Format player statistics for display (based on last 30 matches)
 * Follows Faceit Tracker format: ELO | Level | Avg Kills | K/D | HS% | Winrate
 * @param {Object} playerData - Player data
 * @param {Object} calculatedStats - Calculated statistics from last 30 matches
 * @returns {string} Formatted statistics string
 */
export function formatStatsFromLast30(playerData, calculatedStats) {
  const elo = playerData.games.cs2.faceit_elo || 0;
  const level = playerData.games.cs2.skill_level || 0;
  
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

  const results = matches.map(match => {
    const teams = match.teams;
    let playerTeam = null;

    // Find which team the player was on
    if (teams.faction1.players.some(p => p.player_id === playerId)) {
      playerTeam = 'faction1';
    } else if (teams.faction2.players.some(p => p.player_id === playerId)) {
      playerTeam = 'faction2';
    }

    // Check if player's team won
    const won = match.results.winner === playerTeam;
    return won ? 'W' : 'L';
  });

  return `Últimas 10 (mais recente → antiga): ${results.join(' ')}`;
}

