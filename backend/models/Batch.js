import mongoose from "mongoose";

const batchSchema = mongoose.Schema(
  {
    name: String,
    deletionInProgress: { type: Boolean, default: false, select: false },
    pendingAssignments: { type: Number, default: 0, select: false },
  },
  { autoIndex: false }
);

batchSchema.index(
  { name: 1 },
  {
    name: "name_1_unique",
    unique: true,
    collation: { locale: "simple" },
    partialFilterExpression: { name: { $type: "string" } },
  }
);

function removeAssignmentState(_document, result) {
  delete result.deletionInProgress;
  delete result.pendingAssignments;
  return result;
}

batchSchema.set("toJSON", { transform: removeAssignmentState });
batchSchema.set("toObject", { transform: removeAssignmentState });

const batchModel = mongoose.model("batches", batchSchema);
export default batchModel;
