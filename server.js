const express = require("express");
const cors = require("cors");
const compression = require("compression");
require("dotenv").config();
const { connectDb } = require("./config/db");

const app = express();

// Middleware
app.use(compression());
app.use(cors({
  origin: ["https://tabuadaturbo.com.br", "https://www.tabuadaturbo.com.br", "https://meirelesnew.github.io"],
  methods: ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"],
  credentials: true
}));
app.use(express.json());

// Rotas
app.use("/api/ranking", require("./routes/ranking"));
app.use("/api/jogador", require("./routes/jogador"));

// Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({ message: "Tabuada Turbo API v3.0 Online" });
});

const PORT = process.env.PORT || 10000;

async function startServer() {
  try {
    await connectDb();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor rodando na porta ${PORT}`);
    });
  } catch (error) {
    console.error("Falha ao iniciar o servidor:", error);
    process.exit(1);
  }
}

startServer();
