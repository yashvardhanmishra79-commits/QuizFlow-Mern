import { useEffect, useState } from "react";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdClose,
} from "react-icons/md";

import api from "../../api/api";
import "./AdminManageStudents.css";

function AdminManageStudents() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState(null);

  const [data, setData] = useState({
    name: "",
    email: "",
    password: "",
    batch: "",
  });

  const [students, setStudents] = useState([]);
  const [batches, setBatches] = useState([]);

  // =========================
  // INPUT CHANGE
  // =========================

  function handleChange(e) {
    const { name, value } = e.target;

    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // =========================
  // GET STUDENTS + BATCHES
  // =========================

  useEffect(() => {
    async function getData() {
      try {
        const [studentsResponse, batchesResponse] =
          await Promise.all([
            api.get("/user/get-all-students"),
            api.get("/batch/get-all"),
          ]);

        if (studentsResponse.data?.success) {
          setStudents(
            studentsResponse.data?.data || []
          );
        } else {
          alert(
            "Some Error Occured In Fetching Students"
          );
        }

        if (batchesResponse.data?.success) {
          setBatches(
            batchesResponse.data?.data || []
          );
        } else {
          alert("Error In Fetching Batches");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        alert(
          "Failed to fetch students or batches"
        );
      }
    }

    getData();
  }, []);

  // =========================
  // RESET FORM
  // =========================

  function resetForm() {
    setData({
      name: "",
      email: "",
      password: "",
      batch: "",
    });

    setEditingStudentId(null);
    setIsEditMode(false);
  }

  // =========================
  // OPEN ADD MODAL
  // =========================

  function openAddModal() {
    resetForm();
    setIsModalOpen(true);
  }

  // =========================
  // OPEN EDIT MODAL
  // =========================

  function handleEdit(student) {
    setIsEditMode(true);
    setEditingStudentId(student._id);

    setData({
      name: student.name || "",
      email: student.email || "",
      password: "",
      batch:
        student.batch?._id ||
        student.batch ||
        "",
    });

    setIsModalOpen(true);
  }

  // =========================
  // ADD / UPDATE STUDENT
  // =========================

  async function handleSubmit() {
    if (!data.name.trim()) {
      alert("Please enter student name");
      return;
    }

    if (!data.email.trim()) {
      alert("Please enter student email");
      return;
    }

    if (!isEditMode && !data.password.trim()) {
      alert("Please enter student password");
      return;
    }

    if (!data.batch) {
      alert("Please select a batch");
      return;
    }

    try {
      // =========================
      // UPDATE STUDENT
      // =========================

      if (isEditMode) {
        const response = await api.post(
          "/user/update-user",
          {
            userId: editingStudentId,
            name: data.name.trim(),
            email: data.email.trim(),
            password: data.password,
            batch: data.batch,
          }
        );

        if (response.data?.success) {
          alert("Student Updated Successfully");

          setStudents((prevStudents) =>
            prevStudents.map((student) =>
              student._id === editingStudentId
                ? {
                    ...student,
                    name: data.name.trim(),
                    email: data.email.trim(),
                    batch: data.batch,
                  }
                : student
            )
          );

          resetForm();
          setIsModalOpen(false);
        } else {
          alert(
            response.data?.message ||
              "Some Error Occured While Updating Student"
          );
        }

        return;
      }

      // =========================
      // ADD STUDENT
      // =========================

      const response = await api.post(
        "/user/add-user",
        data
      );

      if (response.data?.success) {
        alert("Student Added Successfully");

        if (response.data?.data) {
          setStudents((prevStudents) => [
            ...prevStudents,
            response.data.data,
          ]);
        }

        resetForm();
        setIsModalOpen(false);
      } else {
        alert(
          response.data?.message ||
            "Some Error Occured While Adding Student"
        );
      }
    } catch (error) {
      console.error(
        "Student save error:",
        error
      );

      alert("Failed to save student");
    }
  }

  // =========================
  // DELETE STUDENT
  // =========================

  async function handleDelete(studentId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this student?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api.post(
        "/user/delete-user",
        {
          userId: studentId,
        }
      );

      if (response.data?.success) {
        alert("Student Deleted Successfully");

        setStudents((prevStudents) =>
          prevStudents.filter(
            (student) =>
              student._id !== studentId
          )
        );
      } else {
        alert(
          response.data?.message ||
            "Some Error Occured While Deleting Student"
        );
      }
    } catch (error) {
      console.error(
        "Student delete error:",
        error
      );

      alert("Failed to delete student");
    }
  }

  // =========================
  // CLOSE MODAL
  // =========================

  function closeModal() {
    resetForm();
    setIsModalOpen(false);
  }

  // =========================
  // FORM SUBMIT
  // =========================

  function handleFormSubmit(e) {
    e.preventDefault();
    handleSubmit();
  }

  return (
    <section className="manage-students-section">

      {/* =========================
          HEADER
      ========================= */}

      <div className="manage-students-header">
        <div>
          <h1>Manage Students</h1>
          <p>
            View and manage all enrolled students
          </p>
        </div>

        <button
          type="button"
          className="manage-students-add-btn"
          onClick={openAddModal}
        >
          <MdAdd />
          Add Student
        </button>
      </div>

      {/* =========================
          TABLE
      ========================= */}

      <div className="manage-students-table-wrapper">
        <table className="manage-students-table">

          <thead>
            <tr>
              <th>Student Name</th>
              <th>Email</th>
              <th>Joined Batch</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {students.length > 0 ? (
              students.map((student) => (
                <tr key={student._id}>

                  {/* NAME */}

                  <td>
                    <div className="student-name-cell">
                      <span className="student-avatar">
                        {student.name
                          ?.split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </span>

                      {student.name}
                    </div>
                  </td>

                  {/* EMAIL */}

                  <td>{student.email}</td>

                  {/* BATCH */}

                  <td>
                    <span className="student-batch-badge">
                      {student.batch?.name ||
                        student.batch ||
                        "No Batch"}
                    </span>
                  </td>

                  {/* ACTIONS */}

                  <td>
                    <div className="student-action-btns">

                      <button
                        type="button"
                        className="student-edit-btn"
                        title="Edit"
                        onClick={() =>
                          handleEdit(student)
                        }
                      >
                        <MdEdit />
                      </button>

                      <button
                        type="button"
                        className="student-delete-btn"
                        title="Delete"
                        onClick={() =>
                          handleDelete(
                            student._id
                          )
                        }
                      >
                        <MdDelete />
                      </button>

                    </div>
                  </td>

                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan="4"
                  style={{
                    textAlign: "center",
                  }}
                >
                  No students found.
                </td>
              </tr>
            )}
          </tbody>

        </table>
      </div>

      {/* =========================
          ADD / EDIT MODAL
      ========================= */}

      {isModalOpen && (
        <div
          className="modal-overlay"
          onClick={closeModal}
        >
          <form
            className="modal-card"
            onClick={(e) =>
              e.stopPropagation()
            }
            onSubmit={handleFormSubmit}
          >

            {/* MODAL HEADER */}

            <div className="modal-header">
              <h2>
                {isEditMode
                  ? "Edit Student"
                  : "Add Student"}
              </h2>

              <MdClose
                className="modal-close-icon"
                onClick={closeModal}
              />
            </div>

            {/* MODAL BODY */}

            <div className="modal-body">

              {/* NAME */}

              <div className="modal-form-group">
                <label htmlFor="student-name">
                  Student Name
                </label>

                <input
                  id="student-name"
                  type="text"
                  placeholder="Enter student name"
                  value={data.name}
                  name="name"
                  onChange={handleChange}
                  autoComplete="name"
                />
              </div>

              {/* EMAIL */}

              <div className="modal-form-group">
                <label htmlFor="student-email">
                  Email
                </label>

                <input
                  id="student-email"
                  type="email"
                  placeholder="Enter student email"
                  value={data.email}
                  name="email"
                  onChange={handleChange}
                  autoComplete="email"
                />
              </div>

              {/* PASSWORD */}

              <div className="modal-form-group">
                <label htmlFor="student-password">
                  Password
                  {isEditMode &&
                    " (leave blank to keep current)"}
                </label>

                <input
                  id="student-password"
                  type="password"
                  placeholder={
                    isEditMode
                      ? "Leave blank to keep current password"
                      : "Enter student password"
                  }
                  value={data.password}
                  name="password"
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </div>

              {/* BATCH */}

              <div className="modal-form-group">
                <label htmlFor="student-batch">
                  Batch
                </label>

                <select
                  id="student-batch"
                  name="batch"
                  value={data.batch}
                  onChange={handleChange}
                >
                  <option
                    value=""
                    disabled
                  >
                    Select Batch
                  </option>

                  {batches.map((batch) => (
                    <option
                      key={batch._id}
                      value={batch._id}
                    >
                      {batch.name}
                    </option>
                  ))}
                </select>
              </div>

            </div>

            {/* MODAL FOOTER */}

            <div className="modal-footer">

              <button
                type="button"
                className="modal-cancel-btn"
                onClick={closeModal}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="modal-submit-btn"
              >
                {isEditMode
                  ? "Update Student"
                  : "Add Student"}
              </button>

            </div>

          </form>
        </div>
      )}

    </section>
  );
}

export default AdminManageStudents;