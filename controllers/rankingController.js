// ══════════════════════════════════════════
//  rankingController.js — com modo offline
// ══════════════════════════════════════════
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../config/db');

// Ranking em memória (fallback quando não há MongoDB)
const memRanking = [];

// ── GET /api/ranking/global ───────────────
exports.getGlobalRanking = async (req, res) => {
  const { nivel, modo, limite = 50 } = req.query;
  const lim = Math.min(parseInt(limite) || 50, 100);
  const db  = getDb();

  try {
    let docs;

    if (db) {
      // MongoDB disponível
      const match = {};
      if (nivel && parseInt(nivel) !== 0) match.nivel = parseInt(nivel);
      if (modo  && modo !== 'todos')       match.modo  = modo;

      const pipeline = [
        { $match: match },
        { $addFields: { nome_key: { $toLower: '$nome' } } },
        { $sort:  { tempo: 1 } },
        { $group: {
          _id:     '$nome_key',
          nome:    { $first: '$nome'    },
          avatar:  { $first: '$avatar'  },
          nivel:   { $first: '$nivel'   },
          tempo:   { $min:   '$tempo'   },
          acertos: { $first: '$acertos' },
          erros:   { $first: '$erros'   },
          modo:    { $first: '$modo'    },
          data:    { $min:   '$data'    }
        }},
        { $sort:  { tempo: 1 } },
        { $limit: lim }
      ];

      docs = await db.collection('ranking').aggregate(pipeline).toArray();
      const ranking = docs.map(d => ({ ...d, jogador_id: d._id }));
      return res.json({ ranking, total: ranking.length });
    }

    // Modo offline — memória
    docs = [...memRanking];
    if (nivel && parseInt(nivel) !== 0) docs = docs.filter(r => r.nivel === parseInt(nivel));
    if (modo  && modo !== 'todos')       docs = docs.filter(r => r.modo === modo);

    // Deduplicar por nome (melhor tempo)
    const seen = new Map();
    for (const d of docs.sort((a,b) => a.tempo - b.tempo)) {
      const k = d.nome.toLowerCase();
      if (!seen.has(k) || d.tempo < seen.get(k).tempo) seen.set(k, d);
    }
    const ranking = [...seen.values()].sort((a,b) => a.tempo - b.tempo).slice(0, lim);
    return res.json({ ranking, total: ranking.length });

  } catch (err) {
    console.error('[Ranking] getGlobal error:', err.message);
    return res.status(500).json({ ranking: [], total: 0, error: 'Erro interno' });
  }
};

// ── POST /api/ranking/salvar ──────────────
exports.saveRankingEntry = async (req, res) => {
  const { nome, avatar, nivel, tempo, acertos, erros, modo } = req.body;

  // Validação básica
  if (!nome || !tempo) return res.status(400).json({ ok: false, error: 'Dados incompletos' });

  const jogador_id = req.usuarioId || req.body.jogador_id || 'anonimo';
  const entry = {
    _id:        uuidv4(),
    jogador_id,
    nome,
    avatar:     avatar  || '🦁',
    nivel:      parseInt(nivel)   || 1,
    tempo:      parseInt(tempo),
    acertos:    parseInt(acertos) || 0,
    erros:      parseInt(erros)   || 0,
    modo:       modo    || 'solo',
    data:       new Date().toLocaleDateString('pt-BR')
  };

  const db = getDb();
  try {
    if (db) {
      await db.collection('ranking').insertOne(entry);
    } else {
      // Modo offline — salva na memória
      memRanking.push(entry);
      if (memRanking.length > 500) memRanking.splice(0, 100); // evita crescer infinito
    }
    return res.json({ ok: true });
  } catch (err) {
    console.error('[Ranking] save error:', err.message);
    return res.status(500).json({ ok: false, error: 'Erro ao salvar' });
  }
};

// ── GET /api/ranking/nivel/:nivel ─────────
exports.getRankingByNivel = async (req, res) => {
  const nivel = parseInt(req.params.nivel);
  if (![1, 2].includes(nivel)) return res.status(400).json({ error: 'Nível inválido' });

  const db = getDb();
  try {
    let docs;
    if (db) {
      docs = await db.collection('ranking').find({ nivel }).sort({ tempo: 1 }).limit(50).toArray();
    } else {
      docs = memRanking.filter(r => r.nivel === nivel).sort((a,b) => a.tempo - b.tempo).slice(0, 50);
    }
    return res.json({ ranking: docs, nivel, total: docs.length });
  } catch (err) {
    return res.status(500).json({ ranking: [], total: 0 });
  }
};

// ── GET /api/ranking/meu ──────────────────
exports.getMeuRanking = async (req, res) => {
  const db = getDb();
  try {
    let docs = [];
    if (db) {
      docs = await db.collection('ranking')
        .find({ jogador_id: req.usuarioId })
        .sort({ tempo: 1 }).limit(20).toArray();
    } else {
      docs = memRanking.filter(r => r.jogador_id === req.usuarioId).sort((a,b) => a.tempo - b.tempo).slice(0, 20);
    }
    return res.json({ ranking: docs, total: docs.length });
  } catch {
    return res.status(500).json({ ranking: [], total: 0 });
  }
};
