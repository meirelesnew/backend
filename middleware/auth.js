// middleware/auth.js — Firebase Admin SDK
const { getAuth } = require("../config/firebase");

async function autenticar(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer "))
    return res.status(401).json({ message: "Token não fornecido" });
  const idToken = header.split(" ")[1];
  try {
    const decoded    = await getAuth().verifyIdToken(idToken);
    req.usuarioId    = decoded.uid;
    req.usuarioEmail = decoded.email;
    req.usuarioRole  = decoded.role || "cliente";
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
}

async function autenticarAdmin(req, res, next) {
  await autenticar(req, res, async () => {
    if (req.usuarioRole !== "admin")
      return res.status(403).json({ message: "Acesso restrito a administradores" });
    next();
  });
}

module.exports = { autenticar, autenticarAdmin };
