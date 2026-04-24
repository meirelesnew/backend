const r=require("express").Router(),rk=require("../controllers/rankingController"),{autenticar}=require("../middleware/auth");
r.get("/global",rk.getGlobalRanking);
r.post("/salvar",rk.saveRankingEntry);
r.get("/nivel/:nivel",rk.getRankingByNivel);
r.get("/meus-resultados",autenticar,rk.getMeuRanking);
module.exports=r;
