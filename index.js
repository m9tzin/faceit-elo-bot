import express from "express";
import fetch from "node-fetch";

const app = express();

// Configuration
const FACEIT_KEY = process.env.FACEIT_KEY;
const PLAYER_NICKNAME = process.env.PLAYER_NICKNAME || "togs" // .env PLAYER_NICKNAME;
const CACHE_TIME = 30 * 1000; // 30 segundos

// Cache separado para cada endpoint
let cache = {
  elo: { data: null, lastUpdate: 0 },
  stats: { data: null, lastUpdate: 0 },
  streak: { data: null, lastUpdate: 0 },
  playerId: null
};

// Helper function to get player ID and data
async function getPlayerData(nickname) {
  const playerNick = nickname || PLAYER_NICKNAME;
  
  const response = await fetch(
    `https://open.faceit.com/data/v4/players?nickname=${playerNick}`,
    {
      headers: {
        Authorization: `Bearer ${FACEIT_KEY}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API FACEIT retornou status ${response.status}`);
  }

  return await response.json();
}

// Endpoint de health check para manter o serviço ativo (ping here to keep the service alive)
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/elo", async (req, res) => {
  const now = Date.now();

  // Cache simples para evitar spam
  if (cache.elo.data && now - cache.elo.lastUpdate < CACHE_TIME) {
    return res.send(cache.elo.data.toString());
  }

  try {
    const data = await getPlayerData();
    
    // Verifica se o jogador tem dados de CS2
    if (!data.games || !data.games.cs2 || !data.games.cs2.faceit_elo) {
      throw new Error("Dados do player não encontrados");
    }

    const elo = data.games.cs2.faceit_elo;

    cache.elo = {
      data: elo,
      lastUpdate: now
    };

    res.send(elo.toString());
  } catch (err) {
    console.error("Erro ao buscar ELO:", err.message);
    res.send("Erro ao buscar ELO");
  }
});

app.get("/stats", async (req, res) => {
  const now = Date.now();
  const playerQuery = req.query.player;

  // Verifica cache (apenas para jogador padrão)
  if (!playerQuery && cache.stats.data && now - cache.stats.lastUpdate < CACHE_TIME) {
    return res.send(cache.stats.data);
  }

  try {
    const playerData = await getPlayerData(playerQuery);
    const playerId = playerData.player_id;

    // Busca estatísticas do CS2
    const statsResponse = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/stats/cs2`,
      {
        headers: {
          Authorization: `Bearer ${FACEIT_KEY}`
        }
      }
    );

    if (!statsResponse.ok) {
      throw new Error(`Stats API retornou status ${statsResponse.status}`);
    }

    const statsData = await statsResponse.json();
    const lifetime = statsData.lifetime;

    // Formata as estatísticas
    const stats = [
      `${playerData.nickname}:`,
      `ELO: ${playerData.games.cs2.faceit_elo}`,
      `Level: ${playerData.games.cs2.skill_level}`,
      `Vitórias: ${lifetime["Wins"] || 0}`,
      `Winrate: ${lifetime["Win Rate %"] || 0}%`,
      `K/D: ${lifetime["Average K/D Ratio"] || 0}`,
      `HS%: ${lifetime["Average Headshots %"] || 0}%`
    ].join(" | ");

    // Salva no cache apenas se for o jogador padrão
    if (!playerQuery) {
      cache.stats = {
        data: stats,
        lastUpdate: now
      };
    }

    res.send(stats);
  } catch (err) {
    console.error("Erro ao buscar stats:", err.message);
    res.send("Erro ao buscar estatísticas :(");
  }
});

app.get("/streak", async (req, res) => {
  const now = Date.now();

  // Verifica cache
  if (cache.streak.data && now - cache.streak.lastUpdate < CACHE_TIME) {
    return res.send(cache.streak.data);
  }

  try {
    const playerData = await getPlayerData();
    const playerId = playerData.player_id;

    // Busca histórico de partidas
    const historyResponse = await fetch(
      `https://open.faceit.com/data/v4/players/${playerId}/history?game=cs2&offset=0&limit=10`,
      {
        headers: {
          Authorization: `Bearer ${FACEIT_KEY}`
        }
      }
    );

    if (!historyResponse.ok) {
      throw new Error(`History API retornou status ${historyResponse.status}`);
    }

    const historyData = await historyResponse.json();
    const matches = historyData.items;

    if (!matches || matches.length === 0) {
      return res.send("Nenhuma partida encontrada");
    }

    // Mapeia resultados: W para vitória, L para derrota
    const results = matches.map(match => {
      const teams = match.teams;
      let playerTeam = null;

      // Encontra em qual time o jogador estava
      if (teams.faction1.players.some(p => p.player_id === playerId)) {
        playerTeam = "faction1";
      } else if (teams.faction2.players.some(p => p.player_id === playerId)) {
        playerTeam = "faction2";
      }

      // Verifica se o time do jogador venceu
      const won = match.results.winner === playerTeam;
      return won ? "W" : "L";
    });

    const streak = `Últimas 10: ${results.join(" ")}`;

    cache.streak = {
      data: streak,
      lastUpdate: now
    };

    res.send(streak);
  } catch (err) {
    console.error("Erro ao buscar streak:", err.message);
    res.send("Erro ao buscar histórico");
  }
});

app.listen(process.env.PORT || 3000, () => {
console.log(`Servidor rodando na porta ${process.env.PORT || 3000}`);
console.log(`Monitorando jogador: ${PLAYER_NICKNAME}`);
});
