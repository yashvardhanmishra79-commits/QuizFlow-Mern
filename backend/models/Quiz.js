import mongoose from "mongoose";

const quizSchema = mongoose.Schema({
  title: String,
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "batches" },
  correctMarks: Number,
  incorrectMarks: Number,
  questions: {
    type: [
      {
        title: String,
        options: [String],
        correctOption: Number,
        explanation: String,
      },
    ],
  },
  currentRevision: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "quizrevisions",
  },
  revisionNumber: { type: Number, default: 0 },
  contentHash: String,
  revisionReady: { type: Boolean, default: false },
});

const quizModel = mongoose.model("quizes", quizSchema);
export default quizModel;
