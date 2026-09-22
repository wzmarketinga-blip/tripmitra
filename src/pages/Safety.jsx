import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  MessageCircle,
  ShieldAlert,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { useNavigate, Link } from "react-router-dom";

const safetyTips = [
  {
    icon: ShieldCheck,
    title: "Verify Before You Connect",
    text: "Look for the verified badge and review the traveller's profile before accepting a request.",
  },
  {
    icon: MessageCircle,
    title: "Keep Communication Safe",
    text: "Use TripMitra chat for initial communication and avoid sharing sensitive personal information.",
  },
  {
    icon: LockKeyhole,
    title: "Protect Your Information",
    text: "Never share passwords, OTPs, banking details or government ID information with another traveller.",
  },
  {
    icon: UserRound,
    title: "Report or Block",
    text: "If someone behaves suspiciously or makes you uncomfortable, use Report or Block immediately.",
  },
];

const beforeTrip = [
  "Check the traveller's profile and verification status.",
  "Discuss destination, dates and trip expectations clearly.",
  "Keep your family or trusted person informed about your plans.",
  "Arrange your own important travel documents and emergency contacts.",
];

const duringTrip = [
  "Meet in a public and familiar place whenever possible.",
  "Keep your phone charged and maintain access to emergency contacts.",
  "Do not hand over money, passwords or sensitive documents to another traveller.",
  "If something feels unsafe, leave the situation and seek help.",
];

export default function Safety() {
  const navigate = useNavigate();

  return (
    <div className="safety-page">
      <header className="dashboard-nav">
        <Link to="/" className="auth-logo">
          <span className="logo-mark">✈</span>

          <span>
            Trip<span>Mitra</span>
          </span>
        </Link>

        <div className="dashboard-nav-right">
          <button
            type="button"
            className="dashboard-profile-btn"
            onClick={() => navigate("/profile/edit")}
          >
            <UserRound size={18} />
            <span>My Profile</span>
          </button>
        </div>
      </header>

      <main className="safety-container">
        <section className="safety-hero">
          <button
            type="button"
            className="auth-back"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Dashboard
          </button>

          <div className="safety-hero-content">
            <div className="safety-hero-icon">
              <ShieldCheck size={42} />
            </div>

            <p className="discover-eyebrow">
              <ShieldAlert size={18} />
              TRAVEL SAFETY
            </p>

            <h1>Travel Safely With TripMitra</h1>

            <p>
              Your safety comes first. Follow these simple guidelines
              to make your travel companion experience safer and more
              comfortable.
            </p>
          </div>
        </section>

        <section className="safety-card-grid">
          {safetyTips.map((item) => {
            const Icon = item.icon;

            return (
              <article
                className="safety-info-card"
                key={item.title}
              >
                <div className="safety-card-icon">
                  <Icon size={24} />
                </div>

                <h2>{item.title}</h2>

                <p>{item.text}</p>
              </article>
            );
          })}
        </section>

        <section className="safety-checklist-section">
          <div className="safety-section-heading">
            <span className="safety-small-icon">
              <CheckCircle2 size={20} />
            </span>

            <div>
              <h2>Before You Travel</h2>
              <p>
                A few simple steps can make a big difference.
              </p>
            </div>
          </div>

          <div className="safety-checklist">
            {beforeTrip.map((tip, index) => (
              <div
                className="safety-check-item"
                key={tip}
              >
                <span>{index + 1}</span>
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="safety-checklist-section">
          <div className="safety-section-heading">
            <span className="safety-small-icon">
              <ShieldCheck size={20} />
            </span>

            <div>
              <h2>During Your Trip</h2>
              <p>
                Stay aware and keep control of your own safety.
              </p>
            </div>
          </div>

          <div className="safety-checklist">
            {duringTrip.map((tip, index) => (
              <div
                className="safety-check-item"
                key={tip}
              >
                <span>{index + 1}</span>
                <p>{tip}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="safety-emergency">
          <div className="safety-emergency-icon">
            <ShieldAlert size={28} />
          </div>

          <div>
            <h2>Feeling Unsafe?</h2>

            <p>
              Trust your instincts. Move to a safe public place and
              contact a trusted person or local emergency service if
              necessary.
            </p>

            <div className="safety-emergency-actions">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/messages")}
              >
                <MessageCircle size={17} />
                Open Messages
              </button>

              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/dashboard")}
              >
                Back to Dashboard
              </button>
            </div>
          </div>
        </section>

        <section className="safety-bottom-note">
          <ShieldCheck size={20} />

          <p>
            TripMitra provides tools such as verification, reporting,
            blocking and moderated communication to support a safer
            travel community.
          </p>
        </section>
      </main>

      <nav className="dashboard-bottom-nav">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
        >
          <ShieldCheck size={20} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/discover")}
        >
          <UserRound size={20} />
          <span>Discover</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/trips")}
        >
          <CheckCircle2 size={20} />
          <span>Trips</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/messages")}
        >
          <MessageCircle size={20} />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() => navigate("/profile/edit")}
        >
          <UserRound size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}