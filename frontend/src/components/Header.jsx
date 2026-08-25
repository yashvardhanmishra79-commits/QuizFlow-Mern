import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useUser } from "../context/AuthContext";
import "./Header.css";

function Header() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header>
      <div className="header-main">
        {/* Left Section of Header */}
        <div className="header-left">
          <Link to="/" className="logo">
            <h1>QuizFlow</h1>
          </Link>
          <ul>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/quizzes">Quizzes</Link>
            </li>
            <li>
              <Link to="/about">About</Link>
            </li>
            <li>
              <Link to="/contact">Contact</Link>
            </li>
          </ul>
        </div>

        {/* Right Section of Header */}
        <div className="header-right">
          {user ? (
            <div className="user-menu">
              <span className="user-name">
                {user.name} ({user.role})
              </span>
              {user.role === "admin" ? (
                <Link to="/admin">
                  <button className="admin-btn">Admin Panel</button>
                </Link>
              ) : (
                <Link to="/quizzes">
                  <button className="solve-quiz-btn">Solve Quiz</button>
                </Link>
              )}
              <button className="logout-btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          ) : (
            <Link to="/login">
              <button className="login-btn">Login</button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
