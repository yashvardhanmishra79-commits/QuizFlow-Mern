import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/AuthContext";
import "./Login.css";
import { MdQuiz } from "react-icons/md";
import { MdMailOutline } from "react-icons/md";
import { MdLockOutline } from "react-icons/md";
import api from "../api/api";

function Login() {
  const [data, setData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useUser();

  function handleChange(e) {
    const { name, value } = e.target;
    setData({ ...data, [name]: value });
    setError("");
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/user/login", data);
      if (response.data?.success) {
        const userData = response.data?.data;
        login(userData, response.data?.authToken);
        
        // Redirect based on role
        if (userData.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/quizzes");
        }
      } else {
        setError(response.data?.message || "Login Failed");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="login-page">
      <form
        className="login-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="login-header">
          <div className="login-icon">
            <MdQuiz />
          </div>
          <h1>QuizFlow</h1>
          <p>Welcome back to the coaching portal</p>
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-rows">
          <label htmlFor="">Email Address</label>
          <div className="form-input">
            <MdMailOutline className="form-input-icon" />
            <input
              type="email"
              placeholder="admin@institute.com"
              name="email"
              value={data.email}
              onChange={handleChange}
              autoComplete="username"
            />
          </div>
        </div>

        <div className="form-rows">
          <label htmlFor="">Password</label>
          <div className="form-input">
            <MdLockOutline className="form-input-icon" />
            <input
              type="password"
              name="password"
              value={data.password}
              onChange={handleChange}
              autoComplete="current-password"
            />
          </div>
        </div>

        <button className="login-button" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>
    </section>
  );
}

export default Login;
