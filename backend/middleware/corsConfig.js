const DEVELOPMENT_ORIGINS = ["http://localhost:5173"];
const ORIGIN_PATTERN = /^https?:\/\/[^/?#]+$/i;

export function getAllowedCorsOrigins({
  environment = process.env.NODE_ENV,
  configuredOrigins = process.env.CORS_ORIGINS,
} = {}) {
  if (configuredOrigins == null || configuredOrigins.trim() === "") {
    if (environment === "production") {
      throw new Error(
        "CORS_ORIGINS must explicitly list trusted frontend origins in production."
      );
    }
    return new Set(DEVELOPMENT_ORIGINS);
  }

  const origins = configuredOrigins.split(",").map((origin) => origin.trim());
  if (origins.some((origin) => origin.length === 0)) {
    throw new Error("CORS_ORIGINS must not contain empty entries.");
  }

  return new Set(
    origins.map((origin) => {
      if (origin.includes("*") || !ORIGIN_PATTERN.test(origin)) {
        throw new Error(
          "CORS_ORIGINS entries must be explicit HTTP(S) origins without paths, queries, or fragments."
        );
      }

      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        throw new Error("CORS_ORIGINS contains a malformed origin.");
      }

      if (
        !["http:", "https:"].includes(parsed.protocol) ||
        !parsed.hostname ||
        parsed.username ||
        parsed.password ||
        parsed.pathname !== "/" ||
        parsed.search ||
        parsed.hash
      ) {
        throw new Error(
          "CORS_ORIGINS entries must be explicit HTTP(S) origins without paths, queries, or fragments."
        );
      }

      return parsed.origin;
    })
  );
}

export function createCorsOptions(allowedOrigins) {
  return {
    origin(origin, callback) {
      if (origin && allowedOrigins.has(origin)) {
        callback(null, origin);
        return;
      }
      callback(null, false);
    },
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Authorization", "Content-Type"],
    optionsSuccessStatus: 204,
  };
}
