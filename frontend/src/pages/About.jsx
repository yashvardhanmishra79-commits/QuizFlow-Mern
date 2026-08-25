import "./About.css";
import { MdSchool, MdGroups, MdQuiz, MdAutoAwesome, MdTrendingUp, MdSupport } from "react-icons/md";

const team = [
  { name: "Analyze Infotech", role: "Founder & CEO", description: "Visionary leader with 10+ years in EdTech" },
  { name: "Development Team", role: "Core Developers", description: "Building scalable quiz solutions" },
  { name: "Design Team", role: "UI/UX Designers", description: "Creating intuitive learning experiences" },
];

const stats = [
  { number: "500+", label: "Quizzes Created" },
  { number: "50+", label: "Active Batches" },
  { number: "1000+", label: "Students Enrolled" },
  { number: "99%", label: "Uptime Guarantee" },
];

function About() {
  return (
    <section className="about-section">
      <div className="container">
        {/* Hero Section */}
        <div className="about-hero">
          <h1>About <span>QuizFlow</span></h1>
          <p className="about-tagline">
            Empowering coaching institutes with intelligent quiz management
          </p>
        </div>

        {/* Mission Section */}
        <div className="mission-section">
          <h2>Our Mission</h2>
          <div className="mission-content">
            <div className="mission-text">
              <p>
                QuizFlow was born from a simple idea: assessments should be effortless to create,
                insightful to analyze, and engaging for students. We understand the challenges
                coaching institutes face — managing batches, creating diverse quizzes, tracking
                individual progress, and providing meaningful feedback.
              </p>
              <p>
                Our platform combines powerful quiz creation tools with AI-assisted question
                generation, detailed analytics, and seamless batch management. Whether you're
                a small coaching center or a large educational institution, QuizFlow scales
                with your needs.
              </p>
            </div>
            <div className="mission-image">
              <img
                src="https://images.unsplash.com/photo-1501504905252-473c47e087f8?q=80&w=1400&auto=format&fit=crop"
                alt="Team collaboration"
              />
            </div>
          </div>
        </div>

        {/* Values Section */}
        <div className="values-section">
          <h2>Our Core Values</h2>
          <div className="values-grid">
            <div className="value-card">
              <MdSchool className="value-icon" />
              <h3>Education First</h3>
              <p>Every feature we build serves the ultimate goal: better learning outcomes for students.</p>
            </div>
            <div className="value-card">
              <MdAutoAwesome className="value-icon" />
              <h3>Innovation</h3>
              <p>We continuously integrate AI and modern tech to simplify quiz creation and analysis.</p>
            </div>
            <div className="value-card">
              <MdGroups className="value-icon" />
              <h3>Collaboration</h3>
              <p>Built for teams — teachers, admins, and students working together seamlessly.</p>
            </div>
            <div className="value-card">
              <MdTrendingUp className="value-icon" />
              <h3>Growth</h3>
              <p>Data-driven insights that help institutes and students grow continuously.</p>
            </div>
            <div className="value-card">
              <MdQuiz className="value-icon" />
              <h3>Quality</h3>
              <p>Professional-grade assessments with global marking schemes and detailed explanations.</p>
            </div>
            <div className="value-card">
              <MdSupport className="value-icon" />
              <h3>Reliability</h3>
              <p>99% uptime, secure data handling, and responsive support when you need it.</p>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="stats-section">
          <h2>QuizFlow in Numbers</h2>
          <div className="stats-grid">
            {stats.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <span className="stat-number">{stat.number}</span>
                <span className="stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Team Section */}
        <div className="team-section">
          <h2>Meet Our Team</h2>
          <div className="team-grid">
            {team.map((member) => (
              <div className="team-card" key={member.name}>
                <div className="team-avatar">
                  <MdGroups />
                </div>
                <h3>{member.name}</h3>
                <span className="team-role">{member.role}</span>
                <p>{member.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="about-cta">
          <h2>Ready to Transform Your Assessments?</h2>
          <p>Join hundreds of coaching institutes already using QuizFlow</p>
          <a href="/login" className="cta-button">
            Get Started Free
          </a>
        </div>
      </div>
    </section>
  );
}

export default About;