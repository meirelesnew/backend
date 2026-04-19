const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET;

// Requer autenticação — bloqueia sem token
exports.requireAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    req.usuarioId = decoded.id;
    req.usuario   = decoded;
    req.role    = decoded.role || "cliente";
    next();
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
};

// Auth opcional — passa mesmo sem token, apenas anexa usuário se houver
exports.optionalAuth = (req, res, next) => {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
      req.usuarioId = decoded.id;
      req.usuario   = decoded;
      req.role    = decoded.role || "cliente";
    } catch {}
  }
  next();
};

// Apenas admin — bloqueia não-admin
exports.requireAdmin = (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token não fornecido" });
  }
  try {
    const decoded = jwt.verify(header.split(" ")[1], JWT_SECRET);
    req.usuarioId = decoded.id;
    req.usuario   = decoded;
    req.role    = decoded.role || "cliente";
    if (req.role !== "admin") {
      return res.status(403).json({ message: "Acesso restrito a administradores" });
    }
    next();
  } catch {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
};
