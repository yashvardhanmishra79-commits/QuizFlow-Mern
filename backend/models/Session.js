import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  sessionVersion: { type: Number, default: 0 },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 },
  },
});

const sessionModel = mongoose.model("sessions", sessionSchema);
export default sessionModel;
