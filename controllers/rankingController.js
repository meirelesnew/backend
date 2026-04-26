const { getDb } = require("../config/firebase");

// GET /api/ranking/global?nivel=0&limite=50
exports.getGlobalRanking = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0, offline: true });

  const nivel  = parseInt(req.query.nivel  || "0");
  const limite = Math.min(parseInt(req.query.limite || "50"), 100);

  try {
    let snap;

    if (nivel !== 0) {
      // WHERE antes de orderBy — obrigatório no Firestore
      snap = await db.collection("ranking")
        .where("nivel", "==", nivel)
        .orderBy("tempo", "asc")
        .limit(limite * 5)
        .get();
    } else {
      // Sem filtro de nível — só ordena
      snap = await db.collection("ranking")
        .orderBy("tempo", "asc")
        .limit(limite * 5)
        .get();
    }

    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Deduplicar: melhor tempo por jogador+nivel
    const mapa = new Map();
    for (const d of docs) {
      const k = (d.jogador_id || d.nome || "?") + "_" + (d.nivel || 1);
      if (!mapa.has(k) || d.tempo < mapa.get(k).tempo) mapa.set(k, d);
    }

    const ranking = Array.from(mapa.values())
      .sort((a, b) => a.tempo - b.tempo)
      .slice(0, limite);

    res.json({ ranking, total: ranking.length });

  } catch (e) {
    console.error("[Ranking] getGlobal erro:", e.message, "code:", e.code);
    res.status(500).json({ ranking: [], total: 0, offline: true, erro: e.message });
  }
};

// POST /api/ranking/salvar
exports.saveRankingEntry = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ok: false, offline: true });

  const { nome, avatar, nivel, tempo, acertos, erros, modo } = req.body;
  if (!nome || !tempo) return res.status(400).json({ ok: false, error: "Campos obrigatorios" });

  const jogador_id = req.usuarioId || req.body.jogador_id || "anonimo";

  try {
    await db.collection("ranking").add({
      jogador_id,
      nome,
      avatar:    avatar || "🦁",
      nivel:     parseInt(nivel)   || 1,
      tempo:     parseInt(tempo),
      acertos:   parseInt(acertos) || 0,
      erros:     parseInt(erros)   || 0,
      modo:      modo || "solo",
      data:      new Date().toLocaleDateString("pt-BR"),
      criado_em: new Date().toISOString()
    });
    res.json({ ok: true });
  } catch (e) {
    console.error("[Ranking] save erro:", e.message);
    res.status(500).json({ ok: false, error: e.message });
  }
};

// GET /api/ranking/nivel/:nivel
exports.getRankingByNivel = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0 });

  const nivel = parseInt(req.params.nivel);
  if (![1, 2].includes(nivel)) return res.status(400).json({ error: "Nivel invalido" });

  try {
    const snap = await db.collection("ranking")
      .where("nivel", "==", nivel)
      .orderBy("tempo", "asc")
      .limit(50)
      .get();
    res.json({
      ranking: snap.docs.map(d => ({ id: d.id, ...d.data(), tempo: Number(d.data().tempo) })),
      nivel,
      total: snap.size
    });
  } catch (e) {
    console.error("[Ranking] byNivel erro:", e.message);
    res.status(500).json({ ranking: [], total: 0 });
  }
};

// GET /api/ranking/meus-resultados
exports.getMeuRanking = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ ranking: [], total: 0 });

  try {
    const snap = await db.collection("ranking")
      .where("jogador_id", "==", req.usuarioId)
      .orderBy("tempo", "asc")
      .limit(20)
      .get();
    res.json({ ranking: snap.docs.map(d => ({ id: d.id, ...d.data() })), total: snap.size });
  } catch (e) {
    res.status(500).json({ ranking: [], total: 0 });
  }
};
