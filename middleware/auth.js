const { getAuth } = require("../config/firebase");
async function autenticar(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ message:"Token nao fornecido" });
  try {
    const d = await getAuth().verifyIdToken(h.split(" ")[1]);
    req.usuarioId = d.uid; req.usuarioEmail = d.email; req.usuarioRole = d.role || "cliente";
    next();
  } catch(e) { return res.status(401).json({ message:"Token invalido ou expirado" }); }
}
async function autenticarAdmin(req, res, next) {
  await autenticar(req, res, async () => {
    if (req.usuarioRole !== "admin") return res.status(403).json({ message:"Acesso restrito" });
    next();
  });
}
module.exports = { autenticar, autenticarAdmin };
