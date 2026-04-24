const r=require("express").Router(),a=require("../controllers/adminController"),{autenticarAdmin}=require("../middleware/auth");
r.get("/usuarios",autenticarAdmin,a.listarUsuarios);
r.post("/promover",autenticarAdmin,a.promoverAdmin);
r.get("/stats",autenticarAdmin,a.getStats);
r.delete("/usuario/:uid",autenticarAdmin,a.deletarUsuario);
module.exports=r;
