import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";

const app = express();
const server = createServer(app);
const io = connectToSocket(server);

app.set("port", (process.env.PORT || 8000));

// FIX: Use environment variable for CORS origin — set FRONTEND_URL on Render
// to your frontend's URL (e.g. https://your-app.onrender.com)
app.use(cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
    credentials: true
}));

app.use(express.json({ limit: "40kb" }));
app.use(express.urlencoded({ limit: "40kb", extended: true }));
app.use("/api/v1/users", userRoutes);

// Health check for Render
app.get("/healthz", (req, res) => res.json({ status: "ok" }));

const start = async () => {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        console.error("ERROR: MONGODB_URI environment variable is not set.");
        process.exit(1);
    }

    try {
        const connectionDb = await mongoose.connect(mongoUri);
        console.log(`MongoDB connected: ${connectionDb.connection.host}`);
        server.listen(app.get("port"), () => {
            console.log(`Server listening on port ${app.get("port")}`);
        });
    } catch (err) {
        console.error("MongoDB connection failed:", err.message);
        process.exit(1);
    }
};

start();
