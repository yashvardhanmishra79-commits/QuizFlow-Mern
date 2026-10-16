import { useState } from "react";
import "./AdminQuizBuilder.css";
import { MdDelete, MdClose, MdAutoAwesome } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import useQuiz from "../../services/QuizBuilderService";

function AdminQuizBuilder() {
  const {
    questions,
    addQuestion,
    removeQuestion,
    handleQuestionChange,
    handleQuizOptionChange,
    handleMarkCorrectOption,
    quizSettings,
    handleQuizSettingsChange,
    handleSubmit,
    resetQuiz,
    batches,
    populateQuizData,
    generateAiQuiz,
  } = useQuiz();

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiError, setAiError] = useState("");
  const [notification, setNotification] = useState("");

  const [aiForm, setAiForm] = useState({
    topic: "",
    batch: quizSettings.batch || "",
    difficulty: "Medium",
    questionCount: 5,
    correctMarks: quizSettings.correctMarks || 1,
    incorrectMarks: quizSettings.incorrectMarks || 0,
  });

  const handleSaveQuiz = async () => {
    try {
      const saved = await handleSubmit();
      if (!saved) {
        return;
      }

      resetQuiz();
      setNotification("");
      setAiError("");
      setIsAiModalOpen(false);
      setIsGenerating(false);
      setAiForm({
        topic: "",
        batch: "",
        difficulty: "Medium",
        questionCount: 5,
        correctMarks: 1,
        incorrectMarks: 0,
      });
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          error?.message ||
          "Unable to save the quiz. Your changes have been preserved."
      );
    }
  };

  const handleOpenAiModal = () => {
    setAiForm((prev) => ({
      ...prev,
      batch: quizSettings.batch || prev.batch,
      correctMarks: quizSettings.correctMarks || prev.correctMarks || 1,
      incorrectMarks: quizSettings.incorrectMarks !== undefined ? quizSettings.incorrectMarks : prev.incorrectMarks,
    }));
    setAiError("");
    setIsAiModalOpen(true);
  };

  const handleAiFormChange = (field, value) => {
    setAiForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleGenerateWithAi = async (e) => {
    if (e) e.preventDefault();
    if (!aiForm.topic.trim()) {
      setAiError("Please enter a topic to generate questions.");
      return;
    }
    setAiError("");
    setIsGenerating(true);

    try {
      console.log("AI Form Data:", aiForm);
      const response = await generateAiQuiz({
        topic: aiForm.topic.trim(),
        batch: aiForm.batch || quizSettings.batch,
        difficulty: aiForm.difficulty,
        questionCount: Number(aiForm.questionCount) || 5,
        correctMarks: aiForm.correctMarks,
        incorrectMarks: aiForm.incorrectMarks,
      });

      if (response && response.success && response.data) {
        populateQuizData(response.data);
        setIsAiModalOpen(false);
        setNotification(
          "Quiz questions generated with AI! Please review and edit the questions below before saving."
        );
      } else {
        setAiError(response?.message || "Failed to generate quiz.");
      }
    } catch (err) {
      console.error("AI Generation error:", err);
      const errMsg =
        err.response?.data?.message ||
        err.message ||
        "An unexpected error occurred while generating quiz with AI.";
      setAiError(errMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <section className="quiz-builder-section">
      {notification && (
        <div className="quiz-notification-banner">
          <span>{notification}</span>
          <button
            type="button"
            className="quiz-notification-close"
            aria-label="Dismiss notification"
            onClick={() => setNotification("")}
          >
            <MdClose />
          </button>
        </div>
      )}

      {/* Quiz Builder Header */}
      <div className="quiz-builder-header">
        <input
          id="quiz-title"
          type="text"
          aria-label="Quiz title"
          className="quiz-builder-input"
          placeholder="Enter Quiz Title..."
          value={quizSettings.quizTitle}
          onChange={(e) =>
            handleQuizSettingsChange("quizTitle", e.target.value)
          }
        />
        <div className="quiz-builder-header-actions">
          <button type="button" onClick={handleOpenAiModal}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
              <MdAutoAwesome /> Create With AI
            </span>
          </button>
          <button type="button" onClick={handleSaveQuiz}>Save Quiz</button>
        </div>
      </div>

      {/* Quiz Builder Body */}
      <div className="quiz-builder-body">
        {/* This will contain all the questiions */}
        <div className="quiz-builder-questions-container">
          {questions.map((question, index) => (
            <div className="quiz-question-card" key={index}>
              <div className="quiz-question-header">
                <div className="quiz-question-header-title">
                  Question {index + 1}
                </div>
                <div className="quiz-question-header-actions">
                  <button
                    type="button"
                    className="quiz-question-header-delete"
                    aria-label={`Delete Question ${index + 1}`}
                    onClick={() => removeQuestion(index)}
                  >
                    <MdDelete aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="quiz-question-input-box">
                <textarea
                  id={`question-${index}`}
                  aria-label={`Question ${index + 1} text`}
                  placeholder="Write Your Question..."
                  value={question.title}
                  onChange={(e) =>
                    handleQuestionChange(index, "title", e.target.value)
                  }
                ></textarea>
              </div>

              <div className="quiz-options-container">
                {question.options.map((option, optionIndex) => (
                  <div className="quiz-option-card" key={optionIndex}>
                    <div className="quiz-option-card-left">
                      <input
                        aria-label={`Mark option ${["A", "B", "C", "D"][optionIndex]} as correct for question ${index + 1}`}
                        type="radio"
                        checked={optionIndex == question.correctOption}
                        onChange={() =>
                          handleMarkCorrectOption(index, optionIndex)
                        }
                      />
                      <span>{["A", "B", "C", "D"][optionIndex]}</span>
                    </div>
                    <input
                      id={`question-${index}-option-${optionIndex}`}
                      aria-label={`Question ${index + 1} option ${["A", "B", "C", "D"][optionIndex]}`}
                      type="text"
                      className="quiz-option-input"
                      placeholder="Enter Option..."
                      value={option}
                      onChange={(e) =>
                        handleQuizOptionChange(
                          index,
                          optionIndex,
                          e.target.value,
                        )
                      }
                    />
                  </div>
                ))}
              </div>

              <div className="quiz-question-footer">
                <div className="quiz-footer-left">
                  <label htmlFor={`question-${index}-marks`}>Marks</label>
                  <input
                    id={`question-${index}-marks`}
                    type="number"
                    value={quizSettings.correctMarks}
                    readOnly
                  />
                </div>

                <div className="quiz-footer-right">
                  <label htmlFor={`question-${index}-explanation`}>Explanation </label>
                  <textarea
                    id={`question-${index}-explanation`}
                    placeholder="Write Your Explanation..."
                    value={question.explanation}
                    onChange={(e) =>
                      handleQuestionChange(index, "explanation", e.target.value)
                    }
                  ></textarea>
                </div>
              </div>
            </div>
          ))}

          <button type="button" className="add-question-button" onClick={addQuestion}>
            <h1>Add Question</h1>
          </button>
        </div>

        {/* This will contain quiz settings */}
        <div className="quiz-builder-settings-panel">
          <div className="quiz-settings-header">
            <IoMdSettings className="settings-icon" />
            <h1>Quiz Settings</h1>
          </div>

          <div className="quiz-settings-select-batch">
            <label htmlFor="quiz-target-batch">Target Batch</label>
            <select
              id="quiz-target-batch"
              value={quizSettings.batch}
              onChange={(e) =>
                handleQuizSettingsChange("batch", e.target.value)
              }
            >
              <option value="">Select Batch</option>
              {batches.map((batch) => (
                <option value={batch._id} key={batch._id}>
                  {batch.name}
                </option>
              ))}
            </select>
          </div>

          <div className="quiz-settings-marking-scheme">
            <label>Global Marking Scheme</label>
            <div>
              <div>
                <label htmlFor="quiz-correct-marks">Correct</label>
                <input
                  id="quiz-correct-marks"
                  type="number"
                  min="0"
                  step="any"
                  value={quizSettings.correctMarks}
                  onChange={(e) =>
                    handleQuizSettingsChange("correctMarks", e.target.value)
                  }
                />
              </div>

              <div>
                <label htmlFor="quiz-incorrect-marks">Incorrect</label>
                <input
                  id="quiz-incorrect-marks"
                  type="number"
                  step="any"
                  value={quizSettings.incorrectMarks}
                  onChange={(e) =>
                    handleQuizSettingsChange("incorrectMarks", e.target.value)
                  }
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Quiz Generator Modal */}
      {isAiModalOpen && (
        <div className="ai-modal-overlay" onClick={() => !isGenerating && setIsAiModalOpen(false)}>
          <div
            className="ai-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ai-modal-title"
          >
            <div className="ai-modal-header">
              <div className="ai-modal-title-group">
                <MdAutoAwesome className="ai-modal-icon" />
                <h2 id="ai-modal-title">Create Quiz With AI</h2>
              </div>
              <button
                type="button"
                className="ai-modal-close-btn"
                aria-label="Close AI quiz generator"
                disabled={isGenerating}
                onClick={() => setIsAiModalOpen(false)}
              >
                <MdClose />
              </button>
            </div>

            <form onSubmit={handleGenerateWithAi} className="ai-modal-body">
              {aiError && (
                <div className="ai-modal-error">
                  <span>{aiError}</span>
                </div>
              )}

              <div className="ai-modal-field">
                <label htmlFor="ai-topic">
                  Topic <span className="ai-required">*</span>
                </label>
                <input
                  id="ai-topic"
                  type="text"
                  placeholder="e.g., Data Structures, Modern JavaScript, Indian History..."
                  value={aiForm.topic}
                  disabled={isGenerating}
                  onChange={(e) => handleAiFormChange("topic", e.target.value)}
                  autoFocus
                />
              </div>

              <div className="ai-modal-grid-2">
                <div className="ai-modal-field">
                  <label htmlFor="ai-target-batch">Target Batch</label>
                  <select
                    id="ai-target-batch"
                    value={aiForm.batch}
                    disabled={isGenerating}
                    onChange={(e) => handleAiFormChange("batch", e.target.value)}
                  >
                    <option value="">Select Batch (Optional)</option>
                    {batches.map((batch) => (
                      <option value={batch._id} key={batch._id}>
                        {batch.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="ai-modal-field">
                  <label htmlFor="ai-difficulty">Difficulty</label>
                  <select
                    id="ai-difficulty"
                    value={aiForm.difficulty}
                    disabled={isGenerating}
                    onChange={(e) =>
                      handleAiFormChange("difficulty", e.target.value)
                    }
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="ai-modal-grid-3">
                <div className="ai-modal-field">
                  <label htmlFor="ai-question-count">Questions</label>
                  <input
                    id="ai-question-count"
                    type="number"
                    min="1"
                    max="20"
                    value={aiForm.questionCount}
                    disabled={isGenerating}
                    onChange={(e) =>
                      handleAiFormChange("questionCount", e.target.value)
                    }
                  />
                </div>

                <div className="ai-modal-field">
                  <label htmlFor="ai-correct-marks">Correct Marks</label>
                  <input
                    id="ai-correct-marks"
                    type="number"
                    min="0"
                    step="any"
                    value={aiForm.correctMarks}
                    disabled={isGenerating}
                    onChange={(e) =>
                      handleAiFormChange("correctMarks", e.target.value)
                    }
                  />
                </div>

                <div className="ai-modal-field">
                  <label htmlFor="ai-incorrect-marks">Incorrect Marks</label>
                  <input
                    id="ai-incorrect-marks"
                    type="number"
                    step="any"
                    value={aiForm.incorrectMarks}
                    disabled={isGenerating}
                    onChange={(e) =>
                      handleAiFormChange("incorrectMarks", e.target.value)
                    }
                  />
                </div>
              </div>

              <div className="ai-modal-footer">
                <button
                  type="button"
                  className="ai-modal-btn-cancel"
                  disabled={isGenerating}
                  onClick={() => setIsAiModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ai-modal-btn-generate"
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <span className="ai-btn-loading">
                      <span className="ai-spinner"></span> Generating...
                    </span>
                  ) : (
                    <span>Generate Questions</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminQuizBuilder;

// Task:
// Create Manage Student UI Page where it wil show all the students and on header there will be one button as Add Student and on click of that button a pop up should be open to add student and create same ui for manage batches too.
