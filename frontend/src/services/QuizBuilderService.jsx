import { useState } from "react";
import api from "../api/api";
import { useEffect } from "react";

function useQuiz() {
  const [questions, setQuestions] = useState([
    {
      title: "",
      options: ["", "", "", ""],
      correctOption: 1,
      explanation: "",
    },
  ]);

  const [quizSettings, setQuizSetting] = useState({
    quizTitle: "",
    batch: "",
    correctMarks: 0,
    incorrectMarks: 0,
  });

  const [batches, setBatches] = useState([]);

  async function getBatches() {
    const response = await api.get("/batch/get-all");
    if (response.data?.success) {
      setBatches(response.data?.data);
    }
  }

  useEffect(() => {
    getBatches();
  }, []);

  function handleQuizSettingsChange(field, value) {
    setQuizSetting({ ...quizSettings, [field]: value });
  }

  function addQuestion() {
    const newQuestion = {
      title: "",
      options: ["", "", "", ""],
      correctOption: 0,
      explanation: "",
    };

    setQuestions([...questions, newQuestion]);
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
    } else {
      alert("Some Error Occured...");
    }
  }

  return {
    questions,
    addQuestion,
    handleQuestionChange,
    handleQuizOptionChange,
    handleMarkCorrectOption,
    quizSettings,
    handleQuizSettingsChange,
    handleSubmit,
    batches,
  };
}

export default useQuiz;
