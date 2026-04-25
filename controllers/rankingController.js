const { getDb } = require("../config/firebase");
exports.getGlobalRanking = async (req, res) => {
  const db=getDb(); if(!db) return res.status(503).json({ranking:[],total:0,offline:true});
  const nivel=parseInt(req.query.nivel||"0"),limite=parseInt(req.query.limite||"50");
  try {
    let q=db.collection("ranking").orderBy("tempo","asc");
    if(nivel!==0) q=q.where("nivel","==",nivel);
    const snap=await q.limit(limite*5).get();
    const docs=snap.docs.map(d=>({id:d.id,...d.data()}));
    const mapa=new Map();
    for(const d of docs){const k=(d.jogador_id||d.nome)+"_"+(d.nivel||1);if(!mapa.has(k)||d.tempo<mapa.get(k).tempo)mapa.set(k,d);}
    const ranking=Array.from(mapa.values()).sort((a,b)=>a.tempo-b.tempo).slice(0,limite);
    res.json({ranking,total:ranking.length});
  } catch(e){res.status(500).json({ranking:[],total:0,offline:true});}
};
exports.saveRankingEntry = async (req, res) => {
  const db=getDb(); if(!db) return res.status(503).json({ok:false,offline:true});
  const {nome,avatar,nivel,tempo,acertos,erros,modo}=req.body;
  const jogador_id=req.usuarioId||req.body.jogador_id||null;
  try {
    await db.collection("ranking").add({jogador_id,nome,avatar,nivel:parseInt(nivel),tempo:parseInt(tempo),acertos:parseInt(acertos),erros:parseInt(erros),modo:modo||"solo",data:new Date().toLocaleDateString("pt-BR"),criado_em:new Date().toISOString()});
    res.json({ok:true});
  } catch(e){res.status(500).json({ok:false});}
};
exports.getRankingByNivel = async (req, res) => {
  const db=getDb(); if(!db) return res.status(503).json({ranking:[],total:0});
  const nivel=parseInt(req.params.nivel);
  if(![1,2].includes(nivel)) return res.status(400).json({message:"Nivel invalido"});
  try {
    const snap=await db.collection("ranking").where("nivel","==",nivel).orderBy("tempo","asc").limit(50).get();
    res.json({ranking:snap.docs.map(d=>({id:d.id,...d.data(),tempo:Number(d.data().tempo)})),nivel,total:snap.size});
  } catch(e){res.status(500).json({ranking:[],total:0});}
};
exports.getMeuRanking = async (req, res) => {
  const db=getDb(); if(!db) return res.status(503).json({ranking:[],total:0});
  try {
    const snap=await db.collection("ranking").where("jogador_id","==",req.usuarioId).orderBy("tempo","asc").limit(20).get();
    res.json({ranking:snap.docs.map(d=>({id:d.id,...d.data()})),total:snap.size});
  } catch(e){res.status(500).json({ranking:[],total:0});}
};
