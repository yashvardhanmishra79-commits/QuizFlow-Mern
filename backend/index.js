import express from "express";
import mongoose from "mongoose";
import batchRoutes from "./routes/batchRoutes.js";
import { createQuizRouter } from "./routes/quizRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import attemptRoutes from "./routes/attemptRoutes.js";
import dotenv from "dotenv";
import cors from "cors";
import { pathToFileURL } from "node:url";
import { createLoginRateLimiter } from "./middleware/rateLimits.js";
import { createCorsOptions, getAllowedCorsOrigins } from "./middleware/corsConfig.js";

export function createApp({
  loginLimiter = createLoginRateLimiter(),
  quizRouter = createQuizRouter(),
  corsOrigins = process.env.CORS_ORIGINS,
  nodeEnv = process.env.NODE_ENV,
} = {}) {
  const app = express();
  const allowedOrigins = getAllowedCorsOrigins({
    environment: nodeEnv,
    configuredOrigins: corsOrigins,
  });
  app.use(cors(createCorsOptions(allowedOrigins)));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.send("Server Is Running Perfectly!!");
  });
  app.post("/user/login", loginLimiter);
  app.use("/user", userRoutes);
  app.use("/batch", batchRoutes);
  app.use("/quiz", quizRouter);
  app.use("/attempts", attemptRoutes);

  app.use((error, _req, res, next) => {
    if (res.headersSent) {
      return next(error);
    }
    if (error?.type === "entity.too.large") {
      return res.status(413).send({
        success: false,
        message: "Request body exceeds the allowed size.",
      });
    }
    if (error?.status === 400 && error?.type?.startsWith("entity.")) {
      return res.status(400).send({
        success: false,
        message: "Request body contains invalid JSON or exceeds the allowed size.",
      });
    }
    console.error("Unhandled request error:", error?.name || "Error");
    return res.status(500).send({
      success: false,
      message: "An internal server error occurred.",
    });
  });

  return app;
}

async function connectToDB() {
  const mongoUrl =
    process.env.MONGO_URL || "mongodb://localhost:27017/quizflow";
  await mongoose.connect(mongoUrl);
  console.log("Connected to MongoDB.");
}

export async function startServer() {
  dotenv.config();
  const app = createApp();
  const databaseConnection = connectToDB().catch((error) => {
    console.error("Database connection failed:", error?.name || "Error");
  });
  const port = process.env.PORT || 4400;
  const server = app.listen(port, () => {
    console.log(`Server is running at http://localhost:${port}/health`);
  });
  await databaseConnection;
  return server;
}

if (
  process.argv[1] &&
  pathToFileURL(process.argv[1]).href === import.meta.url
) {
  await startServer();
}
