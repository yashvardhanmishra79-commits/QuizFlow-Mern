import mongoose from "mongoose";

const quizAttemptSessionSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
    immutable: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "quizes",
    required: true,
    immutable: true,
  },
  revision: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "quizrevisions",
    required: true,
    immutable: true,
  },
  requestId: { type: String, required: true, immutable: true },
  expiresAt: { type: Date, required: true },
  consumedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

quizAttemptSessionSchema.index({ student: 1, requestId: 1 }, { unique: true });
quizAttemptSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const quizAttemptSessionModel = mongoose.model(
  "quizattemptsessions",
  quizAttemptSessionSchema
);
export default quizAttemptSessionModel;
