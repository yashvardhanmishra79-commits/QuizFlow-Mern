import express from "express";
import mongoose from "mongoose";
import userRoutes from "./routes/userRoutes.js";
import batchRoutes from "./routes/batchRoutes.js";
import quizRoutes from "./routes/quizRoutes.js";
import attemptRoutes from "./routes/attemptRoutes.js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

// Logic to connect to Database:
async function connectToDB() {
  try {
    const MONGO_URL =
      process.env.MONGO_URL || "mongodb://localhost:27017/quizflow";
    await mongoose.connect(MONGO_URL);
    console.log("✅ Connected To DB!!...");
  } catch (err) {
    console.log("❌ DB Connection Failed...", err?.name || "Error");
  }
}

connectToDB();

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.send("Server Is Running Perfectly!!");
});
app.use("/user", userRoutes);
app.use("/batch", batchRoutes);
app.use("/quiz", quizRoutes);
app.use("/attempts", attemptRoutes);

const PORT = process.env.PORT || 4400;
app.listen(PORT, () => {
  console.log(`Server Is Running at:\nhttp://localhost:${PORT}/health`);
});

// npm init -y
// npm i express cors mongoose
// npm i nodemon -g
// npm run dev
