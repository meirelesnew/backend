const router = require("express").Router();
const { register, login, googleAuth, perfil } = require("../controllers/authController");
const { requireAuth } = require("../middleware/auth");

router.post("/register", register);       // Criar conta email/senha
router.post("/login",    login);          // Login email/senha
router.post("/google",   googleAuth);     // Login via Google
router.get("/perfil",    requireAuth, perfil); // Perfil (protegido)

module.exports = router;
