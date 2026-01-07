# FACEIT ELO Bot for Twitch.tv Chatbots

[![CI](https://github.com/m9tzin/faceit-elo-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/m9tzin/faceit-elo-bot/actions/workflows/ci.yml)
[![Code Quality](https://github.com/m9tzin/faceit-elo-bot/actions/workflows/code-quality.yml/badge.svg)](https://github.com/m9tzin/faceit-elo-bot/actions/workflows/code-quality.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

A simple Express.js service that fetches and displays a FACEIT player's CS2 ELO rating, designed to be used with Twitch chat bots via URL fetch commands.

## Features

- Fetches real-time FACEIT CS2 data via official API
- **3 commands:** ELO, full stats, and match streak
- Built-in 30-second caching to avoid rate limiting
- Works with Nightbot, StreamElements, and other Twitch bots

## Quick Start

### 1. Installation

```bash
git clone https://github.com/m9tzin/faceit-elo-bot.git
cd faceit-elo-bot
npm install
```

### 2. Configuration

Create and edit `.env` with your details:

```env
FACEIT_KEY=your_faceit_api_key_here
PLAYER_NICKNAME=your_faceit_nickname
```

**Get your FACEIT API key:**
1. Visit https://developers.faceit.com/
2. Login and create a new app
3. Copy the API key

### 3. Run Locally

```bash
npm start
```

## Deployment

This service can be deployed on any platform that supports Node.js. Here are some popular options:

### General Deployment Steps

1. Push your code to a Git repository (GitHub, GitLab, etc.)
2. Create a new web service on your chosen platform
3. Connect your repository
4. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Add Environment Variables:
   - `FACEIT_KEY` = your FACEIT API key
   - `PLAYER_NICKNAME` = your FACEIT nickname (default: player)
   - `PORT` = server port (optional, defaults to 3000)
6. Deploy and copy your service URL

## Twitch Integration

Add commands in your Twitch chat, if you use Nightbot, StreamElements or other Twitch bot:

### Nightbot

Replace `YOUR_SERVICE_URL` with your deployed service URL and `YOUR_PLAYER_NICK` with your FACEIT nickname:

**Option 1: Using a fixed player nickname (recommended for single stream)**

```bash
# ELO command - uses fixed player nickname
!addcom !elo $(urlfetch https://YOUR_SERVICE_URL/elo?nick=YOUR_PLAYER_NICK)

# Streak command - uses fixed player nickname
!addcom !streak $(urlfetch https://YOUR_SERVICE_URL/streak?nick=YOUR_PLAYER_NICK)

# Stats command - uses fixed player nickname
!addcom !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=YOUR_PLAYER_NICK)
```
**Option 2: Using command parameter (search any player)**

```bash
# ELO command - accepts player nickname as parameter
# Usage: !elo (uses default) or !elo s1mple (searches player)
!addcom !elo $(urlfetch https://YOUR_SERVICE_URL/elo?nick=$(1))

# Streak command - accepts player nickname as parameter
# Usage: !streak (uses default) or !streak s1mple (searches player)
!addcom !streak $(urlfetch https://YOUR_SERVICE_URL/streak?nick=$(1))

# Stats command - accepts player nickname as parameter
# Usage: !stats (uses default) or !stats s1mple (searches player)
!addcom !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=$(1))
```

### StreamElements

Replace `YOUR_SERVICE_URL` with your deployed service URL and `YOUR_PLAYER_NICK` with your FACEIT nickname:

**Option 1: Using a fixed player nickname (recommended for single stream)**

```bash
# ELO command - uses fixed player nickname
!command add !elo $(urlfetch https://YOUR_SERVICE_URL/elo?nick=YOUR_PLAYER_NICK)

# Streak command - uses fixed player nickname
!command add !streak $(urlfetch https://YOUR_SERVICE_URL/streak?nick=YOUR_PLAYER_NICK)

# Stats command - uses fixed player nickname
!command add !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=YOUR_PLAYER_NICK)
```
**Option 2: Using command parameter (search any player)**

```bash
# ELO command - accepts player nickname as parameter
# Usage: !elo (uses default) or !elo s1mple (searches player)
!command add !elo $(urlfetch https://YOUR_SERVICE_URL/elo?nick=$(1))

# Streak command - accepts player nickname as parameter
!command add !streak $(urlfetch https://YOUR_SERVICE_URL/streak?nick=$(1))

# Stats command - accepts player nickname as parameter
!command add !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=$(1))
```

# Recommended Commands for your Twitch chat:

```bash
** If you use Nightbot: **
!addcom !elo $(urlfetch https://YOUR_SERVICE_URL/elo?nick=faceit_player)
!addcom !streak $(urlfetch https://YOUR_SERVICE_URL/streak?nick=faceit_player)
!addcom !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=$(1)) 
# Usage: !stats s1mple (searches any faceit player) 
```
## API Endpoints

### `GET /elo` or `GET /elo?nick=nickname`
Returns the current CS2 ELO rating. Supports searching any player via query parameter.

**Response:** `2150`

**Note:** Nicknames are case-insensitive (automatically converted to lowercase).

**Examples:**
```bash
# Default player
curl https://YOUR_SERVICE_URL/elo
# 2150

# Search any player
curl https://YOUR_SERVICE_URL/elo?nick=faceit_player
# 2150

curl https://YOUR_SERVICE_URL/elo?nick=faceit_player
# 2150
```

### `GET /stats` or `GET /stats?player=nickname`
Returns comprehensive player statistics. Supports searching any player via query parameter.

**Response:** `nickname: | ELO: 2150 | Level: 10 | Avg Kills: 18.2 | K/D: 1.25 | HS%: 48% | Winrate: 55%`

**Includes:**
- Player nickname
- Current ELO
- Skill level (1-10)
- Average kills per match
- Win rate percentage
- K/D ratio
- Headshot percentage

**Note:** Nicknames are case-insensitive (automatically converted to lowercase).

**Examples:**
```bash
# Default player
curl https://YOUR_SERVICE_URL/stats
# togs: | ELO: 2150 | Level: 10 | Avg Kills: 18.2 | K/D: 1.25 | HS%: 48% | Winrate: 55%

# Search any player (case-insensitive)
curl https://YOUR_SERVICE_URL/stats?player=s1mple
# s1mple: | ELO: 3250 | Level: 10 | Avg Kills: 18.4 | K/D: 1.45 | HS%: 52% | Winrate: 65%

curl https://YOUR_SERVICE_URL/stats?player=S1MPLE
# s1mple: | ELO: 3250 | Level: 10 | Avg Kills: 18.4 | K/D: 1.45 | HS%: 52% | Winrate: 65%
```

### `GET /streak` or `GET /streak?nick=nickname`
Returns the last 10 match results (W = Win, L = Loss). Supports searching any player via query parameter.

**Response:** `Últimas 10: W W L W L W W W L W`

**Note:** Nicknames are case-insensitive (automatically converted to lowercase).

**Examples:**
```bash
# Default player
curl https://YOUR_SERVICE_URL/streak
# Últimas 10: W L W W W L W L W W

# Search any player
curl https://YOUR_SERVICE_URL/streak?nick=faceit_player
# Últimas 10: W W W L W W W W W W

curl https://YOUR_SERVICE_URL/streak?nick=faceit_player
# Últimas 10: W L W W W L W L W W
```

### `GET /health`
Health check endpoint for monitoring.

**Response:** `OK`

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `FACEIT_KEY` | Yes | Your FACEIT API key |
| `PLAYER_NICKNAME` | Yes | FACEIT player nickname to track |
| `PORT` | No | Server port (default: 3000) |

## Project Structure

```
src/
├── config/           # Configuration management
├── services/         # FACEIT API integration  
├── routes/           # HTTP endpoints
├── middlewares/      # Request/response processing
├── utils/            # Utilities (cache, etc)
└── index.js          # Application entry point
```

## Tech Stack

- **Node.js** - Runtime
- **Express.js** - Web framework
- **node-fetch** - HTTP client

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -m 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made with ❤️ for the FACEIT and Twitch communities

