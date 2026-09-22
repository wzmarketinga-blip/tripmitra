import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  CalendarDays,
  Phone,
  Mail,
  MapPin,
  LockKeyhole,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

function calculateAge(dateString) {
  const today = new Date();
  const birthDate = new Date(`${dateString}T00:00:00`);

  let age = today.getFullYear() - birthDate.getFullYear();

  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birthDate.getDate())
  ) {
    age--;
  }

  return age;
}

function isValidDate(dateString) {
  if (!dateString) return false;

  const parts = dateString.split("-");

  if (
    parts.length !== 3 ||
    parts[0].length !== 4 ||
    parts[1].length !== 2 ||
    parts[2].length !== 2
  ) {
    return false;
  }

  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }

  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    fullName: "",
    dob: "",
    gender: "",
    mobile: "",
    email: "",
    state: "",
    city: "",
    password: "",
    confirmPassword: "",
    terms: false,
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const updateField = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const mobile = form.mobile.trim();
    const state = form.state.trim();
    const city = form.city.trim();

    /* =========================
       VALIDATION
    ========================= */

    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }

    if (fullName.length < 2) {
      setError("Please enter a valid full name.");
      return;
    }

    if (!form.dob) {
      setError("Please enter your complete date of birth.");
      return;
    }

    if (!isValidDate(form.dob)) {
      setError("Please enter a valid date of birth.");
      return;
    }

    const age = calculateAge(form.dob);

    if (age < 18) {
      setError(
        "You must be at least 18 years old to join TripMitra."
      );
      return;
    }

    if (age > 120) {
      setError("Please enter a valid date of birth.");
      return;
    }

    if (!form.gender) {
      setError("Please select your gender.");
      return;
    }

    if (!mobile) {
      setError("Please enter your mobile number.");
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, "");

    if (cleanMobile.length !== 10) {
      setError(
        "Please enter a valid 10-digit mobile number."
      );
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!state) {
      setError("Please enter your state.");
      return;
    }

    if (!city) {
      setError("Please enter your city.");
      return;
    }

    if (!form.password) {
      setError("Please create a password.");
      return;
    }

    if (form.password.length < 8) {
      setError(
        "Password must be at least 8 characters long."
      );
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!form.terms) {
      setError(
        "Please accept the Terms & Conditions to continue."
      );
      return;
    }

    try {
      setLoading(true);

      /* =========================
         STEP 1: CREATE AUTH ACCOUNT
      ========================= */

      const {
        data: signUpData,
        error: signUpError,
      } = await supabase.auth.signUp({
        email,
        password: form.password,

        options: {
          data: {
            full_name: fullName,
            dob: form.dob,
            gender: form.gender,
            phone: cleanMobile,
            state,
            city,
          },
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData?.user) {
        throw new Error(
          "Account could not be created. Please try again."
        );
      }

      /* =========================
         STEP 2: CHECK SESSION
      ========================= */

      let session = signUpData.session;

      if (!session) {
        const {
          data: sessionData,
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        session = sessionData?.session || null;
      }

      /*
       * TripMitra needs an active authenticated session
       * because the next step is Verify Phone.
       *
       * When Supabase Confirm Email is OFF,
       * signUp() returns an authenticated session.
       */

      if (!session) {
        throw new Error(
          "Account created, but no active session was found. Please disable Confirm Email in Supabase Authentication > Providers > Email, then try again."
        );
      }

      /* =========================
         STEP 3: SAVE PROFILE
      ========================= */

      const {
        error: profileError,
      } = await supabase.from("profiles").upsert(
        {
          id: signUpData.user.id,
          full_name: fullName,
          email,
          phone: cleanMobile,
          dob: form.dob,
          gender: form.gender,
          state,
          city,
        },
        {
          onConflict: "id",
        }
      );

      /*
       * Profile may already have been created
       * by the database trigger.
       *
       * Therefore we do not stop registration
       * if the upsert encounters a non-critical issue.
       */

      if (profileError) {
        console.error(
          "Profile save error:",
          profileError
        );
      }

      /* =========================
         STEP 4: TEMP REGISTRATION DATA
      ========================= */

      sessionStorage.setItem(
        "tripmitra_registration_email",
        email
      );

      sessionStorage.setItem(
        "tripmitra_registration_mobile",
        cleanMobile
      );

      sessionStorage.setItem(
        "tripmitra_registration_name",
        fullName
      );

      sessionStorage.setItem(
        "tripmitra_registration_user_id",
        signUpData.user.id
      );

      /* =========================
         STEP 5: CONTINUE TO PHONE
      ========================= */

      setSuccess(
        "Account created successfully. Continuing to phone verification..."
      );

      setTimeout(() => {
        navigate("/verify-phone", {
          replace: true,
        });
      }, 700);
    } catch (err) {
      console.error("Registration error:", err);

      const message =
        err?.message?.toLowerCase() || "";

      if (
        message.includes("user already registered") ||
        message.includes("already registered")
      ) {
        setError(
          "An account with this email already exists. Please login instead."
        );
      } else if (
        message.includes("password") &&
        message.includes("weak")
      ) {
        setError(
          "Your password is too weak. Please use a stronger password."
        );
      } else if (
        message.includes("invalid email")
      ) {
        setError(
          "Please enter a valid email address."
        );
      } else if (
        message.includes("rate limit") ||
        message.includes("too many requests")
      ) {
        setError(
          "Too many registration attempts. Please wait a little and try again."
        );
      } else if (
        message.includes("no active session")
      ) {
        setError(
          "Account was created, but Supabase did not create a login session. Please turn OFF Confirm Email in Supabase Authentication > Providers > Email, then try registration again."
        );
      } else {
        setError(
          err?.message ||
            "Registration failed. Please check your details and try again."
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
            <span className="login-logo-mark">
              ✈
            </span>

            <span>
              Trip<span>Mitra</span>
            </span>
          </Link>

          <div className="login-trust">
            <ShieldCheck size={16} />
            Safe & trusted travel community
          </div>
        </div>

        {/* Register Card */}
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

          {/* Heading */}
          <div className="auth-heading">
            <div className="auth-icon">
              <User size={25} />
            </div>

            <h1>Create Your Account</h1>

            <p>
              Join TripMitra and find trusted travel companions.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="auth-message auth-error">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="auth-message auth-success">
              <CheckCircle2 size={18} />
              <span>{success}</span>
            </div>
          )}

          <form
            className="auth-form"
            onSubmit={handleSubmit}
          >

            {/* Full Name */}
            <label>
              <span>Full Name</span>

              <div className="auth-input">
                <User size={18} />

                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) =>
                    updateField(
                      "fullName",
                      e.target.value
                    )
                  }
                  placeholder="Enter your full name"
                  autoComplete="name"
                />
              </div>
            </label>

            {/* DOB */}
            <label>
              <span>Date of Birth</span>

              <div className="auth-input">
                <CalendarDays size={18} />

                <input
                  type="date"
                  value={form.dob}
                  onChange={(e) =>
                    updateField(
                      "dob",
                      e.target.value
                    )
                  }
                  max={
                    new Date()
                      .toISOString()
                      .split("T")[0]
                  }
                />
              </div>
            </label>

            {/* Gender */}
            <label>
              <span>Gender</span>

              <div className="auth-input">
                <User size={18} />

                <select
                  value={form.gender}
                  onChange={(e) =>
                    updateField(
                      "gender",
                      e.target.value
                    )
                  }
                >
                  <option value="">
                    Select gender
                  </option>

                  <option value="male">
                    Male
                  </option>

                  <option value="female">
                    Female
                  </option>

                  <option value="other">
                    Other
                  </option>

                  <option value="prefer_not_to_say">
                    Prefer not to say
                  </option>
                </select>
              </div>
            </label>

            {/* Mobile */}
            <label>
              <span>Mobile Number</span>

              <div className="auth-input">
                <Phone size={18} />

                <input
                  type="tel"
                  inputMode="numeric"
                  value={form.mobile}
                  onChange={(e) =>
                    updateField(
                      "mobile",
                      e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 10)
                    )
                  }
                  placeholder="10-digit mobile number"
                  autoComplete="tel"
                  maxLength={10}
                />
              </div>
            </label>

            {/* Email */}
            <label>
              <span>Email Address</span>

              <div className="auth-input">
                <Mail size={18} />

                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    updateField(
                      "email",
                      e.target.value
                    )
                  }
                  placeholder="Enter your email address"
                  autoComplete="email"
                />
              </div>
            </label>

            {/* State */}
            <label>
              <span>State</span>

              <div className="auth-input">
                <MapPin size={18} />

                <input
                  type="text"
                  value={form.state}
                  onChange={(e) =>
                    updateField(
                      "state",
                      e.target.value
                    )
                  }
                  placeholder="Enter your state"
                  autoComplete="address-level1"
                />
              </div>
            </label>

            {/* City */}
            <label>
              <span>City</span>

              <div className="auth-input">
                <MapPin size={18} />

                <input
                  type="text"
                  value={form.city}
                  onChange={(e) =>
                    updateField(
                      "city",
                      e.target.value
                    )
                  }
                  placeholder="Enter your city"
                  autoComplete="address-level2"
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
                  value={form.password}
                  onChange={(e) =>
                    updateField(
                      "password",
                      e.target.value
                    )
                  }
                  placeholder="Create a password"
                  autoComplete="new-password"
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
                >
                  {showPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            {/* Confirm Password */}
            <label>
              <span>Confirm Password</span>

              <div className="auth-input auth-password-input">
                <LockKeyhole size={18} />

                <input
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={form.confirmPassword}
                  onChange={(e) =>
                    updateField(
                      "confirmPassword",
                      e.target.value
                    )
                  }
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (prev) => !prev
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>
              </div>
            </label>

            {/* Terms */}
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                color: "#64748b",
                fontSize: "13px",
                lineHeight: 1.5,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) =>
                  updateField(
                    "terms",
                    e.target.checked
                  )
                }
                style={{
                  width: "16px",
                  height: "16px",
                  marginTop: "2px",
                  accentColor: "#2563eb",
                  flexShrink: 0,
                }}
              />

              <span>
                I agree to TripMitra's{" "}
                <span
                  style={{
                    color: "#2563eb",
                    fontWeight: 600,
                  }}
                >
                  Terms & Conditions
                </span>{" "}
                and{" "}
                <span
                  style={{
                    color: "#2563eb",
                    fontWeight: 600,
                  }}
                >
                  Privacy Policy
                </span>
                .
              </span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={loading}
            >
              {loading
                ? "Creating Account..."
                : "Create TripMitra Account"}
            </button>
          </form>

          {/* Login */}
          <p className="auth-bottom">
            Already have an account?{" "}
            <Link to="/login">
              Login
            </Link>
          </p>

          {/* Security */}
          <div className="register-security">
            <ShieldCheck size={18} />

            <div>
              <strong>
                Your information is secure
              </strong>

              <p>
                Your account is protected by Supabase
                Authentication and secure database policies.
              </p>
            </div>
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