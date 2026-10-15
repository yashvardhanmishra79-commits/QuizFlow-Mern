import express from "express";
import Batch from "../models/Batch.js";
import Quiz from "../models/Quiz.js";
import User from "../models/User.js";
import { requireAdmin } from "../middleware/auth.js";
import {
  claimBatchDeletion,
  releaseBatchDeletion,
} from "../utils/batchAssignments.js";
import {
  isDuplicateKeyError,
  isValidationError,
  requireObjectBody,
  requireText,
  validateObjectId,
} from "../utils/validation.js";

const router = express.Router();

function sendBatchError(res, error, message) {
  if (isValidationError(error)) {
    return res.status(400).send({ success: false, message: error.message });
  }
  if (error.statusCode === 404) {
    return res.status(404).send({ success: false, message: error.message });
  }
  if (error.statusCode === 409) {
    return res.status(409).send({ success: false, message: error.message });
  }
  if (isDuplicateKeyError(error)) {
    return res.status(409).send({
      success: false,
      message: "A batch with this name already exists.",
    });
  }
  console.error(message, error?.name || "Error");
  return res.status(500).send({ success: false, message });
}

router.post("/add-batch", requireAdmin, async (req, res) => {
  try {
    const body = requireObjectBody(req.body);
    const name = requireText(body.name, "Batch name", 100);
    const newBatchData = await new Batch({ name }).save();
    return res.status(201).send({
      success: true,
      message: "Batch Added Successfully",
      data: newBatchData,
    });
  } catch (error) {
    return sendBatchError(res, error, "Unable to add batch.");
  }
});

router.post("/delete-batch", requireAdmin, async (req, res) => {
  let deletionClaimed = false;
  try {
    const body = requireObjectBody(req.body);
    const batchId = validateObjectId(body.batchId, "batch ID");
    await claimBatchDeletion(batchId);
    deletionClaimed = true;

    const [student, quiz] = await Promise.all([
      User.exists({ batch: batchId }),
      Quiz.exists({ batch: batchId }),
    ]);
    if (student || quiz) {
      return res.status(409).send({
        success: false,
        message: "Batch cannot be deleted while students or quizzes are assigned to it.",
      });
    }

    const deletedBatch = await Batch.findOneAndDelete({
      _id: batchId,
      deletionInProgress: true,
      pendingAssignments: 0,
    });
    if (!deletedBatch) {
      return res.status(409).send({
        success: false,
        message: "Batch deletion could not be completed safely.",
      });
    }
    deletionClaimed = false;
    return res.send({ success: true, message: "Batch Deleted Successfully" });
  } catch (error) {
    return sendBatchError(res, error, "Unable to delete batch.");
  } finally {
    if (deletionClaimed) {
      await releaseBatchDeletion(req.body?.batchId);
    }
  }
});

router.post("/update-batch", requireAdmin, async (req, res) => {
  try {
    const body = requireObjectBody(req.body);
    const batchId = validateObjectId(body.batchId, "batch ID");
    const name = requireText(body.name, "Batch name", 100);
    const updatedBatch = await Batch.findByIdAndUpdate(
      batchId,
      { name },
      { new: true, runValidators: true }
    );

    if (!updatedBatch) {
      return res.status(404).send({
        success: false,
        message: "Batch not found.",
      });
    }

    return res.send({
      success: true,
      message: "Batch Updated Successfully",
      data: updatedBatch,
    });
  } catch (error) {
    return sendBatchError(res, error, "Unable to update batch.");
  }
});

router.get("/get-all", async (_req, res) => {
  try {
    const batches = await Batch.find();
    return res.send({ success: true, message: "Success", data: batches });
  } catch (error) {
    return sendBatchError(res, error, "Unable to fetch batches.");
  }
});

export default router;
