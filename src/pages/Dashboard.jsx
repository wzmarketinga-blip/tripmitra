import {
  Bell,
  CheckCircle2,
  Compass,
  LogOut,
  MapPin,
  MessageCircle,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
  Plane,
  Clock3,
} from "lucide-react";
import {
  Link,
  useNavigate,
} from "react-router-dom";
import {
  useEffect,
  useState,
} from "react";
import { useProfile } from "../context/ProfileContext";
import { supabase } from "../lib/supabase";

export default function Dashboard() {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const [
    unreadNotifications,
    setUnreadNotifications,
  ] = useState(0);

  const [
    liveRegistrationPaid,
    setLiveRegistrationPaid,
  ] = useState(null);

  const [
    notificationLoading,
    setNotificationLoading,
  ] = useState(true);

  // --------------------------------------------------
  // Helper
  // Supports both camelCase and database snake_case
  // --------------------------------------------------

  const getValue = (...values) => {
    for (const value of values) {
      if (
        value !== null &&
        value !== undefined
      ) {
        if (Array.isArray(value)) {
          if (value.length > 0) {
            return value;
          }
        } else if (
          typeof value === "string"
        ) {
          if (value.trim() !== "") {
            return value;
          }
        } else if (value !== "") {
          return value;
        }
      }
    }

    return "";
  };

  const fullName = getValue(
    profile?.fullName,
    profile?.full_name
  );

  const city = getValue(
    profile?.city
  );

  const state = getValue(
    profile?.state
  );

  const mobile = getValue(
    profile?.mobile,
    profile?.phone
  );

  const languages = getValue(
    profile?.languages
  );

  const travelInterests = getValue(
    profile?.travelInterests,
    profile?.travel_interests,
    profile?.interests
  );

  const travelStyle = getValue(
    profile?.travelStyle,
    profile?.travel_style
  );

  const about = getValue(
    profile?.about
  );

  const photoUrl = getValue(
    profile?.photo_url,
    profile?.photoUrl,
    profile?.photo
  );

  const phoneVerified =
    profile?.phoneVerified ??
    profile?.phone_verified ??
    false;

  const identityVerified =
    profile?.identityVerified ??
    profile?.identity_verified ??
    false;

  const registrationPaidFromProfile =
    profile?.registrationPaid ??
    profile?.registration_paid ??
    false;

  const registrationPaid =
    liveRegistrationPaid !== null
      ? liveRegistrationPaid
      : registrationPaidFromProfile;

  // --------------------------------------------------
  // PROFILE COMPLETION
  // --------------------------------------------------

  const profileFields = [
    fullName,
    city,
    state,
    languages,
    travelInterests,
    travelStyle,
    about,
    photoUrl,
  ];

  const completedFields =
    profileFields.filter((field) => {
      if (Array.isArray(field)) {
        return field.length > 0;
      }

      return (
        field !== null &&
        field !== undefined &&
        field
          .toString()
          .trim() !== ""
      );
    }).length;

  const profileCompletion =
    profileFields.length > 0
      ? Math.round(
          (completedFields /
            profileFields.length) *
            100
        )
      : 0;

  // --------------------------------------------------
  // LIVE DASHBOARD STATUS
  // --------------------------------------------------

  useEffect(() => {
    let mounted = true;
    let notificationChannel = null;

    const loadDashboardStatus =
      async () => {
        try {
          setNotificationLoading(
            true
          );

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

          // ========================================
          // LIVE REGISTRATION STATUS
          // ========================================

          const {
            data: profileData,
            error: profileError,
          } =
            await supabase
              .from("profiles")
              .select(
                "registration_paid"
              )
              .eq(
                "id",
                user.id
              )
              .maybeSingle();

          if (
            profileError
          ) {
            console.error(
              "Dashboard profile status error:",
              profileError
            );
          } else if (
            mounted &&
            typeof profileData?.registration_paid ===
              "boolean"
          ) {
            setLiveRegistrationPaid(
              profileData.registration_paid
            );
          }

          // ========================================
          // UNREAD NOTIFICATIONS
          // ========================================

          const {
            count,
            error:
              notificationError,
          } =
            await supabase
              .from(
                "notifications"
              )
              .select(
                "id",
                {
                  count:
                    "exact",
                  head: true,
                }
              )
              .eq(
                "user_id",
                user.id
              )
              .eq(
                "is_read",
                false
              );

          if (
            notificationError
          ) {
            console.error(
              "Dashboard notification count error:",
              notificationError
            );
          } else if (
            mounted
          ) {
            setUnreadNotifications(
              Number(count) ||
                0
            );
          }

          // ========================================
          // REALTIME NOTIFICATIONS
          // ========================================

          notificationChannel =
            supabase
              .channel(
                `dashboard-notifications-${user.id}`
              )
              .on(
                "postgres_changes",
                {
                  event: "INSERT",
                  schema: "public",
                  table: "notifications",
                  filter: `user_id=eq.${user.id}`,
                },
                () => {
                  if (!mounted) {
                    return;
                  }

                  setUnreadNotifications(
                    (current) =>
                      current + 1
                  );
                }
              )
              .on(
                "postgres_changes",
                {
                  event: "UPDATE",
                  schema: "public",
                  table: "notifications",
                  filter: `user_id=eq.${user.id}`,
                },
                (payload) => {
                  if (!mounted) {
                    return;
                  }

                  const oldRead =
                    payload?.old
                      ?.is_read;

                  const newRead =
                    payload?.new
                      ?.is_read;

                  if (
                    oldRead === false &&
                    newRead === true
                  ) {
                    setUnreadNotifications(
                      (current) =>
                        Math.max(
                          0,
                          current -
                            1
                        )
                    );
                  }

                  if (
                    oldRead === true &&
                    newRead === false
                  ) {
                    setUnreadNotifications(
                      (current) =>
                        current + 1
                    );
                  }
                }
              )
              .subscribe(
                (
                  status
                ) => {
                  console.log(
                    "Dashboard notification realtime:",
                    status
                  );
                }
              );
        } catch (error) {
          console.error(
            "Dashboard status loading error:",
            error
          );
        } finally {
          if (mounted) {
            setNotificationLoading(
              false
            );
          }
        }
      };

    loadDashboardStatus();

    return () => {
      mounted = false;

      if (
        notificationChannel
      ) {
        supabase.removeChannel(
          notificationChannel
        );
      }
    };
  }, [navigate]);

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout =
    async () => {
      try {
        const {
          error,
        } =
          await supabase.auth.signOut();

        if (error) {
          console.error(
            "Logout error:",
            error
          );

          alert(
            "Unable to logout. Please try again."
          );

          return;
        }

        navigate(
          "/login",
          {
            replace: true,
          }
        );
      } catch (error) {
        console.error(
          "Logout failed:",
          error
        );

        alert(
          "Unable to logout. Please try again."
        );
      }
    };

  // --------------------------------------------------
  // OPEN NOTIFICATIONS
  // --------------------------------------------------

  const openNotifications =
    () => {
      navigate(
        "/notifications"
      );
    };

  return (
    <div className="dashboard-page">
      {/* =========================
          NAVBAR
      ========================= */}

      <header className="dashboard-nav">
        <Link
          to="/"
          className="auth-logo"
        >
          <span className="logo-mark">
            ✈
          </span>

          <span>
            Trip<span>
              Mitra
            </span>
          </span>
        </Link>

        <div className="dashboard-nav-right">
          {/* NOTIFICATIONS */}

          <button
            type="button"
            className="dashboard-icon-btn"
            onClick={
              openNotifications
            }
            aria-label="Notifications"
            title="Notifications"
            style={{
              position:
                "relative",
            }}
          >
            <Bell size={20} />

            {unreadNotifications >
              0 && (
              <span
                style={{
                  position:
                    "absolute",
                  top:
                    "-4px",
                  right:
                    "-4px",
                  minWidth:
                    "19px",
                  height:
                    "19px",
                  padding:
                    "0 5px",
                  borderRadius:
                    "999px",
                  background:
                    "#ef4444",
                  color:
                    "#ffffff",
                  fontSize:
                    "10px",
                  fontWeight:
                    800,
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  border:
                    "2px solid #ffffff",
                }}
              >
                {unreadNotifications >
                99
                  ? "99+"
                  : unreadNotifications}
              </span>
            )}

            {notificationLoading &&
              unreadNotifications ===
                0 && (
                <span
                  style={{
                    position:
                      "absolute",
                    top:
                      "4px",
                    right:
                      "4px",
                    width:
                      "7px",
                    height:
                      "7px",
                    borderRadius:
                      "50%",
                    background:
                      "#94a3b8",
                  }}
                />
              )}
          </button>

          {/* MY PROFILE */}

          <button
            type="button"
            className="dashboard-profile-btn"
            onClick={() =>
              navigate(
                "/profile/edit"
              )
            }
          >
            <UserRound
              size={18}
            />

            <span>
              {fullName ||
                "Profile"}
            </span>
          </button>

          {/* LOGOUT */}

          <button
            type="button"
            className="dashboard-profile-btn"
            onClick={
              handleLogout
            }
            title="Logout"
            aria-label="Logout"
          >
            <LogOut
              size={18}
            />

            <span>
              Logout
            </span>
          </button>
        </div>
      </header>

      <main className="dashboard-container">
        {/* =========================
            WELCOME
        ========================= */}

        <section className="dashboard-welcome">
          <div>
            <p className="dashboard-eyebrow">
              Welcome to TripMitra 👋
            </p>

            <h1>
              Ready for your next
              journey,{" "}
              {fullName
                ? fullName.split(
                    " "
                  )[0]
                : "Traveller"}
              ?
            </h1>

            <p>
              Discover verified
              travel companions
              and make your next
              trip more memorable.
            </p>

            {city &&
              state && (
                <p className="dashboard-location">
                  <MapPin
                    size={15}
                  />
                  {city},{" "}
                  {state}
                </p>
              )}
          </div>

          <div className="dashboard-welcome-icon">
            <Plane size={48} />
          </div>
        </section>

        {/* =========================
            STATUS
        ========================= */}

        <section className="dashboard-status-grid">
          {/* PHONE */}

          <div className="dashboard-status-card">
            <div className="status-icon status-green">
              <CheckCircle2
                size={22}
              />
            </div>

            <div>
              <span>
                Phone
              </span>

              <strong>
                {phoneVerified
                  ? "Verified"
                  : "Pending"}
              </strong>
            </div>
          </div>

          {/* IDENTITY */}

          <div className="dashboard-status-card">
            <div className="status-icon status-green">
              <ShieldCheck
                size={22}
              />
            </div>

            <div>
              <span>
                Identity
              </span>

              <strong>
                {identityVerified
                  ? "Verified"
                  : "Pending"}
              </strong>
            </div>
          </div>

          {/* REGISTRATION */}

          <button
            type="button"
            className="dashboard-status-card"
            onClick={() => {
              if (
                !registrationPaid
              ) {
                navigate(
                  "/payment"
                );
              }
            }}
            disabled={
              registrationPaid
            }
            style={{
              width:
                "100%",
              border:
                "none",
              textAlign:
                "left",
              cursor:
                registrationPaid
                  ? "default"
                  : "pointer",
            }}
          >
            <div className="status-icon status-green">
              <WalletCards
                size={22}
              />
            </div>

            <div>
              <span>
                Registration
              </span>

              <strong>
                {registrationPaid
                  ? "Paid"
                  : "Pending"}
              </strong>
            </div>
          </button>
        </section>

        {/* =========================
            QUICK OVERVIEW
        ========================= */}

        <section
          style={{
            marginTop:
              "22px",
            marginBottom:
              "30px",
          }}
        >
          <div className="dashboard-section-heading">
            <div>
              <h2>
                Quick Overview
              </h2>

              <p>
                Stay on top of your
                TripMitra activity.
              </p>
            </div>
          </div>

          <div
            className="dashboard-status-grid"
            style={{
              marginTop:
                "14px",
            }}
          >
            {/* NOTIFICATIONS */}

            <button
              type="button"
              className="dashboard-status-card"
              onClick={
                openNotifications
              }
              style={{
                width:
                  "100%",
                border:
                  "none",
                textAlign:
                  "left",
                cursor:
                  "pointer",
              }}
            >
              <div className="status-icon status-green">
                <Bell
                  size={22}
                />
              </div>

              <div>
                <span>
                  Notifications
                </span>

                <strong>
                  {unreadNotifications >
                  0
                    ? `${unreadNotifications} Unread`
                    : "All caught up"}
                </strong>
              </div>
            </button>

            {/* REQUESTS */}

            <button
              type="button"
              className="dashboard-status-card"
              onClick={() =>
                navigate(
                  "/requests"
                )
              }
              style={{
                width:
                  "100%",
                border:
                  "none",
                textAlign:
                  "left",
                cursor:
                  "pointer",
              }}
            >
              <div className="status-icon status-green">
                <Users
                  size={22}
                />
              </div>

              <div>
                <span>
                  Travel Requests
                </span>

                <strong>
                  View Requests
                </strong>
              </div>
            </button>

            {/* CHATS */}

            <button
              type="button"
              className="dashboard-status-card"
              onClick={() =>
                navigate(
                  "/messages"
                )
              }
              style={{
                width:
                  "100%",
                border:
                  "none",
                textAlign:
                  "left",
                cursor:
                  "pointer",
              }}
            >
              <div className="status-icon status-green">
                <MessageCircle
                  size={22}
                />
              </div>

              <div>
                <span>
                  Messages
                </span>

                <strong>
                  Open Chat
                </strong>
              </div>
            </button>
          </div>
        </section>

        {/* =========================
            MAIN ACTIONS
        ========================= */}

        <section>
          <div className="dashboard-section-heading">
            <div>
              <h2>
                Start Exploring
              </h2>

              <p>
                What would you like
                to do today?
              </p>
            </div>
          </div>

          <div className="dashboard-action-grid">
            {/* FIND COMPANION */}

            <button
              type="button"
              className="dashboard-action-card"
              onClick={() =>
                navigate(
                  "/discover"
                )
              }
            >
              <div className="action-icon action-blue">
                <Compass
                  size={26}
                />
              </div>

              <div>
                <h3>
                  Find a Companion
                </h3>

                <p>
                  Discover verified
                  travellers for
                  your next trip.
                </p>
              </div>

              <span className="action-arrow">
                →
              </span>
            </button>

            {/* MY TRIPS */}

            <button
              type="button"
              className="dashboard-action-card"
              onClick={() =>
                navigate(
                  "/trips"
                )
              }
            >
              <div className="action-icon action-teal">
                <MapPin
                  size={26}
                />
              </div>

              <div>
                <h3>
                  My Trips
                </h3>

                <p>
                  Create and manage
                  your upcoming
                  journeys.
                </p>
              </div>

              <span className="action-arrow">
                →
              </span>
            </button>

            {/* REQUESTS */}

            <button
              type="button"
              className="dashboard-action-card"
              onClick={() =>
                navigate(
                  "/requests"
                )
              }
            >
              <div className="action-icon action-orange">
                <Users
                  size={26}
                />
              </div>

              <div>
                <h3>
                  Travel Requests
                </h3>

                <p>
                  See companion
                  requests and
                  connections.
                </p>
              </div>

              <span className="action-arrow">
                →
              </span>
            </button>

            {/* MESSAGES */}

            <button
              type="button"
              className="dashboard-action-card"
              onClick={() =>
                navigate(
                  "/messages"
                )
              }
            >
              <div className="action-icon action-purple">
                <MessageCircle
                  size={26}
                />
              </div>

              <div>
                <h3>
                  Messages
                </h3>

                <p>
                  Chat securely
                  with your
                  connections.
                </p>
              </div>

              <span className="action-arrow">
                →
              </span>
            </button>
          </div>
        </section>

        {/* =========================
            PROFILE COMPLETION
        ========================= */}

        <section className="dashboard-profile-card">
          <div className="profile-card-icon">
            <UserRound
              size={25}
            />
          </div>

          <div className="profile-card-content">
            <h3>
              {profileCompletion >=
              100
                ? "Your travel profile is complete 🎉"
                : "Complete your travel profile"}
            </h3>

            <p>
              {profileCompletion >=
              100
                ? "Your profile is ready for better travel companion matches."
                : "Add your city, languages, travel interests and travel style to get better companion matches."}
            </p>

            <div className="profile-progress">
              <div className="profile-progress-bar">
                <span
                  style={{
                    width: `${profileCompletion}%`,
                  }}
                />
              </div>

              <strong>
                {profileCompletion}%
                {" "}
                complete
              </strong>
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() =>
              navigate(
                "/profile/edit"
              )
            }
          >
            {profileCompletion >=
            100
              ? "Edit Profile"
              : "Complete Profile"}
          </button>
        </section>

        {/* =========================
            ACTIVATION NOTICE
        ========================= */}

        {!registrationPaid && (
          <section
            className="dashboard-safety"
            style={{
              marginTop:
                "18px",
              background:
                "#eff6ff",
              border:
                "1px solid #bfdbfe",
            }}
          >
            <div className="safety-dashboard-icon">
              <WalletCards
                size={25}
              />
            </div>

            <div>
              <h3>
                Complete your
                registration
              </h3>

              <p>
                Your registration
                payment is still
                pending. Complete the
                one-time payment to
                activate your TripMitra
                account.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigate(
                  "/payment"
                )
              }
            >
              Pay ₹799
            </button>
          </section>
        )}

        {/* =========================
            SAFETY
        ========================= */}

        <section className="dashboard-safety">
          <div className="safety-dashboard-icon">
            <ShieldCheck
              size={25}
            />
          </div>

          <div>
            <h3>
              Your safety matters
            </h3>

            <p>
              Only connect with people
              you trust. Never share
              sensitive personal or
              financial information.
            </p>
          </div>

          <Link to="/safety">
            Safety Tips →
          </Link>
        </section>
      </main>

      {/* =========================
          MOBILE BOTTOM NAV
      ========================= */}

      <nav className="dashboard-bottom-nav">
        <button
          type="button"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          <Compass
            size={20}
          />
          <span>
            Home
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/discover"
            )
          }
        >
          <Users
            size={20}
          />
          <span>
            Discover
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/trips"
            )
          }
        >
          <MapPin
            size={20}
          />
          <span>
            Trips
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/messages"
            )
          }
        >
          <MessageCircle
            size={20}
          />
          <span>
            Chat
          </span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate(
              "/profile/edit"
            )
          }
        >
          <UserRound
            size={20}
          />
          <span>
            Profile
          </span>
        </button>
      </nav>
    </div>
  );
}