import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/useUser";
import { MdMenu, MdClose } from "react-icons/md";
import "./Header.css";

function Header() {
  const { user, logout } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const wrapRef = useRef(null);

  // Close the menu when browser back or forward changes the route.
  useEffect(() => {
    const closeMenu = () => setMobileMenuOpen(false);
    window.addEventListener("popstate", closeMenu);
    return () => window.removeEventListener("popstate", closeMenu);
  }, []);

  // Close on Escape and outside click (only while open)
  useEffect(() => {
    if (!mobileMenuOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") setMobileMenuOpen(false);
    };

    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [mobileMenuOpen]);

  const handleLogout = () => {
    logout();
    navigate("/");
    setMobileMenuOpen(false);
  };

  return (
    <header>
      <div className="header-main" ref={wrapRef}>
        {/* Left Section - Logo */}
        <Link to="/" className="logo" aria-label="QuizFlow Home">
          <h1>QuizFlow</h1>
        </Link>

        {/* Right Section - Login + Hamburger grouped */}
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
          {/* Mobile menu toggle */}
          <button
            type="button"
            className="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
            aria-controls="primary-nav"
          >
            {mobileMenuOpen ? <MdClose /> : <MdMenu />}
          </button>
        </div>

        {/* Mobile nav dropdown - positioned relative to header-main wrapper */}
        <nav className={`nav-links ${mobileMenuOpen ? "open" : ""}`} id="primary-nav" aria-label="Main navigation">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} aria-current={location.pathname === "/" ? "page" : undefined}>Home</Link>
          <Link to="/quizzes" onClick={() => setMobileMenuOpen(false)} aria-current={location.pathname === "/quizzes" ? "page" : undefined}>Quizzes</Link>
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} aria-current={location.pathname === "/about" ? "page" : undefined}>About</Link>
          <Link to="/contact" onClick={() => setMobileMenuOpen(false)} aria-current={location.pathname === "/contact" ? "page" : undefined}>Contact</Link>
        </nav>
      </div>
    </header>
  );
}

export default Header;
