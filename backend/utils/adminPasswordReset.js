import User from "../models/User.js";
import {
  hashPassword,
  validateNewPassword,
} from "./passwordSecurity.js";
import { validateEmail } from "./validation.js";

export class AdminPasswordResetError extends Error {}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function resetAdminPassword({
  email: rawEmail,
  password,
  UserModel = User,
  hash = hashPassword,
}) {
  const email = validateEmail(rawEmail);
  validateNewPassword(password);

  const escapedEmail = escapeRegex(email);
  const accounts = await UserModel.find({
    $or: [
      { emailNormalized: email },
      { email: { $regex: `^${escapedEmail}$`, $options: "i" } },
    ],
  })
    .select("_id role")
    .lean();

  if (accounts.length === 0) {
    throw new AdminPasswordResetError(
      "No account was found for that email address."
    );
  }
  if (accounts.length !== 1) {
    throw new AdminPasswordResetError(
      "The email address matches multiple accounts."
    );
  }
  if (accounts[0].role !== "admin") {
    throw new AdminPasswordResetError(
      "The selected account is not an administrator."
    );
  }

  const passwordHash = await hash(password);
  const result = await UserModel.updateOne(
    { _id: accounts[0]._id, role: "admin" },
    {
      $set: { passwordHash },
      $unset: { password: 1 },
      $inc: { sessionVersion: 1 },
    }
  );
  if (result.matchedCount !== 1) {
    throw new AdminPasswordResetError(
      "The administrator account changed; no password was reset."
    );
  }

  return { email };
}
