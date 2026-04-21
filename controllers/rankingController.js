const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../config/db");

exports.getGlobalRanking = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0, offline: true, message: "Banco de dados indisponível" });

  const { nivel, modo, limite = 50 } = req.query;
  const match = {};
  if (nivel && parseInt(nivel) !== 0) match.nivel = parseInt(nivel);
  if (modo && modo !== "todos") match.modo = modo;

  const pipeline = [
    { $match: match },
    // Adicionar campo nome normalizado para agrupamento case-insensitive
    { $addFields: { nome_key: { $toLower: "$nome" } } },
    { $sort: { tempo: 1 } },
    // Agrupar por nome — assim o mesmo jogador em dispositivos diferentes é unificado
    { $group: {
      _id: "$nome_key",
      nome:   { $first: "$nome" },
      avatar: { $first: "$avatar" },
      nivel:  { $first: "$nivel" },
      tempo:  { $min: "$tempo" },
      acertos:{ $first: "$acertos" },
      erros:  { $first: "$erros" },
      modo:   { $first: "$modo" },
      data:   { $min: "$data" }
    }},
    { $sort: { tempo: 1 } },
    { $limit: parseInt(limite) }
  ];

  try {
    const docs = await db.collection("ranking").aggregate(pipeline).toArray();
    const ranking = docs.map(d => ({ ...d, jogador_id: d._id }));
    res.json({ ranking, total: ranking.length });
  } catch (error) {
    console.error("Erro ao buscar ranking global:", error);
    res.status(500).json({ ranking: [], total: 0, offline: true, message: "Erro interno do servidor" });
  }
};

exports.saveRankingEntry = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, offline: true, message: "Banco de dados indisponível" });

  const { nome, avatar, nivel, tempo, acertos, erros, modo } = req.body;
  const jogador_id = req.usuarioId || req.body.jogador_id || null;
  
  try {
    await db.collection("ranking").insertOne({
      _id: uuidv4(),
      jogador_id,
      nome,
      avatar,
      nivel: parseInt(nivel),
      tempo: parseInt(tempo),
      acertos: parseInt(acertos),
      erros: parseInt(erros),
      modo,
      data: new Date().toLocaleDateString("pt-BR")
    });
    res.json({ ok: true });
  } catch (error) {
    console.error("Erro ao salvar entrada de ranking:", error);
    res.status(500).json({ ok: false, message: "Erro interno do servidor" });
  }
};

exports.getRankingByNivel = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0 });
  const nivel = parseInt(req.params.nivel);
  if (![1, 2].includes(nivel))
    return res.status(400).json({ message: "Nível inválido (use 1 ou 2)" });
  try {
    const docs = await db.collection("ranking")
      .find({ nivel, tempo: { $type: ["int", "long", "double", "decimal"] } })
      .sort({ tempo: 1 }).limit(50).toArray();
    res.json({ ranking: docs.map(d => ({ ...d, _id: String(d._id), tempo: Number(d.tempo) })), nivel, total: docs.length });
  } catch (err) {
    res.status(500).json({ ranking: [], total: 0 });
  }
};

exports.getMeuRanking = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0 });
  try {
    const docs = await db.collection("ranking")
      .find({ jogador_id: req.usuarioId })
      .sort({ tempo: 1 }).limit(20).toArray();
    res.json({ ranking: docs.map(d => ({ ...d, _id: String(d._id) })), total: docs.length });
  } catch (err) {
    res.status(500).json({ ranking: [], total: 0 });
  }
};
