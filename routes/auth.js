const router = require("express").Router();
const ctrl   = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

// Registro e confirmação
router.post("/register",             ctrl.register);
router.post("/confirmar",            ctrl.confirmarConta);
router.post("/reenviar-confirmacao", ctrl.reenviarConfirmacao);

// Login
router.post("/login",   ctrl.login);
router.post("/google",  ctrl.googleAuth);

// Recuperação de senha
router.post("/recuperar-senha", ctrl.solicitarRecuperacao);
router.post("/redefinir-senha", ctrl.redefinirSenha);

// Perfil
router.get("/perfil", requireAuth, ctrl.perfil);

module.exports = router;
