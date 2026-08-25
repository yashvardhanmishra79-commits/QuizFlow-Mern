import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MdArrowBack,
  MdArrowForward,
  MdCheck,
  MdFlag,
} from "react-icons/md";
import "./QuizSolve.css";
import api from "../../api/api";

function QuizSolve() {
  // Extract parameter safely (matches :quizId or fallback to :id)
  const params = useParams();
  const quizId = params.quizId || params.id;
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState({
    title: "",
    subject: "",
    questions: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  useEffect(() => {
    async function getData() {
      // Prevent network call if quizId is undefined or literal "undefined"
      if (!quizId || quizId === "undefined") {
        setError("Invalid Quiz ID. Please return to the quiz list.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.get(`/quiz/single/${quizId}`);
        if (response.data?.success && response.data?.data) {
          setQuiz(response.data.data);
          setError(null);
        } else {
          setError("Failed to load quiz data.");
        }
      } catch (err) {
        console.error("API error fetching quiz:", err);
        setError("Error connecting to server to fetch quiz.");
      } finally {
        setLoading(false);
      }
    }

    getData();
  }, [quizId]);

  const questionsList = quiz?.questions || [];
  const questionsCount = questionsList.length;
  const question = questionsList[currentQuestion];

  const handleAnswerSelect = (optionIndex) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion]: optionIndex }));
  };

  const handleFlag = () => {
    setFlagged((prev) => ({
      ...prev,
      [currentQuestion]: !flagged[currentQuestion],
    }));
  };

  const handleNext = () => {
    if (currentQuestion < questionsCount - 1) {
      setCurrentQuestion((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion((prev) => prev - 1);
    }
  };

  // Fixed handleSubmit (Line 189 fix)
  const handleSubmit = () => {
    const validId = quiz?._id || quiz?.id || quizId;

    if (!validId || validId === "undefined") {
      console.error("Cannot submit: Invalid Quiz ID");
      return;
    }

    navigate(`/quiz/${validId}/result`, { state: { answers, quiz } });
  };

  if (loading) {
    return <div className="quiz-solve-page">Loading quiz...</div>;
  }

  if (error) {
    return (
      <div className="quiz-solve-page">
        <div className="error-container">
          <h2>{error}</h2>
          <button className="back-btn" onClick={() => navigate("/quizzes")}>
            Back to Quizzes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-solve-page">
      <header className="solve-header">
        <button className="back-btn" onClick={() => navigate("/quizzes")}>
          <MdArrowBack />
        </button>
        <div className="quiz-info">
          <h2>{quiz?.title || "Quiz"}</h2>
          <span className="subject-tag">{quiz?.subject || "General"}</span>
        </div>
      </header>

      <div className="solve-content">
        <div className="question-panel">
          <div className="question-header">
            <div className="question-nav">
              <button
                className="nav-btn"
                onClick={handlePrev}
                disabled={currentQuestion === 0}
              >
                <MdArrowBack />
                <span>Previous</span>
              </button>
              <span className="question-counter">
                Question {questionsCount > 0 ? currentQuestion + 1 : 0} of{" "}
                {questionsCount}
              </span>
              <button
                className="nav-btn"
                onClick={handleNext}
                disabled={
                  questionsCount === 0 || currentQuestion === questionsCount - 1
                }
              >
                <span>Next</span>
                <MdArrowForward />
              </button>
            </div>
            <button
              className="flag-btn"
              onClick={handleFlag}
              aria-label="Flag question"
            >
              <MdFlag className={flagged[currentQuestion] ? "flagged" : ""} />
              <span>{flagged[currentQuestion] ? "Flagged" : "Flag"}</span>
            </button>
          </div>

          <div className="question-content">
            <div className="question-text">
              <span className="q-number">Q{currentQuestion + 1}.</span>
              <p>{question?.question || question?.title || "No question text"}</p>
            </div>

            <div className="options-grid">
              {question?.options?.map((option, index) => (
                <button
                  key={index}
                  className={`option-btn ${
                    answers[currentQuestion] === index ? "selected" : ""
                  }`}
                  onClick={() => handleAnswerSelect(index)}
                >
                  <span className="option-label">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="option-text">{option}</span>
                  {answers[currentQuestion] === index && (
                    <MdCheck className="check-icon" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="question-footer">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{
                  width: `${
                    questionsCount > 0
                      ? ((currentQuestion + 1) / questionsCount) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="progress-text">
              {Object.keys(answers).length} / {questionsCount} questions answered
            </div>
          </div>
        </div>

        <aside className="question-palette">
          <h3>Question Palette</h3>
          <div className="palette-grid">
            {questionsList.map((q, index) => (
              <button
                key={q._id || q.id || index}
                className={`palette-item ${
                  index === currentQuestion ? "current" : ""
                } ${answers[index] !== undefined ? "answered" : ""} ${
                  flagged[index] ? "flagged" : ""
                }`}
                onClick={() => setCurrentQuestion(index)}
              >
                <span className="palette-number">{index + 1}</span>
                {flagged[index] && <MdFlag className="palette-flag" />}
              </button>
            ))}
          </div>
          <button
            className="submit-quiz-btn"
            onClick={() => setShowSubmitConfirm(true)}
          >
            <MdCheck />
            Submit Quiz
          </button>
        </aside>
      </div>

      {showSubmitConfirm && (
        <div
          className="modal-overlay"
          onClick={() => setShowSubmitConfirm(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Submit Quiz?</h3>
            <p>Are you sure you want to submit?</p>
            <div className="modal-actions">
              <button
                className="cancel-btn"
                onClick={() => setShowSubmitConfirm(false)}
              >
                Cancel
              </button>
              <button className="confirm-btn" onClick={handleSubmit}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuizSolve;