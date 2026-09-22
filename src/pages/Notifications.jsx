import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Clock3,
  MessageCircle,
  UserRound,
  X,
  Check,
  Compass,
  Plane,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function formatDate(date) {
  if (!date) return "";

  const value = new Date(date);

  if (Number.isNaN(value.getTime())) {
    return "";
  }

  return value.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getIcon(type) {
  const normalized = String(type || "").toLowerCase();

  switch (normalized) {
    case "message":
    case "chat":
      return <MessageCircle size={20} />;

    case "request":
    case "travel_request":
    case "travel-request":
    case "new_request":
      return <Users size={20} />;

    case "success":
    case "accepted":
    case "request_accepted":
    case "connection":
      return <CheckCircle2 size={20} />;

    case "warning":
      return <Clock3 size={20} />;

    default:
      return <Bell size={20} />;
  }
}

function getNotificationRoute(notification) {
  const type = String(
    notification?.type || ""
  ).toLowerCase();

  const title = String(
    notification?.title || ""
  ).toLowerCase();

  const message = String(
    notification?.message || ""
  ).toLowerCase();

  if (
    type.includes("message") ||
    type.includes("chat") ||
    title.includes("message") ||
    message.includes("message")
  ) {
    return "/messages";
  }

  if (
    type.includes("request") ||
    type === "travel_request" ||
    type === "travel-request" ||
    title.includes("travel request") ||
    title.includes("request")
  ) {
    return "/requests";
  }

  if (
    type.includes("connection") ||
    type.includes("accepted") ||
    title.includes("accepted") ||
    message.includes("accepted")
  ) {
    return "/requests";
  }

  return "/notifications";
}

export default function Notifications() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");

  // ==========================================
  // LOAD NOTIFICATIONS
  // ==========================================

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError("");

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

      const {
        data,
        error: notificationError,
      } = await supabase
        .from("notifications")
        .select(`
          id,
          user_id,
          title,
          message,
          type,
          is_read,
          related_id,
          created_at
        `)
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (notificationError) {
        throw notificationError;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error(
        "Notification loading error:",
        err
      );

      const message = err?.message || "";

      if (
        message
          .toLowerCase()
          .includes("row-level security")
      ) {
        setError(
          "Notifications permission issue. Supabase RLS policy needs to allow users to view their notifications."
        );
      } else {
        setError(
          message ||
            "Unable to load notifications."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD + REALTIME
  // ==========================================

  useEffect(() => {
    let notificationChannel = null;
    let mounted = true;

    const setupNotifications = async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error(
          "Notification auth error:",
          userError
        );
        return;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      await loadNotifications();

      if (!mounted) return;

      notificationChannel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification =
              payload.new;

            if (!newNotification) return;

            setNotifications((current) => {
              const alreadyExists =
                current.some(
                  (item) =>
                    item.id ===
                    newNotification.id
                );

              if (alreadyExists) {
                return current;
              }

              return [
                newNotification,
                ...current,
              ];
            });
          }
        )
        .subscribe((status) => {
          console.log(
            "Notifications realtime:",
            status
          );
        });
    };

    setupNotifications();

    return () => {
      mounted = false;

      if (notificationChannel) {
        supabase.removeChannel(
          notificationChannel
        );
      }
    };
  }, [navigate]);

  // ==========================================
  // MARK ONE AS READ
  // ==========================================

  const markAsRead = async (notificationId) => {
    try {
      setActionId(notificationId);
      setError("");

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

      const {
        error: updateError,
      } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("id", notificationId)
        .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (err) {
      console.error(
        "Mark notification error:",
        err
      );

      const message = err?.message || "";

      if (
        message
          .toLowerCase()
          .includes("row-level security")
      ) {
        setError(
          "Permission issue. Supabase RLS policy needs to allow users to update their notifications."
        );
      } else {
        setError(
          message ||
            "Notification could not be updated."
        );
      }
    } finally {
      setActionId(null);
    }
  };

  // ==========================================
  // MARK ALL AS READ
  // ==========================================

  const markAllAsRead = async () => {
    try {
      setActionId("all");
      setError("");

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

      const {
        error: updateError,
      } = await supabase
        .from("notifications")
        .update({
          is_read: true,
        })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (updateError) {
        throw updateError;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );
    } catch (err) {
      console.error(
        "Mark all notifications error:",
        err
      );

      const message = err?.message || "";

      if (
        message
          .toLowerCase()
          .includes("row-level security")
      ) {
        setError(
          "Permission issue. Supabase RLS policy needs to allow users to update their notifications."
        );
      } else {
        setError(
          message ||
            "Notifications could not be updated."
        );
      }
    } finally {
      setActionId(null);
    }
  };

  // ==========================================
  // OPEN NOTIFICATION
  // ==========================================

  const handleNotificationClick = async (
    notification
  ) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
    } catch (err) {
      console.error(
        "Notification click error:",
        err
      );
    }

    const route =
      getNotificationRoute(notification);

    navigate(route);
  };

  // ==========================================
  // UNREAD COUNT
  // ==========================================

  const unreadCount = notifications.filter(
    (notification) =>
      !notification.is_read
  ).length;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
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
        Loading notifications...
      </div>
    );
  }

  return (
    <div className="requests-page">
      {/* ========================================
          HEADER
      ======================================== */}

      <header className="dashboard-nav">
        <button
          type="button"
          className="auth-back"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>

        <div className="dashboard-nav-right">
          <button
            type="button"
            className="dashboard-profile-btn"
            onClick={() =>
              navigate("/profile/edit")
            }
          >
            <UserRound size={18} />
            <span>My Profile</span>
          </button>
        </div>
      </header>

      {/* ========================================
          MAIN
      ======================================== */}

      <main className="requests-container">
        <section className="requests-header">
          <p className="requests-eyebrow">
            <Bell size={16} />
            TRIPMITRA UPDATES
          </p>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h1>Notifications</h1>

              <p>
                Stay updated about your travel
                requests, connections and messages.
              </p>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                className="btn btn-primary"
                disabled={actionId === "all"}
                onClick={markAllAsRead}
              >
                <Check size={17} />

                {actionId === "all"
                  ? "Updating..."
                  : "Mark all as read"}
              </button>
            )}
          </div>
        </section>

        {/* ======================================
            ERROR
        ====================================== */}

        {error && (
          <div
            className="auth-message auth-error"
            style={{
              marginBottom: "20px",
            }}
          >
            <X size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* ======================================
            SUMMARY
        ====================================== */}

        <section className="requests-summary">
          <div>
            <span>Total</span>
            <strong>
              {notifications.length}
            </strong>
          </div>

          <div>
            <span>Unread</span>
            <strong>{unreadCount}</strong>
          </div>

          <div>
            <span>Status</span>
            <strong>
              {unreadCount === 0
                ? "All read"
                : "New updates"}
            </strong>
          </div>
        </section>

        {/* ======================================
            NOTIFICATION LIST
        ====================================== */}

        <section className="requests-list">
          {notifications.length === 0 ? (
            <div className="requests-empty">
              <Bell size={38} />

              <h2>No notifications yet</h2>

              <p>
                New travel requests, messages and
                connection updates will appear here.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  navigate("/discover")
                }
              >
                Find Travel Companion
              </button>
            </div>
          ) : (
            notifications.map(
              (notification) => (
                <article
                  key={notification.id}
                  className="request-card"
                  onClick={() =>
                    handleNotificationClick(
                      notification
                    )
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" ||
                      e.key === " "
                    ) {
                      e.preventDefault();

                      handleNotificationClick(
                        notification
                      );
                    }
                  }}
                  style={{
                    borderLeft:
                      notification.is_read
                        ? "4px solid #e2e8f0"
                        : "4px solid #2563eb",
                    background:
                      notification.is_read
                        ? "#ffffff"
                        : "#f8fbff",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "16px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: "46px",
                        height: "46px",
                        minWidth: "46px",
                        borderRadius: "14px",
                        background:
                          notification.is_read
                            ? "#f1f5f9"
                            : "#dbeafe",
                        color:
                          notification.is_read
                            ? "#64748b"
                            : "#2563eb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {getIcon(
                        notification.type
                      )}
                    </div>

                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent:
                            "space-between",
                          alignItems: "flex-start",
                          gap: "12px",
                        }}
                      >
                        <div>
                          <h2
                            style={{
                              margin: 0,
                              fontSize: "17px",
                              fontWeight: 700,
                              color: "#0f172a",
                            }}
                          >
                            {notification.title}
                          </h2>

                          {!notification.is_read && (
                            <span
                              style={{
                                display:
                                  "inline-block",
                                marginTop: "6px",
                                padding:
                                  "3px 8px",
                                borderRadius:
                                  "999px",
                                background:
                                  "#dbeafe",
                                color:
                                  "#1d4ed8",
                                fontSize:
                                  "11px",
                                fontWeight: 700,
                              }}
                            >
                              NEW
                            </span>
                          )}
                        </div>

                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: "12px",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {formatDate(
                            notification.created_at
                          )}
                        </span>
                      </div>

                      <p
                        style={{
                          margin:
                            "10px 0 0",
                          color: "#64748b",
                          lineHeight: 1.6,
                        }}
                      >
                        {notification.message}
                      </p>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          flexWrap: "wrap",
                          marginTop: "14px",
                        }}
                      >
                        <span
                          style={{
                            color: "#2563eb",
                            fontSize: "13px",
                            fontWeight: 700,
                          }}
                        >
                          Open
                        </span>

                        {!notification.is_read && (
                          <button
                            type="button"
                            disabled={
                              actionId ===
                              notification.id
                            }
                            onClick={(e) => {
                              e.stopPropagation();

                              markAsRead(
                                notification.id
                              );
                            }}
                            style={{
                              border: "none",
                              background:
                                "transparent",
                              color: "#2563eb",
                              fontWeight: 700,
                              cursor:
                                "pointer",
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              gap: "7px",
                              padding: 0,
                            }}
                          >
                            <Check size={15} />

                            {actionId ===
                            notification.id
                              ? "Updating..."
                              : "Mark as read"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              )
            )
          )}
        </section>
      </main>

      {/* ========================================
          BOTTOM NAV
      ======================================== */}

      <nav className="dashboard-bottom-nav">
        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <UserRound size={20} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/discover")
          }
        >
          <Compass size={20} />
          <span>Discover</span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/trips")
          }
        >
          <Plane size={20} />
          <span>Trips</span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/messages")
          }
        >
          <MessageCircle size={20} />
          <span>Chat</span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/profile/edit")
          }
        >
          <UserRound size={20} />
          <span>Profile</span>
        </button>
      </nav>
    </div>
  );
}