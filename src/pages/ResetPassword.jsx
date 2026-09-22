import {
  ArrowLeft,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter your new password.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!confirmPassword) {
      setError("Please confirm your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSuccess(true);
    }, 1000);
  };

  return (
    <div className="auth-page">
      <div className="auth-shell">

        {/* LEFT BRANDING */}
        <section className="auth-brand">
          <div className="auth-logo">TripMitra</div>

          <div className="auth-brand-content">
            <div className="auth-brand-icon">
              <LockKeyhole size={32} />
            </div>

            <h1>Create a new password.</h1>

            <p>
              Set a strong password and get back to discovering
              trusted travel companions with TripMitra.
            </p>

            <ul className="auth-trust-list">
              <li>
                <CheckCircle2 size={18} />
                Keep your account secure
              </li>

              <li>
                <CheckCircle2 size={18} />
                Use at least 8 characters
              </li>

              <li>
                <CheckCircle2 size={18} />
                Never share your password
              </li>
            </ul>
          </div>
        </section>

        {/* RESET PASSWORD */}
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

            {!success ? (
              <>
                <div className="auth-card-header">
                  <div className="auth-icon">
                    <LockKeyhole size={24} />
                  </div>

                  <h2>Reset Password</h2>

                  <p>
                    Enter your new password below to secure your
                    TripMitra account.
                  </p>
                </div>

                <form
                  className="auth-form"
                  onSubmit={handleSubmit}
                >
                  <div>
                    <label htmlFor="password">
                      New Password
                    </label>

                    <div className="auth-input-wrap">
                      <LockKeyhole size={18} />

                      <input
                        id="password"
                        type="password"
                        placeholder="Enter new password"
                        value={password}
                        onChange={(e) =>
                          setPassword(e.target.value)
                        }
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="confirmPassword">
                      Confirm Password
                    </label>

                    <div className="auth-input-wrap">
                      <LockKeyhole size={18} />

                      <input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) =>
                          setConfirmPassword(e.target.value)
                        }
                        autoComplete="new-password"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="auth-error">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="auth-submit"
                    disabled={loading}
                  >
                    {loading
                      ? "Updating Password..."
                      : "Update Password"}
                  </button>
                </form>

                <div className="auth-security-note">
                  <ShieldCheck size={17} />

                  <span>
                    For your security, choose a password that
                    you do not use on other websites.
                  </span>
                </div>
              </>
            ) : (
              <div className="auth-success">
                <div className="auth-success-icon">
                  <CheckCircle2 size={38} />
                </div>

                <h2>Password Updated</h2>

                <p>
                  Your new password has been successfully set.
                  You can now continue to your TripMitra account.
                </p>

                <p className="auth-success-note">
                  Demo mode: actual password update will be
                  connected with Supabase Auth in the next step.
                </p>

                <button
                  type="button"
                  className="auth-submit"
                  onClick={() => navigate("/login")}
                  style={{ marginTop: "20px" }}
                >
                  Continue to Login
                </button>
              </div>
            )}

          </div>
        </section>

      </div>
    </div>
  );
}

export default ResetPassword;