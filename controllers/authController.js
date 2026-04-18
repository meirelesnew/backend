const bcrypt       = require("bcryptjs");
const jwt          = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { v4: uuidv4 } = require("uuid");
const { getDb }    = require("../config/db");

const JWT_SECRET    = process.env.JWT_SECRET;
const JWT_EXPIRES   = "7d";
const GOOGLE_CLIENT = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helpers ───────────────────────────────────────────────────────────────────

function gerarToken(usuario) {
  return jwt.sign(
    { id: usuario._id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES }
  );
}

function respostaUsuario(res, usuario, status = 200) {
  const token = gerarToken(usuario);
  res.status(status).json({
    token,
    usuario: {
      id:     usuario._id,
      nome:   usuario.nome,
      email:  usuario.email,
      avatar: usuario.avatar
    }
  });
}

// ── Registro (email + senha) ──────────────────────────────────────────────────

exports.register = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { nome, email, senha, avatar } = req.body;
  if (!nome || !email || !senha)
    return res.status(400).json({ message: "nome, email e senha são obrigatórios" });
  if (senha.length < 6)
    return res.status(400).json({ message: "Senha deve ter no mínimo 6 caracteres" });

  try {
    const existe = await db.collection("usuarios").findOne({ email: email.toLowerCase() });
    if (existe) return res.status(409).json({ message: "E-mail já cadastrado" });

    const usuario = {
      _id:        uuidv4(),
      nome,
      email:      email.toLowerCase(),
      senha:      await bcrypt.hash(senha, 10),
      avatar:     avatar || "🦁",
      provider:   "email",
      criado_em:  new Date(),
      atualizado_em: new Date()
    };
    await db.collection("usuarios").insertOne(usuario);
    console.log(`[AUTH] Registro: ${nome} (${email})`);
    respostaUsuario(res, usuario, 201);
  } catch (err) {
    console.error("[AUTH] Erro registro:", err.message);
    res.status(500).json({ message: "Erro interno" });
  }
};

// ── Login (email + senha) ─────────────────────────────────────────────────────

exports.login = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { email, senha } = req.body;
  if (!email || !senha)
    return res.status(400).json({ message: "email e senha são obrigatórios" });

  try {
    const usuario = await db.collection("usuarios").findOne({ email: email.toLowerCase() });
    if (!usuario || !(await bcrypt.compare(senha, usuario.senha || "")))
      return res.status(401).json({ message: "E-mail ou senha incorretos" });

    await db.collection("usuarios").updateOne(
      { _id: usuario._id },
      { $set: { atualizado_em: new Date() } }
    );
    console.log(`[AUTH] Login: ${usuario.nome} (${email})`);
    respostaUsuario(res, usuario);
  } catch (err) {
    console.error("[AUTH] Erro login:", err.message);
    res.status(500).json({ message: "Erro interno" });
  }
};

// ── Login via Google ──────────────────────────────────────────────────────────

exports.googleAuth = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { id_token } = req.body;
  if (!id_token) return res.status(400).json({ message: "id_token obrigatório" });

  try {
    // 1. Validar o token com o Google
    const ticket  = await GOOGLE_CLIENT.verifyIdToken({
      idToken:  id_token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload  = ticket.getPayload();
    const googleId = payload.sub;
    const email    = payload.email;
    const nome     = payload.name;
    const picture  = payload.picture;

    // 2. Buscar ou criar usuário
    let usuario = await db.collection("usuarios").findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }]
    });

    if (!usuario) {
      // Novo usuário via Google
      usuario = {
        _id:          uuidv4(),
        nome,
        email:        email.toLowerCase(),
        senha:        null,          // sem senha — login apenas via Google
        avatar:       "🦁",         // avatar padrão (emoji)
        googleId,
        googlePicture: picture,
        provider:     "google",
        criado_em:    new Date(),
        atualizado_em: new Date()
      };
      await db.collection("usuarios").insertOne(usuario);
      console.log(`[AUTH] Novo usuário Google: ${nome} (${email})`);
    } else {
      // Usuário existente — vincular googleId se ainda não tinha
      await db.collection("usuarios").updateOne(
        { _id: usuario._id },
        { $set: { googleId, googlePicture: picture, atualizado_em: new Date() } }
      );
      console.log(`[AUTH] Login Google: ${usuario.nome} (${email})`);
    }

    respostaUsuario(res, usuario);
  } catch (err) {
    console.error("[AUTH] Erro Google:", err.message);
    res.status(401).json({ message: "Autenticação Google falhou", detalhe: err.message });
  }
};

// ── Perfil ────────────────────────────────────────────────────────────────────

exports.perfil = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  try {
    const usuario = await db.collection("usuarios").findOne(
      { _id: req.usuarioId },
      { projection: { senha: 0 } }
    );
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json({ usuario: { ...usuario, id: usuario._id } });
  } catch (err) {
    res.status(500).json({ message: "Erro interno" });
  }
};
