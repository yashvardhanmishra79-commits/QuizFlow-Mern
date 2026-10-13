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
  const [attemptsError, setAttemptsError] = useState("");

  // ============================================
  // LOAD QUIZZES
  // ============================================
  useEffect(() => {
    const controller = new AbortController();

    const storedUserData = localStorage.getItem("userData");

    // CHECK LOGIN
    if (!storedUserData) {
      alert("Please login to access quizzes");
      navigate("/login");
      return () => controller.abort();
    }

    let userData;

    // PARSE USER DATA
    try {
      userData = JSON.parse(storedUserData);
    } catch (err) {
      console.error("Invalid userData:", err);

      localStorage.removeItem("userData");
      navigate("/login");
      return () => controller.abort();
    }

    if (!localStorage.getItem("authToken")) {
      setError("Your session has expired. Please sign in again.");
      setLoading(false);
      navigate("/login");
      return () => controller.abort();
    }

    // CHECK BATCH
    if (!userData.batch) {
      console.error("Batch is missing from userData");

      setError(
        "Your account is not assigned to a batch. Please contact the administrator."
      );

      setLoading(false);
      return () => controller.abort();
    }

    // GET BATCH ID
    const batchId =
      typeof userData.batch === "object"
        ? userData.batch?._id
        : userData.batch;

    // VALIDATE BATCH ID
    if (!batchId) {
      console.error("Invalid batch:", userData.batch);

      setError("Invalid batch assigned to your account.");
      setLoading(false);
      return () => controller.abort();
    }

    async function getData() {
      try {
        const [quizzesResult, attemptsResult] = await Promise.allSettled([
          api.get(`/quiz/${batchId}`, { signal: controller.signal }),
          api.get("/attempts/mine", { signal: controller.signal }),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        if (quizzesResult.status === "rejected") {
          throw quizzesResult.reason;
        }

        const quizzesResponse = quizzesResult.value.data;
        if (
          quizzesResponse?.success !== true ||
          !Array.isArray(quizzesResponse.data)
        ) {
          throw new Error(
            quizzesResponse?.message || "Error in getting quizzes."
          );
        }

        let latestAttempts = new Map();
        let attemptsAvailable = false;
        if (attemptsResult.status === "fulfilled") {
          const attemptsResponse = attemptsResult.value.data;
          if (
            attemptsResponse?.success === true &&
            Array.isArray(attemptsResponse.data)
          ) {
            attemptsAvailable = true;
            attemptsResponse.data.forEach((attempt) => {
              const attemptQuizId = String(attempt.quiz?._id || attempt.quiz);
              if (attemptQuizId && !latestAttempts.has(attemptQuizId)) {
                latestAttempts.set(attemptQuizId, attempt);
              }
            });
          } else {
            setAttemptsError(
              attemptsResponse?.message ||
                "Unable to load your quiz attempts."
            );
          }
        } else {
          if (!controller.signal.aborted) {
            console.error("Unable to load student attempts:", attemptsResult.reason);
          }
          setAttemptsError(
            attemptsResult.reason?.response?.data?.message ||
              "Unable to load your quiz attempts."
          );
        }

        setQuizzes(
          quizzesResponse.data.map((quiz) => {
            const attempt = latestAttempts.get(String(quiz._id));
            return {
              ...quiz,
              attempted: Boolean(attempt),
              marksObtained: attempt?.obtainedMarks,
              attemptStatusUnavailable: !attemptsAvailable,
            };
          })
        );
        setError("");
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }
        console.error("Quiz API error:", err);
        setQuizzes([]);
        setError(
          err.response?.data?.message ||
            err.message ||
            "Unable to load quizzes from the server."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    getData();

    return () => controller.abort();
  }, [navigate]);

  // ============================================
  // START QUIZ
  // ============================================
  const handleStartQuiz = (quizId) => {
    console.log("=================================");
    console.log("START QUIZ ID:", quizId);
    console.log("=================================");

    if (!quizId) {
      console.error("Quiz does not have an _id");

      alert("This quiz has an invalid ID.");
      return;
    }

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
      return !quiz.attemptStatusUnavailable && quiz.attempted === true;
    }

    if (filter === "not-attempted") {
      return !quiz.attemptStatusUnavailable && quiz.attempted !== true;
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

      {/* HEADER */}
      <div className="page-header">
        <div className="header-content">
          <h1>Available Quizzes</h1>

          <p>
            Select a quiz to start solving
          </p>
        </div>

        {/* FILTER BUTTONS */}
        <div className="filter-tabs">
          <button
            className={
              filter === "all" ? "active" : ""
            }
            onClick={() => setFilter("all")}
          >
            All
          </button>

          <button
            className={
              filter === "attempted" ? "active" : ""
            }
            onClick={() => setFilter("attempted")}
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

      {/* ERROR */}
      {error && (
        <div className="empty-state">
          <MdQuiz className="empty-icon" />

          <h3>
            Unable to load quizzes
          </h3>

          <p>{error}</p>
        </div>
      )}

      {/* QUIZ GRID */}
      {!error && !(attemptsError && filter !== "all") && (
        <div className="quiz-grid">

          {filtered.map((quiz) => {

            // ====================================
            // CALCULATE VALUES FROM ACTUAL SCHEMA
            // ====================================

            const totalQuestions =
              Array.isArray(quiz.questions)
                ? quiz.questions.length
                : 0;

            const totalMarks =
              totalQuestions *
              (Number(quiz.correctMarks) || 0);

            return (
              <div
                key={quiz._id}
                className="quiz-card"
              >

                {/* CARD HEADER */}
                <div className="quiz-card-header">

                  <div className="quiz-icon">
                    <MdQuiz />
                  </div>

                  <div className="quiz-meta">

                    <span className="quiz-subject">
                      {quiz.subject || "General"}
                    </span>

                    <span className="quiz-details">
                      {totalQuestions} Questions •{" "}
                      {totalMarks} Marks • No limit
                    </span>

                  </div>

                </div>

                {/* TITLE */}
                <h3 className="quiz-title">
                  {quiz.title || "Untitled Quiz"}
                </h3>

                {/* STATUS */}
                <div className="quiz-status-row">

                  <div className="status-badge">

                    {quiz.attemptStatusUnavailable ? (
                      <span>Attempt status unavailable</span>
                    ) : quiz.attempted ? (
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

                  {/* MARKS */}
                  <div className="marks-display">

                    {quiz.attempted && !quiz.attemptStatusUnavailable ? (
                      <>
                        <span className="marks-obtained">
                          {quiz.marksObtained ?? 0}
                        </span>

                        <span className="marks-separator">
                          /
                        </span>

                        <span className="marks-total">
                          {totalMarks}
                        </span>
                      </>
                    ) : (
                      <span className="na-text">
                        N/A
                      </span>
                    )}

                  </div>

                </div>

                {/* START QUIZ */}
                <button
                  className={`start-quiz-btn ${
                    quiz.attempted
                      ? "reattempt"
                      : ""
                  }`}
                  onClick={() =>
                    handleStartQuiz(quiz._id)
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
            );
          })}

        </div>
      )}

      {/* NO QUIZZES */}
      {!error &&
      attemptsError &&
      filter !== "all" && (
        <div className="empty-state">
          <MdQuiz className="empty-icon" />
          <h3>Unable to load quiz attempts</h3>
          <p>{attemptsError}</p>
        </div>
      )}

      {!error &&
      !attemptsError &&
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