import mongoose from "mongoose";

const userSchema = mongoose.Schema({
  name: String,   
  email: String,
  emailNormalized: { type: String, select: false },
  password: { type: String, select: false },
  passwordHash: { type: String, select: false },
  sessionVersion: { type: Number, default: 0, select: false },
  role: { type: String, enum: ["student", "admin"], default: "student" },
  batch: { type: mongoose.Schema.Types.ObjectId, ref: "batches" },
});

userSchema.index(
  { emailNormalized: 1 },
  {
    unique: true,
    partialFilterExpression: { emailNormalized: { $type: "string" } },
  }
);

function removeCredentials(_document, result) {
  delete result.password;
  delete result.passwordHash;
  delete result.sessionVersion;
  delete result.emailNormalized;
  return result;
}

userSchema.set("toJSON", { transform: removeCredentials });
userSchema.set("toObject", { transform: removeCredentials });

const userModel = mongoose.model("users", userSchema);
export default userModel;

// batch table: name (String)
// quiz table: title (String), batch (Foreign Key), correctMarks (Number), incorrectMarks (Number), questions (Array of objects) 