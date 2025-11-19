const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
app.use(express.json());

// Servir frontend
app.use(express.static(path.join(__dirname, "views")));
app.use("/assets", express.static(path.join(__dirname, "views", "assets")));

const TMDB_API_KEY = "2cc5de7d5097e69d76342a0dfbff39ab";
const OMDB_API_KEY = "11491dc0";
const YOUTUBE_API_KEY = "AIzaSyA_cgcne4B9VeuXCZW3xXwwnqobz50Zqeo";

// -------------------- FUNÇÃO PRINCIPAL --------------------
async function buscarFilme(titulo) {
  try {
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

    if (!searchResponse.data.results?.length)
      throw new Error("Filme não encontrado no TMDb");

    const filme = searchResponse.data.results[0];

    const externalResponse = await axios.get(
      `https://api.themoviedb.org/3/movie/${filme.id}/external_ids`,
      { params: { api_key: TMDB_API_KEY } }
    );

    const imdbId = externalResponse.data.imdb_id;
    let notas = null;

    if (imdbId) {
      const omdbResponse = await axios.get("https://www.omdbapi.com/", {
        params: { i: imdbId, apikey: OMDB_API_KEY },
      });

      if (omdbResponse.data?.Response !== "False") {
        notas = {
          imdb: omdbResponse.data.imdbRating,
          rottenTomatoes:
            omdbResponse.data.Ratings.find(
              (r) => r.Source === "Rotten Tomatoes"
            )?.Value || "N/A",
          metacritic: omdbResponse.data.Metascore,
        };
      }
    }

    let trailer = null;
    try {
      const yt = await axios.get(
        "https://www.googleapis.com/youtube/v3/search",
        {
          params: {
            key: YOUTUBE_API_KEY,
            part: "snippet",
            q: `${filme.title} trailer`,
            type: "video",
          },
        }
      );

      if (yt.data.items.length > 0)
        trailer = `https://www.youtube.com/watch?v=${yt.data.items[0].id.videoId}`;
    } catch {}

    return {
      titulo: filme.title,
      lancamento: filme.release_date,
      sinopse: filme.overview,
      poster: `https://image.tmdb.org/t/p/w500${filme.poster_path}`,
      backdrop: `https://image.tmdb.org/t/p/original${filme.backdrop_path}`,
      notasOMDb: notas,
      trailer,
    };
  } catch (error) {
    throw new Error(error.message);
  }
}

// ----------------------- ROTAS ----------------------------

// homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// rota principal
app.get("/api/filmes/:titulo", async (req, res) => {
  try {
    res.json(await buscarFilme(req.params.titulo));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// buscar populares
app.get("/api/populares", async (req, res) => {
  try {
    const pop = await axios.get(
      "https://api.themoviedb.org/3/movie/popular",
      {
        params: { api_key: TMDB_API_KEY, language: "pt-BR" },
      }
    );

    res.json(pop.data.results);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

/* inicialização */
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () =>
    console.log(`🚀 Servidor rodando em http://localhost:${PORT}`)
  );
}

module.exports = app;
