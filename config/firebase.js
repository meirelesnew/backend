// config/firebase.js
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth: getAuthAdmin } = require("firebase-admin/auth");
let _db = null, _auth = null;
async function connectDb() {
  if (getApps().length > 0) { _db = getFirestore(); _auth = getAuthAdmin(); return _db; }
  try {
    const sa = JSON.parse(Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT,"base64").toString("utf8"));
    initializeApp({ credential: cert(sa) });
    _db = getFirestore(); _auth = getAuthAdmin();
    console.log("\u2705 Firebase Admin conectado ao Firestore!");
    return _db;
  } catch(e) { console.error("\u274c Erro Firebase:", e.message); throw e; }
}
function getDb() { return _db; }
function getAuth() { return _auth; }
module.exports = { connectDb, getDb, getAuth };
