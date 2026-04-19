const router = require("express").Router();
const adminCtrl = require("../controllers/adminController");
const { requireAdmin } = require("../middleware/auth");

//Todas as rotas requerem admin
router.use(requireAdmin);

router.get("/usuarios", adminCtrl.listarUsuarios);
router.get("/usuarios/:id", adminCtrl.buscarUsuario);
router.put("/usuarios/:id", adminCtrl.atualizarUsuario);
router.delete("/usuarios/:id", adminCtrl.deletarUsuario);
router.get("/estatisticas", adminCtrl.estatisticas);

module.exports = router;