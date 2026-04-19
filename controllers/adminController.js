const { getDb } = require("../config/db");

exports.listarUsuarios = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { pagina = 1, limite = 20 } = req.query;
  const skip = (parseInt(pagina) - 1) * parseInt(limite);

  try {
    const usuarios = await db.collection("usuarios")
      .find({}, { projection: { senha: 0, token_confirmacao: 0 } })
      .sort({ criado_em: -1 })
      .skip(skip)
      .limit(parseInt(limite))
      .toArray();

    const total = await db.collection("usuarios").countDocuments();

    res.json({
      usuarios,
      total,
      pagina: parseInt(pagina),
      totalPaginas: Math.ceil(total / parseInt(limite))
    });
  } catch (err) {
    console.error("[ADMIN] Erro listar usuários:", err);
    res.status(500).json({ message: "Erro interno" });
  }
};

exports.buscarUsuario = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { id } = req.params;

  try {
    const usuario = await db.collection("usuarios").findOne(
      { _id: id },
      { projection: { senha: 0, token_confirmacao: 0 } }
    );

    if (!usuario) return res.status(404).json({ message: "Usuário não encontrado" });

    const jogos = await db.collection("ranking")
      .find({ jogador_id: id })
      .sort({ data: -1 })
      .limit(20)
      .toArray();

    res.json({ usuario, jogos });
  } catch (err) {
    console.error("[ADMIN] Erro buscar usuário:", err);
    res.status(500).json({ message: "Erro interno" });
  }
};

exports.atualizarUsuario = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { id } = req.params;
  const { nome, avatar, role, confirmado } = req.body;

  try {
    const updates = {};
  if (nome) updates.nome = nome;
  if (avatar) updates.avatar = avatar;
  if (role) updates.role = role;
  if (typeof confirmado === "boolean") updates.confirmado = confirmado;
  updates.atualizado_em = new Date();

    await db.collection("usuarios").updateOne(
      { _id: id },
      { $set: updates }
    );

    res.json({ message: "Usuário atualizado" });
  } catch (err) {
    console.error("[ADMIN] Erro atualizar usuário:", err);
    res.status(500).json({ message: "Erro interno" });
  }
};

exports.deletarUsuario = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { id } = req.params;

  if (id === req.usuarioId) {
    return res.status(400).json({ message: "Não pode excluir sua própria conta" });
  }

  try {
    await db.collection("usuarios").deleteOne({ _id: id });
    res.json({ message: "Usuário excluído" });
  } catch (err) {
    console.error("[ADMIN] Erro deletar usuário:", err);
    res.status(500).json({ message: "Erro interno" });
  }
};

exports.estatisticas = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  try {
    const totalUsuarios = await db.collection("usuarios").countDocuments();
    const usuariosConfirmados = await db.collection("usuarios").countDocuments({ confirmado: true });
    const totalJogos = await db.collection("ranking").countDocuments();

    const melhoresNivel1 = await db.collection("ranking")
      .find({ nivel: 1 })
      .sort({ tempo: 1 })
      .limit(5)
      .toArray();

    const melhoresNivel2 = await db.collection("ranking")
      .find({ nivel: 2 })
      .sort({ tempo: 1 })
      .limit(5)
      .toArray();

    res.json({
      totalUsuarios,
      usuariosConfirmados,
      totalJogos,
      melhoresNivel1,
      melhoresNivel2
    });
  } catch (err) {
    console.error("[ADMIN] Erro estatísticas:", err);
    res.status(500).json({ message: "Erro interno" });
  }
};