// ══════════════════════════════════════════
//  DB.JS — Conexão MongoDB com modo offline
// ══════════════════════════════════════════
const { MongoClient } = require('mongodb');

let client = null;
let db     = null;

async function connectDb() {
  const url = process.env.MONGO_URL;

  // BUG FIX: sem MONGO_URL → modo offline (não lança erro)
  if (!url) {
    console.log('⚠️  MONGO_URL ausente — modo OFFLINE (sem persistência)');
    return null;
  }

  try {
    client = new MongoClient(url, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: 'majority'
    });
    await client.connect();
    db = client.db('tabuada2026');
    console.log('✅ MongoDB conectado');

    // Índice TTL para salas expiradas
    try {
      await db.collection('salas').createIndex({ expira_em: 1 }, { expireAfterSeconds: 0 });
    } catch {}

    return db;
  } catch (err) {
    console.error('❌ MongoDB falhou:', err.message);
    console.log('⚠️  Continuando em modo OFFLINE');
    return null; // BUG FIX: não relança — servidor sobe mesmo assim
  }
}

function getDb() { return db; }
function isConnected() { return db !== null; }

module.exports = { connectDb, getDb, isConnected };
