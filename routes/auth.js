const r=require("express").Router(),a=require("../controllers/authController"),{autenticar}=require("../middleware/auth");
r.post("/register",a.register);
r.post("/login",a.login);
r.post("/google",a.googleAuth);
r.post("/recuperar-senha",a.solicitarRecuperacao);
r.get("/perfil",autenticar,a.perfil);
r.put("/perfil",autenticar,a.atualizarPerfil);
module.exports=r;
