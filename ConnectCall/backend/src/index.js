import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import mongoose from "mongoose";
import router from "../routes/index.js";
import { connectToSocket } from "../controllers/socketManager.js";

const app = express();
const server = createServer(app);
connectToSocket(server);

app.use(cors({ origin: process.env.FRONTEND_URL || "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/v1/users", router);

const PORT = process.env.PORT || 8000;
const MONGO = process.env.MONGODB_URI || "mongodb://localhost:27017/connectcall";

mongoose.connect(MONGO)
  .then(() => server.listen(PORT, () => console.log(`Server on ${PORT}`)))
  .catch(e => { console.error(e); process.exit(1); });
