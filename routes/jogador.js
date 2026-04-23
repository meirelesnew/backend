const express  = require("express");
const router   = express.Router();
const jogador  = require("../controllers/jogadorController");

router.post("/",    jogador.saveJogador);
router.get ("/:id", jogador.getJogador);

module.exports = router;
