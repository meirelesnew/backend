const express = require("express");
const router  = express.Router();
const auth    = require("../controllers/authController");
const { autenticar } = require("../middleware/auth");

router.post("/register",        auth.register);
router.post("/login",           auth.login);
router.post("/google",          auth.googleAuth);
router.post("/recuperar-senha", auth.solicitarRecuperacao);
router.get ("/perfil",          autenticar, auth.perfil);
router.put ("/perfil",          autenticar, auth.atualizarPerfil);

module.exports = router;
