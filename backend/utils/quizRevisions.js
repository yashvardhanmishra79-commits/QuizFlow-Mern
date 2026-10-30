import { createHash } from "node:crypto";

export const ATTEMPT_SESSION_DURATION_MS = 2 * 60 * 60 * 1000;

export function getQuizRevisionContent(quiz) {
  return {
    title: quiz.title,
    batch: String(quiz.batch),
    correctMarks: Number(quiz.correctMarks),
    incorrectMarks: Number(quiz.incorrectMarks),
    questions: (quiz.questions || []).map((question) => ({
      title: question.title,
      options: [...question.options],
      correctOption: question.correctOption,
      explanation: question.explanation || "",
    })),
  };
}

export function hashQuizRevisionContent(content) {
  return createHash("sha256")
    .update(JSON.stringify(content))
    .digest("hex");
}

export function toPublicQuizRevision(revision) {
  return {
    _id: revision.quiz,
    title: revision.title,
    batch: revision.batch,
    correctMarks: revision.correctMarks,
    incorrectMarks: revision.incorrectMarks,
    questions: (revision.questions || []).map((question) => ({
      title: question.title,
      options: question.options,
    })),
  };
}
