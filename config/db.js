const mongoose = require("mongodb");
const { MongoClient } = require("mongodb");

const MONGO_URL = process.env.MONGO_URL;
if (!MONGO_URL) throw new Error("❌ MONGO_URL não definida nas variáveis de ambiente!");

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
  if (!db) console.warn("⚠️ DB acessado antes da conexão estar pronta.");
  return db;
}

module.exports = { connectDb, getDb };
