import mongoose from "mongoose";

const staffAccountSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["ADMINISTRATOR", "PHARMACIST"], required: true },
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

export default mongoose.model("StaffAccount", staffAccountSchema);
