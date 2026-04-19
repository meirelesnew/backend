const express     = require("express");
const cors        = require("cors");
const compression = require("compression");
const rateLimit   = require("express-rate-limit");
const http        = require("http");
const { Server }  = require("socket.io");
require("dotenv").config();

const { connectDb } = require("./config/db");

const app  = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "https://tabuadaturbo.com.br",
      "https://www.tabuadaturbo.com.br",
      "https://meirelesnew.github.io",
      "https://meirelesnew.github.io/tabuada-turbo",
      "http://localhost:3000",
      "http://localhost:8080",
      "http://127.0.0.1:5500"
    ],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 10000;

// ─── Middlewares ──────────────────────────────────────────────────────────────
app.use(compression());

// Cache para assets estáticos (imagens, CSS, JS)
app.use((req, res, next) => {
  if (req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg|woff2?)$/)) {
    res.set('Cache-Control', 'public, max-age=31536000');
  } else if (req.url.endsWith('.html')) {
    res.set('Cache-Control', 'public, max-age=3600');
  }
  next();
});

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

// ─── Rate Limiting ──────────────────────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Muitas tentativas. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false
});

const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: { error: "Muitas requisições. Aguarde um momento." },
  standardHeaders: true,
  legacyHeaders: false
});

app.use("/api/auth", authLimiter);
app.use("/api", generalLimiter);

// ─── Socket.io — Batalhas em tempo real ────────────────────────────────
const salas = new Map();

io.on("connection", (socket) => {
  console.log(`[SOCKET] Cliente conectado: ${socket.id}`);
  let salaAtual = null;
  let jogadorAtual = null;

  socket.on("criar_sala", (data) => {
    const { jogador_id, nome, avatar, nivel } = data;
    const codigo = Math.random().toString(36).substring(2, 7).toUpperCase();
    const sala = {
      codigo,
      nivel,
      criador: { id: jogador_id, nome, avatar, socketId: socket.id, tempo: null, acertos: 0, erros: 0 },
      jogadores: [],
      status: "esperando",
      createdAt: new Date()
    };
    salas.set(codigo, sala);
    salaAtual = codigo;
    jogadorAtual = { id: jogador_id, nome, avatar, socketId: socket.id };
    socket.join(codigo);
    socket.emit("sala_criada", { codigo, sala });
    console.log(`[SALA] Criada: ${codigo} por ${nome}`);
  });

  socket.on("entrar_sala", (data) => {
    const { codigo, jogador_id, nome, avatar } = data;
    const sala = salas.get(codigo.toUpperCase());
    if (!sala) {
      socket.emit("erro", { message: "Sala não encontrada" });
      return;
    }
    if (sala.jogadores.length >= 1 || sala.criador.id !== jogador_id) {
      sala.jogadores.push({ id: jogador_id, nome, avatar, socketId: socket.id, tempo: null, acertos: 0, erros: 0 });
    }
    salaAtual = codigo.toUpperCase();
    jogadorAtual = { id: jogador_id, nome, avatar, socketId: socket.id };
    socket.join(codigo.toUpperCase());
    io.to(codigo.toUpperCase()).emit("jogador_entrou", { nome, avatar });
    socket.emit("sala_encontrada", { codigo: sala.codigo, sala });
    console.log(`[SALA] ${nome} entrou na sala ${codigo}`);
  });

  socket.on("iniciar_batalha", () => {
    if (!salaAtual) return;
    const sala = salas.get(salaAtual);
    if (!sala) return;
    sala.status = "em_jogo";
    io.to(salaAtual).emit("batalha_iniciada", { nivel: sala.nivel });
    console.log(`[BATALHA] Iniciada: ${salaAtual}`);
  });

  socket.on("atualizar_progresso", (data) => {
    const { tempo, acertos, erros } = data;
    if (!salaAtual || !jogadorAtual) return;
    const sala = salas.get(salaAtual);
    if (!sala) return;
    
    if (sala.criador.id === jogadorAtual.id) {
      sala.criador.tempo = tempo;
      sala.criador.acertos = acertos;
      sala.criador.erros = erros;
    } else {
      const idx = sala.jogadores.findIndex(j => j.id === jogadorAtual.id);
      if (idx !== -1) {
        sala.jogadores[idx].tempo = tempo;
        sala.jogadores[idx].acertos = acertos;
        sala.jogadores[idx].erros = erros;
      }
    }
    
    io.to(salaAtual).emit("progresso_atualizado", {
      jogador: jogadorAtual.nome,
      tempo, acertos, erros
    });
  });

  socket.on("finalizar_batalha", (data) => {
    const { tempo, acertos, erros } = data;
    if (!salaAtual || !jogadorAtual) return;
    const sala = salas.get(salaAtual);
    if (!sala) return;
    
    const resultados = [];
    if (sala.criador.id === jogadorAtual.id) {
      sala.criador.tempo = tempo;
      sala.criador.acertos = acertos;
      sala.criador.erros = erros;
      resultados.push({ nome: sala.criador.nome, avatar: sala.criador.avatar, tempo, acertos, erros });
    } else {
      const idx = sala.jogadores.findIndex(j => j.id === jogadorAtual.id);
      if (idx !== -1) {
        sala.jogadores[idx].tempo = tempo;
        sala.jogadores[idx].acertos = acertos;
        sala.jogadores[idx].erros = erros;
        resultados.push({ nome: sala.jogadores[idx].nome, avatar: sala.jogadores[idx].avatar, tempo, acertos, erros });
      }
    }

    const todos = [sala.criador, ...sala.jogadores].filter(j => j.tempo !== null);
    if (todos.length === (sala.jogadores.length + 1)) {
      todos.sort((a, b) => a.tempo - b.tempo);
      sala.status = "finalizada";
      io.to(salaAtual).emit("batalha_finalizada", { resultados: todos });
      console.log(`[BATALHA] Finalizada: ${salaAtual}`);
    } else {
      io.to(salaAtual).emit("jogador_finalizou", { nome: jogadorAtual.nome, tempo });
    }
  });

  socket.on("sair_sala", () => {
    if (!salaAtual) return;
    const sala = salas.get(salaAtual);
    if (sala) {
      if (sala.criador.id === jogadorAtual?.id) {
        sala.status = "cancelada";
        io.to(salaAtual).emit("sala_cancelada");
        salas.delete(salaAtual);
      } else {
        sala.jogadores = sala.jogadores.filter(j => j.id !== jogadorAtual?.id);
        io.to(salaAtual).emit("jogador_saiu", { nome: jogadorAtual?.nome });
      }
    }
    socket.leave(salaAtual);
    salaAtual = null;
    jogadorAtual = null;
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET] Cliente desconectado: ${socket.id}`);
    if (salaAtual && salaAtual.status !== "finalizada") {
      const sala = salas.get(salaAtual);
      if (sala) {
        io.to(salaAtual).emit("adversario_desconectou");
        salas.delete(salaAtual);
      }
    }
  });
});

// ─── Rotas ────────────────────────────────────────────────────────────────────
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/ranking", require("./routes/ranking"));
app.use("/api/jogador", require("./routes/jogador"));
app.use("/api/admin",   require("./routes/admin"));
// app.use("/api/bootstrap", require("./routes/bootstrap")); // Desabilitado após criar admin

// ─── Health ───────────────────────────────────────────────────────────────────
app.all("/api/health", (req, res) => {
  res.json({ status: "ok", versao: "3.1.0", timestamp: new Date().toISOString(), socketio: true });
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
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Tabuada Turbo API v3.1 — porta ${PORT}`);
      console.log(`🔐 Auth: email/senha + Google OAuth`);
      console.log(`⚔️ Socket.io: batalhas em tempo real`);
      console.log(`📋 Rotas: /api/auth, /api/ranking, /api/jogador`);
    });
  } catch (err) {
    console.error("❌ Falha ao iniciar:", err.message);
    process.exit(1);
  }
}

startServer();
