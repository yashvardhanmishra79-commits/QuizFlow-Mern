import "./Home.css";
import { Link } from "react-router-dom";
import { MdQuiz, MdGroup, MdInsights, MdAutoAwesome, MdArrowRight } from "react-icons/md";

const features = [
  {
    icon: MdQuiz,
    title: "Smart Quizzes",
    description:
      "Create professional quizzes with global marking schemes, explanations, and AI-assisted question generation.",
  },
  {
    icon: MdGroup,
    title: "Batch Management",
    description:
      "Organize students into batches and assign targeted quizzes to the right group effortlessly.",
  },
  {
    icon: MdInsights,
    title: "Insightful Analytics",
    description:
      "Track performance, identify weak areas, and drive student growth with in-depth reports.",
  },
  {
    icon: MdAutoAwesome,
    title: "AI Powered",
    description:
      "Generate questions instantly with AI and save hours of manual question preparation.",
  },
];

function Home() {
  return (
    <section className="home-section">
      <div className="hero">
        <div className="hero-left">
          <h1>
            Empower Your Coaching with <span>Scalable Quizzes</span>
          </h1>
          <p>
            Streamline your assessment process, gain in-depth insights, and
            drive student growth with our professional-grade quiz management
            platform built for modern coaching institutes.
          </p>

          <div className="hero-action-btns">
            <Link to="/quizzes" className="btn btn-primary">
              <MdArrowRight />
              <span>Start Now</span>
            </Link>
            <button className="btn btn-outline">View Demo</button>
          </div>
        </div>
        <div className="hero-right">
          <img
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1400&auto=format&fit=crop"
            alt="Students learning together"
          />
        </div>
      </div>

      {/* Feature Cards */}
      <div className="home-cards">
        <h2>Why Choose QuizFlow?</h2>
        <p className="home-cards-subtitle">
          Everything your coaching institute needs to run assessments smoothly.
        </p>
        <div className="home-cards-grid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div className="home-card" key={feature.title}>
                <div className="home-card-icon">
                  <Icon />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default Home;
