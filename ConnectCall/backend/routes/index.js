import { Router } from "express";
import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";

const r = Router();

r.post("/register", async (req, res) => {
  const { name, username, password } = req.body;
  if (!name || !username || !password) return res.status(400).json({ message: "All fields required" });
  if (await User.findOne({ username })) return res.status(409).json({ message: "Username taken" });
  try {
    await new User({ name, username, password: await bcrypt.hash(password, 10) }).save();
    res.status(201).json({ message: "Registered" });
  } catch (e) { res.status(500).json({ message: String(e) }); }
});

r.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Required" });
  const user = await User.findOne({ username });
  if (!user || !await bcrypt.compare(password, user.password))
    return res.status(401).json({ message: "Invalid credentials" });
  user.token = crypto.randomBytes(20).toString("hex");
  await user.save();
  res.json({ token: user.token, name: user.name, username: user.username });
});

r.get("/get_all_activity", async (req, res) => {
  const user = await User.findOne({ token: req.query.token });
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  res.json(await Meeting.find({ user_id: user.username }).sort({ date: -1 }));
});

r.post("/add_to_activity", async (req, res) => {
  const { token, meeting_code } = req.body;
  const user = await User.findOne({ token });
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  await new Meeting({ user_id: user.username, meetingCode: meeting_code }).save();
  res.status(201).json({ message: "Saved" });
});

export default r;
