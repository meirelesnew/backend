const express = require("express");
const router = express.Router();
const rankingController = require("../controllers/rankingController");

router.get("/global", rankingController.getGlobalRanking);
router.post("/salvar", rankingController.saveRankingEntry);

module.exports = router;
