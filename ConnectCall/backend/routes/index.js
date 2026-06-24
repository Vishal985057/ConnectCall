import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";

const router = Router();

// POST /api/v1/users/register
router.post("/register", async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password)
    return res.status(400).json({ message: "All fields are required" });

  try {
    const existing = await User.findOne({ username });
    if (existing)
      return res.status(409).json({ message: "Username already taken. Please choose another." });
    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ name, username, password: hashed });
    await user.save();
    res.status(201).json({ message: "User Registered" });
  } catch (e) {
    res.status(500).json({ message: `Something went wrong: ${e}` });
  }
});

// POST /api/v1/users/login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Username and password are required" });

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User Not Found" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: "Invalid username or password" });
    const token = crypto.randomBytes(20).toString("hex");
    user.token = token;
    await user.save();
    res.status(200).json({ token, name: user.name, username: user.username });
  } catch (e) {
    res.status(500).json({ message: `Something went wrong: ${e}` });
  }
});

// GET /api/v1/users/get_all_activity?token=xxx
router.get("/get_all_activity", async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ message: "Token is required" });

  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(404).json({ message: "User not found" });
    const meetings = await Meeting.find({ user_id: user.username }).sort({ date: -1 });
    res.json(meetings);
  } catch (e) {
    res.status(500).json({ message: `Something went wrong: ${e}` });
  }
});

// POST /api/v1/users/add_to_activity
router.post("/add_to_activity", async (req, res) => {
  const { token, meeting_code } = req.body;
  if (!token || !meeting_code)
    return res.status(400).json({ message: "Token and meeting_code are required" });

  try {
    const user = await User.findOne({ token });
    if (!user) return res.status(404).json({ message: "User not found" });
    const meeting = new Meeting({ user_id: user.username, meetingCode: meeting_code });
    await meeting.save();
    res.status(201).json({ message: "Added to history" });
  } catch (e) {
    res.status(500).json({ message: `Something went wrong: ${e}` });
  }
});

export default router;
