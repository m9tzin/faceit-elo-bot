# FACEIT ELO Bot for Twitch.tv Chatbots

A simple Express.js service that fetches and displays a FACEIT player's CS2 ELO rating, designed to be used with Twitch chat bots via URL fetch commands.

## Features

- Fetches real-time FACEIT CS2 ELO via official API
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

Add the command in your Twitch chat:

**Nightbot:**
```
!addcom !elo $(urlfetch https://your-app.onrender.com/elo)
```

**StreamElements:**
```
!command add !elo $(urlfetch https://your-app.onrender.com/elo)
```

**Result:**
```
Viewer: !elo
Bot: 2150
```

## API Endpoints

### `GET /elo`
Returns the current CS2 ELO rating as plain text.

**Response:** `2150` (or `Erro ao buscar ELO` on error)

### `GET /health`
Health check endpoint for monitoring.

**Response:** `OK`

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `FACEIT_KEY` | Yes | Your FACEIT API key |
| `PLAYER_NICKNAME` | Yes | FACEIT player nickname to track |
| `PORT` | No | Server port (default: 3000) |

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
