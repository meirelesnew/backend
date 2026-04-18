const express     = require("express");
const cors        = require("cors");
const compression = require("compression");
require("dotenv").config();

const { connectDb } = require("./config/db");

const app  = express();
const PORT = process.env.PORT || 10000;

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(compression());
app.use(cors({
  origin: [
    "https://tabuadaturbo.com.br",
    "https://www.tabuadaturbo.com.br",
    "https://meirelesnew.github.io",
    "https://meirelesnew.github.io/frontend",
    "https://meirelesnew.github.io/tabuada-turbo",
    "http://localhost:3000",
    "http://localhost:8080",
    "http://127.0.0.1:5500"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/ranking", require("./routes/ranking"));
app.use("/api/jogador", require("./routes/jogador"));

// ─── Health ───────────────────────────────────────────────────────────────────
app.all("/api/health", (req, res) => {
  res.json({ status: "ok", versao: "3.0.0", timestamp: new Date().toISOString() });
});

app.all("/", (req, res) => {
  res.json({ status: "ok", app: "Tabuada Turbo API v3", auth: ["email", "google"] });
});

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Rota ${req.method} ${req.path} não encontrada` });
});

// ─── Inicialização ────────────────────────────────────────────────────────────
async function startServer() {
  try {
    await connectDb();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Tabuada Turbo API v3.0 — porta ${PORT}`);
      console.log(`🔐 Auth: email/senha + Google OAuth`);
      console.log(`📋 Rotas: /api/auth, /api/ranking, /api/jogador`);
    });
  } catch (err) {
    console.error("❌ Falha ao iniciar:", err.message);
    process.exit(1);
  }
}

startServer();
