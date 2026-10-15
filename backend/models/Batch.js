import mongoose from "mongoose";

const batchSchema = mongoose.Schema({
  name: String,
  deletionInProgress: { type: Boolean, default: false, select: false },
  pendingAssignments: { type: Number, default: 0, select: false },
});

function removeAssignmentState(_document, result) {
  delete result.deletionInProgress;
  delete result.pendingAssignments;
  return result;
}

batchSchema.set("toJSON", { transform: removeAssignmentState });
batchSchema.set("toObject", { transform: removeAssignmentState });

const batchModel = mongoose.model("batches", batchSchema);
export default batchModel;
