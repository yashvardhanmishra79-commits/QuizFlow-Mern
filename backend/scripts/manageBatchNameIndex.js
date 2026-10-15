import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { ConnectionString } from "mongodb-connection-string-url";
import {
  createBatchNameIndexIfClean,
  inspectBatchNamesForIndex,
} from "../utils/batchNameIndex.js";

const backendDirectory = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env") });

class BatchNameIndexError extends Error {}

export function getDatabaseTarget(connectionString) {
  let parsed;
  try {
    parsed = new ConnectionString(connectionString);
  } catch {
    throw new BatchNameIndexError(
      "MONGO_URL must be a valid MongoDB connection URI."
    );
  }

  if (
    !["mongodb:", "mongodb+srv:"].includes(parsed.protocol) ||
    parsed.hosts.length === 0
  ) {
    throw new BatchNameIndexError(
      "MONGO_URL must be a valid MongoDB connection URI."
    );
  }

  let databaseName;
  try {
    databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    throw new BatchNameIndexError(
      "MONGO_URL must include a valid encoded database name."
    );
  }
  if (!databaseName || databaseName.includes("/") || databaseName.includes("\0")) {
    throw new BatchNameIndexError(
      "MONGO_URL must include an explicit database name."
    );
  }

  const scheme = parsed.protocol.slice(0, -1);
  const hostDescription = parsed.isSRV
    ? `${parsed.hosts[0]} (configured SRV hostname; DNS targets not resolved)`
    : parsed.hosts.join(", ");
  const label = `${scheme}://${hostDescription}/${databaseName}`;
  return { label, confirmation: label };
}

function ask(question) {
  const terminal = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    terminal.question(question, (answer) => {
      terminal.close();
      resolve(answer);
    });
  });
}

export async function manageBatchNameIndex({ apply = false } = {}) {
  const connectionString = process.env.MONGO_URL?.trim();
  if (!connectionString) {
    throw new BatchNameIndexError("MONGO_URL is required.");
  }

  const target = getDatabaseTarget(connectionString);
  console.log(`Configured MongoDB target: ${target.label}`);
  if (apply) {
    if (!process.stdin.isTTY) {
      throw new BatchNameIndexError(
        "Run --apply from an interactive terminal to confirm the target."
      );
    }
    const confirmation = await ask(
      `Type "${target.confirmation}" to confirm this is the intended database: `
    );
    if (confirmation !== target.confirmation) {
      throw new BatchNameIndexError(
        "Database target confirmation did not match."
      );
    }
  }

  mongoose.set("autoIndex", false);
  try {
    await mongoose.connect(connectionString, { autoIndex: false });
    const batches = mongoose.connection.collection("batches");
    const preflight = apply
      ? await createBatchNameIndexIfClean(batches)
      : await inspectBatchNamesForIndex(batches);
    const {
      duplicates,
      nonCanonicalNames,
      unsupportedArrayNames,
      recordCount,
    } = preflight;

    for (const duplicate of duplicates) {
      console.error(
        `Duplicate batch name ${JSON.stringify(duplicate.name)} affects document IDs: ${duplicate.ids.join(", ")}`
      );
    }
    for (const record of nonCanonicalNames) {
      console.error(
        `Noncanonical batch name ${JSON.stringify(record.name)} on document ID ${record.id}; resolve manually.`
      );
    }
    for (const record of unsupportedArrayNames) {
      console.error(
        `Unsupported array-valued batch name on document ID ${record.id}; it matches the index's string-type partial filter and must be resolved manually.`
      );
    }

    if (!preflight.indexCreated && (
      duplicates.length > 0 ||
      nonCanonicalNames.length > 0 ||
      unsupportedArrayNames.length > 0
    )) {
      if (apply) {
        throw new BatchNameIndexError(
          "Unique index was not created. Resolve all reported batch-name issues manually and rerun the dry run."
        );
      }
      console.log(
        `Dry run complete: found ${duplicates.length} duplicate name group(s), ${nonCanonicalNames.length} noncanonical string name(s), and ${unsupportedArrayNames.length} unsupported array-valued name(s). Resolve them manually and rerun the dry run. No records or indexes were changed.`
      );
      return {
        duplicateCount: duplicates.length,
        nonCanonicalCount: nonCanonicalNames.length,
        unsupportedArrayCount: unsupportedArrayNames.length,
        indexCreated: false,
      };
    }

    if (!apply) {
      console.log(
        `Dry run complete: no duplicate string names found among ${recordCount} batches. No records or indexes were changed.`
      );
      return { duplicateCount: 0, indexCreated: false };
    }

    if (!preflight.indexCreated) {
      throw new BatchNameIndexError(
        "Unique index creation did not complete."
      );
    }
    console.log(
      "Batch-name unique index created or already verified. No batch names were changed."
    );
    return { duplicateCount: 0, indexCreated: preflight.indexCreated };
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (
    args.length > 1 ||
    (args.length === 1 && !["--apply", "--dry-run"].includes(args[0]))
  ) {
    throw new BatchNameIndexError(
      "Usage: npm run manage-batch-name-index [-- --dry-run|--apply]"
    );
  }
  await manageBatchNameIndex({ apply: args[0] === "--apply" });
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  main().catch((error) => {
    const message =
      error instanceof BatchNameIndexError
        ? error.message
        : "Database index operation failed; details withheld.";
    console.error(`Batch-name index management failed: ${message}`);
    process.exitCode = 1;
  });
}
