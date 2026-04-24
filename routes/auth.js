const express = require("express");
const router  = express.Router();
const auth    = require("../controllers/authController");
const { autenticar } = require("../middleware/auth");

router.post("/register",        auth.register);
router.post("/login",           auth.login);
router.post("/recuperar-senha", auth.solicitarRecuperacao);
router.post("/redefinir-senha", auth.redefinirSenha);
router.post("/confirmar",       auth.confirmarConta);
router.post("/reenviar",        auth.reenviarConfirmacao);
router.get ("/perfil",          autenticar, auth.perfil);

module.exports = router;
