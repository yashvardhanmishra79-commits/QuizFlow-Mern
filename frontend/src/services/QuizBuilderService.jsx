import { useEffect, useState } from "react";
import api from "../api/api";

function createBlankQuestion() {
  return {
    title: "",
    options: ["", "", "", ""],
    correctOption: 0,
    explanation: "",
  };
}

function createDefaultQuizSettings() {
  return {
    quizTitle: "",
    batch: "",
    correctMarks: 1,
    incorrectMarks: 0,
  };
}

function useQuiz() {
  const [questions, setQuestions] = useState([createBlankQuestion()]);
  const [quizSettings, setQuizSetting] = useState(createDefaultQuizSettings);

  const [batches, setBatches] = useState([]);

  useEffect(() => {
    let active = true;
    api
      .get("/batch/get-all")
      .then((response) => {
        if (active && response.data?.success) {
          setBatches(response.data?.data);
        }
      })
      .catch((error) => {
        console.error("Unable to load quiz-builder batches:", error);
      });

    return () => {
      active = false;
    };
  }, []);

  function handleQuizSettingsChange(field, value) {
    setQuizSetting({ ...quizSettings, [field]: value });
  }

  function resetQuiz() {
    setQuestions([createBlankQuestion()]);
    setQuizSetting(createDefaultQuizSettings());
  }

  function addQuestion() {
    setQuestions([...questions, createBlankQuestion()]);
  }

  function handleQuestionChange(index, fieldName, value) {
    const temp = { ...questions[index] };
    temp[fieldName] = value;
    const tempQuestions = [...questions];
    tempQuestions[index] = temp;
    setQuestions(tempQuestions);
  }

  function handleQuizOptionChange(questionIndex, optionIndex, value) {
    const tempQuestion = { ...questions[questionIndex] };
    tempQuestion.options[optionIndex] = value;
    const temp = [...questions];
    temp[questionIndex] = tempQuestion;
    setQuestions(temp);
  }

  function handleMarkCorrectOption(questionIndex, optionIndex) {
    const tempQuestion = { ...questions[questionIndex] };
    tempQuestion.correctOption = optionIndex;
    const temp = [...questions];
    temp[questionIndex] = tempQuestion;
    setQuestions(temp);
  }

  function removeQuestion(index) {
    if (questions.length <= 1) {
      alert("A quiz must have at least one question.");
      return;
    }
    setQuestions(questions.filter((_, i) => i !== index));
  }

  function populateQuizData(data) {
    if (data.title) {
      setQuizSetting((prev) => ({
        ...prev,
        quizTitle: data.title,
        batch: data.batch || prev.batch,
        correctMarks: data.correctMarks !== undefined ? data.correctMarks : prev.correctMarks,
        incorrectMarks: data.incorrectMarks !== undefined ? data.incorrectMarks : prev.incorrectMarks,
      }));
    }
    if (Array.isArray(data.questions) && data.questions.length > 0) {
      setQuestions(data.questions);
    }
  }

  async function generateAiQuiz(payload) {
    const response = await api.post("/quiz/generate-ai-quiz", payload);
    return response.data;
  }

  async function handleSubmit() {
    const data = {
      title: quizSettings.quizTitle,
      batch: quizSettings.batch,
      correctMarks: quizSettings.correctMarks,
      incorrectMarks: quizSettings.incorrectMarks,
      questions: questions,
    };
    const response = await api.post("/quiz/add-quiz", data);
    if (response.data?.success) {
      alert("Quiz Added Successfully");
      return true;
    } else {
      alert("Some Error Occured...");
      return false;
    }
  }

  return {
    questions,
    setQuestions,
    addQuestion,
    removeQuestion,
    handleQuestionChange,
    handleQuizOptionChange,
    handleMarkCorrectOption,
    quizSettings,
    setQuizSetting,
    handleQuizSettingsChange,
    handleSubmit,
    resetQuiz,
    batches,
    populateQuizData,
    generateAiQuiz,
  };
}

export default useQuiz;
