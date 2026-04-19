const bcrypt           = require("bcryptjs");
const jwt              = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const { v4: uuidv4 }   = require("uuid");
const crypto           = require("crypto");
const { getDb }        = require("../config/db");
const { enviarConfirmacao, enviarRecuperacao } = require("../config/email");

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
  res.status(status).json({
    token: gerarToken(usuario),
    usuario: { id: usuario._id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar }
  });
}

function gerarTokenSeguro() {
  return crypto.randomBytes(32).toString("hex");
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

    const tokenConfirmacao = gerarTokenSeguro();
    const usuario = {
      _id:               uuidv4(),
      nome,
      email:             email.toLowerCase(),
      senha:             await bcrypt.hash(senha, 10),
      avatar:            avatar || "🦁",
      provider:          "email",
      confirmado:        false,                          // ← conta não confirmada ainda
      token_confirmacao: tokenConfirmacao,
      token_confirmacao_expira: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
      criado_em:         new Date(),
      atualizado_em:     new Date()
    };
    await db.collection("usuarios").insertOne(usuario);

    // Enviar email de confirmação (não bloqueia a resposta)
    enviarConfirmacao(email, nome, tokenConfirmacao).catch(e =>
      console.warn("[EMAIL] Falha ao enviar confirmação:", e.message)
    );

    console.log(`[AUTH] Registro: ${nome} (${email})`);
    res.status(201).json({
      message: "Conta criada! Verifique seu e-mail para confirmar.",
      usuario: { id: usuario._id, nome, email: email.toLowerCase(), avatar: usuario.avatar }
    });
  } catch (err) {
    console.error("[AUTH] Erro registro:", err.message);
    res.status(500).json({ message: "Erro interno" });
  }
};

// ── Confirmar conta ───────────────────────────────────────────────────────────

exports.confirmarConta = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { token } = req.body;
  if (!token) return res.status(400).json({ message: "Token obrigatório" });

  try {
    const usuario = await db.collection("usuarios").findOne({
      token_confirmacao: token,
      token_confirmacao_expira: { $gt: new Date() }
    });

    if (!usuario) {
      return res.status(400).json({ message: "Token inválido ou expirado. Solicite um novo." });
    }
    if (usuario.confirmado) {
      return res.status(200).json({ message: "Conta já confirmada. Faça login!" });
    }

    await db.collection("usuarios").updateOne(
      { _id: usuario._id },
      { $set: { confirmado: true, atualizado_em: new Date() },
        $unset: { token_confirmacao: "", token_confirmacao_expira: "" } }
    );

    console.log(`[AUTH] Conta confirmada: ${usuario.email}`);
    respostaUsuario(res, usuario);
  } catch (err) {
    console.error("[AUTH] Erro confirmação:", err.message);
    res.status(500).json({ message: "Erro interno" });
  }
};

// ── Reenviar confirmação ──────────────────────────────────────────────────────

exports.reenviarConfirmacao = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "E-mail obrigatório" });

  try {
    const usuario = await db.collection("usuarios").findOne({ email: email.toLowerCase() });
    if (!usuario) return res.status(404).json({ message: "E-mail não encontrado" });
    if (usuario.confirmado) return res.status(200).json({ message: "Conta já confirmada!" });

    const token = gerarTokenSeguro();
    await db.collection("usuarios").updateOne(
      { _id: usuario._id },
      { $set: {
          token_confirmacao: token,
          token_confirmacao_expira: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      }
    );

    await enviarConfirmacao(email, usuario.nome, token);
    res.json({ message: "E-mail de confirmação reenviado!" });
  } catch (err) {
    console.error("[AUTH] Erro reenvio:", err.message);
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

    // Avisar se conta não confirmada, mas deixa logar
    const aviso = !usuario.confirmado
      ? "Confirme seu e-mail para uma experiência completa."
      : null;

    await db.collection("usuarios").updateOne(
      { _id: usuario._id },
      { $set: { atualizado_em: new Date() } }
    );

    console.log(`[AUTH] Login: ${usuario.nome} (${email})`);
    const token = gerarToken(usuario);
    res.json({
      token,
      aviso,
      usuario: { id: usuario._id, nome: usuario.nome, email: usuario.email, avatar: usuario.avatar }
    });
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
    const ticket   = await GOOGLE_CLIENT.verifyIdToken({
      idToken: id_token, audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload  = ticket.getPayload();
    const googleId = payload.sub;
    const email    = payload.email;
    const nome     = payload.name;
    const picture  = payload.picture;

    let usuario = await db.collection("usuarios").findOne({
      $or: [{ googleId }, { email: email.toLowerCase() }]
    });

    if (!usuario) {
      usuario = {
        _id:           uuidv4(),
        nome,
        email:         email.toLowerCase(),
        senha:         null,
        avatar:        "🦁",
        googleId,
        googlePicture: picture,
        provider:      "google",
        confirmado:    true,        // Google já valida o email
        criado_em:     new Date(),
        atualizado_em: new Date()
      };
      await db.collection("usuarios").insertOne(usuario);
      console.log(`[AUTH] Novo usuário Google: ${nome} (${email})`);
    } else {
      await db.collection("usuarios").updateOne(
        { _id: usuario._id },
        { $set: { googleId, googlePicture: picture, confirmado: true, atualizado_em: new Date() } }
      );
      console.log(`[AUTH] Login Google: ${usuario.nome} (${email})`);
    }

    respostaUsuario(res, usuario);
  } catch (err) {
    console.error("[AUTH] Erro Google:", err.message);
    res.status(401).json({ message: "Autenticação Google falhou", detalhe: err.message });
  }
};

// ── Solicitar recuperação de senha ────────────────────────────────────────────

exports.solicitarRecuperacao = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "E-mail obrigatório" });

  // Sempre retorna sucesso (não revelar se email existe)
  const MSG = "Se este e-mail estiver cadastrado, você receberá as instruções em breve.";

  try {
    const usuario = await db.collection("usuarios").findOne({ email: email.toLowerCase() });
    if (!usuario || usuario.provider === "google") {
      return res.json({ message: MSG });
    }

    const token = gerarTokenSeguro();
    await db.collection("usuarios").updateOne(
      { _id: usuario._id },
      { $set: {
          token_recuperacao:        token,
          token_recuperacao_expira: new Date(Date.now() + 60 * 60 * 1000) // 1h
        }
      }
    );

    await enviarRecuperacao(email, usuario.nome, token);
    console.log(`[AUTH] Recuperação solicitada: ${email}`);
    res.json({ message: MSG });
  } catch (err) {
    console.error("[AUTH] Erro recuperação:", err.message);
    res.status(500).json({ message: "Erro interno" });
  }
};

// ── Redefinir senha ────────────────────────────────────────────────────────────

exports.redefinirSenha = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { token, nova_senha } = req.body;
  if (!token || !nova_senha)
    return res.status(400).json({ message: "token e nova_senha são obrigatórios" });
  if (nova_senha.length < 6)
    return res.status(400).json({ message: "Senha deve ter no mínimo 6 caracteres" });

  try {
    const usuario = await db.collection("usuarios").findOne({
      token_recuperacao:        token,
      token_recuperacao_expira: { $gt: new Date() }
    });

    if (!usuario)
      return res.status(400).json({ message: "Token inválido ou expirado. Solicite novamente." });

    await db.collection("usuarios").updateOne(
      { _id: usuario._id },
      {
        $set:   { senha: await bcrypt.hash(nova_senha, 10), atualizado_em: new Date() },
        $unset: { token_recuperacao: "", token_recuperacao_expira: "" }
      }
    );

    console.log(`[AUTH] Senha redefinida: ${usuario.email}`);
    res.json({ message: "Senha redefinida com sucesso! Faça login." });
  } catch (err) {
    console.error("[AUTH] Erro redefinir:", err.message);
    res.status(500).json({ message: "Erro interno" });
  }
};

// ── Perfil ────────────────────────────────────────────────────────────────────

exports.perfil = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  try {
    const usuario = await db.collection("usuarios").findOne(
      { _id: req.usuarioId },
      { projection: { senha: 0, token_confirmacao: 0, token_recuperacao: 0 } }
    );
    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });
    res.json({ usuario: { ...usuario, id: usuario._id } });
  } catch (err) {
    res.status(500).json({ message: "Erro interno" });
  }
};
