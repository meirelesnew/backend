// config/firebase.js — Firebase Admin SDK
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth: getAuthAdmin } = require("firebase-admin/auth");

async function connectDb() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    console.log("⚠️  FIREBASE_SERVICE_ACCOUNT não definida — modo OFFLINE");
    return null;
  }
  try {
    if (getApps().length === 0) {
      const sa = JSON.parse(
        Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
      );
      initializeApp({ credential: cert(sa) });
    }
    console.log("✅ Firebase Admin conectado ao Firestore!");
    return getFirestore();
  } catch (e) {
    console.error("❌ Firebase falhou:", e.message);
    return null;
  }
}

function getDb() {
  try { return getApps().length > 0 ? getFirestore() : null; }
  catch { return null; }
}

function getAuth() {
  try { return getApps().length > 0 ? getAuthAdmin() : null; }
  catch { return null; }
}

module.exports = { connectDb, getDb, getAuth };
