const request = require("supertest");
const axios = require("axios");
const app = require("../src/App");

jest.mock("axios");

describe("Cobertura total de erros e exceções", () => {
  beforeEach(() => jest.clearAllMocks());

  //Caso de sucesso completo
  it("Deve retornar informações completas de um filme", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          results: [
            {
              id: 1,
              title: "Inception",
              release_date: "2010",
              overview: "Um filme sobre sonhos",
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: { imdb_id: "tt1375666" } })
      .mockResolvedValueOnce({
        data: {
          Response: "True",
          imdbRating: "8.8",
          Ratings: [{ Source: "Rotten Tomatoes", Value: "87%" }],
          Metascore: "74",
        },
      })
      .mockResolvedValueOnce({
        data: { items: [{ id: { videoId: "YoHD9XEInc0" } }] },
      });

    const res = await request(app).get("/api/filmes/Inception");

    expect(res.statusCode).toBe(200);
    expect(res.body.titulo).toBe("Inception");
    expect(res.body.trailer).toBe(
      "https://www.youtube.com/watch?v=YoHD9XEInc0"
    );
    expect(res.body.notasOMDb.imdb).toBe("8.8");
  });

  //Filme não encontrado no TMDb
  it("Deve retornar erro se filme não for encontrado", async () => {
    axios.get.mockResolvedValueOnce({ data: { results: [] } });

    const res = await request(app).get("/api/filmes/Inexistente");

    expect(res.statusCode).toBe(500);
    expect(res.body.erro).toMatch(/não encontrado/i);
  });

  //Erro no TMDb
  it("Deve capturar erro do TMDb", async () => {
    axios.get.mockRejectedValueOnce(new Error("TMDb Error"));

    const res = await request(app).get("/api/filmes/Inception");

    expect(res.statusCode).toBe(500);
    expect(res.body.erro).toBe("TMDb Error");
  });

  //Erro no OMDb
  it("Deve capturar erro do OMDb", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { results: [{ id: 1, title: "Teste", release_date: "2010" }] },
      })
      .mockResolvedValueOnce({ data: { imdb_id: "tt1375666" } })
      .mockRejectedValueOnce(new Error("OMDb Error"));

    const res = await request(app).get("/api/filmes/Teste");

    expect(res.statusCode).toBe(500);
    expect(res.body.erro).toBe("OMDb Error");
  });

  //Erro no YouTube
  it("Deve capturar erro ao buscar trailer no YouTube", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: {
          results: [{ id: 1, title: "Inception", release_date: "2010" }],
        },
      })
      .mockResolvedValueOnce({ data: { imdb_id: "tt1375666" } })
      .mockResolvedValueOnce({
        data: {
          Response: "True",
          imdbRating: "8.8",
          Ratings: [],
          Metascore: "70",
        },
      })
      .mockRejectedValueOnce(new Error("YouTube Error"));

    const res = await request(app).get("/api/filmes/Inception");

    expect(res.statusCode).toBe(200);
    expect(res.body.trailer).toBeNull();
  });

  //OMDb Response = "False"
  it("Deve retornar notas como null quando OMDb responder False", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { results: [{ id: 1, title: "Teste" }] } })
      .mockResolvedValueOnce({ data: { imdb_id: "tt0000001" } })
      .mockResolvedValueOnce({
        data: {
          Response: "False",
        },
      })
      .mockResolvedValueOnce({
        data: { items: [] },
      });

    const res = await request(app).get("/api/filmes/Teste");

    expect(res.statusCode).toBe(200);
    expect(res.body.notasOMDb).toBeNull();
  });

  //imdbId ausente (null)
  it("Deve retornar notas como null quando imdbId for nulo", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { results: [{ id: 1, title: "Teste" }] } })
      .mockResolvedValueOnce({ data: { imdb_id: null } }) // SEM imdbId
      .mockResolvedValueOnce({ data: { items: [] } }); // YouTube

    const res = await request(app).get("/api/filmes/Teste");

    expect(res.statusCode).toBe(200);
    expect(res.body.notasOMDb).toBeNull();
  });

  //YouTube sem vídeo (items = [])
  it("Deve retornar trailer null quando YouTube não retornar vídeos", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { results: [{ id: 1, title: "Teste" }] } })
      .mockResolvedValueOnce({ data: { imdb_id: "tt0000001" } })
      .mockResolvedValueOnce({
        data: {
          Response: "True",
          imdbRating: "7.0",
          Ratings: [],
          Metascore: "60",
        },
      })
      .mockResolvedValueOnce({ data: { items: [] } }); // YouTube -> vazio

    const res = await request(app).get("/api/filmes/Teste");

    expect(res.statusCode).toBe(200);
    expect(res.body.trailer).toBeNull();
  });

  //Endpoint de erro proposital
  it("Deve retornar erro tratado no /api/teste-erro", async () => {
    const res = await request(app).get("/api/teste-erro");

    expect(res.statusCode).toBe(500);
    expect(res.body.mensagem).toBe("Erro tratado com sucesso");
  });

  // Status da API
  it("Deve retornar status da API", async () => {
    const res = await request(app).get("/api/status");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("API rodando normalmente");
  });
});
