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
 * @param {number} [limit=20] - Number of matches to retrieve
 * @returns {Promise<Object>} Match history with all items
 */
export async function getPlayerHistory(playerId, limit = 20) {
  const response = await faceitRequest(`/players/${playerId}/history?game=cs2&offset=0&limit=${limit}`);
  return { items: response.items || [] };
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
 * Format player statistics for display
 * Follows Faceit Tracker format: ELO | Level | Avg Kills | K/D | HS% | Winrate
 * @param {Object} playerData - Player data
 * @param {Object} statsData - Statistics data
 * @returns {string} Formatted statistics string
 */
export function formatStats(playerData, statsData) {
  const lifetime = statsData.lifetime;
  
  // Extract values with fallbacks
  const elo = playerData.games.cs2.faceit_elo || 0;
  const level = playerData.games.cs2.skill_level || 0;
  const kd = lifetime['Average K/D Ratio'] || 0;
  const hsPercent = lifetime['Average Headshots %'] || 0;
  const winrate = lifetime['Win Rate %'] || 0;
  
  // Calculate Average Kills per Match (like Faceit Tracker)
  const totalKills = parseFloat(lifetime['Total Kills with extended stats'] || 0);
  const totalMatches = parseFloat(lifetime['Total Matches'] || lifetime['Matches'] || 1);
  const avgKills = totalMatches > 0 ? totalKills / totalMatches : 0;
  
  // Format Average Kills to one decimal place
  const formattedAvgKills = avgKills.toFixed(1);
  
  return [
    `${playerData.nickname}:`,
    `ELO: ${elo}`,
    `Level: ${level}`,
    `Avg Kills: ${formattedAvgKills}`,
    `K/D: ${kd}`,
    `HS%: ${hsPercent}%`,
    `Winrate: ${winrate}%`
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

