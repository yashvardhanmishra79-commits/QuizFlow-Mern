import assert from "node:assert/strict";
import test from "node:test";
import User from "../models/User.js";
import { calculateQuizScore, validateMarkingScheme } from "../utils/quizMarks.js";
import {
  requireObjectBody,
  requireText,
  validateEmail,
  validateObjectId,
  validateQuestionCount,
  validateQuizContent,
} from "../utils/validation.js";
import {
  generateQuizWithAI,
  validateAndFormatQuizData,
} from "../services/geminiService.js";
import {
  PasswordPolicyError,
  validateNewPassword,
} from "../utils/passwordSecurity.js";
import { planEmailNormalization } from "../utils/emailNormalization.js";

const batchId = "64b000000000000000000001";

test("request validators reject missing fields, wrong types, malformed IDs, and emails", () => {
  assert.throws(() => requireObjectBody([]), /must be an object/);
  assert.throws(() => requireText("  ", "Name"), /nonempty string/);
  assert.throws(() => requireText(42, "Name"), /nonempty string/);
  assert.equal(validateEmail("  Student@Example.com "), "student@example.com");
  assert.throws(() => validateEmail("not-an-email"), /valid email/);
  assert.throws(() => validateObjectId("invalid", "batch ID"), /valid batch ID/);
  assert.equal(validateQuestionCount("5"), 5);
  for (const value of [true, [], "not-a-count", 0, 21, 1.5]) {
    assert.throws(() => validateQuestionCount(value));
  }
});

test("email migration detects canonical duplicates before proposing updates", () => {
  const plan = planEmailNormalization([
    { _id: "user-a", email: " Student@example.com " },
    { _id: "user-b", email: "student@example.com" },
    { _id: "user-c", email: "other@example.com" },
    { _id: "user-invalid", email: "not-an-email" },
  ]);

  assert.deepEqual(plan.duplicates, [
    {
      email: "student@example.com",
      ids: ["user-a", "user-b"],
    },
  ]);
  assert.deepEqual(plan.invalidIds, ["user-invalid"]);
  assert.deepEqual(plan.updates, [
    { _id: "user-a", emailNormalized: "student@example.com" },
    { _id: "user-b", emailNormalized: "student@example.com" },
    { _id: "user-c", emailNormalized: "other@example.com" },
  ]);
});

test("email migration plans only missing or noncanonical values and is idempotent", () => {
  const records = [
    {
      _id: "user-a",
      email: "Student@example.com",
      emailNormalized: "student@example.com",
    },
    { _id: "user-b", email: "OTHER@example.com" },
  ];
  const firstPlan = planEmailNormalization(records);
  assert.deepEqual(firstPlan.updates, [
    { _id: "user-b", emailNormalized: "other@example.com" },
  ]);

  const secondPlan = planEmailNormalization([
    ...records.slice(0, 1),
    {
      _id: "user-b",
      email: "OTHER@example.com",
      emailNormalized: "other@example.com",
    },
  ]);
  assert.deepEqual(secondPlan.updates, []);
});

test("quiz validation requires four nonempty options and a valid correct index", () => {
  const validQuestion = {
    title: "Question text",
    options: ["A", "B", "C", "D"],
    correctOption: 1,
    explanation: "",
  };

  assert.deepEqual(
    validateQuizContent({
      title: " Quiz ",
      batch: batchId,
      questions: [validQuestion],
    }),
    {
      title: "Quiz",
      batch: batchId,
      questions: [{ ...validQuestion, title: "Question text" }],
    }
  );
  assert.throws(
    () =>
      validateQuizContent({
        title: "Quiz",
        batch: batchId,
        questions: [{ ...validQuestion, options: ["A", "", "C", "D"] }],
      }),
    /nonempty string/
  );
  assert.throws(
    () =>
      validateQuizContent({
        title: "Quiz",
        batch: batchId,
        questions: [{ ...validQuestion, correctOption: 4 }],
      }),
    /correct-option index/
  );
});

test("marking validation accepts negative decimals and rejects invalid marks", () => {
  assert.deepEqual(validateMarkingScheme(2, -0.25), {
    correctMarks: 2,
    incorrectMarks: -0.25,
  });
  assert.deepEqual(validateMarkingScheme("1.5", "-0.5"), {
    correctMarks: 1.5,
    incorrectMarks: -0.5,
  });
  for (const [correctMarks, incorrectMarks] of [
    [0, 0],
    [Number.NaN, 0],
    [1, Number.POSITIVE_INFINITY],
    [1, 0.25],
  ]) {
    assert.throws(() => validateMarkingScheme(correctMarks, incorrectMarks));
  }
});

test("grading awards configured marks, penalizes wrong answers, and ignores unanswered questions", () => {
  const questions = [0, 1, 2, 3, 0].map((correctOption) => ({
    correctOption,
  }));
  const score = calculateQuizScore({
    questions,
    answers: [0, 1, 2, 0, null],
    correctMarks: 2,
    incorrectMarks: -0.5,
  });

  assert.deepEqual(score, {
    correctCount: 3,
    incorrectCount: 1,
    unansweredCount: 1,
    totalMarks: 10,
    obtainedMarks: 5.5,
    percentage: 55,
  });
});

test("grading preserves negative totals and safely handles a zero denominator", () => {
  const negativeScore = calculateQuizScore({
    questions: [{ correctOption: 0 }, { correctOption: 1 }],
    answers: [2, 3],
    correctMarks: 2,
    incorrectMarks: -0.5,
  });
  assert.equal(negativeScore.obtainedMarks, -1);
  assert.equal(negativeScore.percentage, -25);

  assert.equal(
    calculateQuizScore({
      questions: [],
      answers: [],
      correctMarks: 1,
      incorrectMarks: 0,
    }).percentage,
    0
  );
});

test("marking validation prevents numeric overflow and supports tiny positive marks", () => {
  assert.throws(
    () => validateMarkingScheme(Number.MAX_VALUE, 0, 2),
    /supported numeric range/
  );
  assert.throws(
    () => validateMarkingScheme(1, -Number.MAX_VALUE, 1),
    /supported numeric range/
  );

  const tinyMark = Number.MIN_VALUE;
  assert.deepEqual(validateMarkingScheme(tinyMark, 0, 2), {
    correctMarks: tinyMark,
    incorrectMarks: 0,
  });
  const tinyMarkScore = calculateQuizScore({
    questions: [{ correctOption: 0 }, { correctOption: 1 }],
    answers: [0, 1],
    correctMarks: tinyMark,
    incorrectMarks: 0,
  });
  assert.ok(Number.isFinite(tinyMarkScore.totalMarks));
  assert.ok(Number.isFinite(tinyMarkScore.obtainedMarks));
  assert.ok(Number.isFinite(tinyMarkScore.percentage));
  assert.equal(tinyMarkScore.percentage, 100);

  const negativeMarking = calculateQuizScore({
    questions: [{ correctOption: 0 }, { correctOption: 1 }],
    answers: [1, null],
    correctMarks: 2,
    incorrectMarks: -0.5,
  });
  assert.equal(negativeMarking.obtainedMarks, -0.5);
  assert.equal(negativeMarking.percentage, -12);
});

test("new passwords follow policy and user serialization omits credentials", () => {
  assert.doesNotThrow(() => validateNewPassword("a-long-password"));
  assert.throws(() => validateNewPassword("short"), PasswordPolicyError);

  const user = new User({
    name: "Student",
    email: "student@example.com",
    emailNormalized: "student@example.com",
    password: "legacy",
    passwordHash: "argon-hash",
    sessionVersion: 3,
    authToken: "not-a-user-field",
  });
  const serialized = user.toJSON();
  assert.equal(Object.hasOwn(serialized, "password"), false);
  assert.equal(Object.hasOwn(serialized, "passwordHash"), false);
  assert.equal(Object.hasOwn(serialized, "sessionVersion"), false);
  assert.equal(Object.hasOwn(serialized, "emailNormalized"), false);
  assert.equal(Object.hasOwn(serialized, "authToken"), false);
});

test("AI quiz formatting preserves negative marks and rejects malformed output", () => {
  const rawQuiz = {
    title: "AI quiz",
    questions: [
      {
        title: "Question",
        options: ["A", "B", "C", "D"],
        correctOption: 2,
        explanation: "C is correct.",
      },
    ],
  };
  const formatted = validateAndFormatQuizData(rawQuiz, {
    batch: batchId,
    correctMarks: 1,
    incorrectMarks: -0.25,
  });
  assert.equal(formatted.incorrectMarks, -0.25);
  assert.equal(formatted.questions[0].correctOption, 2);

  assert.throws(
    () =>
      validateAndFormatQuizData(
        {
          ...rawQuiz,
          questions: [{ ...rawQuiz.questions[0], options: ["A", "B"] }],
        },
        { batch: batchId, correctMarks: 1, incorrectMarks: 0 }
      ),
    /exactly four options/
  );
  assert.throws(
    () =>
      validateAndFormatQuizData(
        {
          ...rawQuiz,
          questions: [{ ...rawQuiz.questions[0], correctOption: 4 }],
        },
        { batch: batchId, correctMarks: 1, incorrectMarks: 0 }
      ),
    /correct-option indices/
  );
  assert.throws(
    () =>
      validateAndFormatQuizData(rawQuiz, {
        batch: batchId,
        correctMarks: 1,
        incorrectMarks: 0,
        questionCount: 2,
      }),
    /exactly 2 questions/
  );
});

test("AI generation stops before any upstream request when no API key is configured", async (t) => {
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousGoogleKey = process.env.GOOGLE_API_KEY;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GOOGLE_API_KEY;
  t.after(() => {
    if (previousGeminiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previousGeminiKey;
    }
    if (previousGoogleKey === undefined) {
      delete process.env.GOOGLE_API_KEY;
    } else {
      process.env.GOOGLE_API_KEY = previousGoogleKey;
    }
  });

  await assert.rejects(
    generateQuizWithAI({ topic: "Testing", batch: batchId }),
    (error) => error.statusCode === 503
  );
});

test("AI generation uses a mocked client and retains negative marking", async (t) => {
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousGeminiModel = process.env.GEMINI_MODEL;
  process.env.GEMINI_API_KEY = "test-api-key";
  process.env.GEMINI_MODEL = "mock-model";
  t.after(() => {
    if (previousGeminiKey === undefined) {
      delete process.env.GEMINI_API_KEY;
    } else {
      process.env.GEMINI_API_KEY = previousGeminiKey;
    }
    if (previousGeminiModel === undefined) {
      delete process.env.GEMINI_MODEL;
    } else {
      process.env.GEMINI_MODEL = previousGeminiModel;
    }
  });

  let requestCount = 0;
  const generated = await generateQuizWithAI(
    {
      topic: "Testing",
      batch: batchId,
      questionCount: 1,
      correctMarks: 2,
      incorrectMarks: -0.5,
    },
    (apiKey) => {
      assert.equal(apiKey, "test-api-key");
      return {
        models: {
          generateContent: async ({ model }) => {
            requestCount += 1;
            assert.equal(model, "mock-model");
            return {
              text: JSON.stringify({
                title: "Generated quiz",
                questions: [
                  {
                    title: "A generated question",
                    options: ["A", "B", "C", "D"],
                    correctOption: 0,
                    explanation: "A is correct.",
                  },
                ],
              }),
            };
          },
        },
      };
    }
  );
  assert.equal(requestCount, 1);
  assert.equal(generated.incorrectMarks, -0.5);
  assert.equal(generated.questions.length, 1);
});
