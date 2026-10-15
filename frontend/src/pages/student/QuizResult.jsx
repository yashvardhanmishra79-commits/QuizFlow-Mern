import { useState, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  MdCheckCircle,
  MdClose,
  MdInfo,
  MdArrowBack,
  MdDownload,
  MdRefresh,
} from "react-icons/md";
import "./QuizResult.css";
import api from "../../api/api";

function QuizResult() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const attemptId = searchParams.get("attemptId");

  const [activeTab, setActiveTab] = useState("summary");
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadAttempt() {
      if (!attemptId) {
        setLoadError("No saved quiz attempt was specified.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setLoadError("");
      try {
        const response = await api.get(`/attempts/${attemptId}`, {
          signal: controller.signal,
        });
        const savedAttempt = response.data?.data;
        const savedQuizId = String(savedAttempt?.quiz?._id || savedAttempt?.quiz);

        if (
          response.data?.success !== true ||
          !savedAttempt ||
          savedQuizId !== String(params.quizId)
        ) {
          throw new Error(
            response.data?.message || "The saved result could not be found."
          );
        }

        if (!controller.signal.aborted) {
          setAttempt(savedAttempt);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Unable to load saved quiz result:", error);
          setLoadError(
            error.response?.data?.message ||
              error.message ||
              "Unable to load the saved quiz result."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadAttempt();
    return () => controller.abort();
  }, [attemptId, params.quizId]);

  const quiz = attempt
    ? { ...attempt.quizSnapshot, _id: attempt.quiz }
    : null;
  const answers = attempt
    ? attempt.answers.reduce((normalized, answer, index) => {
        if (answer !== null && answer !== undefined) {
          normalized[index] = answer;
        }
        return normalized;
      }, {})
    : {};
  const targetQuizId = attempt?.quiz?._id || attempt?.quiz;
  const totalQuestions = quiz?.questions?.length || 0;
  const answeredCount = totalQuestions - (attempt?.unansweredCount || 0);
  const correctCount = attempt?.correctCount || 0;
  const wrongCount = attempt?.incorrectCount || 0;
  const unattemptedCount = attempt?.unansweredCount || 0;
  const totalMarks = attempt?.totalMarks || 0;
  const obtainedMarks = attempt?.obtainedMarks || 0;
  const percentage = attempt?.percentage || 0;

  const handleReattempt = () => {
    if (!targetQuizId || targetQuizId === "undefined") {
      console.error("Cannot re-attempt: Quiz ID is missing or invalid.");
      return;
    }
    navigate(`/quiz/${targetQuizId}/solve`);
  };

  const toggleExpand = (questionId) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const getStatus = (question, index) => {
    const userAnswer = answers[index];
    if (userAnswer === undefined || userAnswer === null) return "unattempted";
    const targetCorrectOption = question.correctAnswer !== undefined ? question.correctAnswer : question.correctOption;
    return userAnswer === targetCorrectOption ? "correct" : "incorrect";
  };

  const handleDownloadReport = () => {
    if (!attempt || !quiz) {
      window.alert("The saved quiz result is not available to download.");
      return;
    }

    const escapeHtml = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return entities[character];
      });
    const studentName = attempt.student?.name || "Student";
    const submittedAt = attempt.submittedAt
      ? new Date(attempt.submittedAt).toLocaleString()
      : "Unavailable";
    const questionRows = quiz.questions
      .map((question, index) => {
        const answerIndex = attempt.answers[index];
        const selectedAnswer =
          answerIndex === null || answerIndex === undefined
            ? "Unanswered"
            : `${String.fromCharCode(65 + answerIndex)}. ${
                question.options?.[answerIndex] || ""
              }`;
        const correctAnswer =
          question.options?.[question.correctOption] || "Unavailable";

        return `<section><h2>Question ${index + 1}</h2><p>${escapeHtml(
          question.title
        )}</p><p><strong>Your answer:</strong> ${escapeHtml(
          selectedAnswer
        )}</p><p><strong>Correct answer:</strong> ${escapeHtml(
          correctAnswer
        )}</p><p><strong>Explanation:</strong> ${escapeHtml(
          question.explanation || "No explanation available."
        )}</p></section>`;
      })
      .join("");
    const title = escapeHtml(quiz.title || "Quiz Result");
    const report = `<!doctype html><html><head><meta charset="utf-8"><title>${title} - QuizFlow Report</title><style>body{font:16px Arial,sans-serif;max-width:850px;margin:32px auto;padding:0 20px;color:#222}h1{margin-bottom:8px}section{border-top:1px solid #ccc;padding:16px 0;break-inside:avoid}@media print{body{margin:0 auto}}</style></head><body><h1>${title}</h1><p><strong>Student:</strong> ${escapeHtml(
      studentName
    )}</p><p><strong>Submitted:</strong> ${escapeHtml(
      submittedAt
    )}</p><p><strong>Score:</strong> ${escapeHtml(
      obtainedMarks
    )} / ${escapeHtml(totalMarks)} (${escapeHtml(percentage)}%)</p><p><strong>Correct:</strong> ${escapeHtml(
      correctCount
    )} &nbsp; <strong>Incorrect:</strong> ${escapeHtml(
      wrongCount
    )} &nbsp; <strong>Unanswered:</strong> ${escapeHtml(
      unattemptedCount
    )}</p>${questionRows}</body></html>`;

    try {
      const reportUrl = URL.createObjectURL(
        new Blob([report], { type: "text/html" })
      );
      const downloadLink = document.createElement("a");
      const filename = (quiz.title || "quiz-result")
        .replace(/[^a-z0-9-_]+/gi, "-")
        .replace(/^-|-$/g, "");
      downloadLink.href = reportUrl;
      downloadLink.download = `${filename || "quiz-result"}-report.html`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.setTimeout(() => URL.revokeObjectURL(reportUrl), 1000);
    } catch (error) {
      console.error("Unable to generate quiz report:", error);
      window.alert("Unable to generate the quiz report. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="quiz-result-page">
        <main className="result-content">Loading saved quiz result...</main>
      </div>
    );
  }

  if (!attempt || !quiz) {
    return (
      <div className="quiz-result-page">
        <main className="result-content">
          <div className="result-main">
            <h2>Result unavailable</h2>
            <p>{loadError || "The saved quiz result could not be found."}</p>
            <button
              className="action-btn outline"
              onClick={() => navigate("/quizzes")}
            >
              Back to Quizzes
            </button>
          </div>
        </main>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case "correct":
        return <MdCheckCircle className="status-icon correct" />;
      case "incorrect":
        return <MdClose className="status-icon incorrect" />;
      default:
        return <MdInfo className="status-icon unattempted" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "correct":
        return "Correct";
      case "incorrect":
        return "Incorrect";
      default:
        return "Unattempted";
    }
  };

  return (
    <div className="quiz-result-page">
      <header className="result-header">
        <button className="back-btn" onClick={() => navigate("/quizzes")}>
          <MdArrowBack />
        </button>
        <div className="result-title">
          <h1>{quiz.title}</h1>
          <span className="subject-tag">{quiz.subject}</span>
        </div>
        <div className="header-actions">
          <button
            className="action-btn outline"
            onClick={handleReattempt}
          >
            <MdRefresh />
            <span>Re-attempt</span>
          </button>
          <button
            className="action-btn primary"
            onClick={handleDownloadReport}
            disabled={!attempt}
          >
            <MdDownload />
            <span>Download Report</span>
          </button>
        </div>
      </header>

      <div className="result-content">
        <aside className="result-sidebar">
          <div className="score-card">
            <div
              className="score-circle"
              style={{ "--score": Math.max(0, Math.min(percentage, 100)) }}
            >
              <span className="score-value">{percentage}%</span>
              <span className="score-label">Score</span>
            </div>
            <div className="score-breakdown">
              <div className="breakdown-item">
                <span className="breakdown-value">{obtainedMarks}</span>
                <span className="breakdown-label">Marks Obtained</span>
              </div>
              <div className="breakdown-divider">/</div>
              <div className="breakdown-item">
                <span className="breakdown-value">{totalMarks}</span>
                <span className="breakdown-label">Total Marks</span>
              </div>
            </div>
            <div className="score-status">
              {percentage >= 70 ? (
                <span className="status-badge success">Excellent!</span>
              ) : percentage >= 50 ? (
                <span className="status-badge good">Good Job</span>
              ) : percentage >= 35 ? (
                <span className="status-badge average">Keep Practicing</span>
              ) : (
                <span className="status-badge poor">Needs Improvement</span>
              )}
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card correct">
              <MdCheckCircle className="stat-icon" />
              <div className="stat-info">
                <span className="stat-value">{correctCount}</span>
                <span className="stat-label">Correct</span>
              </div>
            </div>
            <div className="stat-card incorrect">
              <MdClose className="stat-icon" />
              <div className="stat-info">
                <span className="stat-value">{wrongCount}</span>
                <span className="stat-label">Incorrect</span>
              </div>
            </div>
            <div className="stat-card unattempted">
              <MdInfo className="stat-icon" />
              <div className="stat-info">
                <span className="stat-value">{unattemptedCount}</span>
                <span className="stat-label">Unattempted</span>
              </div>
            </div>
          </div>

          <div className="legend">
            <h4>Legend</h4>
            <div className="legend-items">
              <div className="legend-item correct">
                <MdCheckCircle />
                <span>Correct Answer</span>
              </div>
              <div className="legend-item incorrect">
                <MdClose />
                <span>Your Wrong Answer</span>
              </div>
              <div className="legend-item unattempted">
                <MdInfo />
                <span>Unattempted</span>
              </div>
            </div>
          </div>
        </aside>

        <main className="result-main">
          <div className="tabs">
            <button
              className={activeTab === "summary" ? "active" : ""}
              onClick={() => setActiveTab("summary")}
            >
              Summary
            </button>
            <button
              className={activeTab === "review" ? "active" : ""}
              onClick={() => setActiveTab("review")}
            >
              Review Answers
            </button>
          </div>

          {activeTab === "summary" && (
            <div className="summary-tab">
              <div className="summary-grid">
                <div className="summary-card">
                  <h3>Performance Overview</h3>
                  <div className="overview-stats">
                    <div className="overview-item">
                      <span className="overview-value">
                        {answeredCount}/{totalQuestions}
                      </span>
                      <span className="overview-label">Attempted</span>
                    </div>
                    <div className="overview-item">
                      <span className="overview-value">
                        {correctCount}/{answeredCount}
                      </span>
                      <span className="overview-label">Accuracy</span>
                    </div>
                    <div className="overview-item">
                      <span className="overview-value">
                        {answeredCount > 0
                          ? Math.round((correctCount / answeredCount) * 100)
                          : 0}
                        %
                      </span>
                      <span className="overview-label">Precision</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="question-list-summary">
                <h3>Question-wise Result</h3>
                <div className="summary-questions">
                  {quiz.questions?.map((question, index) => {
                    const status = getStatus(question, index);
                    return (
                      <div
                        key={question._id || question.id || index}
                        className={`summary-question ${status}`}
                      >
                        <div className="sq-header">
                          <span className="sq-number">Q {index + 1}</span>
                          <span className={`sq-status ${status}`}>
                            {getStatusIcon(status)}
                            {getStatusLabel(status)}
                          </span>
                        </div>
                        <p className="sq-text">{question.question || question.title}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === "review" && (
            <div className="review-tab">
              {quiz.questions?.map((question, index) => {
                const userAnswer = answers[index];
                const status = getStatus(question, index);
                const qId = question._id || question.id || index;
                const isExpanded = expandedQuestions.has(qId);
                const targetCorrectOption = question.correctAnswer !== undefined ? question.correctAnswer : question.correctOption;

                return (
                  <div
                    key={qId}
                    className={`review-question ${status}`}
                  >
                    <div
                      className="rq-header"
                      onClick={() => toggleExpand(qId)}
                    >
                      <div className="rq-left">
                        <span className="rq-number">Q{index + 1}</span>
                        <span className={`rq-status ${status}`}>
                          {getStatusIcon(status)}
                          {getStatusLabel(status)}
                        </span>
                      </div>
                      <MdCheckCircle className="expand-icon" />
                    </div>

                    <div
                      className={`rq-content ${isExpanded ? "expanded" : ""}`}
                    >
                      <div className="rq-question">
                        <h4>Question</h4>
                        <p>{question.question || question.title}</p>
                      </div>

                      <div className="rq-options">
                        <h4>Options</h4>
                        <div className="options-list">
                          {question.options?.map((option, optIndex) => {
                            const isUserAnswer = userAnswer === optIndex;
                            const isCorrectAnswer = targetCorrectOption === optIndex;
                            let optionClass = "";
                            if (isUserAnswer) {
                              optionClass = isCorrectAnswer
                                ? "user-correct"
                                : "user-wrong";
                            } else if (isCorrectAnswer) {
                              optionClass = "correct-answer";
                            }

                            return (
                              <div
                                key={optIndex}
                                className={`option-item ${optionClass}`}
                              >
                                <span className="option-letter">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span className="option-text">{option}</span>
                                {isCorrectAnswer && (
                                  <MdCheckCircle className="correct-badge" />
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <MdClose className="wrong-badge" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rq-explanation">
                        <h4>
                          <MdInfo />
                          Explanation
                        </h4>
                        <p>{question.explanation || "No explanation available."}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default QuizResult;