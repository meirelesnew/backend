const express = require("express");
const router = express.Router();
const { getGlobalRanking, saveRankingEntry, getRankingByNivel, getMeuRanking } = require("../controllers/rankingController");
const { requireAuth, optionalAuth } = require("../middleware/auth");

// GET /api/ranking - ranking global (público)
router.get("/", getGlobalRanking);

// GET /api/ranking/nivel/:nivel - ranking por nível (público)
router.get("/nivel/:nivel", getRankingByNivel);

// GET /api/ranking/meu - meu ranking pessoal (requer login)
router.get("/meu", requireAuth, getMeuRanking);

// POST /api/ranking - salvar entrada (anônimo ou autenticado)
router.post("/", optionalAuth, saveRankingEntry);

module.exports = router;
