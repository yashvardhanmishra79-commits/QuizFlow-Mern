import mongoose from "mongoose";

const batchSchema = mongoose.Schema({
  name: String,
});

const batchModel = mongoose.model("batches", batchSchema);
export default batchModel;
