const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { connectDb } = require("./config/db");

const app = express();
const PORT = process.env.PORT || 10000;

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    "https://tabuadaturbo.com.br",
    "https://www.tabuadaturbo.com.br",
    "https://meirelesnew.github.io",
    "http://localhost:3000",
    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(express.json());

// ─── Rotas da API ─────────────────────────────────────────────────────────────
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/ranking", require("./routes/ranking"));
app.use("/api/jogador", require("./routes/jogador"));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", versao: "2.0.0", timestamp: new Date().toISOString() });
});

// ─── Rota raiz ────────────────────────────────────────────────────────────────
app.all("/", (req, res) => {
  res.json({ status: "ok", app: "Tabuada Turbo API v2", versao: "2.0.0", features: ["auth", "ranking-global", "jogadores"] });
});

// ─── 404 ──────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Rota ${req.method} ${req.path} não encontrada` });
});

// ─── Inicialização ────────────────────────────────────────────────────────────
async function iniciar() {
  try {
    await connectDb();
    app.listen(PORT, () => {
      console.log(`🚀 Tabuada Turbo API v2.0.0 — porta ${PORT}`);
      console.log(`📋 Rotas: /api/auth, /api/ranking, /api/jogador`);
    });
  } catch (error) {
    console.error("❌ Falha ao iniciar servidor:", error.message);
    process.exit(1);
  }
}

iniciar();
