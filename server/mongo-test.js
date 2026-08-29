require("dotenv").config();

const { MongoClient } = require("mongodb");

const username = "gorang0248_db_user";
const password = process.env.MONGO_PASSWORD;

const uri =
  `mongodb://${username}:${encodeURIComponent(password)}@` +
  `ac-5bxuyee-shard-00-00.bcrwjz6.mongodb.net:27017,` +
  `ac-5bxuyee-shard-00-01.bcrwjz6.mongodb.net:27017,` +
  `ac-5bxuyee-shard-00-02.bcrwjz6.mongodb.net:27017/` +
  `?tls=true&replicaSet=atlas-jv2l2y-shard-0&authSource=admin`;

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 15000,
  connectTimeoutMS: 15000,
});

async function run() {
  try {
    console.log("Testing direct MongoDB connection...");

    await client.connect();

    await client.db("admin").command({ ping: 1 });

    console.log("=================================");
    console.log("MONGODB CONNECTION SUCCESSFUL");
    console.log("=================================");
  } catch (error) {
    console.log("=================================");
    console.log("MONGODB CONNECTION FAILED");
    console.log("=================================");
    console.log(error.message);
    console.log("=================================");
  } finally {
    await client.close();
  }
}

run();