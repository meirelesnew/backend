const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../config/db");

exports.saveJogador = async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco de dados indisponível" });

  let { jogador_id, nome, avatar } = req.body;
  const idParaUsar = jogador_id || uuidv4();

  try {
    await db.collection("jogadores").replaceOne(
      { _id: idParaUsar },
      { _id: idParaUsar, nome, avatar, atualizado_em: new Date() },
      { upsert: true }
    );
    res.json({ jogador_id: idParaUsar, nome, avatar });
  } catch (error) {
    console.error("Erro ao salvar jogador:", error);
    res.status(500).json({ message: "Erro interno do servidor" });
  }
};
