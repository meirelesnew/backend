// config/firebase.js
const {
  initializeApp,
  cert,
  getApps
} = require("firebase-admin/app");

const { getFirestore }            = require("firebase-admin/firestore");
const { getAuth: getAuthAdmin }   = require("firebase-admin/auth"); // renomeado para evitar conflito

let _db   = null;
let _auth = null;

async function connectDb() {
  if (getApps().length > 0) {
    _db   = getFirestore();
    _auth = getAuthAdmin();
    return _db;
  }
  try {
    const serviceAccount = JSON.parse(
      Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf8")
    );
    initializeApp({ credential: cert(serviceAccount) });
    _db   = getFirestore();
    _auth = getAuthAdmin();
    console.log("✅ Firebase Admin conectado ao Firestore!");
    return _db;
  } catch (error) {
    console.error("❌ Erro ao conectar ao Firebase:", error.message);
    throw error;
  }
}

function getDb()   { return _db;   }
function getAuth() { return _auth; }

module.exports = { connectDb, getDb, getAuth };
