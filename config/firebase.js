// config/firebase.js — Firebase Admin com fallback offline
const { getApps } = require("firebase-admin/app");

let _db   = null;
let _auth = null;
let _modo = "offline";

async function connectDb() {
  // Sem variável de ambiente → modo offline (não trava o servidor)
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("⚠️  FIREBASE_SERVICE_ACCOUNT não definida — modo OFFLINE (memória)");
    return null;
  }

  try {
    const { initializeApp, cert } = require("firebase-admin/app");
    const { getFirestore }        = require("firebase-admin/firestore");
    const { getAuth }             = require("firebase-admin/auth");

    if (getApps().length === 0) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
      );
      initializeApp({ credential: cert(serviceAccount) });
    }

    _db   = getFirestore();
    _auth = getAuth();
    _modo = "firebase";
    console.log("✅ Firebase Admin conectado ao Firestore!");
    return _db;
  } catch (err) {
    console.error("❌ Firebase falhou:", err.message);
    console.log("⚠️  Continuando em modo OFFLINE");
    return null;
  }
}

function getDb()        { return _db;   }
function getAuth()      { return _auth; }
function getModo()      { return _modo; }
function isConnected()  { return _db !== null; }

module.exports = { connectDb, getDb, getAuth, getModo, isConnected };
