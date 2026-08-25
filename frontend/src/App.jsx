import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import About from "./pages/About";
import Contact from "./pages/Contact";
import QuizList from "./pages/student/QuizList";
import QuizSolve from "./pages/student/QuizSolve";
import QuizResult from "./pages/student/QuizResult";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import PublicLayout from "./layouts/PublicLayout";
import AdminQuizBuilder from "./pages/admin/AdminQuizBuilder";
import AdminManageStudents from "./pages/admin/AdminManageStudents";
import AdminManageBatches from "./pages/admin/AdminManageBatches";
import AdminManageQuizzes from "./pages/admin/AdminManageQuizzes";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Layout */}
        <Route path="/" element={<PublicLayout />}>
          <Route path="" element={<Home />} />
          <Route path="login" element={<Login />} />
          <Route path="about" element={<About />} />
          <Route path="contact" element={<Contact />} />
          <Route path="quizzes" element={<QuizList />} />
          <Route path="quiz/:quizId/solve" element={<QuizSolve />} />
          <Route path="quiz/:quizId/result" element={<QuizResult />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route path="" element={<AdminDashboard />} />
          <Route path="create-quiz" element={<AdminQuizBuilder />} />
          <Route path="manage-students" element={<AdminManageStudents />} />
          <Route path="manage-batches" element={<AdminManageBatches />} />
          <Route path="manage-quizzes" element={<AdminManageQuizzes />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

// rfce: React Functional Component Export
