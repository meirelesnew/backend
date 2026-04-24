const { getDb } = require("../config/firebase");
exports.saveJogador = async (req, res) => {
  const db=getDb(); if(!db) return res.status(503).json({message:"Banco indisponivel"});
  const {jogador_id,nome,avatar,recordes_tempo,nivel,source_jogador_id}=req.body;
  const id=jogador_id||("anon_"+Date.now()),nj=nivel||1,tempo=recordes_tempo;
  try {
    const snap=await db.collection("jogadores").doc(id).get();
    let ex=snap.exists?snap.data():null;
    if(source_jogador_id&&source_jogador_id!==id){const fs=await db.collection("jogadores").doc(source_jogador_id).get();if(fs.exists&&!ex){ex=fs.data();await db.collection("jogadores").doc(source_jogador_id).delete();}}
    const now=new Date().toISOString(),rec=ex?.recordes||{};
    if(tempo!==undefined){const ta=rec[nj];if(ta===undefined||tempo<ta)rec[nj]=tempo;}
    const hist=ex?.historico||[];
    if(req.body?.ultimo_jogo){hist.unshift(req.body.ultimo_jogo);if(hist.length>20)hist.pop();}
    const doc={uid:id,nome:nome||ex?.nome||"Jogador",avatar:avatar||ex?.avatar||"\uD83E\uDD8A",recordes:rec,historico:hist,criado_em:ex?.criado_em||now,atualizado_em:now};
    await db.collection("jogadores").doc(id).set(doc);
    res.json({jogador_id:id,nome:doc.nome,avatar:doc.avatar,recordes:doc.recordes});
  } catch(e){res.status(500).json({message:"Erro interno"});}
};
exports.getJogador = async (req, res) => {
  const db=getDb(); if(!db) return res.status(503).json({message:"Banco indisponivel"});
  const {id}=req.params; if(!id) return res.status(400).json({message:"ID nao fornecido"});
  try {
    const snap=await db.collection("jogadores").doc(id).get();
    if(!snap.exists) return res.status(404).json({message:"Jogador nao encontrado"});
    const j=snap.data();
    res.json({jogador_id:j.uid||id,nome:j.nome,avatar:j.avatar,recordes:j.recordes||{},historico:j.historico||[],criado_em:j.criado_em,atualizado_em:j.atualizado_em});
  } catch(e){res.status(500).json({message:"Erro interno"});}
};
