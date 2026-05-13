// src/middleware/auth.js
const jwt = require("jsonwebtoken");

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Hiányzó vagy érvénytelen token." });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Lejárt vagy érvénytelen token." });
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.szerep !== "admin") {
      return res.status(403).json({ error: "Csak adminisztrátor végezheti ezt a műveletet." });
    }
    next();
  });
}

module.exports = { authMiddleware, adminMiddleware };