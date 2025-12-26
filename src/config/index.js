/**
 * Configuration module
 * Centralizes all environment variables and app settings
 */

export const config = {
  // Server configuration
  port: process.env.PORT || 3000,
  
  // FACEIT API configuration
  faceit: {
    apiKey: process.env.FACEIT_KEY,
    baseUrl: 'https://open.faceit.com/data/v4',
    defaultPlayer: process.env.PLAYER_NICKNAME || 'togs' // .env PLAYER_NICKNAME;
    .toLowerCase()
    .trim()
  },
  
  // Cache configuration
  cache: {
    ttl: 30 * 1000 // 30 seconds
  }
};

/**
 * Validates required environment variables
 */
export function validateConfig() {
  const required = ['FACEIT_KEY'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

