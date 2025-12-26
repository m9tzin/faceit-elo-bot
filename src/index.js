/**
 * FACEIT ELO Bot
 * Main application entry point
 */

// Express framework
import express from 'express';
// Configuration
import { config, validateConfig } from './config/index.js';
import { errorHandler } from './middlewares/errorHandler.js';

// Import routes
import healthRouter from './routes/health.js';
import eloRouter from './routes/elo.js';
import statsRouter from './routes/stats.js';
import streakRouter from './routes/streak.js';

// Validate configuration
try {
  validateConfig();
} catch (error) {
  console.error('Configuration Error:', error.message);
  process.exit(1);
}

// Initialize Express app
const app = express();

// Middleware
app.use(express.json());

// Routes
app.use('/health', healthRouter);
app.use('/elo', eloRouter);
app.use('/stats', statsRouter);
app.use('/streak', streakRouter);

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`👤 Default player: ${config.faceit.defaultPlayer}`);
  console.log(`⏱️  Cache TTL: ${config.cache.ttl / 1000}s`);
  console.log(`\nEndpoints:`);
  console.log(`  GET /health - Health check`);
  console.log(`  GET /elo - Current ELO`);
  console.log(`  GET /stats?player=<nickname> - Player statistics`);
  console.log(`  GET /streak - Last 10 matches`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  process.exit(0);
});

