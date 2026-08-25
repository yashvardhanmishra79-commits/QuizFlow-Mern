import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  MdCheckCircle,
  MdClose,
  MdInfo,
  MdArrowBack,
  MdDownload,
  MdRefresh,
} from "react-icons/md";
import "./QuizResult.css";

function QuizResult() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams();

  const { answers, quiz } = location.state || {};

  const [activeTab, setActiveTab] = useState("summary");
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());

  // Safe fallback to derive the correct MongoDB quiz ID
  const targetQuizId = quiz?._id || quiz?.id || params?.quizId || params?.id;

  if (!quiz || !answers) {
    navigate("/quizzes");
    return null;
  }

  const handleReattempt = () => {
    if (!targetQuizId || targetQuizId === "undefined") {
      console.error("Cannot re-attempt: Quiz ID is missing or invalid.");
      return;
    }
    navigate(`/quiz/${targetQuizId}/solve`);
  };

  const totalQuestions = quiz.questions?.length || 0;
  const answeredCount = Object.keys(answers).length;
  let correctCount = 0;
  let totalMarks = 0;
  let obtainedMarks = 0;

  quiz.questions?.forEach((q, index) => {
    const marks = quiz.correctMarks || 1;
    totalMarks += marks;
    const userAnswer = answers[index];
    const targetCorrectOption = q.correctAnswer !== undefined ? q.correctAnswer : q.correctOption;

    if (userAnswer !== undefined && userAnswer === targetCorrectOption) {
      correctCount++;
      obtainedMarks += marks;
    }
  });

  const percentage =
    totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;
  const wrongCount = answeredCount - correctCount;
  const unattemptedCount = totalQuestions - answeredCount;

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
    if (userAnswer === undefined) return "unattempted";
    const targetCorrectOption = question.correctAnswer !== undefined ? question.correctAnswer : question.correctOption;
    return userAnswer === targetCorrectOption ? "correct" : "incorrect";
  };

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
          {/* ✅ FIXED: Uses targetQuizId (quiz._id || quiz.id) */}
          <button
            className="action-btn outline"
            onClick={handleReattempt}
          >
            <MdRefresh />
            <span>Re-attempt</span>
          </button>
          <button className="action-btn primary">
            <MdDownload />
            <span>Download Report</span>
          </button>
        </div>
      </header>

      <div className="result-content">
        <aside className="result-sidebar">
          <div className="score-card">
            <div className="score-circle" style={{ "--score": percentage }}>
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
                            if (isCorrectAnswer) optionClass = "correct-answer";
                            else if (isUserAnswer && !isCorrectAnswer)
                              optionClass = "user-wrong";
                            else if (isUserAnswer && isCorrectAnswer)
                              optionClass = "user-correct";

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