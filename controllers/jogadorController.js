const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../config/db");

exports.saveJogador = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco de dados indisponível" });

  let { 
    jogador_id, 
    nome, 
    avatar, 
    recordes_tempo,
    nivel,
    source_jogador_id
  } = req.body;
  const tempo = recordes_tempo;
  const nivelJogo = nivel || 1;
  const idParaUsar = jogador_id || uuidv4();

  try {
    let existente = await db.collection("jogadores").findOne({ _id: idParaUsar });
    
    if (source_jogador_id && source_jogador_id !== idParaUsar) {
      const fonte = await db.collection("jogadores").findOne({ _id: source_jogador_id });
      if (fonte && !existente) {
        existente = fonte;
        await db.collection("jogadores").deleteOne({ _id: source_jogador_id });
      }
    }

    const now = new Date();

    const recordes = existente?.recordes || {};
    if (tempo !== undefined) {
      const tempoAtual = recordes[nivelJogo];
      if (tempoAtual === undefined || tempo < tempoAtual) {
        recordes[nivelJogo] = tempo;
      }
    }

    const historico = existente?.historico || [];
    if (req.body?.ultimo_jogo) {
      historico.unshift(req.body.ultimo_jogo);
      if (historico.length > 20) historico.pop();
    }

    const doc = {
      _id: idParaUsar,
      nome: nome || existente?.nome || "Jogador",
      avatar: avatar || existente?.avatar || "🦁",
      recordes,
      historico,
      criado_em: existente?.criado_em || now,
      atualizado_em: now
    };

    await db.collection("jogadores").replaceOne(
      { _id: idParaUsar },
      doc,
      { upsert: true }
    );

    res.json({ 
      jogador_id: idParaUsar,
      nome: doc.nome, 
      avatar: doc.avatar,
      recordes: doc.recordes 
    });
  } catch (error) {
    console.error("Erro ao salvar jogador:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};

exports.getJogador = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco de dados indisponível" });

  const { id } = req.params;
  if (!id) return res.status(400).json({ message: "ID não fornecido" });

  try {
    const jogador = await db.collection("jogadores").findOne({ _id: id });
    if (!jogador) return res.status(404).json({ message: "Jogador não encontrado" });

    res.json({
      jogador_id: jogador._id,
      nome: jogador.nome,
      avatar: jogador.avatar,
      recordes: jogador.recordes || {},
      historico: jogador.historico || [],
      criado_em: jogador.criado_em,
      atualizado_em: jogador.atualizado_em
    });
  } catch (error) {
    console.error("Erro ao buscar jogador:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
