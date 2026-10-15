import Batch from "../models/Batch.js";

function batchStateError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

export async function claimBatchAssignment(batchId) {
  const batch = await Batch.findOneAndUpdate(
    { _id: batchId, deletionInProgress: { $ne: true } },
    { $inc: { pendingAssignments: 1 } },
    { new: true }
  );
  if (batch) {
    return batch;
  }

  if (await Batch.exists({ _id: batchId })) {
    throw batchStateError(
      "Batch is being deleted and cannot accept new assignments.",
      409
    );
  }
  throw batchStateError("Batch not found.", 404);
}

export async function releaseBatchAssignment(batchId) {
  const result = await Batch.updateOne(
    { _id: batchId, pendingAssignments: { $gt: 0 } },
    { $inc: { pendingAssignments: -1 } }
  );
  if (result.matchedCount !== 1) {
    throw new Error("Unable to release the batch assignment claim.");
  }
}

export async function withBatchAssignment(batchId, operation) {
  await claimBatchAssignment(batchId);
  try {
    return await operation();
  } finally {
    await releaseBatchAssignment(batchId);
  }
}

export async function claimBatchDeletion(batchId) {
  const batch = await Batch.findOneAndUpdate(
    {
      _id: batchId,
      deletionInProgress: { $ne: true },
      $or: [
        { pendingAssignments: 0 },
        { pendingAssignments: { $exists: false } },
      ],
    },
    { $set: { deletionInProgress: true } },
    { new: true }
  );
  if (batch) {
    return batch;
  }

  if (await Batch.exists({ _id: batchId })) {
    throw batchStateError(
      "Batch has assignments in progress or is already being deleted.",
      409
    );
  }
  throw batchStateError("Batch not found.", 404);
}

export async function releaseBatchDeletion(batchId) {
  const result = await Batch.updateOne(
    {
      _id: batchId,
      deletionInProgress: true,
      pendingAssignments: 0,
    },
    { $set: { deletionInProgress: false } }
  );
  if (result.matchedCount !== 1) {
    throw new Error("Unable to restore the batch after deletion was cancelled.");
  }
}
