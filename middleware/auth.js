const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "tabuada-turbo-secret-2026";

// ─── Middleware: requer autenticação ───────────────────────────────────────────
exports.requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token de autenticação não fornecido" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuarioId = decoded.id;
    req.usuario = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token inválido ou expirado" });
  }
};

// ─── Middleware: auth opcional (não bloqueia, apenas adiciona se tiver token) ──
exports.optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.usuarioId = decoded.id;
      req.usuario = decoded;
    } catch {}
  }
  next();
};
