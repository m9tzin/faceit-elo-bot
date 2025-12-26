# Architecture Documentation

## Project Structure

```
faceit-elo-bot/
├── src/
│   ├── config/
│   │   └── index.js              # Configuration management
│   ├── services/
│   │   └── faceitService.js      # FACEIT API integration
│   ├── routes/
│   │   ├── health.js             # Health check endpoint
│   │   ├── elo.js                # ELO endpoint
│   │   ├── stats.js              # Statistics endpoint
│   │   └── streak.js             # Match streak endpoint
│   ├── middlewares/
│   │   ├── cache.js              # Caching middleware
│   │   └── errorHandler.js       # Error handling middleware
│   ├── utils/
│   │   └── cache.js              # Cache utility
│   └── index.js                  # Application entry point
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── LICENSE                       # MIT License
├── package.json                  # Dependencies and scripts
├── README.md                     # User documentation
└── ARCHITECTURE.md               # This file

```

## Design Principles

### 1. Separation of Concerns
Each module has a single, well-defined responsibility:
- **Config**: Manages environment variables and app settings
- **Services**: Handles external API communication
- **Routes**: Defines HTTP endpoints
- **Middlewares**: Processes requests/responses
- **Utils**: Provides reusable utilities

### 2. Modularity
- Each route is in its own file
- Easy to add/remove features
- No tight coupling between modules

### 3. Error Handling
- Centralized error handling via middleware
- Async errors caught automatically
- User-friendly error messages

### 4. Caching Strategy
- Middleware-based caching
- Configurable TTL
- Per-endpoint cache keys
- Only default player queries are cached

## Module Documentation

### Config (`src/config/index.js`)

Centralizes all configuration:
- Environment variables
- API endpoints
- Cache settings
- Config validation

**Key Functions:**
- `config` - Configuration object
- `validateConfig()` - Validates required env vars

### FACEIT Service (`src/services/faceitService.js`)

Handles all FACEIT API interactions:
- Player data retrieval
- Statistics fetching
- Match history
- Data formatting

**Key Functions:**
- `getPlayerData(nickname)` - Get player by nickname
- `getPlayerStats(playerId)` - Get player statistics
- `getPlayerHistory(playerId, limit)` - Get match history
- `hasCS2Data(playerData)` - Validate CS2 data
- `formatStats(playerData, statsData)` - Format stats for display
- `processMatchStreak(matches, playerId)` - Process W/L streak

### Cache Utility (`src/utils/cache.js`)

Simple in-memory cache implementation:
- TTL-based expiration
- Per-key storage
- Get/Set/Clear operations

**Key Methods:**
- `get(key, ttl)` - Retrieve cached data
- `set(key, data)` - Store data in cache
- `clear(key)` - Clear specific or all cache

### Cache Middleware (`src/middlewares/cache.js`)

Automatic caching for routes:
- Transparent to route handlers
- Conditional caching support
- Response interception

**Key Function:**
- `cacheMiddleware(cacheKey, shouldCache)` - Create cache middleware

### Error Handler (`src/middlewares/errorHandler.js`)

Centralized error handling:
- Catches async errors
- Formats error responses
- Logs errors

**Key Functions:**
- `asyncHandler(fn)` - Wrap async routes
- `errorHandler(err, req, res, next)` - Global error handler

### Routes (`src/routes/*.js`)

Each endpoint is a separate module:
- `/health` - Health check
- `/elo` - Current ELO
- `/stats` - Player statistics (supports any player)
- `/streak` - Last 10 matches

## Data Flow

### Request Flow

```
Client Request
    ↓
Express Server (src/index.js)
    ↓
Route (src/routes/*.js)
    ↓
Cache Middleware (check cache)
    ↓
Route Handler (async)
    ↓
Service (src/services/faceitService.js)
    ↓
FACEIT API
    ↓
Service (format data)
    ↓
Route Handler
    ↓
Cache Middleware (store in cache)
    ↓
Client Response
```

### Error Flow

```
Error Thrown
    ↓
asyncHandler (catches error)
    ↓
errorHandler Middleware
    ↓
Log Error
    ↓
Format Error Message
    ↓
Send Error Response
```

## Adding New Features

### Adding a New Endpoint

1. Create route file in `src/routes/`
2. Import necessary services
3. Define route with middleware
4. Export router
5. Register in `src/index.js`

Example:
```javascript
// src/routes/newEndpoint.js
import express from 'express';
import { asyncHandler } from '../middlewares/errorHandler.js';
import { cacheMiddleware } from '../middlewares/cache.js';

const router = express.Router();

router.get('/', 
  cacheMiddleware('newEndpoint'),
  asyncHandler(async (req, res) => {
    // Your logic here
    res.send('Response');
  })
);

export default router;
```

Then in `src/index.js`:
```javascript
import newEndpointRouter from './routes/newEndpoint.js';
app.use('/new-endpoint', newEndpointRouter);
```

### Adding New Configuration

Add to `src/config/index.js`:
```javascript
export const config = {
  // ... existing config
  newSetting: process.env.NEW_SETTING || 'default'
};
```

### Adding New Service Function

Add to `src/services/faceitService.js`:
```javascript
export async function newServiceFunction(param) {
  // Your service logic
  return await faceitRequest('/endpoint');
}
```

## Testing Strategy

### Manual Testing

```bash
# Health check
curl http://localhost:3000/health

# ELO
curl http://localhost:3000/elo

# Stats (default player)
curl http://localhost:3000/stats

# Stats (specific player)
curl http://localhost:3000/stats?player=s1mple

# Streak
curl http://localhost:3000/streak
```

### Future: Automated Testing

Recommended test structure:
```
tests/
├── unit/
│   ├── config.test.js
│   ├── cache.test.js
│   └── faceitService.test.js
├── integration/
│   └── routes.test.js
└── setup.js
```

## Performance Considerations

### Caching
- 30-second TTL prevents excessive API calls
- Only default player queries are cached
- In-memory cache (fast, but not persistent)

### API Rate Limiting
- FACEIT API has rate limits
- Cache helps stay within limits
- Consider implementing request queue for high traffic

### Scalability
- Current: Single instance, in-memory cache
- Future: Redis for distributed caching
- Future: Load balancing support

## Security Best Practices

1. **Environment Variables**: Never commit `.env`
2. **API Keys**: Stored in env vars, validated on startup
3. **Input Validation**: Nicknames are normalized (lowercase, trimmed)
4. **Error Messages**: Don't expose sensitive information
5. **Dependencies**: Regularly update with `npm audit`

## Deployment

The modular structure makes deployment easier:
- Single entry point (`src/index.js`)
- Environment-based configuration
- Graceful shutdown handling
- Clear separation of concerns

See [README.md](README.md) for deployment instructions.

