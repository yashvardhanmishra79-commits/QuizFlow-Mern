import express from "express";
import Batch from "../models/Batch.js";
import Quiz from "../models/Quiz.js";
import QuizAttempt from "../models/QuizAttempt.js";
import QuizAttemptSession from "../models/QuizAttemptSession.js";
import QuizRevision from "../models/QuizRevision.js";
import { requireAdmin, requireStudent } from "../middleware/auth.js";
import {
  ATTEMPT_SESSION_DURATION_MS,
  toPublicQuizRevision,
} from "../utils/quizRevisions.js";
import {
  calculateQuizScore,
  MarkingValidationError,
  validateMarkingScheme,
} from "../utils/quizMarks.js";
import {
  RequestValidationError,
  requireObjectBody,
  validateRequestId,
  validateObjectId,
} from "../utils/validation.js";

const router = express.Router();

async function findRevisionForQuiz(quizId, revisionId) {
  return QuizRevision.findOne({ _id: revisionId, quiz: quizId });
}

function isExpired(session) {
  return !session || session.expiresAt <= new Date();
}

async function getExistingAttempt(studentId, requestId, quizId) {
  const attempt = await QuizAttempt.findOne({
    student: studentId,
    requestId,
  });
  if (attempt && String(attempt.quiz) !== String(quizId)) {
    const error = new Error("This submission request ID was already used.");
    error.statusCode = 409;
    throw error;
  }
  return attempt;
}

router.post("/start", requireStudent, async (req, res) => {
  try {
    const body = requireObjectBody(req.body);
    const quizId = validateObjectId(body.quizId, "quiz ID");
    const requestId = validateRequestId(body.requestId);
    const existingAttempt = await getExistingAttempt(
      req.student._id,
      requestId,
      quizId
    );
    if (existingAttempt) {
      return res.send({
        success: true,
        message: "Attempt already saved.",
        completed: true,
        data: { _id: existingAttempt._id },
      });
    }

    const existingSession = await QuizAttemptSession.findOne({
      student: req.student._id,
      requestId,
    });
    if (existingSession) {
      if (String(existingSession.quiz) !== String(quizId)) {
        return res.status(409).send({
          success: false,
          message: "This submission request ID was already used.",
        });
      }
      if (existingSession.consumedAt || isExpired(existingSession)) {
        return res.status(410).send({
          success: false,
          message: "This quiz attempt has expired. Please start again.",
        });
      }
      const existingRevision = await findRevisionForQuiz(
        quizId,
        existingSession.revision
      );
      if (!existingRevision) {
        return res.status(409).send({
          success: false,
          message: "This quiz attempt is no longer available.",
        });
      }
      return res.send({
        success: true,
        message: "Quiz attempt resumed.",
        data: {
          ...toPublicQuizRevision(existingRevision),
          requestId,
          expiresAt: existingSession.expiresAt,
        },
      });
    }

    const quiz = await Quiz.findById(quizId).lean();
    if (!quiz || !quiz.currentRevision || quiz.revisionReady !== true) {
      return res.status(404).send({
        success: false,
        message: "Quiz revision not found.",
      });
    }
    const revision = await findRevisionForQuiz(quizId, quiz.currentRevision);
    if (!revision) {
      return res.status(404).send({
        success: false,
        message: "Quiz revision not found.",
      });
    }
    if (
      !req.student.batch ||
      String(req.student.batch) !== String(revision.batch)
    ) {
      return res.status(403).send({
        success: false,
        message: "This quiz is not assigned to your batch.",
      });
    }

    const expiresAt = new Date(Date.now() + ATTEMPT_SESSION_DURATION_MS);
    let session;
    try {
      session = await QuizAttemptSession.create({
        student: req.student._id,
        quiz: quizId,
        revision: revision._id,
        requestId,
        expiresAt,
      });
    } catch (error) {
      if (!error || error.code !== 11000) throw error;
      session = await QuizAttemptSession.findOne({
        student: req.student._id,
        requestId,
      });
      if (!session || isExpired(session)) {
        return res.status(410).send({
          success: false,
          message: "This quiz attempt has expired. Please start again.",
        });
      }
    }

    return res.send({
      success: true,
      message: "Quiz attempt started.",
      data: {
        ...toPublicQuizRevision(revision),
        requestId,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return res.status(400).send({ success: false, message: error.message });
    }
    if (error.statusCode === 409) {
      return res.status(409).send({ success: false, message: error.message });
    }
    console.error("Start quiz attempt error:", error?.name || "Error");
    return res.status(500).send({
      success: false,
      message: "Unable to start the quiz attempt.",
    });
  }
});

router.post("/", requireStudent, async (req, res) => {
  let quizId;
  let answers;
  let requestId;
  try {
    const body = requireObjectBody(req.body);
    quizId = validateObjectId(body.quizId, "quiz ID");
    answers = body.answers;
    requestId = validateRequestId(body.requestId);
  } catch (error) {
    if (!(error instanceof RequestValidationError)) {
      throw error;
    }
    return res.status(400).send({ success: false, message: error.message });
  }

  if (
    !answers ||
    typeof answers !== "object" ||
    Array.isArray(answers)
  ) {
    return res.status(400).send({
      success: false,
      message: "Submitted answers must be an object keyed by question index.",
    });
  }

  try {
    const existingAttempt = await getExistingAttempt(
      req.student._id,
      requestId,
      quizId
    );
    if (existingAttempt) {
      if (String(existingAttempt.quiz) !== String(quizId)) {
        return res.status(409).send({
          success: false,
          message: "This submission request ID was already used.",
        });
      }
      return res.send({
        success: true,
        message: "Attempt already saved.",
        data: existingAttempt,
      });
    }

    const session = await QuizAttemptSession.findOne({
      student: req.student._id,
      requestId,
    });
    if (!session || session.consumedAt || isExpired(session)) {
      return res.status(410).send({
        success: false,
        message: "This quiz attempt has expired or was not started.",
      });
    }
    if (String(session.quiz) !== String(quizId)) {
      return res.status(409).send({
        success: false,
        message: "This submission request ID was already used.",
      });
    }

    const revision = await findRevisionForQuiz(quizId, session.revision);
    if (!revision) {
      return res.status(404).send({
        success: false,
        message: "Quiz revision not found.",
      });
    }

    if (
      !req.student.batch ||
      String(req.student.batch) !== String(revision.batch)
    ) {
      return res.status(403).send({
        success: false,
        message: "This quiz is not assigned to your batch.",
      });
    }

    const questions = Array.isArray(revision.questions)
      ? revision.questions
      : [];
    if (!questions.length) {
      return res.status(400).send({
        success: false,
        message: "This quiz has no questions to submit.",
      });
    }

    const submittedEntries = Object.entries(answers);
    for (const [indexKey, selectedOption] of submittedEntries) {
      const index = Number(indexKey);
      if (
        !/^(0|[1-9]\d*)$/.test(indexKey) ||
        !Number.isInteger(index) ||
        index >= questions.length ||
        !Number.isInteger(selectedOption) ||
        selectedOption < 0 ||
        selectedOption >= (questions[index].options?.length || 0)
      ) {
        return res.status(400).send({
          success: false,
          message: "One or more submitted answers are invalid.",
        });
      }
    }

    const normalizedAnswers = questions.map((_, index) =>
      Object.prototype.hasOwnProperty.call(answers, index)
        ? answers[index]
        : null
    );
    let markingScheme;
    let score;
    try {
      markingScheme = validateMarkingScheme(
        revision.correctMarks,
        revision.incorrectMarks,
        questions.length
      );
      score = calculateQuizScore({
        questions,
        answers: normalizedAnswers,
        ...markingScheme,
      });
    } catch (error) {
      if (!(error instanceof MarkingValidationError)) {
        throw error;
      }
      return res.status(error.statusCode || 400).send({
        success: false,
        message: error.message,
      });
    }
    const {
      correctCount,
      incorrectCount,
      unansweredCount,
      totalMarks,
      obtainedMarks,
      percentage,
    } = score;
    const { correctMarks, incorrectMarks } = markingScheme;
    const batch = await Batch.findById(revision.batch).select("name");

    try {
      const attempt = await QuizAttempt.create({
        student: req.student._id,
        quiz: quizId,
        quizRevision: revision._id,
        requestId,
        quizSnapshot: {
          title: revision.title || "",
          batchName: batch?.name || "",
          correctMarks,
          incorrectMarks,
          questions: questions.map((question) => ({
            title: question.title || "",
            options: question.options || [],
            correctOption: question.correctOption,
            explanation: question.explanation || "",
          })),
        },
        answers: normalizedAnswers,
        obtainedMarks,
        totalMarks,
        percentage,
        correctCount,
        incorrectCount,
        unansweredCount,
      });

      await QuizAttemptSession.findOneAndUpdate(
        { _id: session._id, consumedAt: null },
        { $set: { consumedAt: new Date() } }
      );

      return res.status(201).send({
        success: true,
        message: "Quiz attempt saved successfully.",
        data: attempt,
      });
    } catch (error) {
      if (error.code !== 11000) {
        throw error;
      }

      const savedAttempt = await QuizAttempt.findOne({
        student: req.student._id,
        requestId,
      });
      if (!savedAttempt) {
        throw error;
      }
      if (String(savedAttempt.quiz) !== String(quizId)) {
        return res.status(409).send({
          success: false,
          message: "This submission request ID was already used.",
        });
      }

      return res.send({
        success: true,
        message: "Attempt already saved.",
        data: savedAttempt,
      });
    }
  } catch (error) {
    console.error("Save quiz attempt error:", error);
    return res.status(500).send({
      success: false,
      message: "Unable to save the quiz attempt.",
    });
  }
});

router.get("/mine", requireStudent, async (req, res) => {
  try {
    const attempts = await QuizAttempt.find({ student: req.student._id })
      .select("_id quiz obtainedMarks totalMarks percentage submittedAt")
      .sort({ submittedAt: -1 })
      .lean();

    return res.send({
      success: true,
      message: "Quiz attempts loaded successfully.",
      data: attempts,
    });
  } catch (error) {
    console.error("Load student quiz attempts error:", error);
    return res.status(500).send({
      success: false,
      message: "Unable to load quiz attempts.",
    });
  }
});

router.get("/admin/recent", requireAdmin, async (_req, res) => {
  try {
    const [recentAttempts, scoreSummary] = await Promise.all([
      QuizAttempt.find()
        .sort({ submittedAt: -1 })
        .limit(4)
        .populate({
          path: "student",
          select: "name",
          populate: { path: "batch", select: "name" },
        })
        .lean(),
      QuizAttempt.aggregate([
        {
          $match: {
            percentage: { $type: "number", $lte: 100 },
          },
        },
        {
          $group: {
            _id: null,
            averageScore: { $avg: "$percentage" },
          },
        },
      ]),
    ]);

    return res.send({
      success: true,
      message: "Dashboard results loaded successfully.",
      data: {
        averageScore: scoreSummary[0]?.averageScore ?? null,
        recentResults: recentAttempts.map((attempt) => ({
          _id: attempt._id,
          studentName: attempt.student?.name || "—",
          batchName: attempt.student?.batch?.name || "—",
          obtainedMarks: attempt.obtainedMarks,
          totalMarks: attempt.totalMarks,
          percentage: attempt.percentage,
          submittedAt: attempt.submittedAt,
        })),
      },
    });
  } catch (error) {
    console.error("Load admin dashboard quiz results error:", error);
    return res.status(500).send({
      success: false,
      message: "Unable to load dashboard quiz results.",
    });
  }
});

router.get("/:attemptId", requireStudent, async (req, res) => {
  let attemptId;
  try {
    attemptId = validateObjectId(req.params.attemptId, "attempt ID");
  } catch (error) {
    if (!(error instanceof RequestValidationError)) {
      throw error;
    }
    return res.status(400).send({
      success: false,
      message: error.message,
    });
  }

  try {
    const attempt = await QuizAttempt.findOne({
      _id: attemptId,
      student: req.student._id,
    }).populate("student", "name");

    if (!attempt) {
      return res.status(404).send({
        success: false,
        message: "Quiz attempt not found.",
      });
    }

    return res.send({
      success: true,
      message: "Quiz attempt loaded successfully.",
      data: attempt,
    });
  } catch (error) {
    console.error("Load quiz attempt error:", error);
    return res.status(500).send({
      success: false,
      message: "Unable to load the quiz attempt.",
    });
  }
});

export default router;
