import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import User from "../models/User.js";
import { hashPassword, PasswordPolicyError } from "../utils/passwordSecurity.js";

const backendDirectory = fileURLToPath(new URL("../", import.meta.url));
dotenv.config({ path: path.join(backendDirectory, ".env") });

class ProvisioningError extends Error {}

function getDatabaseTarget(connectionString) {
  let uri;
  try {
    uri = new URL(connectionString);
  } catch {
    throw new ProvisioningError(
      "MONGO_URL must be a valid MongoDB connection URI."
    );
  }

  if (
    !["mongodb:", "mongodb+srv:"].includes(uri.protocol) ||
    !uri.hostname
  ) {
    throw new ProvisioningError(
      "MONGO_URL must be a valid MongoDB connection URI."
    );
  }

  const databaseName = decodeURIComponent(uri.pathname.replace(/^\/+/, ""));
  if (!databaseName || databaseName.includes("/")) {
    throw new ProvisioningError(
      "MONGO_URL must include an explicit database name."
    );
  }

  return {
    displayName: `${uri.hostname}${uri.port ? `:${uri.port}` : ""}/${databaseName}`,
    confirmation: `${uri.hostname}${uri.port ? `:${uri.port}` : ""}/${databaseName}`,
  };
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

function askHidden(question) {
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
        reject(new ProvisioningError("Provisioning was cancelled."));
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

async function provisionAdmin() {
  if (process.argv.length > 2) {
    throw new ProvisioningError(
      "This command accepts no arguments; enter administrator credentials interactively."
    );
  }

  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== "function") {
    throw new ProvisioningError(
      "Run provisioning from an interactive terminal so the password can be entered without echo."
    );
  }

  const connectionString = process.env.MONGO_URL?.trim();
  if (!connectionString) {
    throw new ProvisioningError(
      "MONGO_URL is required. Configure it in backend/.env or the process environment."
    );
  }

  const target = getDatabaseTarget(connectionString);
  console.log(`Configured MongoDB target: ${target.displayName}`);
  const confirmation = await ask(
    `Type "${target.confirmation}" to confirm this is the intended database: `
  );
  if (confirmation !== target.confirmation) {
    throw new ProvisioningError("Database target confirmation did not match.");
  }

  await mongoose.connect(connectionString);
  try {
    if (await User.exists({ role: "admin" })) {
      throw new ProvisioningError(
        "An administrator already exists. No account was changed."
      );
    }

    const name = (await ask("Administrator name: ")).trim();
    const email = (await ask("Administrator email: ")).trim().toLowerCase();
    if (!name || name.length > 100) {
      throw new ProvisioningError(
        "Enter a name between 1 and 100 characters."
      );
    }
    if (
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      throw new ProvisioningError("Enter a valid administrator email address.");
    }
    const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (
      await User.findOne({
        email: { $regex: `^${escapedEmail}$`, $options: "i" },
      })
    ) {
      throw new ProvisioningError(
        "An account with this email address already exists."
      );
    }

    const password = await askHidden("Administrator password (hidden): ");
    const passwordConfirmation = await askHidden("Confirm password (hidden): ");
    if (password.length < 12) {
      throw new ProvisioningError(
        "The administrator password must be at least 12 characters."
      );
    }
    if (password !== passwordConfirmation) {
      throw new ProvisioningError("The entered passwords do not match.");
    }

    if (await User.exists({ role: "admin" })) {
      throw new ProvisioningError(
        "An administrator already exists. No account was changed."
      );
    }

    const passwordHash = await hashPassword(password);
    await new User({
      name,
      email,
      emailNormalized: email,
      passwordHash,
      role: "admin",
    }).save();

    console.log("Administrator provisioned successfully.");
  } finally {
    await mongoose.disconnect();
  }
}

provisionAdmin().catch(async (error) => {
  const message =
    error instanceof ProvisioningError
      ? error.message
      : error instanceof PasswordPolicyError
        ? error.message
        : "Database operation failed; error details are withheld to protect credentials.";
  console.error(`Administrator provisioning failed: ${message}`);
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  process.exitCode = 1;
});
