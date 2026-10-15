import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { getDatabaseTarget } from "./manageBatchNameIndex.js";
import {
  AdminPasswordResetError,
  resetAdminPassword,
} from "../utils/adminPasswordReset.js";
import { PasswordPolicyError } from "../utils/passwordSecurity.js";

const backendDirectory = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env") });

class PasswordResetCliError extends Error {}

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

function askHidden(question) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new PasswordResetCliError(
      "Run this command from an interactive terminal to enter the password without echo."
    );
  }

  return new Promise((resolve, reject) => {
    let value = "";
    const cleanup = () => {
      process.stdin.off("keypress", onKeypress);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write("\n");
    };

    function onKeypress(character, key = {}) {
      if (key.ctrl && key.name === "c") {
        cleanup();
        reject(new PasswordResetCliError("Password reset was cancelled."));
        return;
      }
      if (key.name === "return" || key.name === "enter") {
        cleanup();
        resolve(value);
        return;
      }
      if (key.name === "backspace") {
        value = value.slice(0, -1);
        return;
      }
      if (!key.ctrl && !key.meta && character) {
        value += character;
      }
    }

    process.stdout.write(question);
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on("keypress", onKeypress);
  });
}

export async function runPasswordResetCli({
  env = process.env,
  input = process.stdin,
  output = process.stdout,
  askQuestion = ask,
  askSecret = askHidden,
  reset = resetAdminPassword,
  connect = mongoose.connect.bind(mongoose),
  disconnect = mongoose.disconnect.bind(mongoose),
} = {}) {
  if (process.argv.length > 2) {
    throw new PasswordResetCliError(
      "This command accepts no arguments; identify the account and enter the password interactively."
    );
  }
  if (!input.isTTY || !output.isTTY) {
    throw new PasswordResetCliError(
      "Run this command from an interactive terminal."
    );
  }

  const connectionString = env.MONGO_URL?.trim();
  if (!connectionString) {
    throw new PasswordResetCliError("MONGO_URL is required.");
  }
  let target;
  try {
    target = getDatabaseTarget(connectionString);
  } catch {
    throw new PasswordResetCliError(
      "MONGO_URL must be a valid MongoDB connection URI with an explicit database."
    );
  }

  output.write(`Configured MongoDB target: ${target.label}\n`);
  const databaseConfirmation = await askQuestion(
    `Type "${target.confirmation}" to confirm this is the intended database: `
  );
  if (databaseConfirmation !== target.confirmation) {
    throw new PasswordResetCliError("Database target confirmation did not match.");
  }

  const email = (await askQuestion("Existing administrator email: "))
    .trim()
    .toLowerCase();
  if (!email) {
    throw new PasswordResetCliError("An administrator email is required.");
  }
  const accountConfirmation = await askQuestion(
    `Type "${email}" to confirm the administrator account to reset: `
  );
  if (accountConfirmation !== email) {
    throw new PasswordResetCliError("Account confirmation did not match.");
  }

  const password = await askSecret("New password (hidden): ");
  const passwordConfirmation = await askSecret(
    "Confirm new password (hidden): "
  );
  if (password !== passwordConfirmation) {
    throw new PasswordResetCliError("The entered passwords do not match.");
  }

  try {
    await connect(connectionString, { autoIndex: false });
    await reset({ email, password });
    output.write("Administrator password reset successfully; existing sessions were invalidated.\n");
  } finally {
    if (mongoose.connection.readyState !== 0) {
      await disconnect();
    }
  }
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  runPasswordResetCli().catch(async (error) => {
    const message =
      error instanceof PasswordResetCliError ||
      error instanceof PasswordPolicyError ||
      error instanceof AdminPasswordResetError
        ? error.message
        : "Password reset failed; database details are withheld.";
    console.error(`Administrator password reset failed: ${message}`);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exitCode = 1;
  });
}
