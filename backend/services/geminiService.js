import { GoogleGenAI, Type } from "@google/genai";
import { validateMarkingScheme } from "../utils/quizMarks.js";
import {
  RequestValidationError,
  requireText,
  validateQuestionCount,
  validateQuizContent,
  validateObjectId,
} from "../utils/validation.js";

/**
 * Normalizes an option index that may be a number or a letter ("A", "B", "C", "D")
 * into a 0-based integer (0, 1, 2, or 3).
 */
function normalizeCorrectOption(val) {
  if (typeof val === "number" && Number.isInteger(val) && val >= 0 && val <= 3) {
    return val;
  }
  if (typeof val === "string") {
    const trimmed = val.trim().toUpperCase();
    const letterMap = { A: 0, B: 1, C: 2, D: 3 };
    if (letterMap[trimmed] !== undefined) {
      return letterMap[trimmed];
    }
  }
  throw new RequestValidationError(
    "AI-generated correct-option indices must be 0 to 3 or A to D."
  );
}

/**
 * Validates and converts raw generated data into the exact schema
 * expected by the existing Quiz model and QuizBuilderService.
 */
export function validateAndFormatQuizData(
  raw,
  { batch, correctMarks, incorrectMarks, questionCount }
) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new RequestValidationError("Invalid AI response: expected an object.");
  }

  if (!Array.isArray(raw.questions) || raw.questions.length === 0) {
    throw new RequestValidationError(
      "AI did not return any questions. Please try again."
    );
  }
  if (
    questionCount !== undefined &&
    raw.questions.length !== validateQuestionCount(questionCount)
  ) {
    throw new RequestValidationError(
      `AI must return exactly ${questionCount} questions.`
    );
  }

  const questions = raw.questions.map((question, index) => {
    if (!question || typeof question !== "object" || Array.isArray(question)) {
      throw new RequestValidationError(
        `AI-generated question ${index + 1} must be an object.`
      );
    }

    const explanation = requireText(
      question.explanation,
      `AI-generated question ${index + 1} explanation`,
      4000
    );
    return {
      title: question.title,
      options: question.options,
      correctOption: normalizeCorrectOption(question.correctOption),
      explanation,
    };
  });

  const quizContent = validateQuizContent({
    title: raw.title,
    batch,
    questions,
  });
  const markingScheme = validateMarkingScheme(
    correctMarks,
    incorrectMarks,
    questions.length
  );

  return {
    ...quizContent,
    ...markingScheme,
  };
}

/**
 * Calls Google Gemini API using @google/genai SDK to generate
 * a structured multiple choice quiz.
 */
export async function generateQuizWithAI(
  {
    topic,
    batch,
    difficulty = "Medium",
    questionCount = 5,
    correctMarks = 1,
    incorrectMarks = 0,
  },
  createClient = (apiKey) => new GoogleGenAI({ apiKey })
) {
  topic = requireText(topic, "Topic", 200);
  batch = validateObjectId(batch, "batch ID");
  questionCount = validateQuestionCount(questionCount);
  difficulty = requireText(difficulty, "Difficulty", 40);
  validateMarkingScheme(correctMarks, incorrectMarks, questionCount);

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey || !apiKey.trim() || apiKey === "your_gemini_api_key_here") {
    const error = new Error(
      "Gemini API key is not configured."
    );
    error.statusCode = 503;
    throw error;
  }

  const ai = createClient(apiKey.trim());

  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
  ].filter(Boolean);

  // Remove duplicates
  const uniqueModels = [...new Set(candidateModels)];

  const prompt = `Generate a ${difficulty}-level multiple-choice quiz about "${topic}".
Generate exactly ${questionCount} multiple-choice questions.

Requirements:
- Each question must test understanding of the topic with realistic choices.
- Exactly 4 choices per question (Options A, B, C, D).
- Provide correctOption as an integer 0, 1, 2, or 3 corresponding to index of options array.
- Provide a concise, accurate explanation for each correct answer.
- Provide an engaging title for this quiz.`;

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      title: {
        type: Type.STRING,
        description: "A concise and descriptive quiz title",
      },
      questions: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description: "The question statement",
            },
            options: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
              },
              description: "Array of exactly 4 choices",
            },
            correctOption: {
              type: Type.INTEGER,
              description: "Zero-based index of the correct option: 0, 1, 2, or 3",
            },
            explanation: {
              type: Type.STRING,
              description: "Clear explanation of why the correct option is right",
            },
          },
          required: ["title", "options", "correctOption", "explanation"],
        },
      },
    },
    required: ["title", "questions"],
  };

  let lastError = null;

  for (const model of uniqueModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema,
          temperature: 0.7,
        },
      });

      const responseText = response.text;
      if (!responseText) {
        throw new Error("Empty response received from Gemini API.");
      }

      let parsed;
      try {
        // Strip code fence if present
        const cleaned = responseText.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();
        parsed = JSON.parse(cleaned);
      } catch (parseErr) {
        throw new Error(`Failed to parse AI response as JSON: ${parseErr.message}`);
      }

      const formattedQuiz = validateAndFormatQuizData(parsed, {
        batch,
        correctMarks,
        incorrectMarks,
        questionCount,
      });
      return formattedQuiz;
    } catch (err) {
      lastError = err;
      // If error is 404 (model not found), continue to try next candidate model
      const isNotFound =
        err.message &&
        (err.message.includes("not found") || err.message.includes("404"));
      if (!isNotFound) {
        // For auth or quota errors, don't keep trying models
        break;
      }
    }
  }

  const generationError = new Error("Gemini generation request failed.");
  generationError.statusCode = 502;
  generationError.cause = lastError;
  throw generationError;
}