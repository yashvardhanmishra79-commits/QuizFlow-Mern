import { useState } from "react";
import "./Contact.css";
import {
  MdEmail,
  MdPhone,
  MdLocationOn,
  MdAccessTime,
  MdSend,
  MdCheckCircle,
} from "react-icons/md";
import { MdAdd } from "react-icons/md";

const contactInfo = [
  {
    icon: MdEmail,
    title: "Email Us",
    details: "support@quizflow.com",
    subtext: "We respond within 24 hours",
  },
  {
    icon: MdPhone,
    title: "Call Us",
    details: "+91 98765 43210",
    subtext: "Mon-Fri, 9AM-6PM IST",
  },
  {
    icon: MdLocationOn,
    title: "Visit Us",
    details: "Analyze Infotech",
    subtext: "Tedhi Puliya, Lucknow",
  },
  {
    icon: MdAccessTime,
    title: "Business Hours",
    details: "Monday - Saturday",
    subtext: "9:00 AM - 9:00 PM (IST)",
  },
];

const faqs = [
  {
    question: "How do I create a quiz?",
    answer:
      "After logging in as admin, go to Admin Panel > Create Quiz. You can add questions manually or use AI to generate them. Set marking schemes, time limits, and assign to batches.",
  },
  {
    question: "Can students take quizzes on mobile?",
    answer:
      "Yes! QuizFlow is fully responsive and works seamlessly on mobile devices, tablets, and desktops. Students can solve quizzes from any device with a browser.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "Yes, we offer a 14-day free trial with full access to all features. No credit card required. Contact our sales team to get started.",
  },
  {
    question: "How secure is student data?",
    answer:
      "We use industry-standard encryption, secure authentication, and regular security audits. Student data is never shared with third parties and complies with data protection regulations.",
  },
  {
    question: "Can I import existing questions?",
    answer:
      "Yes, QuizFlow supports bulk import via CSV/Excel files. You can also export quizzes and questions for backup or sharing with other institutes.",
  },
  {
    question: "What support options are available?",
    answer:
      "We offer email support (24hr response), live chat during business hours, comprehensive documentation, video tutorials, and dedicated account managers for enterprise plans.",
  },
];

function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [submitStatus, setSubmitStatus] = useState(null);
  const [activeFaq, setActiveFaq] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitStatus("submitting");
    // Simulate API call
    setTimeout(() => {
      setSubmitStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 1500);
  };

  return (
    <section className="contact-section">
      <div className="container">
        <div className="contact-header">
          <h1>
            Contact <span>Us</span>
          </h1>
          <p>
            Have questions? We'd love to hear from you. Send us a message and
            we'll respond as soon as possible.
          </p>
        </div>

        <div className="contact-grid">
          {/* Contact Info */}
          <div className="contact-info">
            <h2>Get In Touch</h2>
            <div className="info-cards">
              {contactInfo.map((item) => (
                <div className="info-card" key={item.title}>
                  <div className="info-icon">
                    <item.icon />
                  </div>
                  <div className="info-content">
                    <h3>{item.title}</h3>
                    <p>{item.details}</p>
                    <span className="info-subtext">{item.subtext}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contact Form */}
          <div className="contact-form-wrapper">
            <h2>Send Us a Message</h2>
            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Your name"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="subject">Subject *</label>
                <select
                  id="subject"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select a topic</option>
                  <option value="general">General Inquiry</option>
                  <option value="sales">Sales & Pricing</option>
                  <option value="support">Technical Support</option>
                  <option value="feature">Feature Request</option>
                  <option value="bug">Bug Report</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="message">Message *</label>
                <textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows={6}
                  placeholder="Tell us how we can help..."
                />
              </div>
              <button
                type="submit"
                className="submit-btn"
                disabled={submitStatus === "submitting"}
              >
                {submitStatus === "submitting" ? (
                  <>
                    <span className="spinner"></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <MdSend />
                    Send Message
                  </>
                )}
              </button>
              {submitStatus === "success" && (
                <div className="success-message">
                  <MdCheckCircle />
                  <span>
                    Message sent successfully! We'll get back to you soon.
                  </span>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="faq-section">
          <h2>Frequently Asked Questions</h2>

          <div className="faq-grid">
            {faqs.map((faq, index) => (
              <div
                className={`faq-item ${activeFaq === index ? "active" : ""}`}
                key={index}
              >
                <button
                  className="faq-question"
                  onClick={() =>
                    setActiveFaq(activeFaq === index ? null : index)
                  }
                  aria-expanded={activeFaq === index}
                >
                  <span>{faq.question}</span>

                  <span className="faq-toggle">
                    <MdAdd
                      className={`faq-icon ${
                        activeFaq === index ? "open" : ""
                      }`}
                    />
                  </span>
                </button>

                <div
                  className={`faq-answer ${activeFaq === index ? "open" : ""}`}
                >
                  <p>{faq.answer}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="contact-cta">
          <h2>Ready to Get Started?</h2>
          <p>Create your first quiz in minutes. No credit card required.</p>
          <a href="/login" className="cta-button">
            Start Free Trial
          </a>
        </div>
      </div>
    </section>
  );
}

export default Contact;
