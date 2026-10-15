import { rateLimit } from "express-rate-limit";

const MAX_WINDOW_MS = 2 ** 31 - 1;
const MAX_REQUESTS = 1_000_000;

function readPositiveInteger(env, name, fallback, maximum) {
  const value = env[name];
  if (value === undefined) {
    return fallback;
  }
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} must be a positive integer.`);
  }

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed > maximum) {
    throw new Error(`${name} must be no greater than ${maximum}.`);
  }
  return parsed;
}

export function getLoginRateLimitConfig(env = process.env) {
  return {
    windowMs: readPositiveInteger(
      env,
      "LOGIN_RATE_LIMIT_WINDOW_MS",
      15 * 60 * 1000,
      MAX_WINDOW_MS
    ),
    limit: readPositiveInteger(
      env,
      "LOGIN_RATE_LIMIT_MAX",
      10,
      MAX_REQUESTS
    ),
  };
}

export function getAiRateLimitConfig(env = process.env) {
  return {
    windowMs: readPositiveInteger(
      env,
      "AI_RATE_LIMIT_WINDOW_MS",
      60 * 60 * 1000,
      MAX_WINDOW_MS
    ),
    ipLimit: readPositiveInteger(
      env,
      "AI_RATE_LIMIT_IP_MAX",
      10,
      MAX_REQUESTS
    ),
    userLimit: readPositiveInteger(
      env,
      "AI_RATE_LIMIT_USER_MAX",
      5,
      MAX_REQUESTS
    ),
  };
}

function createLimiter({ windowMs, limit, identifier, keyGenerator }) {
  return rateLimit({
    windowMs,
    limit,
    identifier,
    keyGenerator,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler: (_req, res) =>
      res.status(429).send({
        success: false,
        message: "Too many requests. Please try again later.",
      }),
    ...(keyGenerator ? { validate: { keyGeneratorIpFallback: false } } : {}),
  });
}

export function createLoginRateLimiter(
  config = getLoginRateLimitConfig()
) {
  return createLimiter({
    ...config,
    identifier: "login",
  });
}

export function createAiRateLimiters(config = getAiRateLimitConfig()) {
  return {
    ip: createLimiter({
      windowMs: config.windowMs,
      limit: config.ipLimit,
      identifier: "ai-generation-ip",
    }),
    user: createLimiter({
      windowMs: config.windowMs,
      limit: config.userLimit,
      identifier: "ai-generation-user",
      keyGenerator: (req) => `admin:${String(req.admin._id)}`,
    }),
  };
}
