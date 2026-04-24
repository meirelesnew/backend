// rankingController.js — Firestore + fallback memória
const { getDb } = require('../config/firebase');

// Fallback em memória quando Firestore não está disponível
const memRanking = [];

// GET /api/ranking/global
exports.getGlobalRanking = async (req, res) => {
  const { nivel, limite = 50 } = req.query;
  const lim = Math.min(parseInt(limite) || 50, 100);
  const db  = getDb();

  try {
    let docs = [];

    if (db) {
      // Firestore API
      let q = db.collection('ranking').orderBy('tempo', 'asc');
      if (nivel && parseInt(nivel) !== 0) {
        q = db.collection('ranking')
          .where('nivel', '==', parseInt(nivel))
          .orderBy('tempo', 'asc');
      }
      const snap = await q.limit(lim * 3).get();
      snap.forEach(d => docs.push({ _id: d.id, ...d.data() }));
    } else {
      // Memória
      docs = [...memRanking];
      if (nivel && parseInt(nivel) !== 0)
        docs = docs.filter(r => r.nivel === parseInt(nivel));
      docs.sort((a, b) => a.tempo - b.tempo);
    }

    // Deduplicar — melhor tempo por nome
    const seen = new Map();
    for (const d of docs) {
      const k = (d.nome || '').toLowerCase();
      if (!seen.has(k) || d.tempo < seen.get(k).tempo) seen.set(k, d);
    }
    const ranking = [...seen.values()]
      .sort((a, b) => a.tempo - b.tempo)
      .slice(0, lim);

    res.json({ ranking, total: ranking.length });
  } catch (err) {
    console.error('[Ranking] getGlobal:', err.message);
    res.status(500).json({ ranking: [], total: 0, error: 'Erro interno' });
  }
};

// POST /api/ranking/salvar
exports.saveRankingEntry = async (req, res) => {
  const { nome, avatar, nivel, tempo, acertos, erros, modo, jogador_id } = req.body;
  if (!nome || !tempo) return res.status(400).json({ ok: false, error: 'Dados incompletos' });

  const entry = {
    jogador_id: jogador_id || req.usuarioId || 'anonimo',
    nome,
    avatar:   avatar  || '🦁',
    nivel:    parseInt(nivel)   || 1,
    tempo:    parseInt(tempo),
    acertos:  parseInt(acertos) || 0,
    erros:    parseInt(erros)   || 0,
    modo:     modo    || 'solo',
    data:     new Date().toLocaleDateString('pt-BR'),
    criado_em: new Date()
  };

  const db = getDb();
  try {
    if (db) {
      await db.collection('ranking').add(entry);
    } else {
      memRanking.push({ _id: Date.now().toString(36), ...entry });
      if (memRanking.length > 500) memRanking.splice(0, 100);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[Ranking] save:', err.message);
    res.status(500).json({ ok: false, error: 'Erro ao salvar' });
  }
};

// GET /api/ranking/nivel/:nivel
exports.getRankingByNivel = async (req, res) => {
  const nivel = parseInt(req.params.nivel);
  if (![1, 2].includes(nivel)) return res.status(400).json({ error: 'Nível inválido' });

  const db = getDb();
  try {
    let docs = [];
    if (db) {
      const snap = await db.collection('ranking')
        .where('nivel', '==', nivel)
        .orderBy('tempo', 'asc')
        .limit(50)
        .get();
      snap.forEach(d => docs.push({ _id: d.id, ...d.data() }));
    } else {
      docs = memRanking.filter(r => r.nivel === nivel)
        .sort((a, b) => a.tempo - b.tempo).slice(0, 50);
    }
    res.json({ ranking: docs, nivel, total: docs.length });
  } catch (err) {
    res.status(500).json({ ranking: [], total: 0 });
  }
};

// GET /api/ranking/meus-resultados
exports.getMeuRanking = async (req, res) => {
  const db = getDb();
  try {
    let docs = [];
    if (db) {
      const snap = await db.collection('ranking')
        .where('jogador_id', '==', req.usuarioId)
        .orderBy('tempo', 'asc')
        .limit(20)
        .get();
      snap.forEach(d => docs.push({ _id: d.id, ...d.data() }));
    } else {
      docs = memRanking.filter(r => r.jogador_id === req.usuarioId)
        .sort((a, b) => a.tempo - b.tempo).slice(0, 20);
    }
    res.json({ ranking: docs, total: docs.length });
  } catch {
    res.status(500).json({ ranking: [], total: 0 });
  }
};
