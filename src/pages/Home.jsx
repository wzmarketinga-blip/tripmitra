import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import "../App.css";

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const closeMenu = () => setMenuOpen(false);

  const goToDiscover = () => {
    closeMenu();
    navigate("/discover");
  };

  const goToLogin = () => {
    closeMenu();
    navigate("/login");
  };

  const goToRegister = () => {
    closeMenu();
    navigate("/register");
  };

  return (
    <div className="app">
      {/* =========================
          NAVBAR
      ========================= */}
      <header className="navbar">
        <div className="container nav-inner">

          <Link to="/" className="logo" onClick={closeMenu}>
            <span className="logo-mark">✈</span>
            <span>
              Trip<span>Mitra</span>
            </span>
          </Link>

          <nav className={`nav-links ${menuOpen ? "mobile-open" : ""}`}>
            <a href="#home" onClick={closeMenu}>
              Home
            </a>

            <a href="#how-it-works" onClick={closeMenu}>
              How It Works
            </a>

            <Link to="/safety" onClick={closeMenu}>
              Safety
            </Link>

            <a href="#about" onClick={closeMenu}>
              About
            </a>

            <a href="#faq" onClick={closeMenu}>
              FAQ
            </a>

            {/* Mobile Buttons */}
            <div className="mobile-actions">
              <button
                type="button"
                className="btn btn-outline"
                onClick={goToLogin}
              >
                Login
              </button>

              <button
                type="button"
                className="btn btn-primary"
                onClick={goToRegister}
              >
                Join Now
              </button>
            </div>
          </nav>

          {/* Desktop Buttons */}
          <div className="desktop-actions">
            <button
              type="button"
              className="btn btn-outline"
              onClick={goToLogin}
            >
              Login
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={goToRegister}
            >
              Join Now
            </button>
          </div>

          {/* Mobile Menu */}
          <button
            type="button"
            className="menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={25} /> : <Menu size={25} />}
          </button>

        </div>
      </header>

      {/* =========================
          HERO
      ========================= */}
      <main>
        <section className="hero-section" id="home">
          <div className="container hero-grid">

            <div className="hero-content">
              <div className="eyebrow">
                <ShieldCheck size={17} />
                Travel with verified companions
              </div>

              <h1>
                Find Your Perfect
                <span> Travel Companion</span>
              </h1>

              <p className="hero-text">
                Connect with verified people, discover new destinations and
                make your journeys better.
              </p>

              <div className="hero-buttons">
                <button
                  type="button"
                  className="btn btn-primary btn-large"
                  onClick={goToDiscover}
                >
                  Find a Companion
                  <ArrowRight size={19} />
                </button>

                <a
                  href="#how-it-works"
                  className="btn btn-light btn-large"
                >
                  How It Works
                </a>
              </div>

              <div className="trust-row">
                <div>
                  <CheckCircle2 size={18} />
                  <span>Verified</span>
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  <span>Trusted</span>
                </div>

                <div>
                  <CheckCircle2 size={18} />
                  <span>Easy Connection</span>
                </div>
              </div>
            </div>

            {/* Hero Illustration */}
            <div className="hero-visual">
              <div className="hero-card main-illustration">

                <div className="sun"></div>

                <div className="mountain mountain-one"></div>

                <div className="mountain mountain-two"></div>

                <div className="road"></div>

                <div className="traveler traveler-one">
                  <div className="head"></div>
                  <div className="body"></div>
                </div>

                <div className="traveler traveler-two">
                  <div className="head"></div>
                  <div className="body"></div>
                </div>

                <div className="floating-badge badge-one">
                  <CheckCircle2 size={18} />

                  <div>
                    <strong>Verified</strong>
                    <small>Identity checked</small>
                  </div>
                </div>

                <div className="floating-badge badge-two">
                  <Users size={18} />

                  <div>
                    <strong>Find your match</strong>
                    <small>Travel together</small>
                  </div>
                </div>

              </div>
            </div>

          </div>
        </section>

        {/* =========================
            SEARCH
        ========================= */}
        <section className="search-section">
          <div className="container">
            <div className="search-card">

              <div className="search-heading">
                <Compass size={24} />

                <div>
                  <h2>Find a Travel Companion</h2>

                  <p>
                    Search for people travelling to your destination.
                  </p>
                </div>
              </div>

              <div className="search-fields">

                <label>
                  <span>Destination</span>
                  <input
                    type="text"
                    placeholder="e.g. Goa"
                  />
                </label>

                <label>
                  <span>Travel Date</span>
                  <input type="date" />
                </label>

                <label>
                  <span>Looking For</span>

                  <select defaultValue="">
                    <option value="" disabled>
                      Select
                    </option>

                    <option>Travel Partner</option>
                    <option>Group</option>
                    <option>Trip Companion</option>
                  </select>
                </label>

                <button
                  type="button"
                  className="btn btn-primary search-btn"
                  onClick={goToDiscover}
                >
                  Search
                  <ArrowRight size={18} />
                </button>

              </div>

              <p className="login-note">
                Login or register to connect with travel companions.
              </p>

            </div>
          </div>
        </section>

        {/* =========================
            POPULAR DESTINATIONS
        ========================= */}
        <section className="section" id="about">
          <div className="container">

            <div className="section-heading">
              <div>
                <span className="section-label">EXPLORE</span>
                <h2>Popular Destinations</h2>
              </div>

              <p>
                Discover people planning their next journey.
              </p>
            </div>

            <div className="destination-grid">

              <Destination
                name="Goa"
                description="Beaches, sunsets & adventure"
                emoji="🏖️"
                onExplore={goToDiscover}
              />

              <Destination
                name="Manali"
                description="Mountains, snow & nature"
                emoji="🏔️"
                onExplore={goToDiscover}
              />

              <Destination
                name="Jaipur"
                description="Heritage, culture & colours"
                emoji="🏰"
                onExplore={goToDiscover}
              />

            </div>

          </div>
        </section>

        {/* =========================
            HOW IT WORKS
        ========================= */}
        <section
          className="section section-soft"
          id="how-it-works"
        >
          <div className="container">

            <div className="center-heading">
              <span className="section-label">
                SIMPLE & SAFE
              </span>

              <h2>How TripMitra Works</h2>

              <p>
                Find the right travel companion in a few simple steps.
              </p>
            </div>

            <div className="steps-grid">

              <Step
                number="01"
                title="Create Your Profile"
                text="Tell us about yourself, your interests and travel style."
              />

              <Step
                number="02"
                title="Get Verified"
                text="Complete verification to build trust with other travellers."
              />

              <Step
                number="03"
                title="Discover & Connect"
                text="Find suitable companions and send a travel request."
              />

              <Step
                number="04"
                title="Travel Together"
                text="Connect, plan your trip and enjoy your journey."
              />

            </div>
          </div>
        </section>

        {/* =========================
            SAFETY
        ========================= */}
        <section className="section" id="safety">
          <div className="container safety-grid">

            <div>
              <span className="section-label">
                YOUR SAFETY MATTERS
              </span>

              <h2>Travel with confidence.</h2>

              <p className="section-text">
                TripMitra is designed around verification, safety and
                responsible connections so you can focus on enjoying your trip.
              </p>

              <div className="safety-list">

                <SafetyItem
                  title="Identity Verification"
                  text="Verified profiles help create a trusted community."
                />

                <SafetyItem
                  title="Report & Block"
                  text="Quickly report or block unwanted interactions."
                />

                <SafetyItem
                  title="Secure Communication"
                  text="Connect through the platform before your trip."
                />

                <SafetyItem
                  title="Admin Moderation"
                  text="Reports and safety issues can be reviewed by admins."
                />

              </div>

              <button
                type="button"
                className="btn btn-light"
                onClick={() => navigate("/safety")}
              >
                Learn More About Safety
                <ArrowRight size={17} />
              </button>

            </div>

            <div className="safety-card">
              <ShieldCheck size={52} />

              <h3>
                Built for safer travel connections
              </h3>

              <p>
                Travel → People → Verification → Safety → Connection → Trip
              </p>

              <div className="safety-stat">
                <strong>100%</strong>
                <span>Safety-first approach</span>
              </div>
            </div>

          </div>
        </section>

        {/* =========================
            FAQ
        ========================= */}
        <section className="section section-soft" id="faq">
          <div className="container">

            <div className="center-heading">
              <span className="section-label">
                HELP & SUPPORT
              </span>

              <h2>Frequently Asked Questions</h2>

              <p>
                A few common questions about TripMitra.
              </p>
            </div>

            <div className="steps-grid">

              <article className="step-card">
                <h3>Is TripMitra safe?</h3>
                <p>
                  TripMitra is designed with profile verification,
                  reporting, blocking and moderation features.
                </p>
              </article>

              <article className="step-card">
                <h3>Who can join?</h3>
                <p>
                  Users must be 18 years or older and complete the
                  required registration and verification process.
                </p>
              </article>

              <article className="step-card">
                <h3>Can I find a travel companion?</h3>
                <p>
                  Yes. Use Discover to search for people based on
                  destination, date and travel preferences.
                </p>
              </article>

              <article className="step-card">
                <h3>Can I report someone?</h3>
                <p>
                  Yes. Reporting and blocking features are part of
                  the TripMitra safety system.
                </p>
              </article>

            </div>

          </div>
        </section>

        {/* =========================
            CTA
        ========================= */}
        <section className="cta-section">
          <div className="container cta-content">

            <div>
              <span className="section-label">
                READY TO TRAVEL?
              </span>

              <h2>
                Your next journey could be better together.
              </h2>

              <p>
                Create your profile and discover verified travel companions.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-white btn-large"
              onClick={goToRegister}
            >
              Join TripMitra
              <ArrowRight size={19} />
            </button>

          </div>
        </section>
      </main>

      {/* =========================
          FOOTER
      ========================= */}
      <footer className="footer">
        <div className="container footer-grid">

          <div>
            <Link
              to="/"
              className="logo footer-logo"
              onClick={closeMenu}
            >
              <span className="logo-mark">✈</span>

              <span>
                Trip<span>Mitra</span>
              </span>
            </Link>

            <p>
              Find your travel companion. Travel better together.
            </p>
          </div>

          <div>
            <h4>Explore</h4>

            <a href="#how-it-works">
              How It Works
            </a>

            <Link to="/safety">
              Safety
            </Link>

            <a href="#about">
              About
            </a>

            <button
              type="button"
              onClick={goToDiscover}
            >
              Discover Companions
            </button>
          </div>

          <div>
            <h4>Help</h4>

            <a href="#faq">
              FAQ
            </a>

            <a href="#faq">
              Contact
            </a>

            <a href="#faq">
              Privacy
            </a>
          </div>

        </div>

        <div className="container footer-bottom">
          <span>
            © 2026 TripMitra. All rights reserved.
          </span>

          <span>
            Travel responsibly. Travel together.
          </span>
        </div>
      </footer>
    </div>
  );
}


/* =========================
   DESTINATION
========================= */

function Destination({
  name,
  description,
  emoji,
  onExplore,
}) {
  return (
    <article className="destination-card">

      <div className="destination-image">
        {emoji}
      </div>

      <div className="destination-info">

        <h3>{name}</h3>

        <p>{description}</p>

        <button
          type="button"
          onClick={onExplore}
        >
          Explore
          <ArrowRight size={16} />
        </button>

      </div>

    </article>
  );
}


/* =========================
   STEP
========================= */

function Step({
  number,
  title,
  text,
}) {
  return (
    <article className="step-card">

      <span className="step-number">
        {number}
      </span>

      <h3>{title}</h3>

      <p>{text}</p>

    </article>
  );
}


/* =========================
   SAFETY ITEM
========================= */

function SafetyItem({
  title,
  text,
}) {
  return (
    <div className="safety-item">

      <div className="safety-icon">
        <CheckCircle2 size={20} />
      </div>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

    </div>
  );
}