import "./AdminQuizBuilder.css";
import { MdDelete } from "react-icons/md";
import { IoMdSettings } from "react-icons/io";
import useQuiz from "../../services/QuizBuilderService";

function AdminQuizBuilder() {
  const {
    questions,
    addQuestion,
    handleQuestionChange,
    handleQuizOptionChange,
    handleMarkCorrectOption,
    quizSettings,
    handleQuizSettingsChange,
    handleSubmit,
    batches,
  } = useQuiz();

  return (
    <section className="quiz-builder-section">
      {/* Quiz Builder Header */}
      <div className="quiz-builder-header">
        <input
          type="text"
          className="quiz-builder-input"
          placeholder="Enter Quiz Title..."
          value={quizSettings.quizTitle}
          onChange={(e) =>
            handleQuizSettingsChange("quizTitle", e.target.value)
          }
        />
        <div className="quiz-builder-header-actions">
          <button>Create With AI</button>
          <button onClick={handleSubmit}>Save Quiz</button>
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
                  <MdDelete className="quiz-question-header-delete" />
                </div>
              </div>
              <div className="quiz-question-input-box">
                <textarea
                  type="text"
                  placeholder="Write Your Question..."
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
                        type="radio"
                        checked={optionIndex == question.correctOption}
                        onChange={() =>
                          handleMarkCorrectOption(index, optionIndex)
                        }
                      />
                      <span>{["A", "B", "C", "D"][optionIndex]}</span>
                    </div>
                    <input
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
                  <label>Marks</label>
                  <input type="text" />
                </div>

                <div className="quiz-footer-right">
                  <label>Explanation </label>
                  <textarea
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

          <div className="add-question-button" onClick={addQuestion}>
            <h1>Add Question</h1>
          </div>
        </div>

        {/* This will contain quiz settings */}
        <div className="quiz-builder-settings-panel">
          <div className="quiz-settings-header">
            <IoMdSettings className="settings-icon" />
            <h1>Quiz Settings</h1>
          </div>

          <div className="quiz-settings-select-batch">
            <label>Target Batch</label>
            <select
              value={quizSettings.batch}
              onChange={(e) =>
                handleQuizSettingsChange("batch", e.target.value)
              }
            >
              <option hidden>Select Batch</option>
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
                <label>Correct</label>
                <input
                  type="number"
                  value={quizSettings.correctMarks}
                  onChange={(e) =>
                    handleQuizSettingsChange("correctMarks", e.target.value)
                  }
                />
              </div>

              <div>
                <label>Incorrect</label>
                <input
                  type="number"
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
    </section>
  );
}

export default AdminQuizBuilder;

// Task:
// Create Manage Student UI Page where it wil show all the students and on header there will be one button as Add Student and on click of that button a pop up should be open to add student and create same ui for manage batches too.
