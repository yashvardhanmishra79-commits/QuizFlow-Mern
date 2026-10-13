import argon2 from "argon2";
import { timingSafeEqual } from "node:crypto";

const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};
const MAX_PASSWORD_BYTES = 1024;
const MAX_LEGACY_PASSWORD_BYTES = 1024 * 1024;
const ARGON2ID_HASH_PATTERN =
  /^\$argon2id\$v=19\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]{16,}={0,2})\$([A-Za-z0-9+/]{32,}={0,2})$/;

export class PasswordPolicyError extends Error {}

export function validateNewPassword(password) {
  if (typeof password !== "string") {
    throw new PasswordPolicyError("Password must be a string.");
  }

  if (Array.from(password).length < 12) {
    throw new PasswordPolicyError(
      "Password must contain at least 12 characters."
    );
  }

  if (Buffer.byteLength(password, "utf8") > MAX_PASSWORD_BYTES) {
    throw new PasswordPolicyError(
      "Password exceeds the maximum supported length."
    );
  }
}

export function isArgon2idHash(value) {
  if (typeof value !== "string") {
    return false;
  }

  const match = ARGON2ID_HASH_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const memoryCost = Number(match[1]);
  const timeCost = Number(match[2]);
  const parallelism = Number(match[3]);
  const hasCanonicalBase64 = (encoded) =>
    Buffer.from(encoded, "base64")
      .toString("base64")
      .replace(/=+$/, "") === encoded.replace(/=+$/, "");

  return (
    memoryCost >= 8192 &&
    memoryCost <= 65536 &&
    timeCost >= 1 &&
    timeCost <= 5 &&
    parallelism >= 1 &&
    parallelism <= 4 &&
    hasCanonicalBase64(match[4]) &&
    hasCanonicalBase64(match[5])
  );
}

export function isArgon2EncodedValue(value) {
  return typeof value === "string" && value.startsWith("$argon2");
}

export function canMigrateLegacyPassword(password) {
  return (
    typeof password === "string" &&
    Buffer.byteLength(password, "utf8") <= MAX_LEGACY_PASSWORD_BYTES &&
    !isArgon2EncodedValue(password)
  );
}

export async function hashPassword(password) {
  validateNewPassword(password);
  if (isArgon2EncodedValue(password)) {
    throw new PasswordPolicyError("Password value is not accepted.");
  }

  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function hashLegacyPassword(password) {
  if (!canMigrateLegacyPassword(password)) {
    throw new PasswordPolicyError(
      "Legacy password cannot be migrated automatically."
    );
  }

  return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(password, encodedHash) {
  if (typeof password !== "string" || !isArgon2idHash(encodedHash)) {
    return false;
  }

  return argon2.verify(encodedHash, password);
}

export function verifyLegacyPassword(candidate, legacyPassword) {
  if (typeof candidate !== "string" || typeof legacyPassword !== "string") {
    return false;
  }

  const candidateBytes = Buffer.from(candidate, "utf8");
  const legacyBytes = Buffer.from(legacyPassword, "utf8");
  return (
    candidateBytes.length === legacyBytes.length &&
    timingSafeEqual(candidateBytes, legacyBytes)
  );
}
