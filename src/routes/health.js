/**
 * Health check route
 * Used by monitoring services to check if the application is running
 */

import express from 'express';

const router = express.Router();

/**
 * GET /health
 * Returns OK if service is healthy
 */
router.get('/', (req, res) => {
  res.status(200).send('OK');
});

export default router;

