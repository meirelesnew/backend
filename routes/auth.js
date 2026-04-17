const express = require("express");
const router = express.Router();
const { register, login, perfil } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

// GET /api/auth/perfil (protegido)
router.get("/perfil", requireAuth, perfil);

module.exports = router;
