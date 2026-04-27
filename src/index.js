/**
 * FACEIT ELO Bot
 * Main application entry point
 */

import express from 'express';
import { config, validateConfig } from './config/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

import healthRouter from './routes/health.js';
import eloRouter from './routes/elo.js';
import statsRouter from './routes/stats.js';
import streakRouter from './routes/streak.js';

try {
  validateConfig();
} catch (error) {
  console.error('Configuration Error:', error.message);
  process.exit(1);
}

const app = express();

app.use(express.json({ limit: '16kb' }));

app.use('/health', healthRouter);
app.use('/elo', eloRouter);
app.use('/stats', statsRouter);
app.use('/streak', streakRouter);

app.use(errorHandler);

const PORT = config.port;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Default player: ${config.faceit.defaultPlayer}`);
  console.log(`Cache TTL: ${config.cache.ttl / 1000}s`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /health - Health check`);
  console.log(`  GET /elo?player=<nickname> - Current ELO rating`);
  console.log(`  GET /stats?player=<nickname> - Player statistics (player required)`);
  console.log(`  GET /streak?player=<nickname> - Last 10 matches`);
});

function gracefulShutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
