const r=require("express").Router(),j=require("../controllers/jogadorController");
r.post("/",j.saveJogador);
r.get("/:id",j.getJogador);
module.exports=r;
