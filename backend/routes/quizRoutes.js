import express from "express";
import Batch from "../models/Batch.js";
import Quiz from "../models/Quiz.js";
import { generateQuizWithAI } from "../services/geminiService.js";
import { requireAdmin, requireStudent } from "../middleware/auth.js";
import { validateMarkingScheme } from "../utils/quizMarks.js";
import { withBatchAssignment } from "../utils/batchAssignments.js";
import { createAiRateLimiters } from "../middleware/rateLimits.js";
import {
  isDuplicateKeyError,
  isValidationError,
  requireObjectBody,
  requireText,
  validateQuestionCount,
  validateObjectId,
  validateQuizContent,
} from "../utils/validation.js";

export function createQuizRouter(
  generateQuiz = generateQuizWithAI,
  rateLimiters = createAiRateLimiters()
) {
  const router = express.Router();

  function sendQuizError(res, error, fallbackMessage) {
    if (isValidationError(error)) {
      return res.status(400).send({ success: false, message: error.message });
    }
    if (error.statusCode === 404) {
      return res.status(404).send({ success: false, message: error.message });
    }
    if (error.statusCode === 409) {
      return res.status(409).send({ success: false, message: error.message });
    }
    if (error.statusCode === 503) {
      return res.status(503).send({
        success: false,
        message: "AI quiz generation is not configured.",
      });
    }
    if (error.statusCode === 502) {
      return res.status(502).send({
        success: false,
        message: fallbackMessage,
      });
    }
    if (isDuplicateKeyError(error)) {
      return res.status(409).send({
        success: false,
        message: "A quiz with this data already exists.",
      });
    }
    console.error(fallbackMessage, error?.name || "Error");
    return res.status(500).send({ success: false, message: fallbackMessage });
  }

  router.post("/generate-ai-quiz", requireAdmin, rateLimiters.ip, rateLimiters.user, async (req, res) => {
    try {
      const body = requireObjectBody(req.body);
      const topic = requireText(body.topic, "Topic", 200);
      const batch = validateObjectId(body.batch, "batch ID");
      const difficulty =
        body.difficulty === undefined
          ? "Medium"
          : requireText(body.difficulty, "Difficulty", 40);
      const questionCount = validateQuestionCount(
        body.questionCount === undefined ? 5 : body.questionCount
      );
      const markingScheme = validateMarkingScheme(
        body.correctMarks ?? 1,
        body.incorrectMarks ?? 0,
        questionCount
      );
      const generatedQuiz = await withBatchAssignment(batch, () =>
        generateQuiz({
          topic,
          batch,
          difficulty,
          questionCount,
          ...markingScheme,
        })
      );
      const quizContent = validateQuizContent(generatedQuiz);
      const validatedMarks = validateMarkingScheme(
        generatedQuiz.correctMarks,
        generatedQuiz.incorrectMarks,
        quizContent.questions.length
      );

      return res.send({
        success: true,
        message: "AI Quiz generated successfully",
        data: { ...quizContent, ...validatedMarks },
      });
    } catch (error) {
      return sendQuizError(
        res,
        error,
        "AI quiz generation is temporarily unavailable."
      );
    }
  });

  router.post("/add-quiz", requireAdmin, async (req, res) => {
    try {
      const body = requireObjectBody(req.body);
      const quizContent = validateQuizContent(body);
      const markingScheme = validateMarkingScheme(
        body.correctMarks,
        body.incorrectMarks,
        quizContent.questions.length
      );
      const newQuizData = await withBatchAssignment(quizContent.batch, () =>
        new Quiz({
          ...quizContent,
          ...markingScheme,
        }).save()
      );
      return res.status(201).send({
        success: true,
        message: "Quiz Added Successfully",
        data: newQuizData,
      });
    } catch (error) {
      return sendQuizError(res, error, "Unable to add quiz.");
    }
  });

  router.post("/delete-quiz", requireAdmin, async (req, res) => {
    try {
      const body = requireObjectBody(req.body);
      const quizId = validateObjectId(body.quizId, "quiz ID");
      const deletedQuiz = await Quiz.findByIdAndDelete(quizId);
      if (!deletedQuiz) {
        return res.status(404).send({
          success: false,
          message: "Quiz not found.",
        });
      }
      return res.send({ success: true, message: "Quiz Deleted Successfully" });
    } catch (error) {
      return sendQuizError(res, error, "Unable to delete quiz.");
    }
  });

  router.get("/get-all", requireAdmin, async (_req, res) => {
    try {
      const quizzes = await Quiz.find().select(
        "-questions.correctOption -questions.explanation"
      );
      return res.send({ success: true, message: "Success", data: quizzes });
    } catch (error) {
      return sendQuizError(res, error, "Unable to fetch quizzes.");
    }
  });

  router.get("/single/:quizId", requireStudent, async (req, res) => {
    try {
      const quizId = validateObjectId(req.params.quizId, "quiz ID");
      const quizData = await Quiz.findById(quizId).select(
        "-questions.correctOption -questions.explanation"
      );
      if (!quizData) {
        return res.status(404).send({
          success: false,
          message: "Quiz not found.",
        });
      }

      if (
        !req.student.batch ||
        String(req.student.batch) !== String(quizData.batch)
      ) {
        return res.status(403).send({
          success: false,
          message: "This quiz is not assigned to your batch.",
        });
      }

      return res.send({ success: true, message: "Success", data: quizData });
    } catch (error) {
      return sendQuizError(res, error, "Unable to fetch quiz.");
    }
  });

  router.get("/:batchId", requireStudent, async (req, res) => {
    try {
      const batchId = validateObjectId(req.params.batchId, "batch ID");
      if (!req.student.batch || String(req.student.batch) !== String(batchId)) {
        return res.status(403).send({
          success: false,
          message: "This batch is not assigned to you.",
        });
      }

      const batch = await Batch.findById(batchId);
      if (!batch) {
        return res.status(404).send({
          success: false,
          message: "Batch not found.",
        });
      }

      const quizzes = await Quiz.find({ batch: batchId }).select(
        "-questions.correctOption -questions.explanation"
      );
      return res.send({ success: true, message: "Success", data: quizzes });
    } catch (error) {
      return sendQuizError(res, error, "Unable to fetch quizzes.");
    }
  });

  return router;
}

const router = createQuizRouter();
export default router;
