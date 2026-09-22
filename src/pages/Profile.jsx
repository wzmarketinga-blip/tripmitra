import {
  ArrowLeft,
  CheckCircle2,
  Languages,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRound,
  X,
  Ban,
  Flag,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useProfile } from "../context/ProfileContext";
import { supabase } from "../lib/supabase";

function formatLanguages(languages) {
  if (!languages) return "Not specified";

  if (Array.isArray(languages)) {
    return languages.length
      ? languages.join(", ")
      : "Not specified";
  }

  return String(languages);
}

function formatInterests(interests) {
  if (!interests) return [];

  if (Array.isArray(interests)) {
    return interests;
  }

  if (typeof interests === "string") {
    return interests
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof interests === "object") {
    return Object.values(interests)
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  return [];
}

export default function Profile() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { profile: myProfile } = useProfile();

  const [profile, setProfile] = useState(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [pageError, setPageError] = useState("");

  const [showRequest, setShowRequest] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [existingRequestStatus, setExistingRequestStatus] =
    useState("");

  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDetails, setReportDetails] = useState("");
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const [blockLoading, setBlockLoading] = useState(false);

  const [request, setRequest] = useState({
    destination: "",
    date: "",
    duration: "",
    message: "",
  });

  // ==========================================
  // LOAD PROFILE
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        setPageLoading(true);
        setPageError("");

        if (!id) {
          throw new Error("Profile not found.");
        }

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          navigate("/login");
          return;
        }

        if (user.id === id) {
          navigate("/profile/edit");
          return;
        }

        // ==========================================
        // SAFE PUBLIC PROFILE VIEW
        // ==========================================

        const {
          data,
          error: profileError,
        } = await supabase
          .from("public_profiles")
          .select(`
            id,
            full_name,
            age,
            city,
            state,
            languages,
            travel_interests,
            travel_style,
            about,
            identity_verified
          `)
          .eq("id", id)
          .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        if (!data) {
          throw new Error(
            "This traveller profile could not be found."
          );
        }

        if (!mounted) return;

        setProfile({
          id: data.id,

          name:
            data.full_name ||
            "TripMitra Traveller",

          age:
            typeof data.age === "number"
              ? data.age
              : null,

          city:
            data.city ||
            "India",

          state:
            data.state ||
            "",

          languages:
            formatLanguages(
              data.languages
            ),

          travelStyle:
            data.travel_style ||
            "Travel Companion",

          about:
            data.about ||
            "This traveller has not added an introduction yet.",

          interests:
            formatInterests(
              data.travel_interests
            ),

          verified:
            Boolean(
              data.identity_verified
            ),
        });

        // ==========================================
        // CHECK EXISTING REQUEST
        // ==========================================

        const {
          data: existingRequest,
          error: requestError,
        } = await supabase
          .from("travel_requests")
          .select(
            "id, status, created_at"
          )
          .eq(
            "sender_id",
            user.id
          )
          .eq(
            "receiver_id",
            id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

        if (requestError) {
          console.error(
            "Existing request check error:",
            requestError
          );
        }

        if (
          existingRequest &&
          mounted
        ) {
          const status = String(
            existingRequest.status ||
              ""
          ).toUpperCase();

          if (
            status === "PENDING" ||
            status === "ACCEPTED"
          ) {
            setExistingRequestStatus(
              status
            );
          } else {
            setExistingRequestStatus("");
          }
        }
      } catch (err) {
        console.error(
          "Profile load error:",
          err
        );

        if (!mounted) return;

        setPageError(
          err?.message ||
            "Unable to load this traveller profile."
        );
      } finally {
        if (mounted) {
          setPageLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      mounted = false;
    };
  }, [id, navigate]);

  // ==========================================
  // REQUEST FORM
  // ==========================================

  const handleRequestChange = (e) => {
    const {
      name,
      value,
    } = e.target;

    setRequest((prev) => ({
      ...prev,
      [name]: value,
    }));

    setError("");
  };

  // ==========================================
  // CREATE NOTIFICATION
  // ==========================================

  const createRequestNotification =
    async ({
      receiverId,
      senderName,
      requestId,
    }) => {
      try {
        const {
          error: notificationError,
        } = await supabase
          .from("notifications")
          .insert({
            user_id: receiverId,
            type: "TRAVEL_REQUEST",
            title: "New Travel Request",
            message:
              `${senderName} sent you a travel request.`,
            related_id:
              requestId || null,
          });

        if (notificationError) {
          console.error(
            "Notification insert error:",
            notificationError
          );
        }
      } catch (
        notificationError
      ) {
        console.error(
          "Notification creation failed:",
          notificationError
        );
      }
    };

  // ==========================================
  // SEND TRAVEL REQUEST
  // ==========================================

  const handleSendRequest = async (e) => {
    e.preventDefault();
    setError("");

    if (!request.destination.trim()) {
      setError(
        "Please enter destination."
      );
      return;
    }

    if (!request.date) {
      setError(
        "Please select travel date."
      );
      return;
    }

    if (!request.duration) {
      setError(
        "Please select trip duration."
      );
      return;
    }

    if (!request.message.trim()) {
      setError(
        "Please write a short message."
      );
      return;
    }

    if (
      request.message.trim().length < 10
    ) {
      setError(
        "Message should contain at least 10 characters."
      );
      return;
    }

    const selectedDate =
      new Date(
        `${request.date}T00:00:00`
      );

    const today = new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    if (selectedDate < today) {
      setError(
        "Travel date must be today or a future date."
      );
      return;
    }

    if (
      existingRequestStatus ===
      "PENDING"
    ) {
      setError(
        "You already have a pending request with this traveller."
      );
      return;
    }

    if (
      existingRequestStatus ===
      "ACCEPTED"
    ) {
      setError(
        "Your travel request with this traveller is already accepted."
      );
      return;
    }

    try {
      setLoading(true);

      const {
        data: {
          user,
        },
        error: userError,
      } =
        await supabase.auth.getUser();

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

      if (!profile) {
        setError(
          "Traveller profile is not available."
        );
        return;
      }

      if (user.id === profile.id) {
        setError(
          "You cannot send a travel request to yourself."
        );
        return;
      }

      // ==========================================
      // CHECK BLOCKED RELATIONSHIP
      // ==========================================

      const {
        data: blockedUser,
        error: blockCheckError,
      } = await supabase
        .from("blocked_users")
        .select("id")
        .or(
          `and(blocker_id.eq.${user.id},blocked_id.eq.${profile.id}),and(blocker_id.eq.${profile.id},blocked_id.eq.${user.id})`
        )
        .limit(1)
        .maybeSingle();

      if (blockCheckError) {
        throw blockCheckError;
      }

      if (blockedUser) {
        setError(
          "You cannot send a request to this traveller."
        );
        return;
      }

      // ==========================================
      // CHECK DUPLICATE REQUEST
      // ==========================================

      const {
        data: existingRequest,
        error: existingError,
      } =
        await supabase
          .from("travel_requests")
          .select(
            "id, status"
          )
          .eq(
            "sender_id",
            user.id
          )
          .eq(
            "receiver_id",
            profile.id
          )
          .order(
            "created_at",
            {
              ascending: false,
            }
          )
          .limit(1)
          .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingRequest) {
        const status =
          String(
            existingRequest.status ||
              ""
          ).toUpperCase();

        if (status === "PENDING") {
          setExistingRequestStatus(
            "PENDING"
          );

          setError(
            "You already have a pending request with this traveller."
          );

          return;
        }

        if (status === "ACCEPTED") {
          setExistingRequestStatus(
            "ACCEPTED"
          );

          setError(
            "Your request with this traveller is already accepted."
          );

          return;
        }
      }

      // ==========================================
      // INSERT REQUEST
      // ==========================================

      const {
        data: insertedRequest,
        error: insertError,
      } =
        await supabase
          .from("travel_requests")
          .insert({
            sender_id: user.id,
            receiver_id:
              profile.id,
            destination:
              request.destination.trim(),
            travel_date:
              request.date,
            duration:
              request.duration,
            message:
              request.message.trim(),
            status: "PENDING",
          })
          .select("id")
          .single();

      if (insertError) {
        throw insertError;
      }

      // ==========================================
      // SEND NOTIFICATION
      // ==========================================

      await createRequestNotification({
        receiverId:
          profile.id,

        senderName:
          myProfile?.fullName ||
          "A TripMitra traveller",

        requestId:
          insertedRequest?.id ||
          null,
      });

      setExistingRequestStatus(
        "PENDING"
      );

      setSent(true);
    } catch (err) {
      console.error(
        "Send request error:",
        err
      );

      const message =
        err?.message || "";

      if (
        message
          .toLowerCase()
          .includes(
            "row-level security"
          )
      ) {
        setError(
          "Request permission issue. Please check the travel_requests policy."
        );
      } else {
        setError(
          message ||
            "Request could not be sent. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // BLOCK USER
  // ==========================================

  const handleBlockUser =
    async () => {
      if (!profile) return;

      const confirmed =
        window.confirm(
          `Are you sure you want to block ${profile.name}?`
        );

      if (!confirmed) return;

      try {
        setBlockLoading(true);

        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          navigate("/login");
          return;
        }

        if (user.id === profile.id) {
          return;
        }

        const {
          error: blockError,
        } =
          await supabase
            .from("blocked_users")
            .insert({
              blocker_id:
                user.id,
              blocked_id:
                profile.id,
            });

        if (blockError) {
          if (
            blockError.message
              ?.toLowerCase()
              .includes(
                "duplicate"
              )
          ) {
            alert(
              "This traveller is already blocked."
            );
            return;
          }

          throw blockError;
        }

        alert(
          `${profile.name} has been blocked successfully.`
        );

        navigate("/discover");
      } catch (err) {
        console.error(
          "Block user error:",
          err
        );

        alert(
          err?.message ||
            "Unable to block this traveller. Please try again."
        );
      } finally {
        setBlockLoading(false);
      }
    };

  // ==========================================
  // REPORT USER
  // ==========================================

  const handleReportUser =
    async (e) => {
      e.preventDefault();

      if (!reportReason) {
        alert(
          "Please select a reason."
        );
        return;
      }

      if (!profile) {
        return;
      }

      try {
        setReportLoading(true);

        const {
          data: {
            user,
          },
          error: userError,
        } =
          await supabase.auth.getUser();

        if (userError) {
          throw userError;
        }

        if (!user) {
          navigate("/login");
          return;
        }

        if (user.id === profile.id) {
          alert(
            "You cannot report yourself."
          );
          return;
        }

        const {
          error: reportError,
        } =
          await supabase
            .from("reports")
            .insert({
              reporter_id:
                user.id,

              reported_user_id:
                profile.id,

              reason:
                reportReason,

              description:
                reportDetails.trim() ||
                null,

              status:
                "PENDING",
            });

        if (reportError) {
          throw reportError;
        }

        setReportSuccess(
          true
        );
      } catch (err) {
        console.error(
          "Report user error:",
          err
        );

        alert(
          err?.message ||
            "Report could not be submitted. Please try again."
        );
      } finally {
        setReportLoading(false);
      }
    };

  // ==========================================
  // REQUEST MODAL
  // ==========================================

  const closeRequest = () => {
    setShowRequest(false);
    setSent(false);
    setError("");
  };

  const openRequest = () => {
    setError("");
    setSent(false);

    setRequest({
      destination: "",
      date: "",
      duration: "",
      message: "",
    });

    setShowRequest(true);
  };

  // ==========================================
  // REPORT MODAL
  // ==========================================

  const closeReport = () => {
    setShowReport(false);
    setReportReason("");
    setReportDetails("");
    setReportSuccess(false);
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (pageLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#64748b",
          fontSize: "16px",
          fontWeight: 600,
        }}
      >
        Loading traveller profile...
      </div>
    );
  }

  // ==========================================
  // PAGE ERROR
  // ==========================================

  if (
    pageError ||
    !profile
  ) {
    return (
      <div className="profile-page">
        <header className="dashboard-nav">
          <button
            type="button"
            className="auth-back"
            onClick={() =>
              navigate("/discover")
            }
          >
            <ArrowLeft size={17} />
            Back to Discover
          </button>
        </header>

        <main
          className="profile-container"
          style={{
            paddingTop: "60px",
          }}
        >
          <section className="profile-card">
            <div
              className="auth-message auth-error"
              style={{
                margin: 0,
              }}
            >
              <X size={18} />

              <span>
                {pageError ||
                  "Profile not found."}
              </span>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              style={{
                marginTop: "20px",
              }}
              onClick={() =>
                navigate("/discover")
              }
            >
              Back to Discover
            </button>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className="profile-page">

      {/* ========================================
          HEADER
      ======================================== */}

      <header className="dashboard-nav">
        <button
          type="button"
          className="auth-back"
          onClick={() =>
            navigate("/discover")
          }
        >
          <ArrowLeft size={17} />
          Back to Discover
        </button>

        <div className="dashboard-nav-right">
          <button
            type="button"
            className="dashboard-profile-btn"
            onClick={() =>
              navigate(
                "/profile/edit"
              )
            }
          >
            <UserRound size={18} />

            <span>
              {myProfile?.fullName ||
                "My Profile"}
            </span>
          </button>
        </div>
      </header>

      {/* ========================================
          MAIN
      ======================================== */}

      <main className="profile-container">

        {/* PROFILE HEADER */}

        <section className="profile-card">
          <div className="profile-main">

            <div className="profile-avatar">
              <UserRound size={48} />
            </div>

            <div className="profile-heading">

              <div className="profile-name-row">

                <h1>
                  {profile.name}
                </h1>

                {profile.verified && (
                  <span className="profile-verified">
                    <CheckCircle2
                      size={15}
                    />
                    Verified
                  </span>
                )}

              </div>

              <p>
                {profile.age !== null
                  ? `${profile.age} years old`
                  : "Traveller"}

                {" • "}

                {profile.city}

                {profile.state
                  ? `, ${profile.state}`
                  : ""}
              </p>

              <div className="profile-location">

                <MapPin size={16} />

                {profile.city
                  ? `Based in ${profile.city}`
                  : "TripMitra Traveller"}

              </div>

            </div>

          </div>

          <div className="profile-divider" />

          {/* INFO */}

          <div className="profile-info-grid">

            <div className="profile-info-item">

              <MapPin size={20} />

              <div>
                <span>
                  Location
                </span>

                <strong>
                  {profile.city ||
                    "India"}
                </strong>
              </div>

            </div>

            <div className="profile-info-item">

              <span className="profile-info-icon">
                🧭
              </span>

              <div>
                <span>
                  Travel Style
                </span>

                <strong>
                  {profile.travelStyle}
                </strong>
              </div>

            </div>

            <div className="profile-info-item">

              <Languages size={20} />

              <div>
                <span>
                  Languages
                </span>

                <strong>
                  {profile.languages}
                </strong>
              </div>

            </div>

            <div className="profile-info-item">

              <span className="profile-info-icon">
                🛡️
              </span>

              <div>
                <span>
                  Verification
                </span>

                <strong>
                  {profile.verified
                    ? "Verified"
                    : "Not verified yet"}
                </strong>
              </div>

            </div>

          </div>
        </section>

        {/* ABOUT + SAFETY */}

        <div className="profile-content-grid">

          <section className="profile-about-card">

            <h2>
              About{" "}
              {
                profile.name.split(" ")[0]
              }
            </h2>

            <p>
              {profile.about}
            </p>

            {profile.interests.length >
              0 && (
              <div className="profile-interest-list">

                {profile.interests.map(
                  (interest) => (
                    <span
                      key={interest}
                    >
                      {interest}
                    </span>
                  )
                )}

              </div>
            )}

          </section>

          <section className="profile-safety-card">

            <div className="profile-safety-icon">
              <ShieldCheck
                size={25}
              />
            </div>

            <div>

              <h3>
                {profile.verified
                  ? "Verified Traveller"
                  : "Traveller Profile"}
              </h3>

              <p>
                {profile.verified
                  ? "This traveller has completed TripMitra identity verification."
                  : "Always communicate safely through TripMitra and review verification information before travelling together."}
              </p>

            </div>

          </section>

        </div>

        {/* REQUEST */}

        <section className="profile-request-card">

          <div>

            <h2>
              Interested in travelling together?
            </h2>

            <p>
              Send a travel request to{" "}
              {
                profile.name.split(" ")[0]
              }{" "}
              and start a conversation after they accept.
            </p>

          </div>

          {existingRequestStatus ===
          "PENDING" ? (
            <button
              type="button"
              className="btn btn-primary"
              disabled
            >
              <CheckCircle2 size={18} />
              Request Pending
            </button>
          ) : existingRequestStatus ===
            "ACCEPTED" ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigate(
                  "/messages"
                )
              }
            >
              <MessageCircle
                size={18}
              />
              Open Chat
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={
                openRequest
              }
            >
              <MessageCircle
                size={18}
              />
              Send Travel Request
            </button>
          )}

        </section>

        {/* SAFETY ACTIONS */}

        <section
          className="profile-safety-actions"
          style={{
            marginTop: "18px",
            display: "flex",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >

          <button
            type="button"
            className="trip-cancel-btn"
            onClick={
              handleBlockUser
            }
            disabled={
              blockLoading
            }
          >
            <Ban size={17} />

            {blockLoading
              ? "Blocking..."
              : "Block Traveller"}
          </button>

          <button
            type="button"
            className="trip-cancel-btn"
            onClick={() => {
              setReportReason("");
              setReportDetails("");
              setReportSuccess(false);
              setShowReport(true);
            }}
          >
            <Flag size={17} />
            Report Traveller
          </button>

        </section>

      </main>

      {/* ========================================
          REQUEST MODAL
      ======================================== */}

      {showRequest && (
        <div className="request-modal-overlay">

          <div className="request-modal">

            {!sent ? (
              <>
                <div className="request-modal-header">

                  <div>

                    <h2>
                      Send Travel Request
                    </h2>

                    <p>
                      Request to travel with{" "}
                      {profile.name}.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="request-close"
                    onClick={
                      closeRequest
                    }
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>

                </div>

                {error && (
                  <div className="auth-message auth-error">

                    <X size={18} />

                    <span>
                      {error}
                    </span>

                  </div>
                )}

                <form
                  className="request-form"
                  onSubmit={
                    handleSendRequest
                  }
                >

                  <label>

                    <span>
                      Destination
                    </span>

                    <div className="request-input">

                      <MapPin size={18} />

                      <input
                        type="text"
                        name="destination"
                        value={
                          request.destination
                        }
                        onChange={
                          handleRequestChange
                        }
                        placeholder="e.g. Goa"
                        maxLength={120}
                      />

                    </div>

                  </label>

                  <label>

                    <span>
                      Travel Date
                    </span>

                    <div className="request-input">

                      <input
                        type="date"
                        name="date"
                        value={
                          request.date
                        }
                        onChange={
                          handleRequestChange
                        }
                        min={
                          new Date()
                            .toISOString()
                            .split("T")[0]
                        }
                      />

                    </div>

                  </label>

                  <label>

                    <span>
                      Duration
                    </span>

                    <div className="request-input">

                      <select
                        name="duration"
                        value={
                          request.duration
                        }
                        onChange={
                          handleRequestChange
                        }
                      >

                        <option value="">
                          Select duration
                        </option>

                        <option value="1-2 days">
                          1–2 days
                        </option>

                        <option value="3-4 days">
                          3–4 days
                        </option>

                        <option value="5-7 days">
                          5–7 days
                        </option>

                        <option value="1-2 weeks">
                          1–2 weeks
                        </option>

                        <option value="2+ weeks">
                          2+ weeks
                        </option>

                      </select>

                    </div>

                  </label>

                  <label>

                    <span>
                      Message
                    </span>

                    <textarea
                      name="message"
                      value={
                        request.message
                      }
                      onChange={
                        handleRequestChange
                      }
                      placeholder={`Hi ${
                        profile.name.split(" ")[0]
                      }, I'd like to travel together...`}
                      rows="4"
                      maxLength={500}
                    />

                  </label>

                  <div className="request-modal-actions">

                    <button
                      type="button"
                      className="request-cancel-btn"
                      onClick={
                        closeRequest
                      }
                      disabled={
                        loading
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={
                        loading
                      }
                    >
                      {loading
                        ? "Sending..."
                        : "Send Request"}
                    </button>

                  </div>

                </form>
              </>
            ) : (
              <div className="request-success">

                <div className="request-success-icon">
                  <CheckCircle2
                    size={38}
                  />
                </div>

                <h2>
                  Request Sent!
                </h2>

                <p>
                  Your travel request has been sent
                  to{" "}
                  <strong>
                    {profile.name}
                  </strong>.
                </p>

                <div className="auth-message auth-success">

                  <CheckCircle2
                    size={18}
                  />

                  <span>
                    Request status:{" "}
                    <strong>
                      PENDING
                    </strong>
                  </span>

                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    closeRequest
                  }
                >
                  Done
                </button>

              </div>
            )}

          </div>

        </div>
      )}

      {/* ========================================
          REPORT MODAL
      ======================================== */}

      {showReport && (
        <div className="request-modal-overlay">

          <div className="request-modal">

            {!reportSuccess ? (
              <>
                <div className="request-modal-header">

                  <div>

                    <h2>
                      Report Traveller
                    </h2>

                    <p>
                      Help us keep TripMitra safe.
                    </p>

                  </div>

                  <button
                    type="button"
                    className="request-close"
                    onClick={
                      closeReport
                    }
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>

                </div>

                <form
                  className="request-form"
                  onSubmit={
                    handleReportUser
                  }
                >

                  <label>

                    <span>
                      Reason
                    </span>

                    <div className="request-input">

                      <Flag size={18} />

                      <select
                        value={
                          reportReason
                        }
                        onChange={(e) =>
                          setReportReason(
                            e.target.value
                          )
                        }
                      >

                        <option value="">
                          Select reason
                        </option>

                        <option value="Fake profile">
                          Fake profile
                        </option>

                        <option value="Harassment">
                          Harassment
                        </option>

                        <option value="Inappropriate behaviour">
                          Inappropriate behaviour
                        </option>

                        <option value="Scam or fraud">
                          Scam or fraud
                        </option>

                        <option value="Safety concern">
                          Safety concern
                        </option>

                        <option value="Other">
                          Other
                        </option>

                      </select>

                    </div>

                  </label>

                  <label>

                    <span>
                      Additional details
                    </span>

                    <textarea
                      value={
                        reportDetails
                      }
                      onChange={(e) =>
                        setReportDetails(
                          e.target.value
                        )
                      }
                      placeholder="Tell us what happened..."
                      rows="5"
                      maxLength={1000}
                    />

                  </label>

                  <div className="request-modal-actions">

                    <button
                      type="button"
                      className="request-cancel-btn"
                      onClick={
                        closeReport
                      }
                      disabled={
                        reportLoading
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={
                        reportLoading
                      }
                    >
                      <Flag size={17} />

                      {reportLoading
                        ? "Submitting..."
                        : "Submit Report"}
                    </button>

                  </div>

                </form>
              </>
            ) : (
              <div className="request-success">

                <div className="request-success-icon">
                  <CheckCircle2
                    size={38}
                  />
                </div>

                <h2>
                  Report Submitted
                </h2>

                <p>
                  Thank you for helping keep
                  TripMitra safe.
                </p>

                <div className="auth-message auth-success">

                  <CheckCircle2
                    size={18}
                  />

                  <span>
                    Our team can review this report.
                  </span>

                </div>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    closeReport
                  }
                >
                  Done
                </button>

              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}