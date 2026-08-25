import { NavLink, Outlet } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/AuthContext";
import { MdDashboard, MdGroup, MdClass, MdOutlineQuiz, MdLogout } from "react-icons/md";
import { IoCreate } from "react-icons/io5";

import "./AdminLayout.css";
function AdminLayout() {
  const { user, logout } = useUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <div className="admin-layout">
      <div className="admin-sidebar">
        <div className="admin-sidebar-top">
          <div className="admin-sidebar-header">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCX8MiDqLSxS6aaFZr8cpRyYdvSDzWC9ukMa9sdDnCS7swoO8WDZxmRJFYJO-g45rQ9KBKqyyyjNX_mP6pRG4rDEXe6TFI29R7M-l2VLB6C3cGc1YbzSHgZ72SAZElMukKU5a5gQ1WFEtd3qx3ZmFPV5X-Lhc5cJmcbc-Dj__839YB4jHR0pnzwWFh4oQPdxJUuRKb6f1_H8vBy8AOZhtE0ZFa6BZzzRfBLKp-8PeMbBhBXx1IXvglp"
              alt=""
            />
            <div>
              <span>QuizFlow Admin</span>
              <span className="admin-sidebar-header-text-2">
                Coaching Portal
              </span>
            </div>
          </div>

          <div className="admin-sidebar-nav">
            <div className="admin-sidebar-nav-title">Menu</div>
            <NavLink to="/admin" end className="admin-sidebar-nav-row">
              <MdDashboard className="nav-icon" />
              <span>Dashboard</span>
            </NavLink>

            <NavLink to="/admin/create-quiz" className="admin-sidebar-nav-row">
              <IoCreate className="nav-icon" />
              <span>Quiz Builder</span>
            </NavLink>

            <NavLink to="/admin/manage-quizzes" className="admin-sidebar-nav-row">
              <MdOutlineQuiz className="nav-icon" />
              <span>Manage Quizzes</span>
            </NavLink>

            <NavLink to="/admin/manage-students" className="admin-sidebar-nav-row">
              <MdGroup className="nav-icon" />
              <span>Manage Students</span>
            </NavLink>

            <NavLink to="/admin/manage-batches" className="admin-sidebar-nav-row">
              <MdClass className="nav-icon" />
              <span>Manage Batches</span>
            </NavLink>
          </div>
        </div>

        <div className="admin-sidebar-end">
          <div className="admin-profile-card">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuCX8MiDqLSxS6aaFZr8cpRyYdvSDzWC9ukMa9sdDnCS7swoO8WDZxmRJFYJO-g45rQ9KBKqyyyjNX_mP6pRG4rDEXe6TFI29R7M-l2VLB6C3cGc1YbzSHgZ72SAZElMukKU5a5gQ1WFEtd3qx3ZmFPV5X-Lhc5cJmcbc-Dj__839YB4jHR0pnzwWFh4oQPdxJUuRKb6f1_H8vBy8AOZhtE0ZFa6BZzzRfBLKp-8PeMbBhBXx1IXvglp"
              alt=""
            />
            <div>
              <span>{user?.name || "Admin User"}</span>
              <span>{user?.email || "admin@quizflow.com"}</span>
            </div>
          </div>
          <button className="admin-logout-btn" onClick={handleLogout}>
            <MdLogout className="logout-icon" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}

export default AdminLayout;
