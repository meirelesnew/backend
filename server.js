const express    = require("express");
const cors       = require("cors");
const compression= require("compression");
const rateLimit  = require("express-rate-limit");
const http       = require("http");
const { Server } = require("socket.io");
const { connectDb, getDb } = require("./config/firebase");
require("dotenv").config();

const app    = express();
const server = http.createServer(app);
const PORT   = process.env.PORT || 10000;

// ── CORS ────────────────────────────────────────────────────
const ORIGINS = [
  "https://tabuadaturbo.com.br","https://www.tabuadaturbo.com.br",
  "https://meirelesnew.github.io",
  "http://localhost:3000","http://localhost:3001",
  "http://localhost:5500","http://127.0.0.1:5500","http://localhost:8080"
];

const io = new Server(server, { cors: { origin: ORIGINS, methods: ["GET","POST"] } });

app.set("trust proxy", 1);
app.use(compression());
app.use(cors({
  origin: (o, cb) => !o || ORIGINS.includes(o) ? cb(null, true) : cb(new Error("CORS")),
  credentials: true,
  methods: ["GET","POST","PUT","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"]
}));
app.use(express.json());
app.use((_, res, next) => { res.setHeader("Permissions-Policy","identity-credentials-get=()"); next(); });
app.use("/api/auth", rateLimit({ windowMs:15*60*1000, max:30 }));
app.use("/api",      rateLimit({ windowMs:60*1000,    max:300 }));

// ── HEALTH ───────────────────────────────────────────────────
app.all("/",           (_, res) => res.json({ app:"Tabuada Turbo API v4.1", db:"firestore" }));
app.all("/api/health", (_, res) => res.json({ status:"ok", versao:"4.1.0", db: getDb() ? "firestore" : "offline", ts: new Date().toISOString() }));
app.get("/api/online", (_, res) => res.json({ total: online.size, jogadores: [...online.values()] }));
app.get("/api/ping",   (_, res) => res.json({ ok:true, ts: new Date().toISOString() }));

// ── ROTAS ────────────────────────────────────────────────────
app.use("/api/auth",    require("./routes/auth"));
app.use("/api/ranking", require("./routes/ranking"));
app.use("/api/jogador", require("./routes/jogador"));
app.use("/api/admin",   require("./routes/admin"));

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error:`${req.method} ${req.path} não encontrado` }));

// ════════════════════ SOCKET.IO ══════════════════════════════
const salas   = new Map();
const sessoes = new Map();
const online  = new Map();

function broadcastOnline() {
  io.emit("online_atualizado", { total: online.size, jogadores: [...online.values()] });
}

io.on("connection", (socket) => {

  // Presença online
  socket.on("entrar_online", ({ nome, avatar, status = "menu" }) => {
    online.set(socket.id, { nome, avatar, status });
    broadcastOnline();
    console.log(`[ONLINE] +${nome} | total: ${online.size}`);
  });

  socket.on("atualizar_status", ({ status }) => {
    const j = online.get(socket.id);
    if (j) { j.status = status; broadcastOnline(); }
  });

  // Notificação de recorde
  socket.on("novo_recorde", ({ nome, avatar, nivel, tempo }) => {
    io.emit("recorde_quebrado", { nome, avatar, nivel, tempo, quando: new Date().toLocaleTimeString("pt-BR") });
    console.log(`[RECORDE] ${nome} — Nv${nivel} — ${tempo}s`);
  });

  // Batalha
  socket.on("criar_sala", ({ jogador_id, nome, avatar, nivel }) => {
    const codigo = Math.random().toString(36).substring(2,7).toUpperCase();
    salas.set(codigo, { codigo, nivel, status:"esperando", criador:{ id:jogador_id, nome, avatar, socketId:socket.id, tempo:null, acertos:0, erros:0 }, jogadores:[] });
    sessoes.set(socket.id, { sala: codigo, jogador: { id:jogador_id, nome, avatar } });
    socket.join(codigo);
    socket.emit("sala_criada", { codigo, sala: salas.get(codigo) });
    const j = online.get(socket.id);
    if (j) { j.status = "sala"; broadcastOnline(); }
    console.log(`[SALA] Criada: ${codigo}`);
  });

  socket.on("entrar_sala", ({ codigo, jogador_id, nome, avatar }) => {
    const c = codigo.toUpperCase();
    const s = salas.get(c);
    if (!s) { socket.emit("erro",{ message:"Sala não encontrada" }); return; }
    s.jogadores.push({ id:jogador_id, nome, avatar, socketId:socket.id, tempo:null, acertos:0, erros:0 });
    sessoes.set(socket.id, { sala:c, jogador:{ id:jogador_id, nome, avatar } });
    socket.join(c);
    io.to(c).emit("jogador_entrou", { nome, avatar });
    socket.emit("sala_encontrada", { codigo:s.codigo, sala:s });
    const j = online.get(socket.id);
    if (j) { j.status = "sala"; broadcastOnline(); }
  });

  socket.on("iniciar_batalha", () => {
    const sess = sessoes.get(socket.id);
    if (!sess) return;
    const s = salas.get(sess.sala);
    if (!s) return;
    s.status = "em_jogo";
    io.to(sess.sala).emit("batalha_iniciada", { nivel: s.nivel });
    [...sessoes.entries()].filter(([,v]) => v.sala === sess.sala).forEach(([sid]) => {
      const j = online.get(sid); if (j) j.status = "jogando";
    });
    broadcastOnline();
  });

  socket.on("finalizar_batalha", ({ tempo, acertos, erros }) => {
    const sess = sessoes.get(socket.id);
    if (!sess) return;
    const { sala, jogador } = sess;
    const s = salas.get(sala);
    if (!s) return;
    if (s.criador.id === jogador.id) { s.criador.tempo=tempo; s.criador.acertos=acertos; s.criador.erros=erros; }
    else { const i=s.jogadores.findIndex(j=>j.id===jogador.id); if(i!==-1){s.jogadores[i].tempo=tempo;s.jogadores[i].acertos=acertos;s.jogadores[i].erros=erros;} }
    const todos=[s.criador,...s.jogadores].filter(j=>j.tempo!==null);
    if (todos.length===s.jogadores.length+1) { todos.sort((a,b)=>a.tempo-b.tempo); s.status="finalizada"; io.to(sala).emit("batalha_finalizada",{resultados:todos}); }
    else io.to(sala).emit("jogador_finalizou",{ nome:jogador.nome, tempo });
  });

  socket.on("sair_sala", () => {
    const sess = sessoes.get(socket.id);
    if (!sess) return;
    const { sala, jogador } = sess;
    const s = salas.get(sala);
    if (s) {
      if (s.criador.id === jogador.id) { s.status="cancelada"; io.to(sala).emit("sala_cancelada"); salas.delete(sala); }
      else { s.jogadores=s.jogadores.filter(j=>j.id!==jogador.id); io.to(sala).emit("jogador_saiu",{nome:jogador.nome}); }
    }
    socket.leave(sala);
    sessoes.delete(socket.id);
    const j = online.get(socket.id); if (j) { j.status="menu"; broadcastOnline(); }
  });

  socket.on("disconnect", () => {
    const sess = sessoes.get(socket.id);
    if (sess) {
      const s = salas.get(sess.sala);
      if (s && s.status!=="finalizada") io.to(sess.sala).emit("adversario_desconectou");
      sessoes.delete(socket.id);
    }
    online.delete(socket.id);
    broadcastOnline();
    console.log(`[OFFLINE] socket ${socket.id} | online: ${online.size}`);
  });
});

// ── START ─────────────────────────────────────────────────────
async function start() {
  await connectDb(); // Firebase — não trava se falhar
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Tabuada Turbo API v4.1 — porta ${PORT}`);
    console.log(`🔥 Firebase: ${getDb() ? "CONECTADO" : "OFFLINE"}`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
  });
}
start();
