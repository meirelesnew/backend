const { getDb, getAuth } = require("../config/firebase");
exports.listarUsuarios = async (req, res) => {
  const db=getDb(); if(!db) return res.status(503).json({message:"Banco indisponivel"});
  try {
    const snap=await db.collection("usuarios").orderBy("criado_em","desc").limit(100).get();
    res.json({usuarios:snap.docs.map(d=>{const u=d.data();return{id:u.uid,nome:u.nome,email:u.email,avatar:u.avatar,role:u.role||"cliente",provider:u.provider||"email",criado_em:u.criado_em};}),total:snap.size});
  } catch(e){res.status(500).json({message:"Erro interno"});}
};
exports.promoverAdmin = async (req, res) => {
  const db=getDb(),fa=getAuth(); if(!db) return res.status(503).json({message:"Banco indisponivel"});
  const {uid}=req.body; if(!uid) return res.status(400).json({message:"uid obrigatorio"});
  try {
    await db.collection("usuarios").doc(uid).set({role:"admin",atualizado_em:new Date().toISOString()},{merge:true});
    await fa.setCustomUserClaims(uid,{role:"admin"});
    res.json({message:"Usuario promovido a admin"});
  } catch(e){res.status(500).json({message:"Erro interno"});}
};
exports.getStats = async (req, res) => {
  const db=getDb(); if(!db) return res.status(503).json({message:"Banco indisponivel"});
  try {
    const [u,r,j]=await Promise.all([db.collection("usuarios").count().get(),db.collection("ranking").count().get(),db.collection("jogadores").count().get()]);
    res.json({usuarios:u.data().count,partidas:r.data().count,jogadores:j.data().count,timestamp:new Date().toISOString()});
  } catch(e){res.status(500).json({message:"Erro interno"});}
};
exports.deletarUsuario = async (req, res) => {
  const db=getDb(),fa=getAuth(); if(!db) return res.status(503).json({message:"Banco indisponivel"});
  const {uid}=req.params; if(!uid) return res.status(400).json({message:"uid obrigatorio"});
  try {
    await Promise.all([db.collection("usuarios").doc(uid).delete(),fa.deleteUser(uid)]);
    res.json({message:"Usuario deletado"});
  } catch(e){res.status(500).json({message:"Erro interno"});}
};
