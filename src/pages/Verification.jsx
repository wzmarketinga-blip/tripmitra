import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  UserCheck,
  Upload,
  LockKeyhole,
  AlertCircle,
} from "lucide-react";

import { supabase } from "../lib/supabase";

export default function Verification() {
  const navigate = useNavigate();

  const [documentType, setDocumentType] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ==========================================
  // FILE CHANGE
  // ==========================================

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "application/pdf",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please select a JPG, PNG or PDF file."
      );

      setSelectedFile(null);
      setFileName("");

      return;
    }

    // 10 MB limit
    if (
      file.size >
      10 * 1024 * 1024
    ) {
      setError(
        "File size must be less than 10 MB."
      );

      setSelectedFile(null);
      setFileName("");

      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
    setError("");
  };

  // ==========================================
  // SUBMIT VERIFICATION
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    // ------------------------------------------
    // VALIDATION
    // ------------------------------------------

    if (!documentType) {
      setError(
        "Please select a document type."
      );

      return;
    }

    if (!selectedFile) {
      setError(
        "Please select a document to continue."
      );

      return;
    }

    if (!agreed) {
      setError(
        "Please confirm that the information provided is accurate."
      );

      return;
    }

    try {
      setLoading(true);

      // ========================================
      // GET CURRENT USER
      // ========================================

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        setError(
          "Your session has expired. Please login again."
        );

        navigate("/login");

        return;
      }

      // ========================================
      // CREATE UNIQUE FILE PATH
      // ========================================

      const fileExtension =
        selectedFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "file";

      const filePath =
        `${user.id}/verification-${Date.now()}.${fileExtension}`;

      // ========================================
      // UPLOAD TO PRIVATE STORAGE
      // ========================================

      const {
        error: uploadError,
      } = await supabase.storage
        .from(
          "verification-documents"
        )
        .upload(
          filePath,
          selectedFile,
          {
            cacheControl:
              "3600",

            upsert:
              false,

            contentType:
              selectedFile.type,
          }
        );

      if (uploadError) {
        console.error(
          "Verification document upload error:",
          uploadError
        );

        throw new Error(
          uploadError.message ||
            "Document upload failed."
        );
      }

      // ========================================
      // CREATE VERIFICATION REQUEST
      // ========================================

      const {
        error: verificationError,
      } = await supabase
        .from(
          "verification_requests"
        )
        .insert({
          user_id:
            user.id,

          document_type:
            documentType,

          document_url:
            filePath,

          status:
            "pending",
        });

      if (verificationError) {
        console.error(
          "Verification request database error:",
          verificationError
        );

        // --------------------------------------
        // ROLLBACK UPLOADED FILE
        // --------------------------------------

        await supabase.storage
          .from(
            "verification-documents"
          )
          .remove([
            filePath,
          ]);

        throw new Error(
          verificationError.message ||
            "Verification request could not be saved."
        );
      }

      // ========================================
      // IMPORTANT SECURITY NOTE
      // ========================================
      //
      // Do NOT update profiles.identity_verified
      // from the browser.
      //
      // identity_verified is a protected
      // verification result and should be
      // changed only by trusted admin/server logic
      // after document review.
      //
      // ========================================

      // ========================================
      // SAVE LOCAL PROGRESS
      // ========================================

      sessionStorage.setItem(
        "tripmitra_verification_submitted",
        "true"
      );

      sessionStorage.setItem(
        "tripmitra_verification_document_type",
        documentType
      );

      // ========================================
      // CONTINUE TO PAYMENT
      // ========================================

      navigate(
        "/payment",
        {
          state: {
            verificationSubmitted:
              true,
          },
        }
      );
    } catch (err) {
      console.error(
        "Verification submission error:",
        err
      );

      const message =
        err?.message
          ?.toLowerCase() ||
        "";

      if (
        message.includes(
          "row-level security"
        ) ||
        message.includes(
          "rls"
        )
      ) {
        setError(
          "Verification permission is not configured yet. Please check Supabase policies."
        );
      } else if (
        message.includes(
          "bucket"
        ) ||
        message.includes(
          "storage"
        )
      ) {
        setError(
          "Document upload failed. Please check the verification storage bucket."
        );
      } else if (
        message.includes(
          "duplicate"
        ) ||
        message.includes(
          "already exists"
        )
      ) {
        setError(
          "A verification request already exists for this account."
        );
      } else {
        setError(
          err?.message ||
            "Verification submission failed. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page verification-page">

      <div className="auth-wrapper verification-wrapper">

        {/* ========================================
            LOGO
        ======================================== */}

        <div className="login-brand-minimal">

          <Link
            to="/"
            className="login-logo"
          >
            <span className="login-logo-mark">
              ✈
            </span>

            <span>
              Trip<span>Mitra</span>
            </span>
          </Link>

          <div className="login-trust">
            <ShieldCheck
              size={16}
            />

            Safe & trusted travel community
          </div>

        </div>

        {/* ========================================
            CARD
        ======================================== */}

        <div className="auth-card verification-card">

          {/* BACK */}

          <button
            type="button"
            className="auth-back"
            onClick={() =>
              navigate(
                "/verify-phone"
              )
            }
          >
            <ArrowLeft
              size={17}
            />

            Back to Phone Verification
          </button>

          {/* HEADER */}

          <div className="auth-heading">

            <div className="auth-icon">
              <UserCheck
                size={25}
              />
            </div>

            <h1>
              Identity Verification
            </h1>

            <p>
              Verify your identity to help keep the
              TripMitra community safe and trusted.
            </p>

          </div>

          {/* ========================================
              PROGRESS
          ======================================== */}

          <div className="register-progress verification-progress">

            <div className="register-progress-step completed">
              <span>
                <CheckCircle2
                  size={18}
                />
              </span>

              <small>
                Account
              </small>
            </div>

            <div className="register-progress-line active" />

            <div className="register-progress-step completed">
              <span>
                <CheckCircle2
                  size={18}
                />
              </span>

              <small>
                Phone
              </small>
            </div>

            <div className="register-progress-line active" />

            <div className="register-progress-step active">
              <span>
                3
              </span>

              <small>
                Identity
              </small>
            </div>

            <div className="register-progress-line" />

            <div className="register-progress-step">
              <span>
                4
              </span>

              <small>
                Payment
              </small>
            </div>

          </div>

          {/* ========================================
              TRUST BANNER
          ======================================== */}

          <div className="verification-trust-box">

            <div className="verification-trust-icon">
              <ShieldCheck
                size={22}
              />
            </div>

            <div>

              <strong>
                Your verification is private
              </strong>

              <p>
                Verification information is not displayed
                publicly on your profile.
              </p>

            </div>

          </div>

          {/* ========================================
              ERROR
          ======================================== */}

          {error && (
            <div className="auth-message auth-error">

              <AlertCircle
                size={18}
              />

              <span>
                {error}
              </span>

            </div>
          )}

          {/* ========================================
              FORM
          ======================================== */}

          <form
            className="auth-form verification-form"
            onSubmit={
              handleSubmit
            }
          >

            {/* DOCUMENT TYPE */}

            <label>

              <span>
                Verification Document
              </span>

              <div className="auth-input">

                <FileCheck2
                  size={18}
                />

                <select
                  value={
                    documentType
                  }
                  onChange={(e) => {
                    setDocumentType(
                      e.target.value
                    );

                    setError("");
                  }}
                  disabled={
                    loading
                  }
                >

                  <option value="">
                    Select document type
                  </option>

                  <option value="government-id">
                    Government ID
                  </option>

                  <option value="passport">
                    Passport
                  </option>

                  <option value="driving-license">
                    Driving Licence
                  </option>

                </select>

              </div>

            </label>

            {/* ====================================
                UPLOAD
            ==================================== */}

            <div className="verification-upload-section">

              <span className="verification-field-label">
                Upload Document
              </span>

              <label
                htmlFor="verification-document"
                className="verification-upload"
              >

                <div className="verification-upload-icon">
                  <Upload
                    size={24}
                  />
                </div>

                <div>

                  <strong>
                    {fileName
                      ? fileName
                      : "Choose a document"}
                  </strong>

                  <p>
                    JPG, PNG or PDF · Maximum 10 MB
                  </p>

                </div>

              </label>

              <input
                id="verification-document"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={
                  handleFileChange
                }
                className="verification-file-input"
                disabled={
                  loading
                }
              />

              {fileName && (
                <div className="verification-file-success">

                  <CheckCircle2
                    size={16}
                  />

                  Document selected successfully

                </div>
              )}

            </div>

            {/* ====================================
                SECURE UPLOAD NOTICE
            ==================================== */}

            <div className="verification-demo-note">

              <LockKeyhole
                size={18}
              />

              <div>

                <strong>
                  Secure document upload
                </strong>

                <p>
                  Your document will be securely stored
                  in TripMitra's private verification storage
                  for review.
                </p>

              </div>

            </div>

            {/* ====================================
                CONFIRMATION
            ==================================== */}

            <label className="verification-agreement">

              <input
                type="checkbox"
                checked={
                  agreed
                }
                onChange={(e) => {
                  setAgreed(
                    e.target.checked
                  );

                  setError("");
                }}
                disabled={
                  loading
                }
              />

              <span>
                I confirm that the information provided
                by me is accurate and belongs to me.
              </span>

            </label>

            {/* ====================================
                SUBMIT
            ==================================== */}

            <button
              type="submit"
              className="btn btn-primary auth-submit"
              disabled={
                loading
              }
            >
              {loading ? (
                "Uploading & Submitting..."
              ) : (
                <>
                  Continue to Payment

                  <ArrowRight
                    size={18}
                  />
                </>
              )}
            </button>

          </form>

          {/* ========================================
              BENEFITS
          ======================================== */}

          <div className="verification-benefits">

            <h3>

              <ShieldCheck
                size={19}
              />

              Why verify your identity?

            </h3>

            <div className="verification-benefit-list">

              <div>

                <CheckCircle2
                  size={17}
                />

                <span>
                  Builds trust between travellers
                </span>

              </div>

              <div>

                <CheckCircle2
                  size={17}
                />

                <span>
                  Helps reduce fake profiles
                </span>

              </div>

              <div>

                <CheckCircle2
                  size={17}
                />

                <span>
                  Verified badge can appear on your profile
                </span>

              </div>

            </div>

          </div>

        </div>

        {/* FOOTER */}

        <p className="auth-footer">
          🔒 Your personal verification information remains private.
        </p>

      </div>

    </div>
  );
}