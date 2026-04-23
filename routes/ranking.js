const express  = require("express");
const router   = express.Router();
const ranking  = require("../controllers/rankingController");
const { autenticar } = require("../middleware/auth");

router.get ("/global",          ranking.getGlobalRanking);
router.post("/salvar",          ranking.saveRankingEntry);
router.get ("/nivel/:nivel",    ranking.getRankingByNivel);
router.get ("/meus-resultados", autenticar, ranking.getMeuRanking);

module.exports = router;
