import { GoogleGenAI, Type } from "@google/genai";

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
    const parsed = parseInt(trimmed, 10);
    if (!Number.isNaN(parsed)) {
      if (parsed >= 0 && parsed <= 3) return parsed;
      // If 1-indexed (1 to 4)
      if (parsed >= 1 && parsed <= 4) return parsed - 1;
    }
  }
  return 0; // Safe fallback
}

/**
 * Validates and converts raw generated data into the exact schema
 * expected by the existing Quiz model and QuizBuilderService.
 */
export function validateAndFormatQuizData(raw, { topic, batch, correctMarks, incorrectMarks, difficulty }) {
  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid AI response: Expected a JSON object.");
  }

  const rawQuestions = Array.isArray(raw.questions) ? raw.questions : [];
  if (rawQuestions.length === 0) {
    throw new Error("AI did not return any questions. Please try again.");
  }

  const validatedQuestions = rawQuestions.map((q, idx) => {
    const title = typeof q.title === "string" && q.title.trim()
      ? q.title.trim()
      : `Question ${idx + 1}`;

    let options = Array.isArray(q.options)
      ? q.options.map((opt) => (typeof opt === "string" ? opt.trim() : String(opt || "").trim()))
      : [];

    // Ensure exactly 4 options
    if (options.length < 4) {
      while (options.length < 4) {
        options.push(`Option ${String.fromCharCode(65 + options.length)}`);
      }
    } else if (options.length > 4) {
      options = options.slice(0, 4);
    }

    const correctOption = normalizeCorrectOption(q.correctOption);

    const explanation = typeof q.explanation === "string" && q.explanation.trim()
      ? q.explanation.trim()
      : `The correct option is: ${options[correctOption] || "Option A"}`;

    return {
      title,
      options,
      correctOption,
      explanation,
    };
  });

  const quizTitle = typeof raw.title === "string" && raw.title.trim()
    ? raw.title.trim()
    : `${topic} Quiz (${difficulty || "General"})`;

  return {
    title: quizTitle,
    batch: batch || "",
    correctMarks: Number(correctMarks) >= 0 ? Number(correctMarks) : 1,
    incorrectMarks: Number(incorrectMarks) >= 0 ? Number(incorrectMarks) : 0,
    questions: validatedQuestions,
  };
}

/**
 * Calls Google Gemini API using @google/genai SDK to generate
 * a structured multiple choice quiz.
 */
export async function generateQuizWithAI({
  topic,
  batch,
  difficulty = "Medium",
  questionCount = 5,
  correctMarks = 1,
  incorrectMarks = 0,
}) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

  if (!apiKey || !apiKey.trim() || apiKey === "your_gemini_api_key_here") {
    const error = new Error(
      "Gemini API key is not configured. Please add GEMINI_API_KEY to your backend/.env file."
    );
    error.statusCode = 400;
    throw error;
  }

  const ai = new GoogleGenAI({ apiKey: apiKey.trim() });

  const safeCount = Math.max(1, Math.min(20, Number(questionCount) || 5));
  const candidateModels = [
    process.env.GEMINI_MODEL,
    "gemini-3.8-flash",
  ].filter(Boolean);

  // Remove duplicates
  const uniqueModels = [...new Set(candidateModels)];

  const prompt = `Generate a ${difficulty}-level multiple-choice quiz about "${topic}".
Generate exactly ${safeCount} multiple-choice questions.

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

      return validateAndFormatQuizData(parsed, {
        topic,
        batch,
        correctMarks,
        incorrectMarks,
        difficulty,
      });
    } catch (err) {
      lastError = err;
      // If error is 404 (model not found), continue to try next candidate model
      const isNotFound = err.message && (err.message.includes("not found") || err.message.includes("404"));
      if (!isNotFound) {
        // For auth or quota errors, don't keep trying models
        break;
      }
    }
  }

  throw lastError || new Error("Failed to generate quiz with Gemini.");
}