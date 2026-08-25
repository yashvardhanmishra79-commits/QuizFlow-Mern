import express from "express";
import Batch from "../models/Batch.js";
const router = express.Router();
// add-batch: POST
router.post("/add-batch", async (req, res) => {
  const data = req.body;
  const newBatch = new Batch(data);
  const newBatchData = await newBatch.save();
  res.send({
    success: true,
    message: "Batch Added Successfully",
    data: newBatchData,
  });
});

router.post("/delete-batch", async (req, res) => {
  const { batchId } = req.body;
  await Batch.findByIdAndDelete(batchId);
  res.send({ success: true, message: "Batch Deleted Successfully" });
});

router.post("/update-batch", async (req, res) => {
  const { batchId, name } = req.body;
  await Batch.findByIdAndUpdate(batchId, { name });
  res.send({ success: true, message: "Batch Updated Successfully" });
});

router.get("/get-all", async (req, res) => {
  const batches = await Batch.find();
  res.send({ success: true, message: "Success", data: batches });
});

export default router;
