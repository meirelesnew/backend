const router = require("express").Router();
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { getDb } = require("../config/db");

// Rota temporária para criar admin (apenas 1 vez, com a chave correta)
router.post("/criar-admin", async (req, res) => {
  const db = getDb();
  if (!db) return res.status(503).json({ message: "Banco indisponível" });

  const { chave, nome, email, senha } = req.body;
  
  // Chave secreta no .env (defina ADMIN_BOOTSTRAP_KEY=sua_chave_secreta)
  if (chave !== process.env.ADMIN_BOOTSTRAP_KEY) {
    return res.status(403).json({ message: "Chave inválida" });
  }

  try {
    const existente = await db.collection("usuarios").findOne({ email: email.toLowerCase() });
    if (existente) {
      await db.collection("usuarios").updateOne(
        { _id: existente._id },
        { $set: { role: "admin", atualizado_em: new Date() } }
      );
      return res.json({ message: "Admin atualizado!", usuario_id: existente._id });
    }

    const usuario = {
      _id: uuidv4(),
      nome,
      email: email.toLowerCase(),
      senha: await bcrypt.hash(senha, 10),
      avatar: "👑",
      role: "admin",
      provider: "email",
      confirmado: true,
      criado_em: new Date(),
      atualizado_em: new Date()
    };
    await db.collection("usuarios").insertOne(usuario);
    res.json({ message: "Admin criado!", usuario_id: usuario._id });
  } catch (err) {
    console.error("[BOOTSTRAP] Erro:", err);
    res.status(500).json({ message: "Erro interno" });
  }
});

module.exports = router;