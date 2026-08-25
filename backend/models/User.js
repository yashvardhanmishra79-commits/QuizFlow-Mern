import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  name: String,   
  email: String,
  password: String,
  role: { type: String, enum: ["student", "admin"], default: "student" },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "batches" },
});

const userModel = mongoose.model("users", userSchema);
export default userModel;

// batch table: name (String)
// quiz table: title (String), batch (Foreign Key), correctMarks (Number), incorrectMarks (Number), questions (Array of objects) 