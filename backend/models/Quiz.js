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
});

const quizModel = mongoose.model("quizes", quizSchema);
export default quizModel;
