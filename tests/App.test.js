const request = require("supertest");
const axios = require("axios");
const app = require("../src/App");

jest.mock("axios");

describe("Cobertura total de erros e exceções", () => {

  beforeEach(() => jest.clearAllMocks());
  // Caso 1: sucesso normal
  it("Deve retornar informações completas de um filme", async () => {
    axios.get
      .mockResolvedValueOnce({
        // TMDb search
        data: { results: [{ id: 1, title: "Inception", release_date: "2010", overview: "Um filme sobre sonhos" }] },
      })
      .mockResolvedValueOnce({
        // TMDb external_ids
        data: { imdb_id: "tt1375666" },
      })
      .mockResolvedValueOnce({
        // OMDb
        data: {
          Response: "True",
          imdbRating: "8.8",
          Ratings: [{ Source: "Rotten Tomatoes", Value: "87%" }],
          Metascore: "74",
        },
      })
      .mockResolvedValueOnce({
        // YouTube trailer
        data: { items: [{ id: { videoId: "YoHD9XEInc0" } }] },
      });

    const res = await request(app).get("/api/filmes/Inception");

    expect(res.statusCode).toBe(200);
    expect(res.body.titulo).toBe("Inception");
    expect(res.body.trailer).toBe("https://www.youtube.com/watch?v=YoHD9XEInc0");
    expect(res.body.notasOMDb.imdb).toBe("8.8");
  });

  // Caso 2: filme não encontrado no TMDb
  it("Deve retornar erro se filme não for encontrado", async () => {
    axios.get.mockResolvedValueOnce({ data: { results: [] } });

    const res = await request(app).get("/api/filmes/Inexistente");

    expect(res.statusCode).toBe(500);
    expect(res.body.erro).toMatch(/não encontrado/i);
  });

  // Caso 3: falha no TMDb (erro de rede)
  it("Deve capturar erro do TMDb", async () => {
    axios.get.mockRejectedValueOnce(new Error("TMDb Error"));

    const res = await request(app).get("/api/filmes/Inception");

    expect(res.statusCode).toBe(500);
    expect(res.body.erro).toBe("TMDb Error");
  });

  // Caso 4: erro no OMDb
  it("Deve capturar erro do OMDb", async () => {
    axios.get
      .mockResolvedValueOnce({
        data: { results: [{ id: 1, title: "Inception", release_date: "2010" }] },
      }) // TMDb search
      .mockResolvedValueOnce({ data: { imdb_id: "tt1375666" } }) // TMDb external_ids
      .mockRejectedValueOnce(new Error("OMDb Error")); // OMDb falha

    const res = await request(app).get("/api/filmes/Inception");

    expect(res.statusCode).toBe(500);
    expect(res.body.erro).toBe("OMDb Error");
  });

  // Caso 5: erro no YouTube (trailer)
  it("Deve capturar erro ao buscar trailer no YouTube", async () => {
    axios.get
      .mockResolvedValueOnce({ data: { results: [{ id: 1, title: "Inception", release_date: "2010" }] } }) // TMDb search
      .mockResolvedValueOnce({ data: { imdb_id: "tt1375666" } }) // TMDb external_ids
      .mockResolvedValueOnce({
        data: {
          Response: "True",
          imdbRating: "8.8",
          Ratings: [],
          Metascore: "70",
        },
      }) // OMDb
      .mockRejectedValueOnce(new Error("YouTube Error")); // YouTube falha

    const res = await request(app).get("/api/filmes/Inception");

    // Como YouTube é tratado com try/catch, retorna 200 e trailer null
    expect(res.statusCode).toBe(200);
    expect(res.body.trailer).toBeNull();
  });

  // Endpoint de erro proposital
  it("Deve retornar erro tratado no /api/teste-erro", async () => {
    const res = await request(app).get("/api/teste-erro");

    expect(res.statusCode).toBe(500);
    expect(res.body.mensagem).toBe("Erro tratado com sucesso");
  });

  // Endpoint de status da API
  it("Deve retornar status da API", async () => {
    const res = await request(app).get("/api/status");

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe("API rodando normalmente");
  });
});
