import express from "express";
import { createServer } from "node:http";
import cors from "cors";
import mongoose from "mongoose";
import router from "../routes/index.js";
import { connectToSocket } from "../controllers/socketManager.js";

const app = express();
const httpServer = createServer(app);

connectToSocket(httpServer);

app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
app.use("/api/v1/users", router);

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/connectcall";
const PORT = process.env.PORT || 8000;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    httpServer.listen(PORT, () => {
      console.log(`ConnectCall backend running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  });
