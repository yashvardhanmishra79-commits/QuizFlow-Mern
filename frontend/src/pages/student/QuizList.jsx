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

const demoQuizzes = [
  {
    id: 1,
    title: "Physics - Mechanics",
    subject: "Physics",
    totalQuestions: 15,
    totalMarks: 30,
    timeLimit: 30,
    attempted: true,
    marksObtained: 24,
    status: "completed",
  },
  {
    id: 2,
    title: "Chemistry - Organic Chemistry",
    subject: "Chemistry",
    totalQuestions: 20,
    totalMarks: 40,
    timeLimit: 40,
    attempted: false,
    marksObtained: null,
    status: "pending",
  },
  {
    id: 3,
    title: "Mathematics - Calculus",
    subject: "Mathematics",
    totalQuestions: 10,
    totalMarks: 25,
    timeLimit: 25,
    attempted: true,
    marksObtained: 18,
    status: "completed",
  },
  {
    id: 4,
    title: "Biology - Genetics",
    subject: "Biology",
    totalQuestions: 12,
    totalMarks: 24,
    timeLimit: 30,
    attempted: false,
    marksObtained: null,
    status: "pending",
  },
  {
    id: 5,
    title: "Physics - Thermodynamics",
    subject: "Physics",
    totalQuestions: 18,
    totalMarks: 36,
    timeLimit: 45,
    attempted: true,
    marksObtained: 30,
    status: "completed",
  },
  {
    id: 6,
    title: "Chemistry - Inorganic Chemistry",
    subject: "Chemistry",
    totalQuestions: 15,
    totalMarks: 30,
    timeLimit: 35,
    attempted: false,
    marksObtained: null,
    status: "pending",
  },
];

function QuizList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userData"));
    
    if (!userData) {
      alert("Please login to access quizzes");
      navigate("/login");
      return;
    }

    async function getData() {
      try {
        const response = await api.get(`/quiz/${userData.batch}`);
        if (response.data?.success) {
          setQuizzes(response.data?.data);
        } else {
          alert("Error In Getting Quiz");
        }
      } catch (err) {
        console.error(err);
        setQuizzes(demoQuizzes);
      } finally {
        setLoading(false);
      }
    }
    getData();
  }, [navigate]);

  const handleStartQuiz = (quizId) => {
    navigate(`/quiz/${quizId}/solve`);
  };

  const filteredQuizzes = quizzes.length > 0 ? quizzes : demoQuizzes;

  const filtered = filteredQuizzes.filter((quiz) => {
    if (filter === "all") return true;
    if (filter === "attempted") return quiz.attempted;
    if (filter === "not-attempted") return !quiz.attempted;
    return true;
  });

  if (loading) {
    return (
      <div className="quiz-list-page">
        <div className="loading-state">Loading quizzes...</div>
      </div>
    );
  }

  return (
    <div className="quiz-list-page">
      <div className="page-header">
        <div className="header-content">
          <h1>Available Quizzes</h1>
          <p>Select a quiz to start solving</p>
        </div>
        <div className="filter-tabs">
          <button
            className={filter === "all" ? "active" : ""}
            onClick={() => setFilter("all")}
          >
            All
          </button>
          <button
            className={filter === "attempted" ? "active" : ""}
            onClick={() => setFilter("attempted")}
          >
            Attempted
          </button>
          <button
            className={filter === "not-attempted" ? "active" : ""}
            onClick={() => setFilter("not-attempted")}
          >
            Not Attempted
          </button>
        </div>
      </div>

      <div className="quiz-grid">
        {filtered.map((quiz) => (
          <div key={quiz._id || quiz.id} className="quiz-card">
            <div className="quiz-card-header">
              <div className="quiz-icon">
                <MdQuiz />
              </div>
              <div className="quiz-meta">
                <span className="quiz-subject">{quiz.subject}</span>
                <span className="quiz-details">
                  {quiz.totalQuestions} Questions • {quiz.totalMarks} Marks •{" "}
                  {quiz.timeLimit} min
                </span>
              </div>
            </div>

            <h3 className="quiz-title">{quiz.title}</h3>

            <div className="quiz-status-row">
              <div className="status-badge">
                {quiz.attempted ? (
                  <>
                    <MdCheckCircle className="status-icon success" />
                    <span>Attempted</span>
                  </>
                ) : (
                  <>
                    <MdLockClock className="status-icon pending" />
                    <span>Not Attempted</span>
                  </>
                )}
              </div>

              <div className="marks-display">
                {quiz.attempted ? (
                  <>
                    <span className="marks-obtained">{quiz.marksObtained}</span>
                    <span className="marks-separator">/</span>
                    <span className="marks-total">{quiz.totalMarks}</span>
                  </>
                ) : (
                  <span className="na-text">N/A</span>
                )}
              </div>
            </div>

            <button
              className={`start-quiz-btn ${quiz.attempted ? "reattempt" : ""}`}
              onClick={() => handleStartQuiz(quiz._id || quiz.id)}
            >
              {quiz.attempted ? <MdRefresh /> : <MdPlayArrow />}
              <span>{quiz.attempted ? "Re-attempt" : "Start Quiz"}</span>
            </button>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <MdQuiz className="empty-icon" />
          <h3>No quizzes found</h3>
          <p>Try changing the filter or check back later</p>
        </div>
      )}
    </div>
  );
}

export default QuizList;
