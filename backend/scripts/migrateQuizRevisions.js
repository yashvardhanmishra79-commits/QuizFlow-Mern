import "dotenv/config";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import Quiz from "../models/Quiz.js";
import QuizRevision from "../models/QuizRevision.js";
import {
  getQuizRevisionContent,
  hashQuizRevisionContent,
} from "../utils/quizRevisions.js";

const applyChanges = process.argv.includes("--apply");
const mongoUrl = process.env.MONGO_URL;

async function createRevisionWithRetry(quiz, content, contentHash) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const highest = await QuizRevision.findOne({ quiz: quiz._id })
      .sort({ revisionNumber: -1 })
      .select("revisionNumber")
      .lean();
    try {
      return await QuizRevision.create({
        quiz: quiz._id,
        revisionNumber: (highest?.revisionNumber || 0) + 1,
        contentHash,
        ...content,
      });
    } catch (error) {
      if (error?.code !== 11000) throw error;
    }
  }
  throw new Error(`Unable to allocate a revision for quiz ${quiz._id}.`);
}

if (!mongoUrl) {
  console.error("MONGO_URL must be set explicitly for this migration.");
  process.exitCode = 1;
} else {
  const confirmApply = async () => {
    if (!applyChanges) return true;
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(
      "This will write quiz revision metadata. Type APPLY to continue: "
    );
    rl.close();
    return answer.trim() === "APPLY";
  };

  const migrate = async () => {
    await mongoose.connect(mongoUrl, { autoIndex: false });
    let planned = 0;
    let repaired = 0;

    try {
      const quizzes = await Quiz.find().lean();
      for (const quiz of quizzes) {
        const content = getQuizRevisionContent(quiz);
        const contentHash = hashQuizRevisionContent(content);
        const revisions = await QuizRevision.find({ quiz: quiz._id })
          .sort({ revisionNumber: -1 })
          .lean();
        const highestRevisionNumber = revisions[0]?.revisionNumber || 0;
        const matchingRevision = revisions.find(
          (revision) => revision.contentHash === contentHash
        );

        const needsPointerRepair =
          !quiz.revisionReady ||
          !quiz.currentRevision ||
          String(quiz.contentHash || "") !== contentHash ||
          !revisions.some(
            (revision) => String(revision._id) === String(quiz.currentRevision)
          );

        if (!needsPointerRepair) continue;
        planned += 1;

        if (!applyChanges) {
          console.log(
            `[dry-run] quiz ${quiz._id}: ${matchingRevision ? "promote matching revision" : `create revision ${highestRevisionNumber + 1}`}`
          );
          continue;
        }

        // Only a revision with the exact current Quiz content may be promoted.
        // Unrelated orphan revisions are retained and never become current.
        const revision =
          matchingRevision ||
          (await createRevisionWithRetry(quiz, content, contentHash));

        await Quiz.updateOne(
          { _id: quiz._id },
          {
            $set: {
              currentRevision: revision._id,
              revisionNumber: revision.revisionNumber,
              contentHash,
              revisionReady: true,
            },
          }
        );
        repaired += 1;
      }

      console.log(
        `${applyChanges ? "Applied" : "Planned"} ${applyChanges ? repaired : planned} quiz revision repair(s).`
      );
    } finally {
      await mongoose.disconnect();
    }
  };

  confirmApply()
    .then((confirmed) => {
      if (!confirmed) {
        console.log("Migration cancelled.");
        return null;
      }
      return migrate();
    })
    .catch((error) => {
      console.error("Quiz revision migration failed:", error);
      process.exitCode = 1;
    });
}
