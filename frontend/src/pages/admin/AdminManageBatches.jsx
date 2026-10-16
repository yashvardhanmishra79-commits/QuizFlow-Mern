import { useEffect, useState } from "react";
import { MdAdd, MdDelete, MdClose } from "react-icons/md";
import api from "../../api/api";

import "./AdminManageBatches.css";

function AdminManageBatches() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [batches, setBatches] = useState([]);
  const [batchName, setBatchName] = useState("");

  // =========================
  // GET ALL BATCHES
  // =========================
  useEffect(() => {
    async function getData() {
      try {
        const response = await api.get("/batch/get-all");

        if (response.data?.success) {
          setBatches(response.data?.data || []);
        } else {
          alert("Some Error In getting data");
        }
      } catch (error) {
        console.error("Error getting batches:", error);
        alert("Failed to get batches");
      }
    }

    getData();
  }, []);

  // =========================
  // ADD BATCH
  // =========================
  async function handleSubmit() {
    if (!batchName.trim()) {
      alert("Please enter batch name");
      return;
    }

    try {
      const response = await api.post("/batch/add-batch", {
        name: batchName.trim(),
      });

      if (response.data?.success) {
        alert("Batch Added!");

        // Add the newly created batch immediately
        if (response.data?.data) {
          setBatches((prevBatches) => [
            ...prevBatches,
            response.data.data,
          ]);
        }

        setBatchName("");
        setIsModalOpen(false);
      } else {
        alert(response.data?.message || "Some Error Occured");
      }
    } catch (error) {
      console.error("Error adding batch:", error);
      alert("Failed to add batch");
    }
  }

  // =========================
  // DELETE BATCH
  // =========================
  async function handleDelete(batchId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this batch?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      // IMPORTANT:
      // Backend expects "batchId", not "id"
      const response = await api.post("/batch/delete-batch", {
        batchId: batchId,
      });

      if (response.data?.success) {
        alert("Batch Deleted!");

        // Remove it from the UI
        setBatches((prevBatches) =>
          prevBatches.filter((batch) => batch._id !== batchId)
        );
      } else {
        alert(response.data?.message || "Some Error Occured");
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
      alert("Failed to delete batch");
    }
  }

  return (
    <section className="manage-batches-section">

      {/* =========================
          HEADER
      ========================= */}
      <div className="manage-batches-header">
        <div>
          <h1>Manage Batches</h1>
          <p>View and manage all coaching batches</p>
        </div>

        <button
          className="manage-batches-add-btn"
          onClick={() => setIsModalOpen(true)}
        >
          <MdAdd />
          Add Batch
        </button>
      </div>

      {/* =========================
          BATCHES GRID
      ========================= */}
      <div className="manage-batches-grid">
        {batches.length > 0 ? (
          batches.map((batch) => (
            <div
              className="batch-card"
              key={batch._id}
            >
              <div className="batch-card-icon">
                <span className="batch-card-initial">
                  {batch.name?.split(" - ")[1] ||
                    batch.name?.charAt(0) ||
                    "B"}
                </span>
              </div>

              <h3>{batch.name}</h3>

              <button
                className="batch-delete-btn"
                type="button"
                aria-label={`Delete batch ${batch.name}`}
                onClick={() => handleDelete(batch._id)}
              >
                <MdDelete />
              </button>
            </div>
          ))
        ) : (
          <div className="no-batches">
            <p>No batches found.</p>
          </div>
        )}
      </div>

      {/* =========================
          ADD BATCH MODAL
      ========================= */}
      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
          >

            {/* Modal Header */}
            <div className="modal-header">
              <h2>Add Batch</h2>

              <button
                type="button"
                className="modal-close-icon"
                aria-label="Close add batch dialog"
                onClick={() => setIsModalOpen(false)}
              >
                <MdClose aria-hidden="true" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="modal-body">
              <div className="modal-form-group">
                <label htmlFor="batch-name">Batch Name</label>

                <input
                  id="batch-name"
                  type="text"
                  placeholder="Enter batch name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmit();
                    }
                  }}
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="modal-footer">
              <button
                className="modal-cancel-btn"
                onClick={() => {
                  setBatchName("");
                  setIsModalOpen(false);
                }}
              >
                Cancel
              </button>

              <button
                className="modal-submit-btn"
                onClick={handleSubmit}
              >
                Add Batch
              </button>
            </div>

          </div>
        </div>
      )}
    </section>
  );
}

export default AdminManageBatches;
