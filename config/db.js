const { MongoClient } = require("mongodb");

// A URL deve ser configurada no .env (local) ou nas variáveis de ambiente do Render
const MONGO_URL = process.env.MONGO_URL;

let client;
let db;

async function connectDb() {
  if (db) return db;

  try {
    client = new MongoClient(MONGO_URL, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      retryWrites: true,
      w: "majority"
    });
    await client.connect();
    db = client.db("tabuada2026");
    console.log("✅ MongoDB conectado com sucesso!");
    return db;
  } catch (error) {
    console.error("❌ Erro ao conectar ao MongoDB:", error.message);
    throw error;
  }
}

function getDb() {
  return db;
}

module.exports = { connectDb, getDb };
