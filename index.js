import express from "express";
import fetch from "node-fetch";

const app = express();

let cache = {
elo: null,
lastUpdate: 0
};

const CACHE_TIME = 30 * 1000; // 30 segundos

// Endpoint de health check para manter o serviço ativo (ping here to keep the service alive)
app.get("/health", (req, res) => {
res.status(200).send("OK");
});

app.get("/elo", async (req, res) => {
const now = Date.now();

  // Cache simples para evitar spam
if (cache.elo && now - cache.lastUpdate < CACHE_TIME) {
    return res.send(cache.elo.toString());
}

try {
    const response = await fetch(
    "https://open.faceit.com/data/v4/players?nickname=togs",
    {
        headers: {
        Authorization: `Bearer ${process.env.FACEIT_KEY}`
        }
    }
    );

    if (!response.ok) {
    throw new Error(`API FACEIT retornou status ${response.status}`);
    }

    const data = await response.json();
    
    // Verifica se o jogador tem dados de CS2
    if (!data.games || !data.games.cs2 || !data.games.cs2.faceit_elo) {
    throw new Error("Dados do player não encontrados");
    }

    const elo = data.games.cs2.faceit_elo;

    cache = {
    elo,
    lastUpdate: now
    };

    res.send(elo.toString());
} catch (err) {
    console.error("Erro ao buscar ELO:", err.message);
    res.send("Erro ao buscar ELO");
}
});

app.listen(process.env.PORT || 3000, () => {
console.log("Servidor rodando");
});
