import express from "express";
import dotenv from "dotenv";
import appRoutes from "./routes/app";
import conn from "./db/conn";
import cors from "cors";

dotenv.config();
const dbo = conn;
const app = express();
const port = process.env.PORT || 4123;

app.use(cors({
  origin: '*'
}));
app.use(express.json());
app.use(appRoutes);

// get driver connection

app.listen(port, () => {
  // perform a database connection when server starts
  dbo.connectToServer();
  // console.log(`Server is running on port: ${port}`);
});