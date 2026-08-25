import { Link } from "react-router-dom";
import {
  MdGroup,
  MdOutlineQuiz,
  MdClass,
  MdTrendingUp,
  MdAdd,
  MdArrowForward,
} from "react-icons/md";

import "./AdminDashboard.css";

const stats = [
  {
    icon: MdGroup,
    title: "Total Students",
    value: "248",
    trend: "+12 this month",
    color: "blue",
  },
  {
    icon: MdOutlineQuiz,
    title: "Total Quizzes",
    value: "36",
    trend: "+5 this month",
    color: "green",
  },
  {
    icon: MdClass,
    title: "Total Batches",
    value: "8",
    trend: "+2 this month",
    color: "purple",
  },
  {
    icon: MdTrendingUp,
    title: "Avg. Score",
    value: "74%",
    trend: "+4% vs last month",
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

const recentStudents = [
  { name: "Aarav Sharma", batch: "Batch 2026 - A", score: "92%", status: "Passed" },
  { name: "Priya Verma", batch: "Batch 2026 - B", score: "85%", status: "Passed" },
  { name: "Rohan Gupta", batch: "Batch 2026 - A", score: "58%", status: "Failed" },
  { name: "Sneha Patel", batch: "Batch 2026 - C", score: "78%", status: "Passed" },
];

function AdminDashboard() {
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
                <span className="dashboard-stat-value">{stat.value}</span>
                <span className="dashboard-stat-title">{stat.title}</span>
                <span className="dashboard-stat-trend">{stat.trend}</span>
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
              {recentStudents.map((student) => (
                <tr key={student.name}>
                  <td>
                    <div className="dashboard-student-name">
                      <span className="dashboard-student-avatar">
                        {student.name.split(" ").map((n) => n[0]).join("")}
                      </span>
                      {student.name}
                    </div>
                  </td>
                  <td>{student.batch}</td>
                  <td className="dashboard-score">{student.score}</td>
                  <td>
                    <span
                      className={
                        "dashboard-status " +
                        (student.status === "Passed"
                          ? "status-passed"
                          : "status-failed")
                      }
                    >
                      {student.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default AdminDashboard;