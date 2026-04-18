const express = require("express");
const router = express.Router();
const jogadorController = require("../controllers/jogadorController");

router.post("/", jogadorController.saveJogador);

module.exports = router;
