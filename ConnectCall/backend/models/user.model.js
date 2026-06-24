import mongoose from "mongoose";
const s = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  token: String,
});
export const User = mongoose.model("User", s);
