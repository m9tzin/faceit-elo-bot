# FACEIT ELO Bot for Twitch.tv Chatbots

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

Test it:
```bash
curl http://localhost:3000/elo
# Response: 2150

curl http://localhost:3000/stats
# Response: ELO: 2150 | Level: 10 | Matches: 1234 | Wins: 678 | Winrate: 55% | K/D: 1.25 | HS%: 48%

curl http://localhost:3000/streak
# Response: Últimas 10: W W L W L W W W L W
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

Add commands in your Twitch chat:

### Nightbot

Replace `YOUR_SERVICE_URL` with your deployed service URL:

```bash
!addcom !elo $(urlfetch https://YOUR_SERVICE_URL/elo)
!addcom !streak $(urlfetch https://YOUR_SERVICE_URL/streak)

# Stats can search any player
!addcom !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=$(1))
```

### StreamElements

Replace `YOUR_SERVICE_URL` with your deployed service URL:

```bash
!command add !elo $(urlfetch https://YOUR_SERVICE_URL/elo)
!command add !streak $(urlfetch https://YOUR_SERVICE_URL/streak)

# Stats can search any player
!command add !stats $(urlfetch https://YOUR_SERVICE_URL/stats?player=${1})
```

### Example Usage

```
Viewer: !elo
Bot: 2150

Viewer: !streak (from default player)
Bot: Últimas 10: W W L W L W W W L W

Viewer: !stats (from default player)
Bot: togs: | ELO: 2150 | Level: 10 | Wins: 678 | Winrate: 55% | K/D: 1.25 | HS%: 48%

Viewer: !stats s1mple (from any player)
Bot: s1mple: | ELO: 3250 | Level: 10 | Wins: 2500 | Winrate: 65% | K/D: 1.45 | HS%: 52%

Viewer: !stats ZywOo (from any player)
Bot: ZywOo: | ELO: 3100 | Level: 10 | Wins: 2000 | Winrate: 60% | K/D: 1.40 | HS%: 50%
```

## API Endpoints

### `GET /elo`
Returns the current CS2 ELO rating for the default player.

**Example:**
```bash
curl https://YOUR_SERVICE_URL/elo
# 2150
```

### `GET /stats` or `GET /stats?player=nickname`
Returns comprehensive player statistics. Supports searching any player via query parameter.

**Response:** `nickname: | ELO: 2150 | Level: 10 | Wins: 678 | Winrate: 55% | K/D: 1.25 | HS%: 48%`

**Includes:**
- Player nickname
- Current ELO
- Skill level (1-10)
- Total wins
- Win rate percentage
- K/D ratio
- Headshot percentage

**Note:** Nicknames are case-insensitive (automatically converted to lowercase).

**Examples:**
```bash
# Default player
curl https://YOUR_SERVICE_URL/stats
# togs: | ELO: 2150 | Level: 10 | Wins: 678 | Winrate: 55% | K/D: 1.25 | HS%: 48%

# Search any player (case-insensitive)
curl https://YOUR_SERVICE_URL/stats?player=s1mple
# s1mple: | ELO: 3250 | Level: 10 | Wins: 2500 | Winrate: 65% | K/D: 1.45 | HS%: 52%

curl https://YOUR_SERVICE_URL/stats?player=S1MPLE
# s1mple: | ELO: 3250 | Level: 10 | Wins: 2500 | Winrate: 65% | K/D: 1.45 | HS%: 52%
```

### `GET /streak`
Returns the last 10 match results (W = Win, L = Loss) for the default player.

**Response:** `Últimas 10: W W L W L W W W L W`

**Example:**
```bash
curl https://YOUR_SERVICE_URL/streak
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
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

---

Made with ❤️ for the FACEIT and Twitch communities

