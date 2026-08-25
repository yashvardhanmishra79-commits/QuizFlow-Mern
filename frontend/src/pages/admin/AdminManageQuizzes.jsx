import { Link } from "react-router-dom";
import {
  MdAdd,
  MdDelete,
  MdOutlineQuiz,
} from "react-icons/md";
import { useEffect, useState } from "react";

import api from "../../api/api";
import "./AdminManageQuizzes.css";

function AdminManageQuizzes() {
  const [quizzes, setQuizzes] = useState([]);

  // =========================
  // GET ALL QUIZZES
  // =========================

  useEffect(() => {
    async function getData() {
      try {
        const response = await api.get("/quiz/get-all");

        if (response.data?.success) {
          setQuizzes(response.data?.data || []);
        } else {
          alert(
            response.data?.message ||
              "Some Error Occured"
          );
        }
      } catch (error) {
        console.error("Error fetching quizzes:", error);
        alert("Failed to fetch quizzes");
      }
    }

    getData();
  }, []);

  // =========================
  // DELETE QUIZ
  // =========================

  async function handleDelete(quizId) {
    const confirmDelete = window.confirm(
      "Are you sure you want to delete this quiz?"
    );

    if (!confirmDelete) {
      return;
    }

    try {
      const response = await api.post(
        "/quiz/delete-quiz",
        {
          quizId: quizId,
        }
      );

      if (response.data?.success) {
        alert("Quiz Deleted Successfully");

        // Remove quiz from UI immediately
        setQuizzes((prevQuizzes) =>
          prevQuizzes.filter(
            (quiz) => quiz._id !== quizId
          )
        );
      } else {
        alert(
          response.data?.message ||
            "Some Error Occured While Deleting Quiz"
        );
      }
    } catch (error) {
      console.error("Quiz delete error:", error);
      alert("Failed to delete quiz");
    }
  }

  return (
    <section className="manage-quizzes-section">

      {/* =========================
          HEADER
      ========================= */}

      <div className="manage-quizzes-header">
        <div>
          <h1>Manage Quizzes</h1>
          <p>View all created quizzes</p>
        </div>

        <Link
          to="/admin/create-quiz"
          className="manage-quizzes-add-btn"
        >
          <MdAdd />
          Add Quiz
        </Link>
      </div>

      {/* =========================
          QUIZZES LIST
      ========================= */}

      <div className="manage-quizzes-list">
        {quizzes.length > 0 ? (
          quizzes.map((quiz) => (
            <div
              className="quiz-list-card"
              key={quiz._id}
            >
              <div className="quiz-list-icon">
                <MdOutlineQuiz />
              </div>

              <span className="quiz-list-name">
                {quiz.title}
              </span>

              <button
                className="quiz-list-delete-btn"
                title="Delete"
                onClick={() =>
                  handleDelete(quiz._id)
                }
              >
                <MdDelete />
              </button>
            </div>
          ))
        ) : (
          <div className="no-quizzes">
            <p>No quizzes found.</p>
          </div>
        )}
      </div>

    </section>
  );
}

export default AdminManageQuizzes;