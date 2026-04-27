# FACEIT ELO Bot for Twitch.tv Chatbots

[![CI](https://github.com/m9tzin/faceit-elo-bot/actions/workflows/ci.yml/badge.svg)](https://github.com/m9tzin/faceit-elo-bot/actions/workflows/ci.yml)
[![Code Quality](https://github.com/m9tzin/faceit-elo-bot/actions/workflows/code-quality.yml/badge.svg)](https://github.com/m9tzin/faceit-elo-bot/actions/workflows/code-quality.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

A simple Express.js service that fetches and displays a FACEIT player's CS2 ELO rating, designed to be used with Twitch chat bots via URL fetch commands.

## Features

- Fetches real-time FACEIT CS2 data via the official API
- **3 commands:** ELO (with today’s W/L), full stats, and last-10 match streak
- Stats (K/D, HS%, win rate, etc.) are computed from the **last 30 matches**
- Built-in caching (30s for ELO/streak, 3 min for stats) to avoid rate limiting
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
# Optional — default player when ?player is omitted on the URL (default: faceit_player)
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

Development (auto-restart on file changes, Node 18+):

```bash
npm run dev
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
5. Add environment variables:
   - `FACEIT_KEY` — your FACEIT API key (required)
   - `PLAYER_NICKNAME` — default streamer/player when the URL has no `player` query (optional; default `faceit_player`)
   - `PORT` — server port (optional; default `3000`)
6. Deploy and copy your service URL

## Twitch Integration

Add commands in your Twitch chat, if you use Nightbot, StreamElements or other Twitch bot:

### Nightbot

Replace `YOUR_SERVICE_URL` with your deployed service URL and `YOUR_PLAYER_NICK` with your FACEIT nickname:

**Option 1: Using a fixed player nickname (recommended for single stream)**

```bash
# ELO command - uses fixed player nickname
!addcom !elo $(urlfetch https://YOUR_SERVICE_URL/elo?player=YOUR_PLAYER_NICK)

# Streak command - uses fixed player nickname
!addcom !wl $(urlfetch https://YOUR_SERVICE_URL/streak?player=YOUR_PLAYER_NICK)

# Stats command - uses fixed player nickname
!addcom !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=YOUR_PLAYER_NICK)
```

**Option 2: Using command parameter (search any player)**

```bash
# ELO command - accepts player nickname as parameter
# Usage: !elo (uses default) or !elo s1mple (searches player)
!addcom !elo $(urlfetch https://YOUR_SERVICE_URL/elo?player=$(1))

# Streak command - accepts player nickname as parameter
# Usage: !wl (uses default) or !wl s1mple (searches player)
!addcom !wl $(urlfetch https://YOUR_SERVICE_URL/streak?player=$(1))

# Stats command — nickname required (e.g. !stats s1mple)
!addcom !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=$(1))
```

### StreamElements

Replace `YOUR_SERVICE_URL` with your deployed service URL and `YOUR_PLAYER_NICK` with your FACEIT nickname:

**Option 1: Using a fixed player nickname (recommended for single stream)**

```bash
# ELO command - uses fixed player nickname
!command add !elo $(urlfetch https://YOUR_SERVICE_URL/elo?player=YOUR_PLAYER_NICK)

# Streak command - uses fixed player nickname
!command add !wl $(urlfetch https://YOUR_SERVICE_URL/streak?player=YOUR_PLAYER_NICK)

# Stats command - uses fixed player nickname
!command add !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=YOUR_PLAYER_NICK)
```

**Option 2: Using command parameter (search any player)**

```bash
# ELO command - accepts player nickname as parameter
# Usage: !elo (uses default) or !elo s1mple (searches player)
!command add !elo $(urlfetch https://YOUR_SERVICE_URL/elo?player=$(1))

# Streak command - accepts player nickname as parameter
!command add !wl $(urlfetch https://YOUR_SERVICE_URL/streak?player=$(1))

# Stats command — nickname required (e.g. !stats s1mple)
!command add !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=$(1))
```

### Recommended commands (Nightbot example)

Replace `YOUR_SERVICE_URL` and `faceit_player` with your deployment URL and default FACEIT nickname.

```text
!addcom !elo $(urlfetch https://YOUR_SERVICE_URL/elo?player=faceit_player)
!addcom !wl $(urlfetch https://YOUR_SERVICE_URL/streak?player=faceit_player)
!addcom !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=$(1))
```

Usage: `!stats` **must** include a nickname (`!stats s1mple`). `!elo` / `!wl` can use the fixed player in the URL or `$(1)` as in the options above.

### Nightbot cooldown (moderadores vs viewers)

By default Nightbot applies a **30-second cooldown** per command for regular viewers, while moderators and the broadcaster bypass it. This means a viewer who types `!stats` right after another viewer will see no response — the bot silently ignores the duplicate.

To reduce or equalize the cooldown:

1. Go to [nightbot.tv](https://nightbot.tv/) and log in
2. Navigate to **Commands → Custom**
3. Click **Edit** on the `!stats` (or `!elo` / `!wl`) command
4. Change the **Cooldown** field to a lower value (minimum **5 seconds**)
5. Save

Setting the cooldown to **5s** keeps a small spam guard while giving viewers a much faster experience.

## API Endpoints

### `GET /elo` or `GET /elo?player=nickname`

Returns the current CS2 ELO plus **today’s** wins and losses (FACEIT match day). Optional query `player` sets the FACEIT nickname; if omitted, the server uses `PLAYER_NICKNAME`.

**Response:** `2150, W: 2, L: 1`

**Note:** Nicknames are case-insensitive (automatically converted to lowercase).

**Examples:**

```bash
# Default player (from PLAYER_NICKNAME or built-in default)
curl https://YOUR_SERVICE_URL/elo
# 2150, W: 1, L: 0

# Search any player
curl https://YOUR_SERVICE_URL/elo?player=faceit_player
# 2150, W: 2, L: 1
```

### `GET /stats?player=nickname` (required)

Returns player statistics. Averages, K/D, HS%, and win rate are derived from the **last 30 completed matches**. Query **`player` is required** (alias `nick` still accepted for older URLs). There is no default player for `/stats` — unlike `/elo` and `/streak`.

**Response:** `nickname: | ELO: 2150 | Level: 10 | Avg Kills: 18.2 | K/D: 1.25 | HS%: 48% | Winrate: 55%`

**Missing `player`:** `200` with body `Indique o nickname FACEIT (ex.: !stats s1mple)` (plain text for Twitch `urlfetch`). The same warning is returned when `player` is the literal string `null` or `undefined` (case-insensitive) — this happens on Nightbot when the user runs `!stats` without any argument and `$(1)` gets expanded to `null`.

**Includes:**

- Player nickname
- Current ELO
- Skill level (1-10)
- Average kills per match (last 30)
- Win rate percentage (last 30)
- K/D ratio (last 30)
- Headshot percentage (last 30)

**Note:** Nicknames are case-insensitive (automatically converted to lowercase).

**Examples:**

```bash
# No player query — prompts for nickname
curl https://YOUR_SERVICE_URL/stats
# Indique o nickname FACEIT (ex.: !stats s1mple)

# Nightbot `$(1)` expands to "null" when no argument is passed — same warning
curl "https://YOUR_SERVICE_URL/stats?player=null"
# Indique o nickname FACEIT (ex.: !stats s1mple)

# Search any player (case-insensitive)
curl https://YOUR_SERVICE_URL/stats?player=s1mple
# s1mple: | ELO: 3250 | Level: 10 | Avg Kills: 18.4 | K/D: 1.45 | HS%: 52% | Winrate: 65%

curl https://YOUR_SERVICE_URL/stats?player=S1MPLE
# s1mple: | ELO: 3250 | Level: 10 | Avg Kills: 18.4 | K/D: 1.45 | HS%: 52% | Winrate: 65%
```

### `GET /streak` or `GET /streak?player=nickname`

Returns the last 10 match results (W = Win, L = Loss). Optional query `player` sets the FACEIT nickname; if omitted, the server uses `PLAYER_NICKNAME`.

**Response:** `Últimas 10: W W L W L W W W L W`

**Note:** Nicknames are case-insensitive (automatically converted to lowercase).

**Examples:**

```bash
# Default player
curl https://YOUR_SERVICE_URL/streak
# Últimas 10: W L W W W L W L W W

# Search any player
curl https://YOUR_SERVICE_URL/streak?player=faceit_player
# Últimas 10: W W W L W W W W W W
```

### `GET /health`

Health check endpoint for monitoring.

**Response:** `OK`

## Configuration

| Variable          | Required | Description                                                                              |
| ----------------- | -------- | ---------------------------------------------------------------------------------------- |
| `FACEIT_KEY`      | Yes      | Your FACEIT API key                                                                      |
| `PLAYER_NICKNAME` | No       | Default FACEIT nickname when `player` is omitted from the URL (default: `faceit_player`) |
| `PORT`            | No       | Server port (default: 3000)                                                              |

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

- **Node.js** (ES modules) — runtime
- **Express.js** — web framework
- **node-fetch** — HTTP client
- **dotenv** — load `.env` in development

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
