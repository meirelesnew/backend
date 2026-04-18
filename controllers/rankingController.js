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
    { $sort: { tempo: 1 } },
    { $group: {
      _id: "$jogador_id",
      nome: { $first: "$nome" },
      avatar: { $first: "$avatar" },
      nivel: { $first: "$nivel" },
      tempo: { $min: "$tempo" },
      acertos: { $first: "$acertos" },
      erros: { $first: "$erros" },
      modo: { $first: "$modo" },
      data: { $first: "$data" }
    }},
    { $sort: { tempo: 1 } },
    { $limit: parseInt(limite) }
  ];

  try {
    const docs = await db.collection("ranking").aggregate(pipeline).toArray();
    const ranking = docs.map(d => ({ ...d, jogador_id: d._id, _id: d._id }));
    res.json({ ranking, total: ranking.length });
  } catch (error) {
    console.error("Erro ao buscar ranking global:", error);
    res.status(500).json({ ranking: [], total: 0, offline: true, message: "Erro interno do servidor" });
  }
};

exports.saveRankingEntry = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, offline: true, message: "Banco de dados indisponível" });

  const { jogador_id, nome, avatar, nivel, tempo, acertos, erros, modo } = req.body;
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
