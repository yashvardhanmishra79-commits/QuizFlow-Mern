import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  MdPlayArrow,
  MdCheckCircle,
  MdLockClock,
  MdQuiz,
  MdRefresh,
} from "react-icons/md";
import "./QuizList.css";
import api from "../../api/api";

function QuizList() {
  const navigate = useNavigate();

  const [filter, setFilter] = useState("all");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ============================================
  // LOAD QUIZZES
  // ============================================
  useEffect(() => {
    const storedUserData = localStorage.getItem("userData");

    // --------------------------------------------
    // CHECK LOGIN
    // --------------------------------------------
    if (!storedUserData) {
      alert("Please login to access quizzes");
      navigate("/login");
      return;
    }

    let userData;

    // --------------------------------------------
    // PARSE USER DATA
    // --------------------------------------------
    try {
      userData = JSON.parse(storedUserData);
    } catch (err) {
      console.error("Invalid userData:", err);

      localStorage.removeItem("userData");
      navigate("/login");
      return;
    }

    console.log("=================================");
    console.log("USER DATA:", userData);
    console.log("USER BATCH:", userData.batch);
    console.log("=================================");

    // --------------------------------------------
    // CHECK BATCH
    // --------------------------------------------
    if (!userData.batch) {
      console.error("Batch is missing from userData");

      setError(
        "Your account is not assigned to a batch. Please contact the administrator."
      );

      setLoading(false);
      return;
    }

    // --------------------------------------------
    // GET BATCH ID
    //
    // Handles both:
    //
    // batch: "68xxxxxxxxxxxxxxxxxxxxxxxx"
    //
    // and:
    //
    // batch: {
    //   _id: "68xxxxxxxxxxxxxxxxxxxxxxxx"
    // }
    // --------------------------------------------
    const batchId =
      typeof userData.batch === "object"
        ? userData.batch?._id
        : userData.batch;

    console.log("BATCH ID USED FOR API:", batchId);

    // --------------------------------------------
    // VALIDATE BATCH ID
    // --------------------------------------------
    if (!batchId) {
      console.error("Invalid batch:", userData.batch);

      setError("Invalid batch assigned to your account.");
      setLoading(false);
      return;
    }

    // --------------------------------------------
    // FETCH QUIZZES
    // --------------------------------------------
    const getData = async () => {
      try {
        console.log(
          "GET:",
          `/quiz/${batchId}`
        );

        const response = await api.get(`/quiz/${batchId}`);

        console.log("QUIZ RESPONSE:", response.data);

        if (response.data?.success) {
          const quizData = response.data?.data || [];

          console.log("QUIZZES FROM DATABASE:", quizData);

          setQuizzes(quizData);
          setError("");
        } else {
          setQuizzes([]);

          setError(
            response.data?.message ||
              "Error in getting quizzes."
          );
        }
      } catch (err) {
        console.error("QUIZ API ERROR:", err);

        console.error(
          "SERVER RESPONSE:",
          err.response?.data
        );

        setQuizzes([]);

        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Unable to load quizzes from the server."
        );
      } finally {
        setLoading(false);
      }
    };

    getData();
  }, [navigate]);

  // ============================================
  // START QUIZ
  // ============================================
  const handleStartQuiz = (quizId) => {
    console.log("=================================");
    console.log("START QUIZ ID:", quizId);
    console.log("=================================");

    // No ID
    if (!quizId) {
      console.error("Quiz does not have an _id");

      alert("This quiz has an invalid ID.");
      return;
    }

    // MongoDB ObjectId validation
    const isValidObjectId =
      /^[a-fA-F0-9]{24}$/.test(String(quizId));

    if (!isValidObjectId) {
      console.error(
        "INVALID MONGODB QUIZ ID:",
        quizId
      );

      alert(
        "This quiz has an invalid database ID. Please contact the administrator."
      );

      return;
    }

    // --------------------------------------------
    // IMPORTANT:
    // Only use MongoDB _id
    // --------------------------------------------
    navigate(`/quiz/${quizId}/solve`);
  };

  // ============================================
  // FILTER
  // ============================================
  const filtered = quizzes.filter((quiz) => {
    if (filter === "all") {
      return true;
    }

    if (filter === "attempted") {
      return quiz.attempted === true;
    }

    if (filter === "not-attempted") {
      return quiz.attempted !== true;
    }

    return true;
  });

  // ============================================
  // LOADING
  // ============================================
  if (loading) {
    return (
      <div className="quiz-list-page">
        <div className="loading-state">
          Loading quizzes...
        </div>
      </div>
    );
  }

  // ============================================
  // PAGE
  // ============================================
  return (
    <div className="quiz-list-page">

      {/* ========================================
          HEADER
      ======================================== */}
      <div className="page-header">

        <div className="header-content">
          <h1>
            Available Quizzes
          </h1>

          <p>
            Select a quiz to start solving
          </p>
        </div>

        {/* ======================================
            FILTER BUTTONS
        ====================================== */}
        <div className="filter-tabs">

          <button
            className={
              filter === "all"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("all")
            }
          >
            All
          </button>

          <button
            className={
              filter === "attempted"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("attempted")
            }
          >
            Attempted
          </button>

          <button
            className={
              filter === "not-attempted"
                ? "active"
                : ""
            }
            onClick={() =>
              setFilter("not-attempted")
            }
          >
            Not Attempted
          </button>

        </div>
      </div>

      {/* ========================================
          ERROR
      ======================================== */}
      {error && (
        <div className="empty-state">

          <MdQuiz className="empty-icon" />

          <h3>
            Unable to load quizzes
          </h3>

          <p>
            {error}
          </p>

        </div>
      )}

      {/* ========================================
          QUIZ GRID
      ======================================== */}
      {!error && (
        <div className="quiz-grid">

          {filtered.map((quiz) => (

            <div
              key={quiz._id}
              className="quiz-card"
            >

              {/* ==================================
                  CARD HEADER
              ================================== */}
              <div className="quiz-card-header">

                <div className="quiz-icon">
                  <MdQuiz />
                </div>

                <div className="quiz-meta">

                  <span className="quiz-subject">
                    {quiz.subject ||
                      "General"}
                  </span>

                  <span className="quiz-details">
                    {quiz.totalQuestions ??
                      0}{" "}
                    Questions •{" "}
                    {quiz.totalMarks ??
                      0}{" "}
                    Marks •{" "}
                    {quiz.timeLimit ??
                      0}{" "}
                    min
                  </span>

                </div>

              </div>

              {/* ==================================
                  TITLE
              ================================== */}
              <h3 className="quiz-title">
                {quiz.title ||
                  "Untitled Quiz"}
              </h3>

              {/* ==================================
                  STATUS
              ================================== */}
              <div className="quiz-status-row">

                <div className="status-badge">

                  {quiz.attempted ? (
                    <>
                      <MdCheckCircle
                        className="status-icon success"
                      />

                      <span>
                        Attempted
                      </span>
                    </>
                  ) : (
                    <>
                      <MdLockClock
                        className="status-icon pending"
                      />

                      <span>
                        Not Attempted
                      </span>
                    </>
                  )}

                </div>

                {/* ================================
                    MARKS
                ================================= */}
                <div className="marks-display">

                  {quiz.attempted ? (
                    <>
                      <span className="marks-obtained">
                        {quiz.marksObtained ??
                          0}
                      </span>

                      <span className="marks-separator">
                        /
                      </span>

                      <span className="marks-total">
                        {quiz.totalMarks ??
                          0}
                      </span>
                    </>
                  ) : (
                    <span className="na-text">
                      N/A
                    </span>
                  )}

                </div>

              </div>

              {/* ==================================
                  START QUIZ
              ================================== */}
              <button
                className={`start-quiz-btn ${
                  quiz.attempted
                    ? "reattempt"
                    : ""
                }`}
                onClick={() =>
                  handleStartQuiz(
                    quiz._id
                  )
                }
              >

                {quiz.attempted ? (
                  <MdRefresh />
                ) : (
                  <MdPlayArrow />
                )}

                <span>
                  {quiz.attempted
                    ? "Re-attempt"
                    : "Start Quiz"}
                </span>

              </button>

            </div>

          ))}

        </div>
      )}

      {/* ========================================
          NO QUIZZES
      ======================================== */}
      {!error &&
        filtered.length === 0 && (
          <div className="empty-state">

            <MdQuiz className="empty-icon" />

            <h3>
              No quizzes found
            </h3>

            <p>
              No quizzes have been assigned
              to your batch yet.
            </p>

          </div>
        )}

    </div>
  );
}

export default QuizList;
