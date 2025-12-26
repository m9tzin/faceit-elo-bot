# FACEIT ELO Bot for Twitch.tv Chatbots

A simple Express.js service that fetches and displays a FACEIT player's CS2 ELO rating, designed to be used with Twitch chat bots via URL fetch commands.

## Features

- Fetches real-time FACEIT CS2 data via official API
- **3 commands:** ELO, full stats, and match streak
- Built-in 30-second caching to avoid rate limiting
- Health check endpoint for uptime monitoring
- Ready for free deployment on Render
- Works with Nightbot, StreamElements, and other Twitch bots

## Quick Start

### 1. Installation

```bash
git clone https://github.com/yourusername/faceit-elo-bot.git
cd faceit-elo-bot
npm install
```

### 2. Configuration

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your details:

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
# Response: ELO: 2150 | Level: 10 | Partidas: 1234 | Vitórias: 678 | Winrate: 55% | K/D: 1.25 | HS%: 48%

curl http://localhost:3000/streak
# Response: Últimas 10: W W L W L W W W L W
```

## Deploy on Render

1. Push your code to GitHub
2. Go to [Render Dashboard](https://dashboard.render.com/)
3. Click **"New +"** → **"Web Service"**
4. Connect your GitHub repository
5. Configure:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Add Environment Variables:
   - `FACEIT_KEY` = your API key
   - `PLAYER_NICKNAME` = your FACEIT nickname
7. Deploy and copy your service URL

**Note:** Render's free tier sleeps after 15 minutes of inactivity. Use a service like [UptimeRobot](https://uptimerobot.com/) to ping the `/health` endpoint every 5 minutes to keep it awake.

## Twitch Integration

Add commands in your Twitch chat:

### Nightbot

```bash
!addcom !elo $(urlfetch https://your-app.onrender.com/elo)
!addcom !streak $(urlfetch https://your-app.onrender.com/streak)

# Stats can search any player
!addcom !stats $(urlfetch https://your-app.onrender.com/stats?player=$(1))
```

### StreamElements

```bash
!command add !elo $(urlfetch https://your-app.onrender.com/elo)
!command add !streak $(urlfetch https://your-app.onrender.com/streak)

# Stats can search any player
!command add !stats $(urlfetch https://your-app.onrender.com/stats?player=${1})
```

### Example Usage

```
Viewer: !elo
Bot: 2150

Viewer: !streak
Bot: Últimas 10: W W L W L W W W L W

Viewer: !stats
Bot: togs: | ELO: 2150 | Level: 10 | Vitórias: 678 | Winrate: 55% | K/D: 1.25 | HS%: 48%

Viewer: !stats s1mple
Bot: s1mple: | ELO: 3250 | Level: 10 | Vitórias: 2500 | Winrate: 65% | K/D: 1.45 | HS%: 52%

Viewer: !stats ZywOo
Bot: ZywOo: | ELO: 3100 | Level: 10 | Vitórias: 2000 | Winrate: 60% | K/D: 1.40 | HS%: 50%
```

## API Endpoints

### `GET /elo`
Returns the current CS2 ELO rating for the default player.

**Example:**
```bash
curl https://your-app.onrender.com/elo
# 2150
```

### `GET /stats` or `GET /stats?player=nickname`
Returns comprehensive player statistics. Supports searching any player via query parameter.

**Response:** `nickname: | ELO: 2150 | Level: 10 | Vitórias: 678 | Winrate: 55% | K/D: 1.25 | HS%: 48%`

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
curl https://your-app.onrender.com/stats
# togs: | ELO: 2150 | Level: 10 | Vitórias: 678 | Winrate: 55% | K/D: 1.25 | HS%: 48%

# Search any player (case-insensitive)
curl https://your-app.onrender.com/stats?player=s1mple
# s1mple: | ELO: 3250 | Level: 10 | Vitórias: 2500 | Winrate: 65% | K/D: 1.45 | HS%: 52%

curl https://your-app.onrender.com/stats?player=S1MPLE
# s1mple: | ELO: 3250 | Level: 10 | Vitórias: 2500 | Winrate: 65% | K/D: 1.45 | HS%: 52%
```

### `GET /streak`
Returns the last 10 match results (W = Win, L = Loss) for the default player.

**Response:** `Últimas 10: W W L W L W W W L W`

**Example:**
```bash
curl https://your-app.onrender.com/streak
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

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation.

## Tech Stack

- **Node.js** - Runtime
- **Express.js** - Web framework
- **node-fetch** - HTTP client
- **Modular Architecture** - Professional project structure

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
