import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export default function VerifyPhone() {
  const navigate = useNavigate();

  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    // Demo OTP
    if (otp.trim() !== "123456") {
      setError("Invalid OTP. For testing use 123456.");
      return;
    }

    try {
      setLoading(true);

      // Get logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error("User session not found. Please login again.");
      }

      const metadata = user.user_metadata || {};

      // Profile data
      // IMPORTANT: database column is "mobile", not "phone"
      const profileData = {
        id: user.id,
        full_name: metadata.full_name || "TripMitra User",
        email: user.email || "",
        mobile: metadata.phone || "",
        dob: metadata.dob || null,
        gender: metadata.gender || null,
        state: metadata.state || "",
        city: metadata.city || "",
        phone_verified: true,
        identity_verified: false,
        registration_paid: false,
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(profileData, {
          onConflict: "id",
        });

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
        throw new Error(profileError.message);
      }

      // Save verification status locally
      sessionStorage.setItem("tripmitra_phone_verified", "true");

      // Go to identity verification
      navigate("/verification");
    } catch (err) {
      console.error("Verify phone error:", err);

      const message = err?.message || "";

      if (message.toLowerCase().includes("row-level security")) {
        setError(
          "Profile permission issue. Please check the profiles INSERT policy."
        );
      } else {
        setError(
          message || "Profile could not be created. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-wrapper">

        {/* Brand */}
        <div className="login-brand-minimal">
          <Link to="/" className="login-logo">
            <span className="login-logo-mark">✈</span>

            <span>
              Trip<span>Mitra</span>
            </span>
          </Link>

          <div className="login-trust">
            <ShieldCheck size={16} />
            Safe & trusted travel community
          </div>
        </div>

        {/* Card */}
        <div className="auth-card">

          {/* Back */}
          <button
            type="button"
            className="auth-back"
            onClick={() => navigate("/register")}
          >
            <ArrowLeft size={17} />
            Back
          </button>

          {/* Heading */}
          <div className="auth-heading">
            <div className="auth-icon">
              <Smartphone size={25} />
            </div>

            <h1>Verify Your Mobile</h1>

            <p>
              Enter the OTP sent to your registered mobile number.
            </p>
          </div>

          {/* Demo OTP */}
          <div
            style={{
              padding: "14px",
              borderRadius: "12px",
              background: "#eff6ff",
              color: "#1d4ed8",
              fontSize: "14px",
              marginBottom: "18px",
              display: "flex",
              gap: "10px",
              alignItems: "flex-start",
            }}
          >
            <ShieldCheck size={20} />

            <span>
              <strong>Testing OTP:</strong> 123456
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-message auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form className="auth-form" onSubmit={handleVerify}>

            <label>
              <span>6-Digit OTP</span>

              <div className="auth-input">
                <Smartphone size={18} />

                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setError("");
                  }}
                  placeholder="Enter 123456"
                  autoComplete="one-time-code"
                />
              </div>
            </label>

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Mobile"}
            </button>
          </form>

          {/* Security message */}
          <div
            style={{
              marginTop: "20px",
              padding: "14px",
              borderRadius: "12px",
              background: "#f0fdf4",
              color: "#166534",
              display: "flex",
              gap: "10px",
              alignItems: "center",
              fontSize: "13px",
            }}
          >
            <CheckCircle2 size={18} />

            Your mobile verification is secured.
          </div>
        </div>

        {/* Footer */}
        <p className="auth-footer">
          🔒 TripMitra • Safe & trusted travel community
        </p>

      </div>
    </div>
  );
}