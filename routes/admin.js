const express = require("express");
const router  = express.Router();
const admin   = require("../controllers/adminController");
const { autenticarAdmin } = require("../middleware/auth");

router.get   ("/usuarios",       autenticarAdmin, admin.listarUsuarios);
router.get   ("/usuarios/:id",   autenticarAdmin, admin.buscarUsuario);
router.put   ("/usuarios/:id",   autenticarAdmin, admin.atualizarUsuario);
router.delete("/usuarios/:id",   autenticarAdmin, admin.deletarUsuario);
router.get   ("/stats",          autenticarAdmin, admin.estatisticas);

module.exports = router;
