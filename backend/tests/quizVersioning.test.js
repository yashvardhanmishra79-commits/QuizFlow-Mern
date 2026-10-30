import assert from "node:assert/strict";
import test from "node:test";
import QuizAttempt from "../models/QuizAttempt.js";
import QuizAttemptSession from "../models/QuizAttemptSession.js";
import QuizRevision from "../models/QuizRevision.js";
import {
  getQuizRevisionContent,
  hashQuizRevisionContent,
  toPublicQuizRevision,
} from "../utils/quizRevisions.js";

test("quiz revisions use unique numbers and non-unique content hashes", () => {
  const indexes = QuizRevision.schema.indexes();
  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.quiz === 1 && fields.revisionNumber === 1 && options.unique === true
    )
  );
  assert.ok(
    indexes.some(
      ([fields, options]) =>
        fields.quiz === 1 && fields.contentHash === 1 && !options.unique
    )
  );
  assert.equal(QuizRevision.schema.path("title").options.immutable, true);
  assert.equal(QuizRevision.schema.path("questions").options.immutable, true);
});

test("restored content hashes the same while remaining eligible for a new revision number", () => {
  const original = getQuizRevisionContent({
    title: "Quiz",
    batch: "64b000000000000000000001",
    correctMarks: 1,
    incorrectMarks: -0.25,
    questions: [
      { title: "Q", options: ["A", "B"], correctOption: 1, explanation: "Why" },
    ],
  });
  const restored = getQuizRevisionContent({ ...original });
  assert.equal(hashQuizRevisionContent(original), hashQuizRevisionContent(restored));
  assert.equal(QuizRevision.schema.path("contentHash").options.unique, undefined);
});

test("attempt sessions and attempts enforce student/request idempotency indexes", () => {
  const sessionIndexes = QuizAttemptSession.schema.indexes();
  const attemptIndexes = QuizAttempt.schema.indexes();
  assert.ok(
    sessionIndexes.some(
      ([fields, options]) =>
        fields.student === 1 && fields.requestId === 1 && options.unique === true
    )
  );
  assert.ok(
    attemptIndexes.some(
      ([fields, options]) =>
        fields.student === 1 && fields.requestId === 1 && options.unique === true
    )
  );
  assert.equal(QuizAttemptSession.schema.path("expiresAt").options.required, true);
});

test("public revisions omit answer keys and explanations", () => {
  const revision = {
    _id: "64b000000000000000000021",
    quiz: "64b000000000000000000020",
    title: "Protected quiz",
    batch: "64b000000000000000000001",
    correctMarks: 1,
    incorrectMarks: 0,
    questions: [
      {
        title: "Question",
        options: ["A", "B"],
        correctOption: 1,
        explanation: "Private explanation",
      },
    ],
  };
  const publicRevision = toPublicQuizRevision(revision);
  assert.equal(publicRevision._id, revision.quiz);
  assert.equal("correctOption" in publicRevision.questions[0], false);
  assert.equal("explanation" in publicRevision.questions[0], false);
});
