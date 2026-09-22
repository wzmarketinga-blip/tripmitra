import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  Lock,
} from "lucide-react";
import { supabase } from "../lib/supabase";

const REGISTRATION_FEE = 799;

const RAZORPAY_CHECKOUT_URL =
  "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const existingScript = document.querySelector(
      `script[src="${RAZORPAY_CHECKOUT_URL}"]`
    );

    if (existingScript) {
      existingScript.addEventListener("load", () =>
        resolve(true)
      );

      existingScript.addEventListener("error", () =>
        resolve(false)
      );

      return;
    }

    const script = document.createElement("script");

    script.src = RAZORPAY_CHECKOUT_URL;
    script.async = true;

    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);

    document.body.appendChild(script);
  });
}

export default function Payment() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] =
    useState(true);

  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [paymentId, setPaymentId] = useState("");

  /* =====================================================
     GET CURRENT SESSION ACCESS TOKEN
  ===================================================== */

  const getCurrentSession = async () => {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    if (!session?.access_token) {
      throw new Error(
        "Your login session is missing. Please logout and login again."
      );
    }

    return session;
  };

  /* =====================================================
     CHECK CURRENT USER + EXISTING PAYMENT
  ===================================================== */

  useEffect(() => {
    let mounted = true;

    const checkExistingPayment = async () => {
      try {
        setCheckingPayment(true);
        setError("");

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          navigate("/login", {
            replace: true,
          });

          return;
        }

        const {
          data: profile,
          error: profileError,
        } = await supabase
          .from("profiles")
          .select("registration_paid")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!mounted) return;

        if (
          profile?.registration_paid === true
        ) {
          const savedPaymentId =
            sessionStorage.getItem(
              "tripmitra_payment_id"
            );

          if (savedPaymentId) {
            setPaymentId(savedPaymentId);
          }

          setSuccess(true);
        }
      } catch (err) {
        console.error(
          "Payment status check failed:",
          err
        );

        if (!mounted) return;

        setError(
          err?.message ||
            "Unable to check your payment status."
        );
      } finally {
        if (mounted) {
          setCheckingPayment(false);
        }
      }
    };

    checkExistingPayment();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  /* =====================================================
     RAZORPAY PAYMENT
  ===================================================== */

  const handlePayment = async () => {
    setError("");

    try {
      setLoading(true);

      /* -----------------------------------------------
         GET LOGGED-IN USER
      ------------------------------------------------ */

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        throw new Error(
          "Your session has expired. Please login again."
        );
      }

      /* -----------------------------------------------
         GET CURRENT SESSION TOKEN
      ------------------------------------------------ */

      const session =
        await getCurrentSession();

      const accessToken =
        session.access_token;

      console.log(
        "Supabase session found for payment."
      );

      /* -----------------------------------------------
         CHECK IF ALREADY PAID
      ------------------------------------------------ */

      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select("registration_paid")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (
        profile?.registration_paid === true
      ) {
        const existingPaymentId =
          sessionStorage.getItem(
            "tripmitra_payment_id"
          );

        if (existingPaymentId) {
          setPaymentId(
            existingPaymentId
          );
        }

        setSuccess(true);
        setLoading(false);

        return;
      }

      /* -----------------------------------------------
         LOAD RAZORPAY CHECKOUT
      ------------------------------------------------ */

      const razorpayLoaded =
        await loadRazorpayScript();

      if (!razorpayLoaded) {
        throw new Error(
          "Razorpay Checkout load nahi ho paya. Internet connection check karke dobara try karein."
        );
      }

      /* -----------------------------------------------
         CREATE UNIQUE RECEIPT
      ------------------------------------------------ */

      const receipt =
        `TM_REG_${user.id.slice(
          0,
          8
        )}_${Date.now()}`;

      console.log(
        "Creating Razorpay order..."
      );

      /* -----------------------------------------------
         CREATE RAZORPAY ORDER
         EXPLICIT AUTHORIZATION HEADER
      ------------------------------------------------ */

      const {
        data: orderData,
        error: orderError,
      } = await supabase.functions.invoke(
        "create-razorpay-order",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },

          body: {
            amount:
              REGISTRATION_FEE * 100,

            receipt,
          },
        }
      );

      if (orderError) {
        console.error(
          "Razorpay order function error:",
          orderError
        );

        throw new Error(
          orderError.message ||
            "Payment order create nahi ho paya."
        );
      }

      console.log(
        "Razorpay order response:",
        orderData
      );

      if (
        !orderData?.success ||
        !orderData?.order_id
      ) {
        throw new Error(
          orderData?.error ||
            "Razorpay order create nahi ho paya."
        );
      }

      /* -----------------------------------------------
         RAZORPAY CHECKOUT OPTIONS
      ------------------------------------------------ */

      const options = {
        key: orderData.key_id,

        amount:
          orderData.amount,

        currency:
          orderData.currency || "INR",

        name: "TripMitra",

        description:
          "TripMitra Registration",

        order_id:
          orderData.order_id,

        prefill: {
          name:
            user.user_metadata
              ?.full_name ||
            user.user_metadata
              ?.name ||
            "",

          email:
            user.email || "",
        },

        notes: {
          user_id: user.id,
          payment_type:
            "registration",
        },

        theme: {
          color: "#2563EB",
        },

        /* ---------------------------------------------
           PAYMENT SUCCESS
        --------------------------------------------- */

        handler: async function (
          response
        ) {
          try {
            setLoading(true);
            setError("");

            console.log(
              "Razorpay success response:",
              response
            );

            const razorpayPaymentId =
              response?.razorpay_payment_id;

            const razorpayOrderId =
              response?.razorpay_order_id;

            const razorpaySignature =
              response?.razorpay_signature;

            if (
              !razorpayPaymentId ||
              !razorpayOrderId ||
              !razorpaySignature
            ) {
              throw new Error(
                "Razorpay payment verification details incomplete hain."
              );
            }

            setPaymentId(
              razorpayPaymentId
            );

            /* -----------------------------------------
               GET FRESH SESSION TOKEN
            ----------------------------------------- */

            const verifySession =
              await getCurrentSession();

            const verifyAccessToken =
              verifySession.access_token;

            console.log(
              "Calling verify-razorpay-payment..."
            );

            /* -----------------------------------------
               SERVER-SIDE PAYMENT VERIFICATION
               EXPLICIT AUTHORIZATION HEADER
            ----------------------------------------- */

            const {
              data: verificationData,
              error: verificationError,
            } =
              await supabase.functions.invoke(
                "verify-razorpay-payment",
                {
                  headers: {
                    Authorization: `Bearer ${verifyAccessToken}`,
                  },

                  body: {
                    razorpay_order_id:
                      razorpayOrderId,

                    razorpay_payment_id:
                      razorpayPaymentId,

                    razorpay_signature:
                      razorpaySignature,
                  },
                }
              );

            console.log(
              "Verification response:",
              verificationData
            );

            if (
              verificationError
            ) {
              console.error(
                "Verification Edge Function error:",
                verificationError
              );

              throw new Error(
                verificationError.message ||
                  "Payment verification service failed."
              );
            }

            if (
              !verificationData?.success
            ) {
              console.error(
                "Payment verification failed:",
                verificationData
              );

              throw new Error(
                verificationData?.error ||
                  "Payment verification failed."
              );
            }

            /* -----------------------------------------
               VERIFIED SUCCESS
            ----------------------------------------- */

            sessionStorage.setItem(
              "tripmitra_registration_paid",
              "true"
            );

            sessionStorage.setItem(
              "tripmitra_payment_id",
              razorpayPaymentId
            );

            setPaymentId(
              razorpayPaymentId
            );

            setSuccess(true);
          } catch (
            verificationError
          ) {
            console.error(
              "Final payment verification error:",
              verificationError
            );

            setError(
              verificationError?.message ||
                "Payment hua hai, lekin verification complete nahi hua. Please contact support."
            );
          } finally {
            setLoading(false);
          }
        },

        /* ---------------------------------------------
           PAYMENT MODAL CLOSED
        --------------------------------------------- */

        modal: {
          ondismiss:
            function () {
              setLoading(false);
            },
        },
      };

      /* -----------------------------------------------
         CREATE RAZORPAY INSTANCE
      ------------------------------------------------ */

      const razorpay =
        new window.Razorpay(
          options
        );

      /* -----------------------------------------------
         PAYMENT FAILED
      ------------------------------------------------ */

      razorpay.on(
        "payment.failed",
        function (response) {
          console.error(
            "Razorpay payment failed:",
            response
          );

          setError(
            response?.error
              ?.description ||
              "Payment failed. Please try again."
          );

          setLoading(false);
        }
      );

      /* -----------------------------------------------
         OPEN RAZORPAY
      ------------------------------------------------ */

      razorpay.open();
    } catch (err) {
      console.error(
        "Payment error:",
        err
      );

      setError(
        err?.message ||
          "Payment could not be started. Please try again."
      );

      setLoading(false);
    }
  };

  /* =====================================================
     LOADING
  ===================================================== */

  if (checkingPayment) {
    return (
      <div className="auth-page">
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          Checking payment status...
        </div>
      </div>
    );
  }

  /* =====================================================
     SUCCESS
  ===================================================== */

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-wrapper">
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

          <div className="auth-card">
            <div
              style={{
                width: "76px",
                height: "76px",
                borderRadius: "50%",
                background:
                  "#dcfce7",
                color: "#16a34a",
                display: "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                margin:
                  "0 auto 20px",
              }}
            >
              <CheckCircle2
                size={42}
              />
            </div>

            <div className="auth-heading">
              <h1>
                Payment Successful
              </h1>

              <p>
                Your TripMitra registration
                payment has been verified
                successfully.
              </p>
            </div>

            <div
              style={{
                padding: "18px",
                borderRadius:
                  "14px",
                background:
                  "#f8fafc",
                border:
                  "1px solid #e2e8f0",
                marginTop: "20px",
                marginBottom:
                  "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  marginBottom:
                    "12px",
                }}
              >
                <span>
                  Registration Fee
                </span>

                <strong>
                  ₹{REGISTRATION_FEE}
                </strong>
              </div>

              {paymentId && (
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    fontSize:
                      "13px",
                    color:
                      "#64748b",
                  }}
                >
                  <span>
                    Payment ID
                  </span>

                  <strong
                    style={{
                      color:
                        "#0f172a",
                      wordBreak:
                        "break-all",
                      textAlign:
                        "right",
                    }}
                  >
                    {paymentId}
                  </strong>
                </div>
              )}
            </div>

            <div
              style={{
                padding: "14px",
                borderRadius:
                  "12px",
                background:
                  "#eff6ff",
                color: "#1d4ed8",
                fontSize:
                  "13px",
                marginBottom:
                  "20px",
                lineHeight: 1.5,
              }}
            >
              <strong>
                Account Activated ✓
              </strong>

              <br />

              Payment verified and
              your TripMitra account
              is now active.
            </div>

            <button
              type="button"
              className="btn btn-primary auth-submit"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
            >
              Go to Dashboard
            </button>
          </div>

          <p className="auth-footer">
            🔒 TripMitra • Safe & trusted
            travel community
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     PAYMENT PAGE
  ===================================================== */

  return (
    <div className="auth-page">
      <div className="auth-wrapper">
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

        <div className="auth-card">
          <button
            type="button"
            className="auth-back"
            onClick={() =>
              navigate(
                "/verification"
              )
            }
          >
            <ArrowLeft
              size={17}
            />
            Back
          </button>

          <div className="auth-heading">
            <div className="auth-icon">
              <CreditCard
                size={25}
              />
            </div>

            <h1>
              Registration Payment
            </h1>

            <p>
              Complete your one-time
              registration payment to
              activate your TripMitra
              account.
            </p>
          </div>

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

          {/* AMOUNT */}

          <div
            style={{
              padding: "24px",
              borderRadius:
                "16px",
              background:
                "#f8fafc",
              border:
                "1px solid #e2e8f0",
              marginBottom:
                "20px",
              textAlign:
                "center",
            }}
          >
            <div
              style={{
                color:
                  "#64748b",
                fontSize:
                  "14px",
                marginBottom:
                  "8px",
              }}
            >
              TripMitra Registration
              Fee
            </div>

            <div
              style={{
                fontSize:
                  "38px",
                fontWeight: 800,
                color:
                  "#0f172a",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                gap: "3px",
              }}
            >
              <IndianRupee
                size={29}
              />

              {REGISTRATION_FEE}
            </div>

            <div
              style={{
                marginTop:
                  "8px",
                fontSize:
                  "12px",
                color:
                  "#64748b",
              }}
            >
              One-time registration
              fee
            </div>
          </div>

          {/* BENEFITS */}

          <div
            style={{
              display:
                "grid",
              gap: "12px",
              marginBottom:
                "22px",
            }}
          >
            <div
              style={{
                display:
                  "flex",
                gap: "10px",
                alignItems:
                  "center",
                fontSize:
                  "14px",
              }}
            >
              <CheckCircle2
                size={18}
                color="#16a34a"
              />

              Verified travel
              community access
            </div>

            <div
              style={{
                display:
                  "flex",
                gap: "10px",
                alignItems:
                  "center",
                fontSize:
                  "14px",
              }}
            >
              <CheckCircle2
                size={18}
                color="#16a34a"
              />

              Discover travel
              companions
            </div>

            <div
              style={{
                display:
                  "flex",
                gap: "10px",
                alignItems:
                  "center",
                fontSize:
                  "14px",
              }}
            >
              <CheckCircle2
                size={18}
                color="#16a34a"
              />

              Trips, requests
              and messaging
            </div>

            <div
              style={{
                display:
                  "flex",
                gap: "10px",
                alignItems:
                  "center",
                fontSize:
                  "14px",
              }}
            >
              <CheckCircle2
                size={18}
                color="#16a34a"
              />

              Secure payment
              verification
            </div>
          </div>

          {/* TEST MODE */}

          <div
            style={{
              padding:
                "14px",
              borderRadius:
                "12px",
              background:
                "#eff6ff",
              color:
                "#1d4ed8",
              fontSize:
                "13px",
              marginBottom:
                "20px",
              lineHeight: 1.5,
            }}
          >
            <strong>
              Razorpay Test Mode
            </strong>

            <br />

            Abhi test payment
            chalega. Is mode mein
            real paisa charge nahi
            hoga.
          </div>

          {/* PAYMENT BUTTON */}

          <button
            type="button"
            className="btn btn-primary auth-submit"
            onClick={
              handlePayment
            }
            disabled={loading}
          >
            {loading ? (
              "Verifying Payment..."
            ) : (
              <>
                <CreditCard
                  size={18}
                />

                Pay ₹
                {REGISTRATION_FEE}
                {" "}
                Securely
              </>
            )}
          </button>

          {/* SECURITY */}

          <div
            style={{
              marginTop:
                "18px",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              gap: "6px",
              textAlign:
                "center",
              color:
                "#64748b",
              fontSize:
                "12px",
            }}
          >
            <Lock
              size={13}
            />

            Secure payment
            processing by Razorpay
          </div>
        </div>

        <p className="auth-footer">
          🔒 TripMitra • Safe & trusted
          travel community
        </p>
      </div>
    </div>
  );
}