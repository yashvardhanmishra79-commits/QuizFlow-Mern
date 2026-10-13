import { createHash, randomBytes } from "node:crypto";
import Session from "../models/Session.js";
import User from "../models/User.js";

const SESSION_DURATION_MS = 12 * 60 * 60 * 1000;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId, sessionVersion) {
  const token = randomBytes(32).toString("hex");

  await Session.create({
    user: userId,
    sessionVersion,
    tokenHash: hashToken(token),
    expiresAt: new Date(Date.now() + SESSION_DURATION_MS),
  });

  return token;
}

export async function revokeSession(token) {
  if (!token) {
    return;
  }

  await Session.deleteOne({ tokenHash: hashToken(token) });
}

async function requireRole(req, res, next, requiredRole) {
  try {
    const authorization = req.get("authorization") || "";
    const [scheme, token] = authorization.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).send({
        success: false,
        message: "Authentication is required.",
      });
    }

    const session = await Session.findOne({
      tokenHash: hashToken(token),
      expiresAt: { $gt: new Date() },
    });

    if (!session) {
      return res.status(401).send({
        success: false,
        message: "Your session has expired. Please sign in again.",
      });
    }

    const user = await User.findById(session.user).select(
      "_id role batch name +sessionVersion"
    );
    if (!user) {
      return res.status(401).send({
        success: false,
        message: "The account for this session no longer exists.",
      });
    }

    if ((session.sessionVersion ?? 0) !== (user.sessionVersion ?? 0)) {
      return res.status(401).send({
        success: false,
        message: "Your session has expired. Please sign in again.",
      });
    }

    if (user.role !== requiredRole) {
      return res.status(403).send({
        success: false,
        message: `Only ${requiredRole} accounts can access this resource.`,
      });
    }

    req[requiredRole] = user;
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requireStudent(req, res, next) {
  return requireRole(req, res, next, "student");
}

export function requireAdmin(req, res, next) {
  return requireRole(req, res, next, "admin");
}
