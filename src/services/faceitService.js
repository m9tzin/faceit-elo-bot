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
    `Wins: ${lifetime['Wins'] || 0}`,
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

/**
 * Calculate today's statistics (wins, losses, elo change)
 * @param {Array} matches - Match history array
 * @param {string} playerId - Player ID
 * @param {number} currentElo - Current ELO rating
 * @returns {Object} Today's stats { wins, losses, eloChange }
 */
export function calculateTodayStats(matches, playerId, currentElo) {
  if (!matches || matches.length === 0) {
    return { wins: 0, losses: 0, eloChange: 0 };
  }

  // Get today's date (start of day in UTC)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const todayTimestamp = today.getTime();

  let wins = 0;
  let losses = 0;
  const todayMatches = [];

  // Filter matches from today
  matches.forEach(match => {
    if (!match.finished_at) return;
    
    // Check if match was played today
    const matchDate = new Date(match.finished_at * 1000); // FACEIT uses Unix timestamp
    matchDate.setUTCHours(0, 0, 0, 0);
    
    if (matchDate.getTime() === todayTimestamp) {
      const teams = match.teams;
      let playerTeam = null;

      // Find which team the player was on
      if (teams.faction1.players.some(p => p.player_id === playerId)) {
        playerTeam = 'faction1';
      } else if (teams.faction2.players.some(p => p.player_id === playerId)) {
        playerTeam = 'faction2';
      }

      if (playerTeam) {
        // Check if player's team won
        const won = match.results.winner === playerTeam;
        
        if (won) {
          wins++;
        } else {
          losses++;
        }

        // Store match with elo info if available
        const playerTeamData = teams[playerTeam];
        if (playerTeamData.players) {
          const playerData = playerTeamData.players.find(p => p.player_id === playerId);
          if (playerData) {
            // Try different possible field names for elo data
            const eloAfter = playerData.elo_after || playerData.elo || playerData.faceit_elo || null;
            const eloBefore = playerData.elo_before || playerData.elo_start || null;
            
            todayMatches.push({
              won,
              eloAfter,
              eloBefore,
              timestamp: match.finished_at
            });
          }
        }
      }
    }
  });

  // Calculate elo change
  let eloChange = 0;
  
  if (todayMatches.length > 0) {
    // Sort matches by timestamp (oldest first) to ensure correct order
    todayMatches.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
    
    const oldestMatch = todayMatches[0];
    const newestMatch = todayMatches[todayMatches.length - 1];
    
    // Try to get precise elo change from API data
    if (oldestMatch.eloBefore !== null && newestMatch.eloAfter !== null) {
      // Calculate from oldest match before to newest match after
      eloChange = newestMatch.eloAfter - oldestMatch.eloBefore;
    } else if (oldestMatch.eloBefore !== null) {
      // Calculate from oldest match before to current elo
      eloChange = currentElo - oldestMatch.eloBefore;
    } else {
      // Fallback: estimate based on wins/losses (approximate)
      // Typical FACEIT elo change: ~20-30 for win, ~20-30 for loss
      eloChange = (wins * 25) - (losses * 25);
    }
  }

  return { wins, losses, eloChange };
}

