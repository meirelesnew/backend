const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../config/db");

const JWT_SECRET = process.env.JWT_SECRET || "tabuada-turbo-secret-2026";
const JWT_EXPIRES = "7d";

// ─── Registro ─────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, message: "Banco de dados indisponível" });

  const { nome, email, senha, avatar } = req.body;

  if (!nome || !email || !senha) {
    return res.status(400).json({ ok: false, message: "nome, email e senha são obrigatórios" });
  }

  // Validação básica de email
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ ok: false, message: "Email inválido" });
  }

  if (senha.length < 6) {
    return res.status(400).json({ ok: false, message: "Senha deve ter pelo menos 6 caracteres" });
  }

  try {
    // Verifica se email já existe
    const existing = await db.collection("usuarios").findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ ok: false, message: "Este email já está cadastrado" });
    }

    const senhaHash = await bcrypt.hash(senha, 10);
    const id = uuidv4();

    const usuario = {
      _id: id,
      nome: nome.trim(),
      email: email.toLowerCase(),
      senhaHash,
      avatar: avatar || "🎮",
      criado_em: new Date(),
      pontuacao_total: 0,
      jogos_totais: 0
    };

    await db.collection("usuarios").insertOne(usuario);

    const token = jwt.sign({ id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

    console.log(`[AUTH] Novo usuário registrado: ${nome} (${email})`);
    res.status(201).json({
      ok: true,
      token,
      usuario: { id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar }
    });
  } catch (error) {
    console.error("[AUTH] Erro no registro:", error.message);
    res.status(500).json({ ok: false, message: "Erro interno do servidor" });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────
exports.login = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, message: "Banco de dados indisponível" });

  const { email, senha } = req.body;

  if (!email || !senha) {
    return res.status(400).json({ ok: false, message: "email e senha são obrigatórios" });
  }

  try {
    const usuario = await db.collection("usuarios").findOne({ email: email.toLowerCase() });

    if (!usuario) {
      return res.status(401).json({ ok: false, message: "Email ou senha incorretos" });
    }

    const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);
    if (!senhaCorreta) {
      return res.status(401).json({ ok: false, message: "Email ou senha incorretos" });
    }

    const token = jwt.sign(
      { id: usuario._id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES }
    );

    console.log(`[AUTH] Login: ${usuario.nome} (${email})`);
    res.json({
      ok: true,
      token,
      usuario: { id: usuario._id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar }
    });
  } catch (error) {
    console.error("[AUTH] Erro no login:", error.message);
    res.status(500).json({ ok: false, message: "Erro interno do servidor" });
  }
};

// ─── Perfil (rota protegida) ──────────────────────────────────────────────────
exports.perfil = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco de dados indisponível" });

  try {
    const usuario = await db.collection("usuarios").findOne({ _id: req.usuarioId });
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });

    res.json({
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      avatar: usuario.avatar,
      pontuacao_total: usuario.pontuacao_total || 0,
      jogos_totais: usuario.jogos_totais || 0,
      criado_em: usuario.criado_em
    });
  } catch (error) {
    console.error("[AUTH] Erro ao buscar perfil:", error.message);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
