import {
  ArrowLeft,
  CheckCircle2,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();

    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSent(true);
    }, 1000);
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">

        {/* Left / Branding */}
        <section className="auth-brand">
          <Link to="/" className="auth-logo">
            <span className="logo-mark">✈</span>

            <span>
              Trip<span>Mitra</span>
            </span>
          </Link>

          <div className="auth-brand-content">
            <div className="auth-brand-icon">
              <ShieldCheck size={34} />
            </div>

            <h1>Get Back to Your Journey</h1>

            <p>
              Reset your password securely and continue
              discovering travel companions with TripMitra.
            </p>

            <div className="auth-trust-list">
              <div>
                <CheckCircle2 size={18} />
                <span>Secure account recovery</span>
              </div>

              <div>
                <CheckCircle2 size={18} />
                <span>Your account stays protected</span>
              </div>

              <div>
                <CheckCircle2 size={18} />
                <span>Simple and quick process</span>
              </div>
            </div>
          </div>
        </section>

        {/* Form */}
        <section className="auth-card-section">
          <div className="auth-card">

            <button
              type="button"
              className="auth-back"
              onClick={() => navigate("/login")}
            >
              <ArrowLeft size={17} />
              Back to Login
            </button>

            {!sent ? (
              <>
                <div className="auth-card-header">
                  <div className="auth-icon">
                    <Mail size={26} />
                  </div>

                  <h2>Forgot Password?</h2>

                  <p>
                    Enter the email address associated with your
                    TripMitra account and we'll send you a
                    password reset link.
                  </p>
                </div>

                <form
                  className="auth-form"
                  onSubmit={handleSubmit}
                  noValidate
                >
                  <label>
                    <span>Email Address</span>

                    <div className="auth-input-wrap">
                      <Mail size={18} />

                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </div>
                  </label>

                  {error && (
                    <div className="auth-error">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary auth-submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Sending..."
                      : "Send Reset Link"}
                  </button>
                </form>

                <div className="auth-footer">
                  Remember your password?{" "}
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                  >
                    Login
                  </button>
                </div>
              </>
            ) : (
              <div className="auth-success">

                <div className="auth-success-icon">
                  <CheckCircle2 size={42} />
                </div>

                <h2>Reset Link Sent!</h2>

                <p>
                  We've sent a password reset link to:
                </p>

                <strong>{email}</strong>

                <p className="auth-success-note">
                  Please check your inbox and follow the
                  instructions to create a new password.
                </p>

                <button
                  type="button"
                  className="btn btn-primary auth-submit"
                  onClick={() => navigate("/login")}
                >
                  Back to Login
                </button>

                <button
                  type="button"
                  className="auth-text-button"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                >
                  Use another email
                </button>
              </div>
            )}

            <div className="auth-security-note">
              <ShieldCheck size={17} />

              <span>
                Never share your password or OTP with anyone.
              </span>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
}