import mongoose from "mongoose";

export class RequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequestValidationError";
    this.statusCode = 400;
  }
}

export function requireObjectBody(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new RequestValidationError("Request body must be an object.");
  }

  return body;
}

export function requireText(value, label, maxLength = 200) {
  if (
    typeof value !== "string" ||
    !value.trim() ||
    value.trim().length > maxLength ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new RequestValidationError(
      `${label} must be a nonempty string of at most ${maxLength} characters.`
    );
  }

  return value.trim();
}

export function validateEmail(value) {
  const email = requireText(value, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new RequestValidationError("A valid email address is required.");
  }
  return email;
}

export function validateObjectId(value, label = "ID") {
  if (
    typeof value !== "string" ||
    !mongoose.isObjectIdOrHexString(value)
  ) {
    throw new RequestValidationError(`A valid ${label} is required.`);
  }
  return value;
}

export function validateQuestionCount(value) {
  const isNumericInput =
    typeof value === "number" ||
    (typeof value === "string" && value.trim().length > 0);
  const count = Number(value);
  if (
    !isNumericInput ||
    !Number.isInteger(count) ||
    count < 1 ||
    count > 20
  ) {
    throw new RequestValidationError(
      "Question count must be an integer from 1 to 20."
    );
  }
  return count;
}

export function validateQuizContent(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new RequestValidationError("Quiz data must be an object.");
  }

  const { title, batch, questions } = payload;
  const validatedTitle = requireText(title, "Quiz title", 200);
  validateObjectId(batch, "batch ID");

  if (
    !Array.isArray(questions) ||
    questions.length === 0 ||
    questions.length > 100
  ) {
    throw new RequestValidationError(
      "A quiz must contain between 1 and 100 questions."
    );
  }

  const validatedQuestions = questions.map((question, index) => {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      throw new RequestValidationError(
        `Question ${index + 1} must be an object.`
      );
    }

    const questionTitle = requireText(
      question.title,
      `Question ${index + 1}`,
      1000
    );
    if (!Array.isArray(question.options) || question.options.length !== 4) {
      throw new RequestValidationError(
        `Question ${index + 1} must have exactly four options.`
      );
    }

    const options = question.options.map((option, optionIndex) =>
      requireText(
        option,
        `Question ${index + 1}, option ${optionIndex + 1}`,
        500
      )
    );

    if (
      !Number.isInteger(question.correctOption) ||
      question.correctOption < 0 ||
      question.correctOption > 3
    ) {
      throw new RequestValidationError(
        `Question ${index + 1} must have a correct-option index from 0 to 3.`
      );
    }

    let explanation = "";
    if (question.explanation !== undefined) {
      if (typeof question.explanation !== "string") {
        throw new RequestValidationError(
          `Question ${index + 1} explanation must be a string.`
        );
      }
      if (question.explanation.length > 4000) {
        throw new RequestValidationError(
          `Question ${index + 1} explanation is too long.`
        );
      }
      explanation = question.explanation.trim();
    }

    return {
      title: questionTitle,
      options,
      correctOption: question.correctOption,
      explanation,
    };
  });

  return {
    title: validatedTitle,
    batch,
    questions: validatedQuestions,
  };
}

export function isDuplicateKeyError(error) {
  return error?.code === 11000;
}

export function isValidationError(error) {
  return (
    error instanceof RequestValidationError ||
    error?.name === "MarkingValidationError" ||
    error?.name === "ValidationError"
  );
}
