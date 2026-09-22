import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  UserRound,
  X,
  RefreshCw,
  Plane,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

function formatDate(date) {
  if (!date) return "Not specified";

  const value = new Date(
    `${date}T00:00:00`
  );

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return date;
  }

  return value.toLocaleDateString(
    "en-IN",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  );
}

function normalizeStatus(status) {
  return String(
    status || "PENDING"
  ).toUpperCase();
}

export default function Requests() {
  const navigate = useNavigate();

  const [requests, setRequests] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [actionId, setActionId] =
    useState(null);

  const [error, setError] =
    useState("");

  // ==========================================
  // LOAD REQUESTS
  // ==========================================

  const loadRequests = async ({
    silent = false,
  } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      // ==========================================
      // 1. LOAD INCOMING REQUESTS
      // ==========================================

      const {
        data: requestData,
        error: requestError,
      } = await supabase
        .from("travel_requests")
        .select(`
          id,
          sender_id,
          receiver_id,
          destination,
          travel_date,
          duration,
          message,
          status,
          created_at,
          updated_at
        `)
        .eq(
          "receiver_id",
          user.id
        )
        .order(
          "created_at",
          {
            ascending: false,
          }
        );

      if (requestError) {
        throw requestError;
      }

      if (
        !requestData ||
        requestData.length === 0
      ) {
        setRequests([]);
        return;
      }

      // ==========================================
      // 2. GET SENDER IDS
      // ==========================================

      const senderIds = [
        ...new Set(
          requestData.map(
            (request) =>
              request.sender_id
          )
        ),
      ];

      // ==========================================
      // 3. LOAD SAFE PUBLIC PROFILES
      // ==========================================

      const {
        data: profiles,
        error: profilesError,
      } = await supabase
        .from("public_profiles")
        .select(`
          id,
          full_name,
          age,
          city,
          state,
          identity_verified
        `)
        .in(
          "id",
          senderIds
        );

      if (profilesError) {
        throw profilesError;
      }

      // ==========================================
      // 4. CREATE PROFILE MAP
      // ==========================================

      const profileMap = {};

      (
        profiles || []
      ).forEach(
        (profile) => {
          profileMap[
            profile.id
          ] = profile;
        }
      );

      // ==========================================
      // 5. FORMAT REQUEST DATA
      // ==========================================

      const formattedRequests =
        requestData.map(
          (request) => {
            const sender =
              profileMap[
                request.sender_id
              ];

            return {
              id: request.id,

              senderId:
                request.sender_id,

              receiverId:
                request.receiver_id,

              name:
                sender?.full_name ||
                "TripMitra Traveller",

              age:
                typeof sender?.age ===
                "number"
                  ? sender.age
                  : null,

              city:
                sender?.city ||
                sender?.state ||
                "India",

              state:
                sender?.state ||
                "",

              destination:
                request.destination ||
                "Not specified",

              date:
                request.travel_date,

              duration:
                request.duration ||
                "Not specified",

              message:
                request.message ||
                "No message added.",

              status:
                normalizeStatus(
                  request.status
                ),

              verified:
                Boolean(
                  sender?.identity_verified
                ),

              createdAt:
                request.created_at,

              updatedAt:
                request.updated_at,
            };
          }
        );

      setRequests(
        formattedRequests
      );
    } catch (err) {
      console.error(
        "Request loading error:",
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
          "Request permission issue. Please check the travel_requests RLS policy."
        );
      } else {
        setError(
          message ||
            "Unable to load travel requests."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadRequests();
  }, []);

  // ==========================================
  // CREATE NOTIFICATION
  // ==========================================

  const createNotification = async ({
    userId,
    title,
    message,
    type,
    relatedId = null,
  }) => {
    try {
      const {
        error: notificationError,
      } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title,
          message,
          type,
          is_read: false,
          related_id:
            relatedId,
        });

      if (
        notificationError
      ) {
        console.error(
          "Notification error:",
          notificationError
        );
      }
    } catch (err) {
      console.error(
        "Notification creation failed:",
        err
      );
    }
  };

  // ==========================================
  // CHECK BLOCK RELATIONSHIP
  // ==========================================

  const isBlockedBetweenUsers =
    async (
      currentUserId,
      otherUserId
    ) => {
      const {
        data,
        error: blockError,
      } = await supabase
        .from("blocked_users")
        .select("id")
        .or(
          `and(blocker_id.eq.${currentUserId},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${currentUserId})`
        )
        .limit(1)
        .maybeSingle();

      if (blockError) {
        throw blockError;
      }

      return Boolean(data);
    };

  // ==========================================
  // ACCEPT / DECLINE
  // ==========================================

  const handleStatus = async (
    requestId,
    status
  ) => {
    const normalizedStatus =
      normalizeStatus(status);

    if (
      normalizedStatus !==
        "ACCEPTED" &&
      normalizedStatus !==
        "DECLINED"
    ) {
      return;
    }

    try {
      setError("");
      setActionId(requestId);

      const {
        data: {
          user,
        },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      // ========================================
      // GET REQUEST
      // ========================================

      const {
        data: travelRequest,
        error: requestError,
      } = await supabase
        .from("travel_requests")
        .select(`
          id,
          sender_id,
          receiver_id,
          destination,
          travel_date,
          duration,
          message,
          status
        `)
        .eq(
          "id",
          requestId
        )
        .eq(
          "receiver_id",
          user.id
        )
        .maybeSingle();

      if (requestError) {
        throw requestError;
      }

      if (!travelRequest) {
        throw new Error(
          "Travel request could not be found."
        );
      }

      const currentStatus =
        normalizeStatus(
          travelRequest.status
        );

      // ========================================
      // PREVENT DOUBLE ACTION
      // ========================================

      if (
        currentStatus !==
        "PENDING"
      ) {
        if (
          currentStatus ===
          "ACCEPTED"
        ) {
          setError(
            "This request has already been accepted."
          );
        } else {
          setError(
            "This request has already been processed."
          );
        }

        await loadRequests({
          silent: true,
        });

        return;
      }

      // ========================================
      // ACCEPT
      // ========================================

      if (
        normalizedStatus ===
        "ACCEPTED"
      ) {
        // --------------------------------------
        // CHECK BLOCKED RELATIONSHIP
        // --------------------------------------

        const blocked =
          await isBlockedBetweenUsers(
            user.id,
            travelRequest.sender_id
          );

        if (blocked) {
          throw new Error(
            "This traveller cannot be connected because one of the users has blocked the other."
          );
        }

        // --------------------------------------
        // CHECK EXISTING CONNECTION
        // --------------------------------------

        const {
          data: existingConnection,
          error:
            existingConnectionError,
        } = await supabase
          .from("connections")
          .select(
            "id, status"
          )
          .eq(
            "request_id",
            travelRequest.id
          )
          .maybeSingle();

        if (
          existingConnectionError
        ) {
          throw existingConnectionError;
        }

        // --------------------------------------
        // CREATE CONNECTION
        // --------------------------------------

        if (
          !existingConnection
        ) {
          const {
            error:
              connectionError,
          } = await supabase
            .from("connections")
            .insert({
              user_one_id:
                travelRequest.sender_id,

              user_two_id:
                travelRequest.receiver_id,

              request_id:
                travelRequest.id,

              status:
                "ACTIVE",
            });

          if (
            connectionError
          ) {
            console.error(
              "Connection error:",
              connectionError
            );

            throw new Error(
              "Connection could not be created. Please check the connections INSERT policy."
            );
          }
        } else if (
          String(
            existingConnection.status ||
              ""
          ).toUpperCase() ===
          "ENDED"
        ) {
          const {
            error:
              reopenError,
          } = await supabase
            .from("connections")
            .update({
              status:
                "ACTIVE",
            })
            .eq(
              "id",
              existingConnection.id
            );

          if (reopenError) {
            throw reopenError;
          }
        }

        // --------------------------------------
        // UPDATE REQUEST
        // --------------------------------------

        const {
          data: updatedRequest,
          error: updateError,
        } = await supabase
          .from("travel_requests")
          .update({
            status:
              "ACCEPTED",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            requestId
          )
          .eq(
            "receiver_id",
            user.id
          )
          .eq(
            "status",
            "PENDING"
          )
          .select(`
            id,
            sender_id,
            receiver_id,
            status
          `)
          .maybeSingle();

        if (updateError) {
          throw updateError;
        }

        if (!updatedRequest) {
          await loadRequests({
            silent: true,
          });

          throw new Error(
            "This request was already updated."
          );
        }

        // --------------------------------------
        // NOTIFY SENDER
        // --------------------------------------

        await createNotification({
          userId:
            travelRequest.sender_id,

          title:
            "Travel request accepted",

          message:
            "Your travel request has been accepted. You are now connected!",

          type:
            "REQUEST_ACCEPTED",

          relatedId:
            travelRequest.id,
        });

        // --------------------------------------
        // UPDATE UI
        // --------------------------------------

        setRequests(
          (currentRequests) =>
            currentRequests.map(
              (request) =>
                request.id ===
                requestId
                  ? {
                      ...request,
                      status:
                        "ACCEPTED",
                    }
                  : request
            )
        );

        return;
      }

      // ========================================
      // DECLINE
      // ========================================

      if (
        normalizedStatus ===
        "DECLINED"
      ) {
        const {
          data: updatedRequest,
          error: updateError,
        } = await supabase
          .from("travel_requests")
          .update({
            status:
              "DECLINED",

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            requestId
          )
          .eq(
            "receiver_id",
            user.id
          )
          .eq(
            "status",
            "PENDING"
          )
          .select(`
            id,
            sender_id,
            receiver_id,
            status
          `)
          .maybeSingle();

        if (updateError) {
          throw updateError;
        }

        if (!updatedRequest) {
          await loadRequests({
            silent: true,
          });

          throw new Error(
            "This request was already updated."
          );
        }

        // --------------------------------------
        // NOTIFY SENDER
        // --------------------------------------

        await createNotification({
          userId:
            travelRequest.sender_id,

          title:
            "Travel request declined",

          message:
            "Your travel request was declined.",

          type:
            "REQUEST_DECLINED",

          relatedId:
            travelRequest.id,
        });

        // --------------------------------------
        // UPDATE UI
        // --------------------------------------

        setRequests(
          (currentRequests) =>
            currentRequests.map(
              (request) =>
                request.id ===
                requestId
                  ? {
                      ...request,
                      status:
                        "DECLINED",
                    }
                  : request
            )
        );
      }
    } catch (err) {
      console.error(
        "Request status update error:",
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
          "Permission issue. Please check the Supabase RLS policies for travel_requests, connections and notifications."
        );
      } else {
        setError(
          message ||
            "Request could not be updated."
        );
      }
    } finally {
      setActionId(null);
    }
  };

  // ==========================================
  // COUNTS
  // ==========================================

  const pendingCount =
    requests.filter(
      (request) =>
        normalizeStatus(
          request.status
        ) === "PENDING"
    ).length;

  const acceptedCount =
    requests.filter(
      (request) =>
        normalizeStatus(
          request.status
        ) === "ACCEPTED"
    ).length;

  const declinedCount =
    requests.filter(
      (request) =>
        normalizeStatus(
          request.status
        ) === "DECLINED"
    ).length;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          background:
            "#f8fafc",
          color:
            "#64748b",
          fontSize:
            "16px",
          fontWeight:
            600,
        }}
      >
        Loading travel requests...
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="requests-page">

      {/* HEADER */}

      <header className="dashboard-nav">

        <button
          type="button"
          className="auth-back"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          <ArrowLeft
            size={17}
          />

          Dashboard
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
            <UserRound
              size={18}
            />

            <span>
              My Profile
            </span>
          </button>

        </div>

      </header>

      {/* MAIN */}

      <main className="requests-container">

        <section className="requests-header">

          <p className="requests-eyebrow">

            <MessageCircle
              size={16}
            />

            TRAVEL CONNECTIONS

          </p>

          <div
            style={{
              display:
                "flex",
              justifyContent:
                "space-between",
              alignItems:
                "flex-start",
              gap:
                "16px",
              flexWrap:
                "wrap",
            }}
          >

            <div>

              <h1>
                Travel Requests
              </h1>

              <p>
                Review requests from
                travellers who are
                interested in travelling
                with you.
              </p>

            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                loadRequests({
                  silent: true,
                })
              }
              disabled={
                refreshing
              }
            >
              <RefreshCw
                size={17}
              />

              {refreshing
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

        </section>

        {/* ERROR */}

        {error && (
          <div
            className="auth-message auth-error"
            style={{
              marginBottom:
                "20px",
            }}
          >
            <X size={18} />

            <span>
              {error}
            </span>
          </div>
        )}

        {/* SUMMARY */}

        <section className="requests-summary">

          <div>
            <span>
              Total Requests
            </span>

            <strong>
              {requests.length}
            </strong>
          </div>

          <div>
            <span>
              Pending
            </span>

            <strong>
              {pendingCount}
            </strong>
          </div>

          <div>
            <span>
              Accepted
            </span>

            <strong>
              {acceptedCount}
            </strong>
          </div>

          <div>
            <span>
              Declined
            </span>

            <strong>
              {declinedCount}
            </strong>
          </div>

        </section>

        {/* REQUEST LIST */}

        <section className="requests-list">

          {requests.length ===
          0 ? (
            <div className="requests-empty">

              <MessageCircle
                size={38}
              />

              <h2>
                No travel requests
              </h2>

              <p>
                You don't have any
                travel requests yet.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  navigate(
                    "/discover"
                  )
                }
              >
                Find Travel Companion
              </button>

            </div>
          ) : (
            requests.map(
              (request) => {
                const status =
                  normalizeStatus(
                    request.status
                  );

                const isProcessing =
                  actionId ===
                  request.id;

                return (
                  <article
                    className="request-card"
                    key={
                      request.id
                    }
                  >

                    {/* PERSON */}

                    <div className="request-card-top">

                      <div className="request-avatar">
                        <UserRound
                          size={
                            30
                          }
                        />
                      </div>

                      <div className="request-person">

                        <h2>
                          {
                            request.name
                          }
                        </h2>

                        <p>
                          {request.age !==
                          null
                            ? `${request.age} years`
                            : "Traveller"}{" "}
                          •{" "}
                          {
                            request.city
                          }
                        </p>

                        {request.verified && (
                          <span className="request-verified">

                            <CheckCircle2
                              size={
                                13
                              }
                            />

                            Verified
                            Traveller

                          </span>
                        )}

                      </div>

                      <div
                        className={`request-status request-status-${status.toLowerCase()}`}
                      >

                        {status ===
                          "PENDING" && (
                          <Clock3
                            size={
                              14
                            }
                          />
                        )}

                        {status ===
                          "ACCEPTED" && (
                          <CheckCircle2
                            size={
                              14
                            }
                          />
                        )}

                        {status ===
                          "DECLINED" && (
                          <X
                            size={
                              14
                            }
                          />
                        )}

                        {status}

                      </div>

                    </div>

                    {/* VIEW PROFILE */}

                    <div
                      style={{
                        marginTop:
                          "10px",
                      }}
                    >

                      <button
                        type="button"
                        style={{
                          border:
                            "none",
                          background:
                            "transparent",
                          padding:
                            0,
                          color:
                            "#2563eb",
                          fontSize:
                            "13px",
                          fontWeight:
                            700,
                          cursor:
                            "pointer",
                        }}
                        onClick={() =>
                          navigate(
                            `/profile/${request.senderId}`
                          )
                        }
                      >
                        View Traveller Profile →
                      </button>

                    </div>

                    {/* TRIP */}

                    <div className="request-trip-info">

                      <div>

                        <span>
                          Destination
                        </span>

                        <strong>
                          <MapPin
                            size={
                              16
                            }
                          />

                          {
                            request.destination
                          }
                        </strong>

                      </div>

                      <div>

                        <span>
                          Travel Date
                        </span>

                        <strong>
                          {formatDate(
                            request.date
                          )}
                        </strong>

                      </div>

                      <div>

                        <span>
                          Duration
                        </span>

                        <strong>
                          {
                            request.duration
                          }
                        </strong>

                      </div>

                    </div>

                    {/* MESSAGE */}

                    <div className="request-message">

                      <MessageCircle
                        size={
                          17
                        }
                      />

                      <p>
                        {
                          request.message
                        }
                      </p>

                    </div>

                    {/* CREATED */}

                    {request.createdAt && (
                      <div
                        style={{
                          marginTop:
                            "10px",
                          color:
                            "#94a3b8",
                          fontSize:
                            "12px",
                        }}
                      >
                        Request received{" "}
                        {new Date(
                          request.createdAt
                        ).toLocaleString(
                          "en-IN",
                          {
                            day:
                              "numeric",
                            month:
                              "short",
                            hour:
                              "numeric",
                            minute:
                              "2-digit",
                          }
                        )}
                      </div>
                    )}

                    {/* PENDING */}

                    {status ===
                      "PENDING" && (
                      <div className="request-actions">

                        <button
                          type="button"
                          className="request-decline-btn"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            handleStatus(
                              request.id,
                              "DECLINED"
                            )
                          }
                        >
                          <X
                            size={
                              17
                            }
                          />

                          {isProcessing
                            ? "Updating..."
                            : "Decline"}
                        </button>

                        <button
                          type="button"
                          className="btn btn-primary"
                          disabled={
                            isProcessing
                          }
                          onClick={() =>
                            handleStatus(
                              request.id,
                              "ACCEPTED"
                            )
                          }
                        >
                          <CheckCircle2
                            size={
                              17
                            }
                          />

                          {isProcessing
                            ? "Updating..."
                            : "Accept Request"}
                        </button>

                      </div>
                    )}

                    {/* ACCEPTED */}

                    {status ===
                      "ACCEPTED" && (
                      <div className="request-accepted-box">

                        <CheckCircle2
                          size={
                            18
                          }
                        />

                        <span>
                          Request accepted.
                          You are now
                          connected with{" "}
                          {
                            request.name.split(
                              " "
                            )[0]
                          }.
                        </span>

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
                            size={
                              17
                            }
                          />

                          Open Chat
                        </button>

                      </div>
                    )}

                    {/* DECLINED */}

                    {status ===
                      "DECLINED" && (
                      <div className="request-declined-box">

                        <X
                          size={
                            18
                          }
                        />

                        <span>
                          This travel
                          request was
                          declined.
                        </span>

                      </div>
                    )}

                  </article>
                );
              }
            )
          )}

        </section>

      </main>

      {/* BOTTOM NAV */}

      <nav className="dashboard-bottom-nav">

        <button
          type="button"
          onClick={() =>
            navigate(
              "/dashboard"
            )
          }
        >
          <UserRound
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
          <MapPin
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
          <Plane
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