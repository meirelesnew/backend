const express = require("express");
const router = express.Router();
const { saveJogador } = require("../controllers/jogadorController");

// POST /api/jogador
router.post("/", saveJogador);

module.exports = router;
