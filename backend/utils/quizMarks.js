export class MarkingValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "MarkingValidationError";
    this.statusCode = 400;
  }
}

function parseMark(value, label) {
  const mark =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isFinite(mark)) {
    throw new MarkingValidationError(`${label} must be a finite number.`);
  }

  return mark;
}

export function validateMarkingScheme(
  correctMarks,
  incorrectMarks,
  questionCount
) {
  const correct = parseMark(correctMarks, "Correct marks");
  const incorrect = parseMark(incorrectMarks, "Incorrect marks");

  if (correct <= 0) {
    throw new MarkingValidationError("Correct marks must be greater than zero.");
  }

  if (incorrect > 0) {
    throw new MarkingValidationError(
      "Incorrect marks must be zero or negative."
    );
  }

  if (questionCount !== undefined) {
    if (!Number.isInteger(questionCount) || questionCount < 0) {
      throw new MarkingValidationError(
        "Question count must be a nonnegative integer."
      );
    }

    const totalMarks = questionCount * correct;
    const maximumObtainedMagnitude =
      questionCount * Math.max(Math.abs(correct), Math.abs(incorrect));
    const maximumPercentage =
      questionCount === 0
        ? 0
        : (Math.max(Math.abs(correct), Math.abs(incorrect)) / correct) * 100;

    if (
      !Number.isFinite(totalMarks) ||
      !Number.isFinite(maximumObtainedMagnitude) ||
      !Number.isFinite(maximumPercentage)
    ) {
      throw new MarkingValidationError(
        "Marking scheme produces scores outside the supported numeric range."
      );
    }
  }

  return { correctMarks: correct, incorrectMarks: incorrect };
}

export function calculateQuizScore({
  questions,
  answers,
  correctMarks,
  incorrectMarks,
}) {
  const markingScheme = validateMarkingScheme(
    correctMarks,
    incorrectMarks,
    questions.length
  );
  const correctCount = answers.reduce(
    (count, answer, index) =>
      answer !== null && answer === questions[index].correctOption
        ? count + 1
        : count,
    0
  );
  const answeredCount = answers.filter((answer) => answer !== null).length;
  const incorrectCount = answeredCount - correctCount;
  const unansweredCount = questions.length - answeredCount;
  const totalMarks = questions.length * markingScheme.correctMarks;
  const obtainedMarks =
    correctCount * markingScheme.correctMarks +
    incorrectCount * markingScheme.incorrectMarks;
  const percentage =
    Number.isFinite(totalMarks) && totalMarks > 0
      ? Math.round((obtainedMarks / totalMarks) * 100)
      : 0;

  if (
    !Number.isFinite(totalMarks) ||
    !Number.isFinite(obtainedMarks) ||
    !Number.isFinite(percentage)
  ) {
    throw new MarkingValidationError(
      "Calculated quiz score is outside the supported numeric range."
    );
  }

  return {
    correctCount,
    incorrectCount,
    unansweredCount,
    totalMarks,
    obtainedMarks,
    percentage,
  };
}
