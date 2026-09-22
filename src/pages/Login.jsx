import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    emailOrMobile: "",
    password: "",
    remember: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const goToRegister = () => {
    setError("");
    navigate("/register");
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));

    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const loginValue = form.emailOrMobile.trim();

    if (!loginValue) {
      setError("Please enter your email address.");
      return;
    }

    if (!loginValue.includes("@")) {
      setError(
        "Please login using the email address used during registration."
      );
      return;
    }

    if (!form.password) {
      setError("Please enter your password.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    try {
      setLoading(true);

      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: loginValue.toLowerCase(),
          password: form.password,
        });

      if (loginError) {
        throw loginError;
      }

      if (!data?.user) {
        throw new Error("Login failed. Please try again.");
      }

      console.log(
        "TripMitra Login Successful:",
        data.user.email
      );

      navigate("/dashboard", { replace: true });
    } catch (err) {
      console.error("TripMitra Login Error:", err);

      const message = err?.message?.toLowerCase() || "";

      if (
        message.includes("invalid login credentials") ||
        message.includes("invalid credentials")
      ) {
        setError("Account not found or password is incorrect.");
      } else if (
        message.includes("email not confirmed")
      ) {
        setError(
          "Please confirm your email before logging in."
        );
      } else if (
        message.includes("too many requests")
      ) {
        setError(
          "Too many attempts. Please wait and try again."
        );
      } else if (
        message.includes("network") ||
        message.includes("fetch")
      ) {
        setError(
          "Unable to connect to Supabase. Please check your internet connection."
        );
      } else {
        setError(
          "Account not found. Please register first."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrapper">

        {/* Logo */}
        <div className="login-brand-minimal">
          <button
            type="button"
            className="login-logo"
            onClick={() => navigate("/")}
            style={{
              border: "none",
              background: "transparent",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <span className="login-logo-mark">✈</span>

            <span>
              Trip<span>Mitra</span>
            </span>
          </button>

          <div className="login-trust">
            <ShieldCheck size={16} />
            Safe & trusted travel community
          </div>
        </div>

        {/* Login Card */}
        <div className="auth-card">

          {/* Back */}
          <button
            type="button"
            className="auth-back"
            onClick={() => navigate("/")}
          >
            <ArrowLeft size={17} />
            Back to Home
          </button>

          <div className="auth-heading">
            <div className="auth-icon">
              <LockKeyhole size={25} />
            </div>

            <h1>Welcome Back</h1>

            <p>
              Login to continue your travel journey.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-message auth-error">
              <AlertCircle size={18} />

              <div style={{ flex: 1 }}>
                <div>{error}</div>

                {(error.toLowerCase().includes("not found") ||
                  error
                    .toLowerCase()
                    .includes("incorrect")) && (
                  <button
                    type="button"
                    onClick={goToRegister}
                    style={{
                      display: "inline-block",
                      marginTop: "6px",
                      color: "#2563eb",
                      fontWeight: 700,
                      textDecoration: "none",
                      background: "none",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                      fontSize: "inherit",
                    }}
                  >
                    Don't have an account? Register Now →
                  </button>
                )}
              </div>
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            {/* Email */}
            <label>
              <span>Email Address</span>

              <div className="auth-input">
                <Mail size={18} />

                <input
                  type="email"
                  name="emailOrMobile"
                  value={form.emailOrMobile}
                  onChange={handleChange}
                  placeholder="Enter your registered email"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>
            </label>

            {/* Password */}
            <label>
              <span>Password</span>

              <div className="auth-input auth-password-input">
                <LockKeyhole size={18} />

                <input
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  title={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            {/* Options */}
            <div className="auth-options">

              <label className="remember-me">
                <input
                  type="checkbox"
                  name="remember"
                  checked={form.remember}
                  onChange={handleChange}
                  disabled={loading}
                />

                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => navigate("/forgot-password")}
                style={{
                  background: "none",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  color: "inherit",
                  font: "inherit",
                }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Login */}
            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? (
                "Logging in..."
              ) : (
                <>
                  Login

                  <ArrowLeft
                    size={18}
                    style={{
                      transform: "rotate(180deg)",
                    }}
                  />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <span>OR</span>
          </div>

          {/* Register */}
          <div className="auth-bottom">
            <span>Don't have an account? </span>

            <button
              type="button"
              onClick={goToRegister}
              style={{
                background: "none",
                border: "none",
                padding: 0,
                color: "#2563eb",
                fontWeight: 700,
                cursor: "pointer",
                font: "inherit",
              }}
            >
              Join TripMitra
            </button>
          </div>

        </div>

        {/* Security */}
        <p className="auth-footer">
          🔒 Your account and personal information are protected.
        </p>

      </div>
    </div>
  );
}