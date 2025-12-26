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
 * Make authenticated request to FACEIT API
 * @param {string} endpoint - API endpoint
 * @returns {Promise<Object>} API response
 */
async function faceitRequest(endpoint) {
  const url = `${config.faceit.baseUrl}${endpoint}`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.faceit.apiKey}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`FACEIT API returned status ${response.status}`);
  }

  return await response.json();
}

/**
 * Get player data by nickname with case-insensitive fallback
 * Tries multiple variations if the exact nickname fails
 * @param {string} [nickname] - Player nickname (optional, uses default if not provided)
 * @returns {Promise<Object>} Player data
 */
export async function getPlayerData(nickname) {
  const playerNick = normalizeNickname(nickname);
  
  // Try variations in order: original, lowercase, uppercase, capitalize
  const variations = [
    playerNick,
    playerNick.toLowerCase(),
    playerNick.toUpperCase(),
    playerNick.charAt(0).toUpperCase() + playerNick.slice(1).toLowerCase()
  ];
  
  // Remove duplicates
  const uniqueVariations = [...new Set(variations)];
  
  let lastError = null;
  
  for (const variation of uniqueVariations) {
    try {
      const encodedNickname = encodeURIComponent(variation);
      const data = await faceitRequest(`/players?nickname=${encodedNickname}`);
      return data;
    } catch (error) {
      lastError = error;
      // Continue to next variation
    }
  }
  
  // If all variations failed, throw a 404 error with user-friendly message
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
 * @param {number} [limit=10] - Number of matches to retrieve
 * @returns {Promise<Object>} Match history
 */
export async function getPlayerHistory(playerId, limit = 10) {
  return await faceitRequest(`/players/${playerId}/history?game=cs2&offset=0&limit=${limit}`);
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
 * @param {Object} playerData - Player data
 * @param {Object} statsData - Statistics data
 * @returns {string} Formatted statistics string
 */
export function formatStats(playerData, statsData) {
  const lifetime = statsData.lifetime;
  
  return [
    `${playerData.nickname}:`,
    `ELO: ${playerData.games.cs2.faceit_elo}`,
    `Level: ${playerData.games.cs2.skill_level}`,
    `Vitórias: ${lifetime['Wins'] || 0}`,
    `Winrate: ${lifetime['Win Rate %'] || 0}%`,
    `K/D: ${lifetime['Average K/D Ratio'] || 0}`,
    `HS%: ${lifetime['Average Headshots %'] || 0}%`
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

  return `Últimas 10: ${results.join(' ')}`;
}

