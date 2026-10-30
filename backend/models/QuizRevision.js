import mongoose from "mongoose";

const revisionQuestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    options: { type: [String], required: true },
    correctOption: { type: Number, required: true },
    explanation: { type: String, default: "" },
  },
  { _id: false }
);

const quizRevisionSchema = new mongoose.Schema({
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "quizes",
    required: true,
    immutable: true,
  },
  revisionNumber: { type: Number, required: true, immutable: true },
  contentHash: { type: String, required: true, immutable: true },
  title: { type: String, required: true, immutable: true },
  batch: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "batches",
    required: true,
    immutable: true,
  },
  correctMarks: { type: Number, required: true, immutable: true },
  incorrectMarks: { type: Number, required: true, immutable: true },
  questions: { type: [revisionQuestionSchema], required: true, immutable: true },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    immutable: true,
  },
  createdAt: { type: Date, default: Date.now, immutable: true },
});

quizRevisionSchema.index({ quiz: 1, revisionNumber: 1 }, { unique: true });
quizRevisionSchema.index({ quiz: 1, contentHash: 1 });

const quizRevisionModel = mongoose.model("quizrevisions", quizRevisionSchema);
export default quizRevisionModel;
