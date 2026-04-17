const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../config/db");

// ─── Ranking Global ────────────────────────────────────────────────────────────
exports.getGlobalRanking = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0, offline: true });

  const { nivel = 0, modo = "todos", limite = 50 } = req.query;

  const matchStage = {
    tempo: { $type: ["int", "long", "double", "decimal"] }
  };
  if (Number(nivel) === 1 || Number(nivel) === 2) matchStage.nivel = Number(nivel);
  if (modo === "solo" || modo === "batalha") matchStage.modo = modo;

  const pipeline = [
    { $match: matchStage },
    { $sort: { tempo: 1 } },
    { $limit: Math.min(parseInt(limite) || 50, 100) }
  ];

  try {
    const docs = await db.collection("ranking").aggregate(pipeline).toArray();
    const ranking = docs.map(d => ({ ...d, _id: String(d._id), tempo: Number(d.tempo) }));
    console.log(`[RANKING] GET global — ${ranking.length} registros (nivel=${nivel} modo=${modo})`);
    res.json({ ranking, total: ranking.length });
  } catch (error) {
    console.error("[RANKING] Erro ao buscar ranking global:", error.message);
    res.status(500).json({ ranking: [], total: 0, offline: true, message: "Erro interno" });
  }
};

// ─── Salvar Entrada no Ranking ─────────────────────────────────────────────────
exports.saveRankingEntry = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, offline: true });

  const { jogador_id, nome, avatar, nivel, tempo, acertos, erros, modo } = req.body;
  const usuario_id = req.usuarioId || null; // Definido pelo middleware de auth (se logado)

  if (!nome || !avatar || !nivel || tempo == null || !modo) {
    return res.status(400).json({ ok: false, message: "Campos obrigatórios faltando" });
  }

  try {
    const entrada = {
      _id: uuidv4(),
      jogador_id: jogador_id || "anonimo",
      usuario_id,  // null se não tiver conta, preenchido se tiver login
      nome,
      avatar,
      nivel: parseInt(nivel),
      tempo: parseInt(tempo),
      acertos: parseInt(acertos),
      erros: parseInt(erros),
      modo,
      verificado: !!usuario_id, // entrada verificada se vier de conta autenticada
      data: new Date().toLocaleDateString("pt-BR"),
      criado_em: new Date()
    };

    await db.collection("ranking").insertOne(entrada);

    // Atualiza estatísticas do usuário se tiver conta
    if (usuario_id) {
      await db.collection("usuarios").updateOne(
        { _id: usuario_id },
        { $inc: { jogos_totais: 1, pontuacao_total: acertos || 0 } }
      );
    }

    console.log(`[RANKING] POST salvo: ${nome} nivel=${nivel} tempo=${tempo}ms verificado=${!!usuario_id}`);
    res.json({ ok: true });
  } catch (error) {
    console.error("[RANKING] Erro ao salvar:", error.message);
    res.status(500).json({ ok: false, message: "Erro interno do servidor" });
  }
};

// ─── Ranking por Nível ─────────────────────────────────────────────────────────
exports.getRankingByNivel = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0, offline: true });

  const nivel = parseInt(req.params.nivel);
  if (![1, 2].includes(nivel)) return res.status(400).json({ message: "Nível inválido (use 1 ou 2)" });

  try {
    const docs = await db.collection("ranking")
      .find({ nivel, tempo: { $type: ["int", "long", "double", "decimal"] } })
      .sort({ tempo: 1 })
      .limit(50)
      .toArray();
    const ranking = docs.map(d => ({ ...d, _id: String(d._id), tempo: Number(d.tempo) }));
    res.json({ ranking, nivel, total: ranking.length });
  } catch (error) {
    console.error("[RANKING] Erro ao buscar por nivel:", error.message);
    res.status(500).json({ ranking: [], total: 0 });
  }
};

// ─── Ranking do Jogador (histórico pessoal) ────────────────────────────────────
exports.getMeuRanking = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0, offline: true });

  const usuario_id = req.usuarioId;

  try {
    const docs = await db.collection("ranking")
      .find({ usuario_id })
      .sort({ tempo: 1 })
      .limit(20)
      .toArray();
    const ranking = docs.map(d => ({ ...d, _id: String(d._id), tempo: Number(d.tempo) }));
    res.json({ ranking, total: ranking.length });
  } catch (error) {
    console.error("[RANKING] Erro ao buscar ranking pessoal:", error.message);
    res.status(500).json({ ranking: [], total: 0 });
  }
};
