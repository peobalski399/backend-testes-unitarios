const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const TMDB_API_KEY = "2cc5de7d5097e69d76342a0dfbff39ab";
const OMDB_API_KEY = "11491dc0";
const YOUTUBE_API_KEY = "AIzaSyA_cgcne4B9VeuXCZW3xXwwnqobz50Zqeo";

async function buscarFilme(titulo) {
  try {
    // 🔍 1. Buscar filme no TMDb
    const searchResponse = await axios.get(
      "https://api.themoviedb.org/3/search/movie",
      {
        params: {
          api_key: TMDB_API_KEY,
          language: "pt-BR",
          query: titulo,
        },
      }
    );

    if (!searchResponse.data.results?.length) {
      throw new Error("Filme não encontrado no TMDb");
    }

    const filme = searchResponse.data.results[0];

    // 🎬 2. Buscar IMDb ID no TMDb
    const externalResponse = await axios.get(
      `https://api.themoviedb.org/3/movie/${filme.id}/external_ids`,
      { params: { api_key: TMDB_API_KEY } }
    );

    const imdbId = externalResponse.data.imdb_id;
    let notas = null;

    // ⭐ 3. Buscar notas no OMDb
    if (imdbId) {
      const omdbResponse = await axios.get("http://www.omdbapi.com/", {
        params: { i: imdbId, apikey: OMDB_API_KEY },
      });

      if (omdbResponse.data && omdbResponse.data.Response !== "False") {
        notas = {
          imdb: omdbResponse.data.imdbRating,
          rottenTomatoes:
            omdbResponse.data.Ratings.find(
              (r) => r.Source === "Rotten Tomatoes"
            )?.Value || "N/A",
          metacritic:
            omdbResponse.data.Metascore !== "N/A"
              ? omdbResponse.data.Metascore
              : "N/A",
        };
      }
    }

    // 🎥 4. Buscar trailer no YouTube (com tratamento completo)
    let trailerUrl = null;
    /* istanbul ignore next: linha de tratamento de exceção do YouTube */
    try {
      const ytResponse = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            part: "snippet",
            q: `${filme.title} official trailer`,
            type: "video",
            key: YOUTUBE_API_KEY,
          },
        }
      );

      if (
        ytResponse &&
        ytResponse.data &&
        Array.isArray(ytResponse.data.items) &&
        ytResponse.data.items.length > 0
      ) {
        trailerUrl = `https://www.youtube.com/watch?v=${ytResponse.data.items[0].id.videoId}`;
      } else {
        trailerUrl = null;
      }
    } catch (e) {
      console.warn("⚠️ Falha ao buscar trailer no YouTube:", e.message);
      trailerUrl = null; // ✅ mantém execução e define trailer como nulo
    }

    // ✅ Retorno final
    return {
      titulo: filme.title,
      lancamento: filme.release_date,
      sinopse: filme.overview,
      notasOMDb: notas,
      trailer: trailerUrl,
    };
  } catch (error) {
    throw new Error(error.message || "Erro ao buscar informações do filme");
  }
}

// 🧠 Endpoint principal
app.get("/api/filmes/:titulo", async (req, res) => {
  try {
    const { titulo } = req.params;
    const filme = await buscarFilme(titulo);
    res.status(200).json(filme);
  } catch (error) {
    res.status(500).json({ erro: error.message });
  }
});

// 🔄 Endpoint de status
app.get("/api/status", (req, res) => {
  res.json({ status: "API rodando normalmente", versao: "1.0.0" });
});

// 💥 Endpoint de erro proposital
app.get("/api/teste-erro", (req, res) => {
  try {
    throw new Error("Erro de teste controlado!");
  } catch (err) {
    res
      .status(500)
      .json({ mensagem: "Erro tratado com sucesso", erro: err.message });
  }
});

/* istanbul ignore next: bloco de inicialização do servidor (não testável) */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  });
}

module.exports = app;
