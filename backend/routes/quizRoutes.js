import express from "express";
import Quiz from "../models/Quiz.js";
const router = express.Router();
router.post("/add-quiz", async (req, res) => {
  const data = req.body;
  const newQuiz = new Quiz(data);
  const newQuizData = await newQuiz.save();
  res.send({
    success: true,
    message: "Quiz Added Successfully",
    data: newQuizData,
  });
});

router.post("/delete-quiz", async (req, res) => {
  const { quizId } = req.body;
  await Quiz.findByIdAndDelete(quizId);
  res.send({ success: true, message: "Quiz Deleted Successfully" });
});

router.get("/get-all", async (req, res) => {
  const quizzes = await Quiz.find();
  res.send({ success: true, message: "Success", data: quizzes });
});

router.get("/:batchId", async (req, res) => {
  const batchId = req.params.batchId;
  const quizzes = await Quiz.find({ batch: batchId });
  res.send({ success: true, message: "Success", data: quizzes });
});

router.get("/single/:quizId", async (req, res) => {
  const quizId = req.params.quizId;
  const quizData = await Quiz.findById(quizId);
  res.send({ success: true, message: "Success", data: quizData });
});

export default router;
