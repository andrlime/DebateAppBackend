import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const CONN_URI: string = process.env.MONGOURI || "";
const client = new MongoClient(CONN_URI);
let _db: any;

export default {
  connectToServer() {
    client.connect((err, db) => {
      // Verify we got a good "db" object
      if (db) {
        _db = db.db("judges");
      }
      return 1;
    });
  },

  getDb() {
    return _db;
  },
};
