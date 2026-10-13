import express from "express";
import Quiz from "../models/Quiz.js";
import { generateQuizWithAI } from "../services/geminiService.js";
import { requireAdmin } from "../middleware/auth.js";

const router = express.Router();

router.post("/generate-ai-quiz", requireAdmin, async (req, res) => {
  try {
    const {
      topic,
      batch,
      difficulty,
      questionCount,
      correctMarks,
      incorrectMarks,
    } = req.body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).send({
        success: false,
        message: "Please provide a topic for the quiz.",
      });
    }

    const quizData = await generateQuizWithAI({
      topic: topic.trim(),
      batch,
      difficulty,
      questionCount,
      correctMarks,
      incorrectMarks,
    });

    res.send({
      success: true,
      message: "AI Quiz generated successfully",
      data: quizData,
    });
  } catch (error) {
    console.error("AI Quiz generation error:", error.message);
    const status = error.statusCode || 500;
    res.status(status).send({
      success: false,
      message: error.message || "Failed to generate quiz with AI",
    });
  }
});

router.post("/add-quiz", requireAdmin, async (req, res) => {
  const data = req.body;
  const newQuiz = new Quiz(data);
  const newQuizData = await newQuiz.save();
  res.send({
    success: true,
    message: "Quiz Added Successfully",
    data: newQuizData,
  });
});

router.post("/delete-quiz", requireAdmin, async (req, res) => {
  const { quizId } = req.body;
  await Quiz.findByIdAndDelete(quizId);
  res.send({ success: true, message: "Quiz Deleted Successfully" });
});

router.get("/get-all", async (req, res) => {
  const quizzes = await Quiz.find().select(
    "-questions.correctOption -questions.explanation"
  );
  res.send({ success: true, message: "Success", data: quizzes });
});

router.get("/:batchId", async (req, res) => {
  const batchId = req.params.batchId;
  const quizzes = await Quiz.find({ batch: batchId }).select(
    "-questions.correctOption -questions.explanation"
  );
  res.send({ success: true, message: "Success", data: quizzes });
});

router.get("/single/:quizId", async (req, res) => {
  const quizId = req.params.quizId;
  const quizData = await Quiz.findById(quizId).select(
    "-questions.correctOption -questions.explanation"
  );
  res.send({ success: true, message: "Success", data: quizData });
});

export default router;
