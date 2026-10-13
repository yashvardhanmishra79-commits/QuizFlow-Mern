import { Link } from "react-router-dom";
import {
  MdGroup,
  MdOutlineQuiz,
  MdClass,
  MdTrendingUp,
  MdAdd,
  MdArrowForward,
} from "react-icons/md";
import { useEffect, useState } from "react";

import api from "../../api/api";
import "./AdminDashboard.css";

const stats = [
  {
    icon: MdGroup,
    title: "Total Students",
    key: "students",
    detail: "Database total",
    color: "blue",
  },
  {
    icon: MdOutlineQuiz,
    title: "Total Quizzes",
    key: "quizzes",
    detail: "Database total",
    color: "green",
  },
  {
    icon: MdClass,
    title: "Total Batches",
    key: "batches",
    detail: "Database total",
    color: "purple",
  },
  {
    icon: MdTrendingUp,
    title: "Avg. Score",
    key: "averageScore",
    color: "orange",
  },
];

const quickActions = [
  {
    title: "Create Quiz",
    description: "Build a new quiz with questions and settings",
    to: "/admin/create-quiz",
  },
  {
    title: "Add Student",
    description: "Enroll a new student to a batch",
    to: "/admin/manage-students",
  },
  {
    title: "Add Batch",
    description: "Create a new coaching batch",
    to: "/admin/manage-batches",
  },
];

function AdminDashboard() {
  const [dashboardStats, setDashboardStats] = useState({
    students: { value: null, status: "loading" },
    quizzes: { value: null, status: "loading" },
    batches: { value: null, status: "loading" },
    averageScore: { value: null, status: "loading" },
    recentResults: { value: null, status: "loading" },
  });

  useEffect(() => {
    const controller = new AbortController();
    const requests = [
      { key: "students", url: "/user/get-all-students" },
      { key: "quizzes", url: "/quiz/get-all" },
      { key: "batches", url: "/batch/get-all" },
      { key: "results", url: "/attempts/admin/recent" },
    ];

    Promise.allSettled(
      requests.map(({ url }) =>
        api.get(url, { signal: controller.signal })
      )
    ).then((results) => {
      if (controller.signal.aborted) {
        return;
      }

      const nextStats = {};

      results.forEach((result, index) => {
        const { key, url } = requests[index];

        if (result.status === "rejected") {
          if (!controller.signal.aborted) {
            console.error(
              `Dashboard request failed (${url}):`,
              result.reason?.message || "Unknown error"
            );
          }
          if (key === "results") {
            nextStats.averageScore = { value: null, status: "error" };
            nextStats.recentResults = { value: null, status: "error" };
            return;
          }
          nextStats[key] = { value: null, status: "error" };
          return;
        }

        const response = result.value.data;
        if (key === "results") {
          if (
            response?.success !== true ||
            !response.data ||
            (response.data.averageScore !== null &&
              typeof response.data.averageScore !== "number") ||
            !Array.isArray(response.data.recentResults)
          ) {
            console.error(
              `Dashboard request returned invalid data (${url}).`
            );
            nextStats.averageScore = { value: null, status: "error" };
            nextStats.recentResults = { value: null, status: "error" };
            return;
          }

          nextStats.averageScore = {
            value: response.data.averageScore,
            status: "loaded",
          };
          nextStats.recentResults = {
            value: response.data.recentResults,
            status: "loaded",
          };
          return;
        }

        if (response?.success !== true || !Array.isArray(response.data)) {
          console.error(`Dashboard request returned invalid data (${url}).`);
          nextStats[key] = { value: null, status: "error" };
          return;
        }

        nextStats[key] = { value: response.data.length, status: "loaded" };
      });

      if (!controller.signal.aborted) {
        setDashboardStats(nextStats);
      }
    });

    return () => controller.abort();
  }, []);

  return (
    <section className="admin-dashboard">
      {/* Welcome Header */}
      <div className="dashboard-welcome">
        <div>
          <h1>Welcome back, Admin! 👋</h1>
          <p>Here's what's happening with your coaching institute today.</p>
        </div>
        <Link to="/admin/create-quiz" className="dashboard-cta-btn">
          <MdAdd />
          Create Quiz
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div className="dashboard-stat-card" key={stat.title}>
              <div className={`dashboard-stat-icon stat-${stat.color}`}>
                <Icon />
              </div>
              <div className="dashboard-stat-info">
                <span className="dashboard-stat-value">
                  {stat.key === "averageScore"
                    ? dashboardStats.averageScore.status === "loaded" &&
                      dashboardStats.averageScore.value !== null
                      ? `${dashboardStats.averageScore.value.toFixed(1)}%`
                      : "—"
                    : dashboardStats[stat.key].status === "loaded"
                      ? dashboardStats[stat.key].value
                      : "—"}
                </span>
                <span className="dashboard-stat-title">{stat.title}</span>
                <span className="dashboard-stat-trend">
                  {stat.key === "averageScore"
                    ? dashboardStats.averageScore.status === "loading"
                      ? "Loading..."
                      : dashboardStats.averageScore.status === "error"
                        ? "Unable to load"
                        : dashboardStats.averageScore.value === null
                          ? dashboardStats.recentResults.value.length > 0
                            ? "No valid scores"
                            : "No saved results"
                          : "Based on saved results"
                    : dashboardStats[stat.key].status === "loading"
                      ? "Loading..."
                      : dashboardStats[stat.key].status === "error"
                        ? "Unable to load"
                        : stat.detail}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="dashboard-quick-actions">
        <div className="dashboard-section-header">
          <h2>Quick Actions</h2>
          <span>Shortcuts for common tasks</span>
        </div>
        <div className="dashboard-quick-grid">
          {quickActions.map((action) => (
            <Link to={action.to} className="dashboard-quick-card" key={action.title}>
              <div>
                <h3>{action.title}</h3>
                <p>{action.description}</p>
              </div>
              <MdArrowForward className="dashboard-quick-arrow" />
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Students */}
      <div className="dashboard-recent">
        <div className="dashboard-section-header">
          <h2>Recent Results</h2>
          <Link to="/admin/manage-students" className="dashboard-view-all">
            View All
          </Link>
        </div>
        <div className="dashboard-table-wrapper">
          <table className="dashboard-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Batch</th>
                <th>Score</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {dashboardStats.recentResults.status === "loading" ? (
                <tr>
                  <td colSpan={4}>Loading results...</td>
                </tr>
              ) : dashboardStats.recentResults.status === "error" ? (
                <tr>
                  <td colSpan={4}>Unable to load results.</td>
                </tr>
              ) : dashboardStats.recentResults.value.length === 0 ? (
                <tr>
                  <td colSpan={4}>No results available yet.</td>
                </tr>
              ) : (
                dashboardStats.recentResults.value.map((result) => (
                  <tr key={result._id}>
                    <td>{result.studentName}</td>
                    <td>{result.batchName}</td>
                    <td className="dashboard-score">
                      {result.obtainedMarks} / {result.totalMarks} (
                      {result.percentage}%)
                    </td>
                    <td>
                      <span className="dashboard-status">Completed</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;