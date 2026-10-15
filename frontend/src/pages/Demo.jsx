import { useState } from "react";
import {
  MdArrowBack,
  MdArrowForward,
  MdAutoAwesome,
  MdCheckCircle,
  MdClass,
  MdGroup,
  MdOutlineQuiz,
  MdReplay,
  MdTrendingUp,
} from "react-icons/md";
import "./Demo.css";

const sampleQuestions = [
  {
    title: "Which data structure follows the First In, First Out (FIFO) principle?",
    options: ["Stack", "Queue", "Binary tree", "Hash map"],
    correctOption: 1,
  },
  {
    title: "What is the time complexity of accessing an array element by index?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctOption: 0,
  },
  {
    title: "Which HTTP method is commonly used to retrieve a resource?",
    options: ["POST", "PATCH", "GET", "DELETE"],
    correctOption: 2,
  },
  {
    title: "What does CSS primarily describe?",
    options: [
      "Database relationships",
      "The presentation of a document",
      "Server-side routing",
      "User authentication",
    ],
    correctOption: 1,
  },
  {
    title: "Which JavaScript keyword declares a block-scoped variable?",
    options: ["var", "static", "let", "define"],
    correctOption: 2,
  },
];

const sampleResults = [
  { initials: "AM", name: "Aarav Mehta", batch: "Web Development", score: "18 / 20", percentage: "90%" },
  { initials: "SK", name: "Sara Khan", batch: "Web Development", score: "16 / 20", percentage: "80%" },
  { initials: "RP", name: "Rohan Patel", batch: "Data Science", score: "15 / 20", percentage: "75%" },
];

function Demo() {
  const [activeView, setActiveView] = useState("admin");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const question = sampleQuestions[currentQuestion];
  const answeredCount = Object.keys(answers).length;
  const correctCount = sampleQuestions.reduce(
    (count, item, index) =>
      answers[index] === item.correctOption ? count + 1 : count,
    0
  );
  const incorrectCount = answeredCount - correctCount;
  const unansweredCount = sampleQuestions.length - answeredCount;
  const correctMarks = 2;
  const incorrectMarks = -0.5;
  const totalMarks = sampleQuestions.length * correctMarks;
  const obtainedMarks =
    correctCount * correctMarks + incorrectCount * incorrectMarks;
  const percentage = Math.round((obtainedMarks / totalMarks) * 100);

  const startStudentPreview = () => {
    setActiveView("student");
    setSubmitted(false);
    setAnswers({});
    setCurrentQuestion(0);
  };

  const selectAnswer = (optionIndex) => {
    setAnswers((previous) => ({ ...previous, [currentQuestion]: optionIndex }));
  };

  const restartDemo = () => {
    setAnswers({});
    setCurrentQuestion(0);
    setSubmitted(false);
  };

  return (
    <section className="demo-page">
      <div className="demo-intro">
        <div>
          <span className="demo-eyebrow">
            <MdAutoAwesome /> INTERACTIVE PRODUCT TOUR
          </span>
          <h1>See QuizFlow in action</h1>
          <p>
            Explore the admin dashboard, then try a sample student quiz. Every
            name, score, and question here is demo content.
          </p>
        </div>
        <span className="demo-sample-pill">
          <span aria-hidden="true" /> Sample data only
        </span>
      </div>

      <div className="demo-view-switch" role="tablist" aria-label="Choose demo view">
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "admin"}
          className={activeView === "admin" ? "active" : ""}
          onClick={() => setActiveView("admin")}
        >
          <MdTrendingUp /> Admin workspace
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeView === "student"}
          className={activeView === "student" ? "active" : ""}
          onClick={() => setActiveView("student")}
        >
          <MdOutlineQuiz /> Student experience
        </button>
      </div>

      {activeView === "admin" ? (
        <div className="demo-admin-view">
          <div className="demo-panel-heading">
            <div>
              <span className="demo-kicker">ADMIN OVERVIEW</span>
              <h2>Good morning, Admin</h2>
              <p>A quick look at your coaching workspace.</p>
            </div>
            <button
              type="button"
              className="demo-primary-button"
              onClick={startStudentPreview}
            >
              Preview student quiz <MdArrowForward />
            </button>
          </div>

          <div className="demo-stats-grid">
            <article className="demo-stat-card">
              <span className="demo-stat-icon blue"><MdGroup /></span>
              <div><strong>248</strong><span>Students enrolled</span><small>Across 8 active batches</small></div>
            </article>
            <article className="demo-stat-card">
              <span className="demo-stat-icon green"><MdOutlineQuiz /></span>
              <div><strong>36</strong><span>Quizzes created</span><small>12 completed this week</small></div>
            </article>
            <article className="demo-stat-card">
              <span className="demo-stat-icon purple"><MdClass /></span>
              <div><strong>8</strong><span>Active batches</span><small>Learning in progress</small></div>
            </article>
            <article className="demo-stat-card">
              <span className="demo-stat-icon orange"><MdTrendingUp /></span>
              <div><strong>78.4%</strong><span>Average score</span><small>Across sample results</small></div>
            </article>
          </div>

          <div className="demo-admin-lower">
            <article className="demo-card demo-activity-card">
              <div className="demo-card-heading">
                <div><span className="demo-kicker">RECENT ACTIVITY</span><h3>Latest quiz results</h3></div>
                <span className="demo-live-label">Sample</span>
              </div>
              <div className="demo-results-list">
                {sampleResults.map((result) => (
                  <div className="demo-result-row" key={result.initials}>
                    <span className="demo-avatar">{result.initials}</span>
                    <div className="demo-result-person"><strong>{result.name}</strong><span>{result.batch}</span></div>
                    <div className="demo-result-score"><strong>{result.score}</strong><span>{result.percentage}</span></div>
                  </div>
                ))}
              </div>
            </article>
            <article className="demo-card demo-quiz-card">
              <div className="demo-card-heading">
                <div><span className="demo-kicker">UP NEXT</span><h3>Featured quiz</h3></div>
                <span className="demo-quiz-icon"><MdOutlineQuiz /></span>
              </div>
              <h4>JavaScript Essentials</h4>
              <p>Test core concepts with a short, focused assessment.</p>
              <div className="demo-quiz-meta"><span>5 questions</span><span>10 total marks</span><span>Negative marking</span></div>
              <button type="button" className="demo-secondary-button" onClick={startStudentPreview}>
                Try student preview <MdArrowForward />
              </button>
            </article>
          </div>
          <p className="demo-data-note">All dashboard figures and student names are fictional sample data.</p>
        </div>
      ) : (
        <div className="demo-student-view">
          <div className="demo-quiz-topline">
            <div>
              <span className="demo-kicker">SAMPLE ASSESSMENT · WEB DEVELOPMENT</span>
              <h2>JavaScript Essentials</h2>
            </div>
            {!submitted && (
              <div className="demo-marking-note">
                <span>Correct <strong>+{correctMarks}</strong></span>
                <span>Incorrect <strong>{incorrectMarks}</strong></span>
              </div>
            )}
          </div>

          {submitted ? (
            <div className="demo-result-screen">
              <span className="demo-result-check"><MdCheckCircle /></span>
              <span className="demo-kicker">SAMPLE QUIZ COMPLETE</span>
              <h2>Your score: {obtainedMarks} / {totalMarks}</h2>
              <p className="demo-result-percentage">{percentage}%</p>
              <div className="demo-result-breakdown">
                <div><strong>{correctCount}</strong><span>Correct</span></div>
                <div><strong>{incorrectCount}</strong><span>Incorrect</span></div>
                <div><strong>{unansweredCount}</strong><span>Unanswered</span></div>
              </div>
              <p className="demo-grading-hint">
                Correct answers earn +{correctMarks}; incorrect answers receive {incorrectMarks};
                unanswered questions receive no penalty.
              </p>
              <div className="demo-result-actions">
                <button type="button" className="demo-secondary-button" onClick={restartDemo}>
                  <MdReplay /> Try again
                </button>
                <button type="button" className="demo-primary-button" onClick={() => setActiveView("admin")}>
                  Back to admin view
                </button>
              </div>
            </div>
          ) : (
            <div className="demo-quiz-layout">
              <article className="demo-card demo-question-card">
                <div className="demo-question-header">
                  <span>Question {currentQuestion + 1} of {sampleQuestions.length}</span>
                  <span className="demo-question-answered">{answeredCount} answered</span>
                </div>
                <div className="demo-progress-track" aria-label={`${Math.round(((currentQuestion + 1) / sampleQuestions.length) * 100)}% through quiz`}>
                  <span style={{ width: `${((currentQuestion + 1) / sampleQuestions.length) * 100}%` }} />
                </div>
                <div className="demo-question-content">
                  <span className="demo-question-number">QUESTION {String(currentQuestion + 1).padStart(2, "0")}</span>
                  <h3>{question.title}</h3>
                  <div className="demo-options">
                    {question.options.map((option, index) => (
                      <button
                        type="button"
                        key={option}
                        className={`demo-option ${answers[currentQuestion] === index ? "selected" : ""}`}
                        aria-pressed={answers[currentQuestion] === index}
                        onClick={() => selectAnswer(index)}
                      >
                        <span className="demo-option-letter">{String.fromCharCode(65 + index)}</span>
                        <span>{option}</span>
                        {answers[currentQuestion] === index && <MdCheckCircle />}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="demo-question-controls">
                  <button
                    type="button"
                    className="demo-secondary-button"
                    disabled={currentQuestion === 0}
                    onClick={() => setCurrentQuestion((index) => Math.max(0, index - 1))}
                  >
                    <MdArrowBack /> Previous
                  </button>
                  {currentQuestion < sampleQuestions.length - 1 ? (
                    <button
                      type="button"
                      className="demo-primary-button"
                      onClick={() => setCurrentQuestion((index) => Math.min(sampleQuestions.length - 1, index + 1))}
                    >
                      Next question <MdArrowForward />
                    </button>
                  ) : (
                    <button type="button" className="demo-primary-button" onClick={() => setSubmitted(true)}>
                      Submit sample quiz
                    </button>
                  )}
                </div>
              </article>
              <aside className="demo-card demo-question-nav">
                <span className="demo-kicker">YOUR PROGRESS</span>
                <h3>Question map</h3>
                <p>Choose any question to review or change your answer.</p>
                <div className="demo-question-map">
                  {sampleQuestions.map((item, index) => (
                    <button
                      type="button"
                      key={item.title}
                      className={`${currentQuestion === index ? "current" : ""} ${answers[index] !== undefined ? "answered" : ""}`}
                      aria-label={`Go to question ${index + 1}${answers[index] !== undefined ? ", answered" : ", unanswered"}`}
                      aria-current={currentQuestion === index ? "step" : undefined}
                      onClick={() => setCurrentQuestion(index)}
                    >
                      {index + 1}
                    </button>
                  ))}
                </div>
                <div className="demo-nav-legend">
                  <span><i className="answered" /> Answered ({answeredCount})</span>
                  <span><i /> Not answered ({sampleQuestions.length - answeredCount})</span>
                </div>
                <button type="button" className="demo-submit-link" onClick={() => setSubmitted(true)}>
                  Submit quiz <MdArrowForward />
                </button>
                <p className="demo-unanswered-note">You can submit with unanswered questions. They receive zero marks.</p>
              </aside>
            </div>
          )}
          <p className="demo-data-note">Demo only — answers stay in this page and are never sent to a server.</p>
        </div>
      )}
    </section>
  );
}

export default Demo;
