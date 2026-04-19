const express = require("express");
const router = express.Router();
const jogadorController = require("../controllers/jogadorController");

router.post("/", jogadorController.saveJogador);
router.get("/:id", jogadorController.getJogador);

module.exports = router;
