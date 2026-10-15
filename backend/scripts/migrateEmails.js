import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";
import { planEmailNormalization } from "../utils/emailNormalization.js";

const backendDirectory = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env") });

export async function migrateEmails({ apply = false } = {}) {
  const connectionString = process.env.MONGO_URL?.trim();
  if (!connectionString) {
    throw new Error("MONGO_URL is required.");
  }

  mongoose.set("autoIndex", false);
  await mongoose.connect(connectionString, { autoIndex: false });
  try {
    const users = mongoose.connection.collection("users");
    const records = await users
      .find({}, { projection: { email: 1, emailNormalized: 1 } })
      .toArray();
    const plan = planEmailNormalization(records);

    if (plan.duplicates.length > 0 || plan.invalidIds.length > 0) {
      for (const duplicate of plan.duplicates) {
        console.error(
          `Duplicate normalized email affects user IDs: ${duplicate.ids.join(", ")}`
        );
      }
      if (plan.invalidIds.length > 0) {
        console.error(
          `Invalid or missing emails require manual review for user IDs: ${plan.invalidIds.join(", ")}`
        );
      }
      throw new Error(
        "No records were changed. Resolve the reported accounts and rerun."
      );
    }

    if (!apply) {
      console.log(
        `Dry run complete: ${plan.updates.length} user records require normalization. No records were changed.`
      );
      return { updatedCount: 0, plannedCount: plan.updates.length };
    }

    if (plan.updates.length > 0) {
      const existingNormalizedValues = new Set(
        records
          .map((record) => record.emailNormalized)
          .filter((value) => typeof value === "string")
      );
      let migrationId;
      let temporaryValues;
      do {
        migrationId = randomUUID();
        temporaryValues = plan.normalizedRecords.map(
          (record) => `quizflow-email-migration-${migrationId}-${record._id}`
        );
      } while (
        temporaryValues.some((value) => existingNormalizedValues.has(value))
      );

      for (const [index, record] of plan.normalizedRecords.entries()) {
        const result = await users.updateOne(
          { _id: record._id },
          { $set: { emailNormalized: temporaryValues[index] } }
        );
        if (result.matchedCount !== 1) {
          throw new Error("A user record changed during migration.");
        }
      }
      for (const record of plan.normalizedRecords) {
        const result = await users.updateOne(
          { _id: record._id },
          { $set: { emailNormalized: record.emailNormalized } }
        );
        if (result.matchedCount !== 1) {
          throw new Error("A user record changed during migration.");
        }
      }
    }

    await users.createIndex(
      { emailNormalized: 1 },
      {
        unique: true,
        partialFilterExpression: {
          emailNormalized: { $type: "string" },
        },
      }
    );
    console.log(
      `Email normalization complete: ${plan.updates.length} user records updated and the partial unique index verified.`
    );
    return {
      updatedCount: plan.updates.length,
      plannedCount: plan.updates.length,
    };
  } finally {
    await mongoose.disconnect();
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== "--apply")) {
    throw new Error("Usage: npm run migrate-emails [-- --apply]");
  }

  await migrateEmails({ apply: args[0] === "--apply" });
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error) => {
    console.error(`Email normalization migration failed: ${error.name}`);
    process.exitCode = 1;
  });
}
