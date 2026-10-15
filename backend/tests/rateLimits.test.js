import assert from "node:assert/strict";
import express from "express";
import { createServer } from "node:http";
import test from "node:test";
import {
  createLoginRateLimiter,
  getAiRateLimitConfig,
  getLoginRateLimitConfig,
} from "../middleware/rateLimits.js";

test("rate limit configuration uses safe defaults", () => {
  assert.deepEqual(getLoginRateLimitConfig({}), {
    windowMs: 15 * 60 * 1000,
    limit: 10,
  });
  assert.deepEqual(getAiRateLimitConfig({}), {
    windowMs: 60 * 60 * 1000,
    ipLimit: 10,
    userLimit: 5,
  });
});

test("rate limit configuration rejects invalid or excessive values", () => {
  assert.throws(
    () => getLoginRateLimitConfig({ LOGIN_RATE_LIMIT_MAX: "0" }),
    /LOGIN_RATE_LIMIT_MAX must be a positive integer/
  );
  assert.throws(
    () => getAiRateLimitConfig({ AI_RATE_LIMIT_WINDOW_MS: "not-a-number" }),
    /AI_RATE_LIMIT_WINDOW_MS must be a positive integer/
  );
  assert.throws(
    () => getAiRateLimitConfig({ AI_RATE_LIMIT_USER_MAX: "1000001" }),
    /AI_RATE_LIMIT_USER_MAX must be no greater than/
  );
});

test("IP-based limiter maintains independent client counters", async (t) => {
  const app = express();
  const limiter = createLoginRateLimiter({
    windowMs: 60_000,
    limit: 1,
  });
  app.use((req, _res, next) => {
    Object.defineProperty(req, "ip", {
      configurable: true,
      value: req.get("x-test-client-ip"),
    });
    next();
  });
  app.post("/login", limiter, (_req, res) => res.sendStatus(200));

  const server = createServer(app);
  await new Promise((resolve) =>
    server.listen(0, "127.0.0.1", resolve)
  );
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );
  const url = `http://127.0.0.1:${server.address().port}/login`;
  const hit = (clientIp) =>
    fetch(url, {
      method: "POST",
      headers: { "x-test-client-ip": clientIp },
    });

  assert.equal((await hit("192.0.2.1")).status, 200);
  assert.equal((await hit("192.0.2.1")).status, 429);
  assert.equal((await hit("198.51.100.1")).status, 200);
});
