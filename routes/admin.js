const express = require("express");
const router  = express.Router();
const admin   = require("../controllers/adminController");
const { autenticarAdmin } = require("../middleware/auth");

router.get   ("/usuarios",       autenticarAdmin, admin.listarUsuarios);
router.post  ("/promover",       autenticarAdmin, admin.promoverAdmin);
router.get   ("/stats",          autenticarAdmin, admin.getStats);
router.delete("/usuario/:uid",   autenticarAdmin, admin.deletarUsuario);

module.exports = router;
