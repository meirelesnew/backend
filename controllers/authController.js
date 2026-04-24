const { getDb, getAuth } = require("../config/firebase");
function isEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

exports.register = async (req, res) => {
  const fa=getAuth(), db=getDb();
  if(!db) return res.status(503).json({message:"Banco indisponivel"});
  const {nome,email,senha,avatar} = req.body;
  if(!nome||!email||!senha) return res.status(400).json({message:"Campos obrigatorios"});
  if(senha.length<6) return res.status(400).json({message:"Senha minimo 6 caracteres"});
  if(!isEmail(email)) return res.status(400).json({message:"Email invalido"});
  try {
    const u = await fa.createUser({email:email.toLowerCase(),password:senha,displayName:nome.trim()});
    await db.collection("usuarios").doc(u.uid).set({uid:u.uid,nome:nome.trim(),email:email.toLowerCase(),avatar:avatar||"\uD83E\uDD8A",role:"cliente",provider:"email",criado_em:new Date().toISOString(),atualizado_em:new Date().toISOString()});
    const ct = await fa.createCustomToken(u.uid);
    res.status(201).json({message:"Conta criada!",customToken:ct,usuario:{id:u.uid,nome:nome.trim(),email:email.toLowerCase(),avatar:avatar||"\uD83E\uDD8A",role:"cliente"}});
  } catch(e) {
    if(e.code==="auth/email-already-exists") return res.status(409).json({message:"Email ja cadastrado"});
    res.status(500).json({message:"Erro interno"});
  }
};

exports.login = async (req, res) => {
  const fa=getAuth(), db=getDb();
  if(!db) return res.status(503).json({message:"Banco indisponivel"});
  const {email,senha} = req.body;
  if(!email||!senha) return res.status(400).json({message:"Email e senha obrigatorios"});
  try {
    const ar = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key="+process.env.FIREBASE_API_KEY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password:senha,returnSecureToken:true})});
    const ad = await ar.json();
    if(!ar.ok){ const m=ad.error?.message||""; if(m.includes("EMAIL_NOT_FOUND")||m.includes("INVALID_PASSWORD")||m.includes("INVALID_LOGIN_CREDENTIALS")) return res.status(401).json({message:"Email ou senha incorretos"}); throw new Error(m); }
    const snap = await db.collection("usuarios").doc(ad.localId).get();
    const p = snap.exists ? snap.data() : {};
    await db.collection("usuarios").doc(ad.localId).set({atualizado_em:new Date().toISOString()},{merge:true});
    const ct = await fa.createCustomToken(ad.localId,{role:p.role||"cliente"});
    res.json({customToken:ct,usuario:{id:ad.localId,nome:p.nome||email,email:email.toLowerCase(),avatar:p.avatar||"\uD83E\uDD8A",role:p.role||"cliente"}});
  } catch(e) { console.error("[AUTH] login:",e.message); res.status(500).json({message:"Erro interno"}); }
};

exports.googleAuth = async (req, res) => {
  const fa=getAuth(), db=getDb();
  if(!db) return res.status(503).json({message:"Banco indisponivel"});
  const {id_token} = req.body;
  if(!id_token) return res.status(400).json({message:"id_token obrigatorio"});
  try {
    const d = await fa.verifyIdToken(id_token);
    const snap = await db.collection("usuarios").doc(d.uid).get();
    let p;
    if(!snap.exists){
      p={uid:d.uid,nome:d.name||d.email,email:d.email.toLowerCase(),avatar:"\uD83E\uDD8A",role:"cliente",googlePicture:d.picture||null,provider:"google",criado_em:new Date().toISOString(),atualizado_em:new Date().toISOString()};
      await db.collection("usuarios").doc(d.uid).set(p);
    } else {
      p=snap.data();
      await db.collection("usuarios").doc(d.uid).set({googlePicture:d.picture||null,atualizado_em:new Date().toISOString()},{merge:true});
    }
    const ct = await fa.createCustomToken(d.uid,{role:p.role||"cliente"});
    res.json({customToken:ct,usuario:{id:d.uid,nome:p.nome,email:d.email.toLowerCase(),avatar:p.avatar||"\uD83E\uDD8A",role:p.role||"cliente"}});
  } catch(e) { res.status(401).json({message:"Auth Google falhou",detalhe:e.message}); }
};

exports.solicitarRecuperacao = async (req, res) => {
  const {email} = req.body;
  if(!email) return res.status(400).json({message:"Email obrigatorio"});
  try { await fetch("https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key="+process.env.FIREBASE_API_KEY,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestType:"PASSWORD_RESET",email})}); } catch(_){}
  res.json({message:"Se este email estiver cadastrado, voce recebera as instrucoes em breve."});
};

exports.perfil = async (req, res) => {
  const db=getDb();
  if(!db) return res.status(503).json({message:"Banco indisponivel"});
  try {
    const snap=await db.collection("usuarios").doc(req.usuarioId).get();
    if(!snap.exists) return res.status(404).json({message:"Usuario nao encontrado"});
    const u=snap.data();
    res.json({usuario:{...u,id:u.uid}});
  } catch(e){ res.status(500).json({message:"Erro interno"}); }
};

exports.atualizarPerfil = async (req, res) => {
  const db=getDb();
  if(!db) return res.status(503).json({message:"Banco indisponivel"});
  const up={atualizado_em:new Date().toISOString()};
  if(req.body.nome) up.nome=req.body.nome.trim();
  if(req.body.avatar) up.avatar=req.body.avatar;
  try { await db.collection("usuarios").doc(req.usuarioId).set(up,{merge:true}); res.json({message:"Perfil atualizado",...up}); }
  catch(e){ res.status(500).json({message:"Erro interno"}); }
};
