import express from "express";
import Batch from "../models/Batch.js";
import Quiz from "../models/Quiz.js";
import QuizRevision from "../models/QuizRevision.js";
import { generateQuizWithAI } from "../services/geminiService.js";
import { requireAdmin, requireStudent } from "../middleware/auth.js";
import { validateMarkingScheme } from "../utils/quizMarks.js";
import { withBatchAssignment } from "../utils/batchAssignments.js";
import { createAiRateLimiters } from "../middleware/rateLimits.js";
import {
  getQuizRevisionContent,
  hashQuizRevisionContent,
} from "../utils/quizRevisions.js";
import {
  isDuplicateKeyError,
  isValidationError,
  RequestValidationError,
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

  async function findCurrentRevision(quiz) {
    if (!quiz?.currentRevision || quiz.revisionReady !== true) {
      return null;
    }
    return QuizRevision.findOne({
      _id: quiz.currentRevision,
      quiz: quiz._id,
    });
  }

  async function createNextRevision({ quizId, content, contentHash, createdBy }) {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const highestRevision = await QuizRevision.findOne({ quiz: quizId })
        .sort({ revisionNumber: -1 })
        .select("revisionNumber")
        .lean();
      const revisionNumber = (highestRevision?.revisionNumber || 0) + 1;

      try {
        return await QuizRevision.create({
          quiz: quizId,
          revisionNumber,
          contentHash,
          ...content,
          createdBy,
        });
      } catch (error) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
      }
    }

    const error = new Error("Unable to allocate a quiz revision safely.");
    error.statusCode = 409;
    throw error;
  }

  async function recoverCurrentRevision(quiz) {
    const content = getQuizRevisionContent(quiz);
    const contentHash = hashQuizRevisionContent(content);
    const matchingRevision = await QuizRevision.findOne({
      quiz: quiz._id,
      contentHash,
    }).sort({ revisionNumber: -1 });
    const revision =
      matchingRevision ||
      (await createNextRevision({
        quizId: quiz._id,
        content,
        contentHash,
      }));

    await Quiz.updateOne(
      { _id: quiz._id, revisionReady: { $ne: true } },
      {
        $set: {
          currentRevision: revision._id,
          revisionNumber: revision.revisionNumber,
          contentHash: revision.contentHash,
          revisionReady: true,
        },
      }
    );
    return revision;
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
          revisionReady: false,
        }).save()
      );
      const content = { ...quizContent, ...markingScheme };
      const revisionContent = getQuizRevisionContent(content);
      const contentHash = hashQuizRevisionContent(revisionContent);
      const revision = await createNextRevision({
        quizId: newQuizData._id,
        content: revisionContent,
        contentHash,
        createdBy: req.admin._id,
      });
      await Quiz.updateOne(
        { _id: newQuizData._id, revisionReady: false },
        {
          $set: {
            currentRevision: revision._id,
            revisionNumber: revision.revisionNumber,
            contentHash,
            revisionReady: true,
          },
        }
      );
      const initializedQuiz = await Quiz.findById(newQuizData._id);
      return res.status(201).send({
        success: true,
        message: "Quiz Added Successfully",
        data: initializedQuiz || newQuizData,
      });
    } catch (error) {
      return sendQuizError(res, error, "Unable to add quiz.");
    }
  });

  router.post("/update-quiz", requireAdmin, async (req, res) => {
    try {
      const body = requireObjectBody(req.body);
      const allowedFields = new Set([
        "quizId",
        "title",
        "batch",
        "correctMarks",
        "incorrectMarks",
        "questions",
        "expectedRevision",
        "expectedRevisionNumber",
      ]);
      const unexpectedField = Object.keys(body).find(
        (field) => !allowedFields.has(field)
      );
      if (unexpectedField) {
        throw new RequestValidationError(
          `Field '${unexpectedField}' cannot be updated.`
        );
      }

      const quizId = validateObjectId(body.quizId, "quiz ID");
      const expectedRevision = body.expectedRevision
        ? validateObjectId(body.expectedRevision, "expected revision ID")
        : undefined;
      const expectedRevisionNumber =
        body.expectedRevisionNumber === undefined
          ? undefined
          : Number(body.expectedRevisionNumber);
      if (
        expectedRevisionNumber !== undefined &&
        (!Number.isInteger(expectedRevisionNumber) || expectedRevisionNumber < 1)
      ) {
        throw new RequestValidationError(
          "Expected revision number must be a positive integer."
        );
      }
      const quizContent = validateQuizContent(body);
      const markingScheme = validateMarkingScheme(
        body.correctMarks,
        body.incorrectMarks,
        quizContent.questions.length
      );
      let existingQuiz = await Quiz.findById(quizId).select(
        "_id title batch correctMarks incorrectMarks questions currentRevision revisionNumber contentHash revisionReady"
      );
      if (!existingQuiz) {
        return res.status(404).send({
          success: false,
          message: "Quiz not found.",
        });
      }

      let currentRevision = await findCurrentRevision(existingQuiz);
      if (!currentRevision) {
        currentRevision = await recoverCurrentRevision(existingQuiz);
        existingQuiz = await Quiz.findById(quizId).select(
          "_id currentRevision revisionNumber contentHash revisionReady"
        );
      }

      if (
        expectedRevision &&
        String(expectedRevision) !== String(currentRevision._id)
      ) {
        const error = new Error("Quiz was changed by another administrator.");
        error.statusCode = 409;
        throw error;
      }
      if (
        expectedRevisionNumber !== undefined &&
        expectedRevisionNumber !== currentRevision.revisionNumber
      ) {
        const error = new Error("Quiz was changed by another administrator.");
        error.statusCode = 409;
        throw error;
      }

      const content = { ...quizContent, ...markingScheme };
      const revisionContent = getQuizRevisionContent(content);
      const contentHash = hashQuizRevisionContent(revisionContent);
      if (contentHash === currentRevision.contentHash) {
        return res.send({
          success: true,
          message: "Quiz is already up to date.",
          data: existingQuiz,
        });
      }

      const revision = await withBatchAssignment(quizContent.batch, () =>
        createNextRevision({
          quizId,
          content: revisionContent,
          contentHash,
          createdBy: req.admin._id,
        })
      );
      let updatedQuiz = await Quiz.findOneAndUpdate(
        {
          _id: quizId,
          currentRevision: currentRevision._id,
          revisionNumber: currentRevision.revisionNumber,
        },
        {
          $set: {
            ...content,
            currentRevision: revision._id,
            revisionNumber: revision.revisionNumber,
            contentHash,
            revisionReady: true,
          },
        },
        { new: true, runValidators: true }
      );
      if (!updatedQuiz) {
        const latestQuiz = await Quiz.findById(quizId).select(
          "_id contentHash"
        );
        if (latestQuiz?.contentHash === contentHash) {
          updatedQuiz = latestQuiz;
        }
      }
      if (!updatedQuiz) {
        return res.status(409).send({
          success: false,
          message: "Quiz was changed by another administrator. Reload and try again.",
        });
      }

      return res.send({
        success: true,
        message: "Quiz Updated Successfully",
        data: updatedQuiz,
      });
    } catch (error) {
      return sendQuizError(res, error, "Unable to update quiz.");
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

  router.get("/admin/:quizId", requireAdmin, async (req, res) => {
    try {
      const quizId = validateObjectId(req.params.quizId, "quiz ID");
      const quizData = await Quiz.findById(quizId);
      if (!quizData) {
        return res.status(404).send({
          success: false,
          message: "Quiz not found.",
        });
      }
      return res.send({ success: true, message: "Success", data: quizData });
    } catch (error) {
      return sendQuizError(res, error, "Unable to fetch quiz.");
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
