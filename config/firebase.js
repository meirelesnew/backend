const { initializeApp, cert, getApps, getApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth: getAuthAdmin } = require("firebase-admin/auth");

async function connectDb() {
  try {
    if (getApps().length === 0) {
      const sa = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
      );
      initializeApp({ credential: cert(sa) });
      console.log("✅ Firebase Admin inicializado!");
    }
    // Sempre pegar db e auth do app ativo — não depende de variável local
    const db   = getFirestore();
    const auth = getAuthAdmin();
    console.log("✅ Firebase Admin conectado ao Firestore!");
    return { db, auth };
  } catch (e) {
    console.error("❌ Erro Firebase:", e.message);
    throw e;
  }
}

// Sem variáveis locais — sempre pega do SDK diretamente
function getDb() {
  try { return getFirestore(); }
  catch { return null; }
}

function getAuth() {
  try { return getAuthAdmin(); }
  catch { return null; }
}

module.exports = { connectDb, getDb, getAuth };
