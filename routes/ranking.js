const router = require("express").Router();
const ctrl   = require("../controllers/rankingController");
const { requireAuth, optionalAuth } = require("../middleware/auth");

router.get("/global",       ctrl.getGlobalRanking);        // Público
router.get("/nivel/:nivel", ctrl.getRankingByNivel);       // Público
router.get("/meu",          requireAuth, ctrl.getMeuRanking); // Protegido
router.post("/salvar",      optionalAuth, ctrl.saveRankingEntry); // Anônimo ou logado

module.exports = router;
