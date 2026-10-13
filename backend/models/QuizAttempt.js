import mongoose from "mongoose";

const questionSnapshotSchema = new mongoose.Schema(
  {
    title: String,
    options: [String],
    correctOption: Number,
    explanation: String,
  },
  { _id: false }
);

const quizSnapshotSchema = new mongoose.Schema(
  {
    title: String,
    batchName: String,
    correctMarks: Number,
    incorrectMarks: Number,
    questions: [questionSnapshotSchema],
  },
  { _id: false }
);

const quizAttemptSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "users",
    required: true,
  },
  quiz: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "quizes",
    required: true,
  },
  requestId: { type: String, required: true },
  quizSnapshot: { type: quizSnapshotSchema, required: true },
  answers: [{ type: Number, default: null }],
  obtainedMarks: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  correctCount: { type: Number, required: true },
  incorrectCount: { type: Number, required: true },
  unansweredCount: { type: Number, required: true },
  submittedAt: { type: Date, default: Date.now },
});

quizAttemptSchema.index({ student: 1, requestId: 1 }, { unique: true });

const quizAttemptModel = mongoose.model("quizattempts", quizAttemptSchema);
export default quizAttemptModel;
