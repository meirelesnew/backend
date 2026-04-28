const express     = require("express");
const cors        = require("cors");
const compression = require("compression");
const rateLimit   = require("express-rate-limit");
const http        = require("http");
const { Server }  = require("socket.io");
require("dotenv").config();

const app    = express();
app.set("trust proxy", 1);
const server = http.createServer(app);
const PORT   = process.env.PORT || 3001;

// ── Modo Offline — dados em memória ──────────────────────────
const mem = { ranking: [], usuarios: [], jogadores: [] };
let mongoDb = null, mongoOn = false;

async function tryMongo() {
  if (!process.env.MONGO_URL) { console.log("⚠️  Sem MONGO_URL — modo OFFLINE (memória)"); return; }
  try {
    const { MongoClient } = require("mongodb");
    const c = new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: 5000 });
    await c.connect();
    mongoDb = c.db("tabuada2026");
    mongoOn = true;
    console.log("✅ MongoDB conectado — modo ONLINE");
  } catch (e) { console.log("⚠️  MongoDB falhou — modo OFFLINE:", e.message); }
}

const col = (name) => mongoOn && mongoDb ? mongoDb.collection(name) : null;

// ── CORS ─────────────────────────────────────────────────────
const ORIGINS = [
  "https://tabuadaturbo.com.br","https://www.tabuadaturbo.com.br",
  "https://meirelesnew.github.io",
  "http://localhost:3000","http://localhost:3001",
  "http://localhost:5500","http://127.0.0.1:5500","http://localhost:8080"
];
const io = new Server(server, { cors: { origin: ORIGINS, methods: ["GET","POST"] } });
app.use(compression());
app.use(cors({ origin:(o,cb)=>!o||ORIGINS.includes(o)?cb(null,true):cb(new Error("CORS")), credentials:true, methods:["GET","POST","PUT","DELETE","OPTIONS"], allowedHeaders:["Content-Type","Authorization"] }));
app.use(express.json());
app.use((_,res,next)=>{ res.setHeader("Permissions-Policy","identity-credentials-get=()"); next(); });
app.use("/api/auth", rateLimit({ windowMs:15*60*1000, max:30 }));
app.use("/api",      rateLimit({ windowMs:60*1000, max:300 }));

// ── JWT + bcrypt ──────────────────────────────────────────────
const bcrypt = require("bcryptjs");
const jwt    = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "tt-dev-2026";

// ═══════════════════════════════ ROTAS ═══════════════════════

app.all("/",           (_, res) => res.json({ app:"Tabuada Turbo API v3.2", db: mongoOn?"mongodb":"memory" }));
app.all("/api/health", (_, res) => res.json({ status:"ok", db: mongoOn?"conectado":"offline-memory", ts: new Date().toISOString() }));

// Auth
app.post("/api/auth/registrar", async (req, res) => {
  const { nome, email, senha, avatar } = req.body;
  if (!nome||!email||!senha) return res.status(400).json({ error:"Campos obrigatórios" });
  if (senha.length < 6)      return res.status(400).json({ error:"Senha mínimo 6 caracteres" });

  const c = col("usuarios");
  const existe = c ? await c.findOne({ email }) : mem.usuarios.find(u=>u.email===email);
  if (existe) return res.status(409).json({ error:"Email já cadastrado" });

  const hash = await bcrypt.hash(senha, 10);
  const u    = { _id: Date.now().toString(36), nome, email, avatar: avatar||"🦁", senhaHash: hash };
  c ? await c.insertOne(u) : mem.usuarios.push(u);

  const token = jwt.sign({ id:u._id, nome, email }, SECRET, { expiresIn:"30d" });
  res.json({ ok:true, token, user:{ id:u._id, nome, email, avatar:u.avatar } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, senha } = req.body;
  if (!email||!senha) return res.status(400).json({ error:"Campos obrigatórios" });

  const c = col("usuarios");
  const u = c ? await c.findOne({ email }) : mem.usuarios.find(u=>u.email===email);
  if (!u || !await bcrypt.compare(senha, u.senhaHash))
    return res.status(401).json({ error:"Email ou senha incorretos" });

  const token = jwt.sign({ id:u._id, nome:u.nome, email }, SECRET, { expiresIn:"30d" });
  res.json({ ok:true, token, user:{ id:u._id, nome:u.nome, email, avatar:u.avatar } });
});

app.post("/api/auth/recuperar", (_, res) =>
  res.json({ ok:true, message:"Se o email existir, você receberá as instruções." }));

// Jogador
app.post("/api/jogador", async (req, res) => {
  const { nome, avatar } = req.body;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,5);
  const j  = { _id:id, nome, avatar };
  const c  = col("jogadores");
  c ? await c.insertOne(j) : mem.jogadores.push(j);
  res.json({ jogador_id: id });
});

// Ranking — salvar
app.post("/api/ranking/salvar", async (req, res) => {
  const { nome, avatar, nivel, tempo, acertos, erros, modo, jogador_id } = req.body;
  if (!nome||!tempo) return res.status(400).json({ ok:false, error:"Dados incompletos" });

  const entry = {
    _id:        Date.now().toString(36),
    jogador_id: jogador_id||"anonimo",
    nome, avatar,
    nivel:   parseInt(nivel)||1,
    tempo:   parseInt(tempo),
    acertos: parseInt(acertos)||0,
    erros:   parseInt(erros)||0,
    modo:    modo||"solo",
    data:    new Date().toLocaleDateString("pt-BR")
  };
  const c = col("ranking");
  c ? await c.insertOne(entry) : mem.ranking.push(entry);
  res.json({ ok:true });
});

// Ranking — global (deduplicado por nome, melhor tempo)
app.get("/api/ranking/global", async (req, res) => {
  const { nivel, limite = 50 } = req.query;
  const lim = Math.min(parseInt(limite)||50, 100);
  const c   = col("ranking");

  let docs;
  if (c) {
    const match = {};
    if (nivel && parseInt(nivel)!==0) match.nivel = parseInt(nivel);
    docs = await c.find(match).sort({ tempo:1 }).limit(lim*3).toArray();
  } else {
    docs = [...mem.ranking];
    if (nivel && parseInt(nivel)!==0) docs = docs.filter(r=>r.nivel===parseInt(nivel));
    docs.sort((a,b)=>a.tempo-b.tempo);
  }

  // Deduplica — melhor tempo por nome
  const seen = new Map();
  for (const d of docs) {
    const k = d.nome.toLowerCase();
    if (!seen.has(k) || d.tempo < seen.get(k).tempo) seen.set(k, d);
  }
  const ranking = [...seen.values()].sort((a,b)=>a.tempo-b.tempo).slice(0, lim);
  res.json({ ranking, total: ranking.length });
});

app.get("/api/ranking/nivel/:nivel", async (req, res) => {
  const nivel = parseInt(req.params.nivel);
  const c     = col("ranking");
  let docs;
  if (c) {
    docs = await c.find({ nivel }).sort({ tempo:1 }).limit(50).toArray();
  } else {
    docs = mem.ranking.filter(r=>r.nivel===nivel).sort((a,b)=>a.tempo-b.tempo).slice(0,50);
  }
  res.json({ ranking: docs, nivel, total: docs.length });
});

// 404
app.use((req,res) => res.status(404).json({ error:`${req.method} ${req.path} não encontrado` }));

// ═══════════════════════ SOCKET.IO ═══════════════════════════
// ═══════════════════════════════════════════════════════════════
//  ESTADO GLOBAL DO SOCKET.IO
// ═══════════════════════════════════════════════════════════════
const salas    = new Map(); // sala_codigo → dados da sala
const sessoes  = new Map(); // socket.id   → { sala, jogador }
const online   = new Map(); // socket.id   → { nome, avatar, status }

// Broadcast da lista de online para todos
function broadcastOnline() {
  const jogadores = [...online.values()];
  io.emit("online_atualizado", { total: jogadores.length, jogadores });
}

io.on("connection", (socket) => {

  // ── Presença online ──────────────────────────────────────────
  socket.on("entrar_online", ({ nome, avatar, status = "menu" }) => {
    online.set(socket.id, { nome, avatar, status });
    broadcastOnline();
    console.log(`[ONLINE] +${nome} | total: ${online.size}`);
  });

  socket.on("atualizar_status", ({ status }) => {
    const j = online.get(socket.id);
    if (j) { j.status = status; broadcastOnline(); }
  });

  // ── Notificação de novo recorde ──────────────────────────────
  socket.on("novo_recorde", ({ nome, avatar, nivel, tempo }) => {
    io.emit("recorde_quebrado", {
      nome, avatar, nivel, tempo,
      quando: new Date().toLocaleTimeString("pt-BR")
    });
    console.log(`[RECORDE] ${nome} — Nv${nivel} — ${tempo}s`);
  });

  // ── Batalha ──────────────────────────────────────────────────
  socket.on("criar_sala", ({ jogador_id, nome, avatar, nivel }) => {
    const codigo = Math.random().toString(36).substring(2,7).toUpperCase();
    const sala   = { codigo, nivel, status:"esperando", criador:{ id:jogador_id, nome, avatar, socketId:socket.id, tempo:null, acertos:0, erros:0 }, jogadores:[] };
    salas.set(codigo, sala);
    sessoes.set(socket.id, { sala: codigo, jogador: { id:jogador_id, nome, avatar } });
    socket.join(codigo);
    socket.emit("sala_criada", { codigo, sala });

    // Atualizar status online para "sala"
    const j = online.get(socket.id);
    if (j) { j.status = "sala"; broadcastOnline(); }
    console.log(`[SALA] Criada: ${codigo}`);
  });

  socket.on("entrar_sala", ({ codigo, jogador_id, nome, avatar }) => {
    const c = codigo.toUpperCase();
    const s = salas.get(c);
    if (!s) { socket.emit("erro",{ message:"Sala não encontrada" }); return; }
    s.jogadores.push({ id:jogador_id, nome, avatar, socketId:socket.id, tempo:null, acertos:0, erros:0 });
    sessoes.set(socket.id, { sala: c, jogador: { id:jogador_id, nome, avatar } });
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

    // Atualizar status de todos na sala para "jogando"
    [...sessoes.entries()]
      .filter(([,v]) => v.sala === sess.sala)
      .forEach(([sid]) => {
        const j = online.get(sid);
        if (j) j.status = "jogando";
      });
    broadcastOnline();
  });

  socket.on("finalizar_batalha", ({ tempo, acertos, erros }) => {
    const sess = sessoes.get(socket.id);
    if (!sess) return;
    const { sala, jogador } = sess;
    const s = salas.get(sala);
    if (!s) return;

    if (s.criador.id === jogador.id) {
      s.criador.tempo=tempo; s.criador.acertos=acertos; s.criador.erros=erros;
    } else {
      const i = s.jogadores.findIndex(j => j.id === jogador.id);
      if (i !== -1) { s.jogadores[i].tempo=tempo; s.jogadores[i].acertos=acertos; s.jogadores[i].erros=erros; }
    }

    const todos = [s.criador,...s.jogadores].filter(j => j.tempo !== null);
    if (todos.length === s.jogadores.length+1) {
      todos.sort((a,b) => a.tempo-b.tempo);
      s.status = "finalizada";
      io.to(sala).emit("batalha_finalizada", { resultados: todos });
    } else {
      io.to(sala).emit("jogador_finalizou", { nome:jogador.nome, tempo });
    }
  });

  socket.on("sair_sala", () => {
    const sess = sessoes.get(socket.id);
    if (!sess) return;
    const { sala, jogador } = sess;
    const s = salas.get(sala);
    if (s) {
      if (s.criador.id === jogador.id) {
        s.status = "cancelada";
        io.to(sala).emit("sala_cancelada");
        salas.delete(sala);
      } else {
        s.jogadores = s.jogadores.filter(j => j.id !== jogador.id);
        io.to(sala).emit("jogador_saiu", { nome: jogador.nome });
      }
    }
    socket.leave(sala);
    sessoes.delete(socket.id);

    const j = online.get(socket.id);
    if (j) { j.status = "menu"; broadcastOnline(); }
  });

  socket.on("disconnect", () => {
    // Limpar sala
    const sess = sessoes.get(socket.id);
    if (sess) {
      const { sala } = sess;
      const s = salas.get(sala);
      if (s && s.status !== "finalizada") {
        io.to(sala).emit("adversario_desconectou");
        salas.delete(sala);
      }
      sessoes.delete(socket.id);
    }
    // Limpar online
    online.delete(socket.id);
    broadcastOnline();
    console.log(`[OFFLINE] socket ${socket.id} | online: ${online.size}`);
  });
});

// Endpoint REST para online count (útil para o frontend acordar o servidor)
app.get("/api/online", (req, res) => {
  res.json({ total: online.size, jogadores: [...online.values()] });
});

// ─── Start ────────────────────────────────────────────────────
async function start() {
  await tryMongo();
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`\n🚀 Tabuada Turbo API v3.2`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log(`📊 Modo: ${mongoOn ? "ONLINE (MongoDB)" : "OFFLINE (memória)"}`);
    console.log(`❤️  Health: http://localhost:${PORT}/api/health\n`);
  });
}
start();
