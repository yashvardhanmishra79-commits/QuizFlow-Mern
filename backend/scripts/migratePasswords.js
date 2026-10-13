import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import User from "../models/User.js";
import {
  canMigrateLegacyPassword,
  hashLegacyPassword,
  isArgon2EncodedValue,
  isArgon2idHash,
} from "../utils/passwordSecurity.js";

const BATCH_SIZE = 100;
const backendDirectory = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env") });

class MigrationError extends Error {}

function getDatabaseTarget(connectionString) {
  let uri;
  try {
    uri = new URL(connectionString);
  } catch {
    throw new MigrationError(
      "MONGO_URL must be a valid MongoDB connection URI."
    );
  }

  if (
    !["mongodb:", "mongodb+srv:"].includes(uri.protocol) ||
    !uri.hostname
  ) {
    throw new MigrationError(
      "MONGO_URL must be a valid MongoDB connection URI."
    );
  }

  const databaseName = decodeURIComponent(uri.pathname.replace(/^\/+/, ""));
  if (!databaseName || databaseName.includes("/")) {
    throw new MigrationError(
      "MONGO_URL must include an explicit database name."
    );
  }

  const target = `${uri.hostname}${uri.port ? `:${uri.port}` : ""}/${databaseName}`;
  return { displayName: target, confirmation: target };
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

async function migratePasswords() {
  const mode = process.argv[2];
  if (
    process.argv.length !== 3 ||
    !["--dry-run", "--apply"].includes(mode)
  ) {
    throw new MigrationError(
      "Specify exactly one mode: --dry-run or --apply."
    );
  }

  if (!process.stdin.isTTY) {
    throw new MigrationError(
      "Run this command from an interactive terminal to confirm the database target."
    );
  }

  const connectionString = process.env.MONGO_URL?.trim();
  if (!connectionString) {
    throw new MigrationError(
      "MONGO_URL is required. Configure it in backend/.env or the process environment."
    );
  }

  const target = getDatabaseTarget(connectionString);
  console.log(`Configured MongoDB target: ${target.displayName}`);
  const confirmation = await ask(
    `Type "${target.confirmation}" to confirm this is the intended database: `
  );
  if (confirmation !== target.confirmation) {
    throw new MigrationError("Database target confirmation did not match.");
  }

  await mongoose.connect(connectionString);
  const counts = {
    scanned: 0,
    migrated: 0,
    wouldMigrate: 0,
    legacyValuesRemoved: 0,
    wouldRemoveLegacyValues: 0,
    changedConcurrently: 0,
    alreadyHashed: 0,
    unsupportedEncoded: 0,
    tooLargeToMigrate: 0,
  };

  try {
    let lastId = null;
    while (true) {
      const filter = {
        password: { $type: "string" },
        $or: [
          { passwordHash: { $exists: false } },
          { passwordHash: { $type: "string" } },
        ],
      };
      if (lastId) {
        filter._id = { $gt: lastId };
      }

      const records = await User.find(filter)
        .select("_id +password +passwordHash")
        .sort({ _id: 1 })
        .limit(BATCH_SIZE)
        .lean();
      if (records.length === 0) {
        break;
      }

      lastId = records[records.length - 1]._id;
      counts.scanned += records.length;

      for (const record of records) {
        if (typeof record.passwordHash === "string") {
          if (!isArgon2idHash(record.passwordHash)) {
            counts.unsupportedEncoded += 1;
            continue;
          }

          counts.alreadyHashed += 1;
          if (mode === "--dry-run") {
            counts.wouldRemoveLegacyValues += 1;
            continue;
          }

          const cleanup = await User.updateOne(
            {
              _id: record._id,
              password: record.password,
              passwordHash: record.passwordHash,
            },
            { $unset: { password: 1 } }
          );
          if (cleanup.modifiedCount === 1) {
            counts.legacyValuesRemoved += 1;
          } else {
            counts.changedConcurrently += 1;
          }
          continue;
        }

        let encodedHash;
        if (isArgon2idHash(record.password)) {
          encodedHash = record.password;
          counts.alreadyHashed += 1;
        } else if (isArgon2EncodedValue(record.password)) {
          counts.unsupportedEncoded += 1;
          continue;
        } else {
          if (!canMigrateLegacyPassword(record.password)) {
            counts.tooLargeToMigrate += 1;
            continue;
          }
        }

        if (mode === "--dry-run") {
          if (!isArgon2idHash(record.password)) {
            counts.wouldMigrate += 1;
          }
          continue;
        }

        if (!encodedHash) {
          encodedHash = await hashLegacyPassword(record.password);
        }

        const result = await User.updateOne(
          {
            _id: record._id,
            password: record.password,
            passwordHash: { $exists: false },
          },
          {
            $set: { passwordHash: encodedHash },
            $unset: { password: 1 },
          }
        );

        if (result.modifiedCount === 1) {
          counts.migrated += 1;
        } else {
          counts.changedConcurrently += 1;
        }
      }
    }

    console.log(
      `${mode === "--dry-run" ? "Dry run" : "Migration"} complete. ` +
        `Scanned: ${counts.scanned}; ` +
        `would migrate: ${counts.wouldMigrate}; ` +
        `migrated: ${counts.migrated}; ` +
        `legacy values removed: ${counts.legacyValuesRemoved}; ` +
        `would remove legacy values: ${counts.wouldRemoveLegacyValues}; ` +
        `already encoded: ${counts.alreadyHashed}; ` +
        `changed concurrently: ${counts.changedConcurrently}; ` +
        `unsupported encoded: ${counts.unsupportedEncoded}; ` +
        `skipped for size: ${counts.tooLargeToMigrate}.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

migratePasswords().catch(async (error) => {
  const message =
    error instanceof MigrationError
      ? error.message
      : "Database migration operation failed; details are withheld.";
  console.error(`Password migration failed: ${message}`);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exitCode = 1;
});
