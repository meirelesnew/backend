// config/firebase.js — substitui config/db.js
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore }                  = require("firebase-admin/firestore");
const { getAuth }                       = require("firebase-admin/auth");

let db;
let auth;

async function connectDb() {
  if (getApps().length > 0) {
    db   = getFirestore();
    auth = getAuth();
    return db;
  }
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
    );
    initializeApp({ credential: cert(serviceAccount) });
    db   = getFirestore();
    auth = getAuth();
    console.log("✅ Firebase Admin conectado ao Firestore!");
    return db;
  } catch (error) {
    console.error("❌ Erro ao conectar ao Firebase:", error.message);
    throw error;
  }
}

function getDb()   { return db;   }
function getAuth() { return auth; }

module.exports = { connectDb, getDb, getAuth };
