import assert from "node:assert/strict";
import { createServer } from "node:http";
import test from "node:test";
import { createApp } from "../index.js";
import { getAllowedCorsOrigins } from "../middleware/corsConfig.js";

async function startCorsApi(t) {
  const server = createServer(
    createApp({
      corsOrigins:
        "HTTP://LOCALHOST:5173, https://frontend.example.test:8443",
      nodeEnv: "test",
    })
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(
    () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      })
  );
  return `http://127.0.0.1:${server.address().port}`;
}

test("CORS permits configured origins exactly and handles frontend preflight", async (t) => {
  const api = await startCorsApi(t);

  const allowed = await fetch(`${api}/health`, {
    headers: { Origin: "http://localhost:5173" },
  });
  assert.equal(allowed.status, 200);
  assert.equal(
    allowed.headers.get("access-control-allow-origin"),
    "http://localhost:5173"
  );
  assert.equal(allowed.headers.get("access-control-allow-credentials"), null);

  const preflight = await fetch(`${api}/quiz/generate-ai-quiz`, {
    method: "OPTIONS",
    headers: {
      Origin: "https://frontend.example.test:8443",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization,content-type",
    },
  });
  assert.equal(preflight.status, 204);
  assert.equal(
    preflight.headers.get("access-control-allow-origin"),
    "https://frontend.example.test:8443"
  );
  assert.match(
    preflight.headers.get("access-control-allow-methods"),
    /\bPOST\b/
  );
  const allowedHeaders = preflight.headers
    .get("access-control-allow-headers")
    .toLowerCase()
    .split(",")
    .map((header) => header.trim());
  assert.ok(allowedHeaders.includes("authorization"));
  assert.ok(allowedHeaders.includes("content-type"));
});

test("untrusted, substring, scheme, and port variants get no CORS permission", async (t) => {
  const api = await startCorsApi(t);

  for (const origin of [
    "https://evil.test",
    "http://localhost:5173.evil.test",
    "https://localhost:5173",
    "http://localhost:5174",
  ]) {
    const response = await fetch(`${api}/health`, {
      headers: { Origin: origin },
    });
    assert.equal(response.status, 200);
    assert.equal(
      response.headers.get("access-control-allow-origin"),
      null,
      `${origin} should not receive CORS permission`
    );
  }
});

test("requests without Origin continue normally without CORS headers", async (t) => {
  const api = await startCorsApi(t);
  const response = await fetch(`${api}/health`);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("access-control-allow-origin"), null);
});

test("development defaults to the documented local frontend origin", () => {
  assert.deepEqual(
    [...getAllowedCorsOrigins({ environment: "development", configuredOrigins: "" })],
    ["http://localhost:5173"]
  );
});

test("production requires a valid explicit origin allowlist", () => {
  for (const configuredOrigins of ["", null]) {
    assert.throws(
      () =>
        getAllowedCorsOrigins({
          environment: "production",
          configuredOrigins,
        }),
      /CORS_ORIGINS must explicitly/
    );
  }

  assert.throws(
    () => createApp({ nodeEnv: "production", corsOrigins: "" }),
    /CORS_ORIGINS must explicitly/
  );

  for (const configuredOrigins of [
    "*",
    "https://frontend.example.test/path",
    "https://frontend.example.test?mode=1",
    "https://frontend.example.test#fragment",
    "not a URL",
    "https://frontend.example.test,,https://other.example.test",
    "https://user:password@frontend.example.test",
  ]) {
    assert.throws(
      () =>
        getAllowedCorsOrigins({
          environment: "production",
          configuredOrigins,
        }),
      /CORS_ORIGINS/
    );
  }
});
