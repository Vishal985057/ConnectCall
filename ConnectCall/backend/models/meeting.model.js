import mongoose from "mongoose";
const s = new mongoose.Schema({
  user_id: { type: String, required: true },
  meetingCode: { type: String, required: true },
  date: { type: Date, default: Date.now },
});
export const Meeting = mongoose.model("Meeting", s);
