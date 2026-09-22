import {
  ArrowLeft,
  CheckCircle2,
  MessageCircle,
  Send,
  UserRound,
  MapPin,
  CalendarDays,
  Clock3,
  AlertCircle,
  Users,
  Search,
  Plane,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";

function formatTime(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(dateString) {
  if (!dateString) return "Not specified";

  const date = new Date(`${dateString}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Messages() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const messagesEndRef = useRef(null);

  const [user, setUser] = useState(null);

  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] =
    useState(null);

  const [companion, setCompanion] = useState(null);
  const [tripRequest, setTripRequest] = useState(null);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");

  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // ==========================================
  // SCROLL TO BOTTOM
  // ==========================================

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    }, 50);
  };

  // ==========================================
  // LOAD CURRENT USER
  // ==========================================

  const loadCurrentUser = async () => {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      throw userError;
    }

    if (!currentUser) {
      navigate("/login");
      return null;
    }

    setUser(currentUser);

    return currentUser;
  };

  // ==========================================
  // LOAD ALL ACTIVE CONNECTIONS
  // ==========================================

  const loadConnections = async (currentUser) => {
    const {
      data: connectionData,
      error: connectionError,
    } = await supabase
      .from("connections")
      .select(`
        id,
        user_one_id,
        user_two_id,
        request_id,
        status,
        created_at
      `)
      .or(
        `user_one_id.eq.${currentUser.id},user_two_id.eq.${currentUser.id}`
      )
      .eq("status", "ACTIVE")
      .order("created_at", {
        ascending: false,
      });

    if (connectionError) {
      throw connectionError;
    }

    if (!connectionData?.length) {
      setConnections([]);
      setSelectedConnection(null);
      setCompanion(null);
      setTripRequest(null);
      setMessages([]);

      return [];
    }

    const companionIds = connectionData.map(
      (item) =>
        item.user_one_id === currentUser.id
          ? item.user_two_id
          : item.user_one_id
    );

    const requestIds = connectionData
      .map((item) => item.request_id)
      .filter(Boolean);

    // ========================================
    // LOAD SAFE PUBLIC COMPANION PROFILES
    // ========================================

    const {
      data: profileData,
      error: profileError,
    } = await supabase
      .from("public_profiles")
      .select(`
        id,
        full_name,
        city,
        state,
        identity_verified
      `)
      .in("id", companionIds);

    if (profileError) {
      throw profileError;
    }

    // ========================================
    // LOAD ORIGINAL REQUESTS
    // ========================================

    let requestData = [];

    if (requestIds.length > 0) {
      const {
        data,
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
        .in("id", requestIds);

      if (requestError) {
        console.error(
          "Travel requests loading error:",
          requestError
        );
      } else {
        requestData = data || [];
      }
    }

    // ========================================
    // CREATE LOOKUP MAPS
    // ========================================

    const profileMap = new Map(
      (profileData || []).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const requestMap = new Map(
      requestData.map((request) => [
        request.id,
        request,
      ])
    );

    // ========================================
    // LOAD LATEST MESSAGE + UNREAD COUNT
    // ========================================

    const enrichedConnections =
      await Promise.all(
        connectionData.map(async (item) => {
          const companionId =
            item.user_one_id === currentUser.id
              ? item.user_two_id
              : item.user_one_id;

          const profile =
            profileMap.get(companionId);

          const request =
            item.request_id
              ? requestMap.get(
                  item.request_id
                )
              : null;

          let latestMessage = null;
          let unreadCount = 0;

          try {
            const {
              data: latestData,
            } = await supabase
              .from("messages")
              .select(`
                id,
                sender_id,
                message,
                read_at,
                created_at
              `)
              .eq(
                "connection_id",
                item.id
              )
              .order("created_at", {
                ascending: false,
              })
              .limit(1);

            latestMessage =
              latestData?.[0] || null;

            const {
              count,
            } = await supabase
              .from("messages")
              .select(
                "id",
                {
                  count: "exact",
                  head: true,
                }
              )
              .eq(
                "connection_id",
                item.id
              )
              .neq(
                "sender_id",
                currentUser.id
              )
              .is(
                "read_at",
                null
              );

            unreadCount =
              Number(count) || 0;
          } catch (messageError) {
            console.error(
              "Connection message summary error:",
              messageError
            );
          }

          return {
            ...item,
            companionId,
            companion: profile || null,
            request: request || null,
            latestMessage,
            unreadCount,
          };
        })
      );

    // ========================================
    // SORT NEWEST MESSAGE FIRST
    // ========================================

    enrichedConnections.sort(
      (a, b) => {
        const aDate =
          a.latestMessage?.created_at ||
          a.created_at ||
          "";

        const bDate =
          b.latestMessage?.created_at ||
          b.created_at ||
          "";

        return (
          new Date(bDate).getTime() -
          new Date(aDate).getTime()
        );
      }
    );

    setConnections(
      enrichedConnections
    );

    return enrichedConnections;
  };

  // ==========================================
  // LOAD SELECTED CHAT
  // ==========================================

  const loadSelectedChat = async (
    connectionItem,
    currentUser
  ) => {
    if (!connectionItem) {
      setSelectedConnection(null);
      setCompanion(null);
      setTripRequest(null);
      setMessages([]);

      return;
    }

    try {
      setChatLoading(true);
      setError("");

      setSelectedConnection(
        connectionItem
      );

      setCompanion(
        connectionItem.companion ||
          null
      );

      setTripRequest(
        connectionItem.request ||
          null
      );

      // ========================================
      // LOAD CHAT MESSAGES
      // ========================================

      const {
        data,
        error: messagesError,
      } = await supabase
        .from("messages")
        .select(`
          id,
          connection_id,
          sender_id,
          message,
          read_at,
          created_at
        `)
        .eq(
          "connection_id",
          connectionItem.id
        )
        .order("created_at", {
          ascending: true,
        });

      if (messagesError) {
        throw messagesError;
      }

      setMessages(data || []);

      // ========================================
      // MARK RECEIVED MESSAGES AS READ
      // ========================================

      await markMessagesAsRead(
        connectionItem.id,
        currentUser
      );

      // Update unread count in chat list.
      setConnections((current) =>
        current.map((item) =>
          item.id ===
          connectionItem.id
            ? {
                ...item,
                unreadCount: 0,
              }
            : item
        )
      );

      scrollToBottom();
    } catch (err) {
      console.error(
        "Selected chat loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load this conversation."
      );
    } finally {
      setChatLoading(false);
    }
  };

  // ==========================================
  // MARK MESSAGES AS READ
  // ==========================================

  const markMessagesAsRead = async (
    connectionId,
    currentUser
  ) => {
    try {
      const {
        error: readError,
      } = await supabase
        .from("messages")
        .update({
          read_at:
            new Date().toISOString(),
        })
        .eq(
          "connection_id",
          connectionId
        )
        .neq(
          "sender_id",
          currentUser.id
        )
        .is(
          "read_at",
          null
        );

      if (readError) {
        console.error(
          "Read status update error:",
          readError
        );
      }
    } catch (err) {
      console.error(
        "Mark messages read failed:",
        err
      );
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const initializeChat = async () => {
      try {
        setLoading(true);
        setError("");

        const currentUser =
          await loadCurrentUser();

        if (
          !currentUser ||
          !mounted
        ) {
          return;
        }

        const loadedConnections =
          await loadConnections(
            currentUser
          );

        if (!mounted) return;

        if (
          !loadedConnections.length
        ) {
          setLoading(false);
          return;
        }

        // ======================================
        // OPTIONAL URL CONNECTION ID
        // Example:
        // /messages?connection=abc
        // ======================================

        const requestedConnectionId =
          searchParams.get(
            "connection"
          );

        let initialConnection =
          loadedConnections.find(
            (item) =>
              item.id ===
              requestedConnectionId
          );

        // Default to first connection.
        if (!initialConnection) {
          initialConnection =
            loadedConnections[0];
        }

        await loadSelectedChat(
          initialConnection,
          currentUser
        );
      } catch (err) {
        console.error(
          "Chat initialization error:",
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
            "Chat permission issue. Please check the messages and connections RLS policies."
          );
        } else {
          setError(
            message ||
              "Unable to load chat."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeChat();

    return () => {
      mounted = false;
    };
  }, [searchParams]);

  // ==========================================
  // REALTIME SELECTED CHAT
  // ==========================================

  useEffect(() => {
    if (
      !selectedConnection?.id ||
      !user?.id
    ) {
      return undefined;
    }

    let mounted = true;

    const connectionId =
      selectedConnection.id;

    const realtimeChannel =
      supabase
        .channel(
          `messages-${connectionId}`
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter:
              `connection_id=eq.${connectionId}`,
          },
          async (payload) => {
            if (!mounted) return;

            const newMessage =
              payload.new;

            if (!newMessage) return;

            setMessages((current) => {
              const exists =
                current.some(
                  (item) =>
                    item.id ===
                    newMessage.id
                );

              if (exists) {
                return current;
              }

              return [
                ...current,
                newMessage,
              ];
            });

            // Update latest message in sidebar.
            setConnections((current) =>
              current
                .map((item) =>
                  item.id ===
                  connectionId
                    ? {
                        ...item,
                        latestMessage:
                          newMessage,
                        unreadCount:
                          newMessage.sender_id !==
                          user.id
                            ? 1
                            : 0,
                      }
                    : item
                )
                .sort((a, b) => {
                  const aDate =
                    a.latestMessage
                      ?.created_at ||
                    a.created_at ||
                    "";

                  const bDate =
                    b.latestMessage
                      ?.created_at ||
                    b.created_at ||
                    "";

                  return (
                    new Date(
                      bDate
                    ).getTime() -
                    new Date(
                      aDate
                    ).getTime()
                  );
                })
            );

            scrollToBottom();

            if (
              newMessage.sender_id !==
              user.id
            ) {
              await markMessagesAsRead(
                connectionId,
                user
              );

              setConnections(
                (current) =>
                  current.map(
                    (item) =>
                      item.id ===
                      connectionId
                        ? {
                            ...item,
                            unreadCount: 0,
                          }
                        : item
                  )
              );
            }
          }
        )
        .subscribe((status) => {
          console.log(
            "Chat realtime status:",
            status
          );
        });

    return () => {
      mounted = false;

      supabase.removeChannel(
        realtimeChannel
      );
    };
  }, [
    selectedConnection?.id,
    user?.id,
  ]);

  // ==========================================
  // SEND MESSAGE NOTIFICATION
  // ==========================================

  const createMessageNotification =
    async (
      receiverId,
      senderName
    ) => {
      try {
        const {
          error: notificationError,
        } = await supabase
          .from("notifications")
          .insert({
            user_id:
              receiverId,

            type: "MESSAGE",

            title:
              "New Message",

            message:
              `${senderName} sent you a new message.`,

            related_id:
              selectedConnection?.id ||
              null,
          });

        if (notificationError) {
          console.error(
            "Message notification error:",
            notificationError
          );
        }
      } catch (notificationError) {
        console.error(
          "Message notification failed:",
          notificationError
        );
      }
    };

  // ==========================================
  // SEND MESSAGE
  // ==========================================

  const handleSend = async (
    event
  ) => {
    event.preventDefault();

    const cleanText =
      text.trim();

    if (!cleanText) {
      return;
    }

    if (!user) {
      setError(
        "Please login again."
      );
      return;
    }

    if (!selectedConnection) {
      setError(
        "Please select an active conversation."
      );
      return;
    }

    try {
      setSending(true);
      setError("");

      const {
        data: insertedMessage,
        error: sendError,
      } = await supabase
        .from("messages")
        .insert({
          connection_id:
            selectedConnection.id,

          sender_id:
            user.id,

          message:
            cleanText,
        })
        .select(`
          id,
          connection_id,
          sender_id,
          message,
          read_at,
          created_at
        `)
        .single();

      if (sendError) {
        throw sendError;
      }

      // ========================================
      // SHOW MESSAGE IMMEDIATELY
      // ========================================

      setMessages((current) => {
        const exists =
          current.some(
            (item) =>
              item.id ===
              insertedMessage.id
          );

        if (exists) {
          return current;
        }

        return [
          ...current,
          insertedMessage,
        ];
      });

      // ========================================
      // UPDATE CHAT LIST
      // ========================================

      setConnections((current) =>
        current
          .map((item) =>
            item.id ===
            selectedConnection.id
              ? {
                  ...item,
                  latestMessage:
                    insertedMessage,
                  unreadCount: 0,
                }
              : item
          )
          .sort((a, b) => {
            const aDate =
              a.latestMessage
                ?.created_at ||
              a.created_at ||
              "";

            const bDate =
              b.latestMessage
                ?.created_at ||
              b.created_at ||
              "";

            return (
              new Date(
                bDate
              ).getTime() -
              new Date(
                aDate
              ).getTime()
            );
          })
      );

      setText("");

      scrollToBottom();

      // ========================================
      // FIND COMPANION
      // ========================================

      const receiverId =
        selectedConnection.companionId;

      if (receiverId) {
        await createMessageNotification(
          receiverId,
          "Your travel companion"
        );
      }
    } catch (err) {
      console.error(
        "Send message error:",
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
          "Message permission issue. Please check the messages INSERT policy."
        );
      } else {
        setError(
          message ||
            "Message could not be sent."
        );
      }
    } finally {
      setSending(false);
    }
  };

  // ==========================================
  // ENTER TO SEND
  // ==========================================

  const handleKeyDown = (
    event
  ) => {
    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      handleSend(event);
    }
  };

  // ==========================================
  // SELECT CHAT
  // ==========================================

  const handleSelectConnection =
    async (connectionItem) => {
      if (!user) return;

      if (
        selectedConnection?.id ===
        connectionItem.id
      ) {
        return;
      }

      await loadSelectedChat(
        connectionItem,
        user
      );
    };

  // ==========================================
  // FILTER CHAT LIST
  // ==========================================

  const filteredConnections =
    connections.filter(
      (item) => {
        const name =
          item.companion
            ?.full_name ||
          "";

        const city =
          item.companion?.city ||
          "";

        return (
          name
            .toLowerCase()
            .includes(
              search
                .toLowerCase()
            ) ||
          city
            .toLowerCase()
            .includes(
              search
                .toLowerCase()
            )
        );
      }
    );

  // ==========================================
  // TOTAL UNREAD
  // ==========================================

  const totalUnread =
    connections.reduce(
      (total, item) =>
        total +
        (Number(
          item.unreadCount
        ) || 0),
      0
    );

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <div
        style={{
          minHeight:
            "100vh",
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
        Loading your chats...
      </div>
    );
  }

  // ==========================================
  // NO CONNECTION
  // ==========================================

  if (!connections.length) {
    return (
      <div className="messages-page">

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

        <main
          style={{
            minHeight:
              "calc(100vh - 80px)",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            padding:
              "30px 20px 110px",
          }}
        >

          <section
            className="requests-empty"
            style={{
              width:
                "100%",
              maxWidth:
                "560px",
            }}
          >

            <MessageCircle
              size={42}
            />

            <h2>
              No active connection
            </h2>

            <p>
              Accept a travel
              request to start
              chatting with your
              travel companion.
            </p>

            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigate(
                  "/requests"
                )
              }
            >
              View Travel Requests
            </button>

          </section>

        </main>

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
            <Search
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
            style={{
              color:
                "#2563eb",
            }}
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

  // ==========================================
  // CHAT PAGE
  // ==========================================

  return (
    <div className="messages-page">

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

      <main
        style={{
          maxWidth:
            "1180px",
          margin:
            "0 auto",
          padding:
            "24px 16px 110px",
        }}
      >

        {/* ERROR */}

        {error && (
          <div
            className="auth-message auth-error"
            style={{
              marginBottom:
                "16px",
            }}
          >
            <AlertCircle
              size={18}
            />

            <span>
              {error}
            </span>
          </div>
        )}

        <section
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "320px minmax(0, 1fr)",
            minHeight:
              "650px",
            background:
              "#ffffff",
            borderRadius:
              "20px",
            border:
              "1px solid #e2e8f0",
            overflow:
              "hidden",
            boxShadow:
              "0 10px 30px rgba(15, 23, 42, 0.06)",
          }}
        >

          {/* ======================================
              LEFT CHAT LIST
          ====================================== */}

          <aside
            style={{
              borderRight:
                "1px solid #e2e8f0",
              background:
                "#ffffff",
              display:
                "flex",
              flexDirection:
                "column",
              minWidth:
                0,
            }}
          >

            <div
              style={{
                padding:
                  "20px",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >

              <div
                style={{
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "space-between",
                  gap:
                    "10px",
                }}
              >

                <div>

                  <h1
                    style={{
                      margin:
                        0,
                      fontSize:
                        "20px",
                      fontWeight:
                        800,
                      color:
                        "#0f172a",
                    }}
                  >
                    Messages
                  </h1>

                  <p
                    style={{
                      margin:
                        "5px 0 0",
                      color:
                        "#64748b",
                      fontSize:
                        "13px",
                    }}
                  >
                    Your active connections
                  </p>

                </div>

                {totalUnread >
                  0 && (
                  <span
                    style={{
                      minWidth:
                        "28px",
                      height:
                        "28px",
                      padding:
                        "0 8px",
                      borderRadius:
                        "999px",
                      background:
                        "#2563eb",
                      color:
                        "#ffffff",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      fontSize:
                        "12px",
                      fontWeight:
                        800,
                    }}
                  >
                    {totalUnread}
                  </span>
                )}

              </div>

              {/* SEARCH */}

              <div
                style={{
                  marginTop:
                    "16px",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  gap:
                    "8px",
                  padding:
                    "10px 12px",
                  border:
                    "1px solid #cbd5e1",
                  borderRadius:
                    "12px",
                  background:
                    "#f8fafc",
                }}
              >

                <Search
                  size={17}
                  color="#64748b"
                />

                <input
                  type="text"
                  value={
                    search
                  }
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search companion..."
                  style={{
                    flex:
                      1,
                    border:
                      "none",
                    outline:
                      "none",
                    background:
                      "transparent",
                    fontFamily:
                      "inherit",
                    fontSize:
                      "13px",
                    color:
                      "#0f172a",
                  }}
                />

              </div>

            </div>

            {/* CHAT LIST */}

            <div
              style={{
                flex:
                  1,
                overflowY:
                  "auto",
              }}
            >

              {filteredConnections.length ===
              0 ? (
                <div
                  style={{
                    padding:
                      "30px 20px",
                    textAlign:
                      "center",
                    color:
                      "#64748b",
                  }}
                >

                  <Users
                    size={32}
                    style={{
                      marginBottom:
                        "10px",
                    }}
                  />

                  <p
                    style={{
                      margin:
                        0,
                      fontSize:
                        "13px",
                    }}
                  >
                    No matching
                    conversations.
                  </p>

                </div>
              ) : (
                filteredConnections.map(
                  (item) => {
                    const name =
                      item
                        .companion
                        ?.full_name ||
                      "Travel Companion";

                    const preview =
                      item
                        .latestMessage
                        ?.message ||
                      item
                        .request
                        ?.message ||
                      "Start the conversation";

                    const isSelected =
                      selectedConnection?.id ===
                      item.id;

                    return (
                      <button
                        key={
                          item.id
                        }
                        type="button"
                        onClick={() =>
                          handleSelectConnection(
                            item
                          )
                        }
                        style={{
                          width:
                            "100%",
                          border:
                            "none",
                          borderBottom:
                            "1px solid #f1f5f9",
                          background:
                            isSelected
                              ? "#eff6ff"
                              : "#ffffff",
                          padding:
                            "15px 16px",
                          cursor:
                            "pointer",
                          display:
                            "flex",
                          gap:
                            "12px",
                          alignItems:
                            "center",
                          textAlign:
                            "left",
                        }}
                      >

                        <div
                          style={{
                            width:
                              "44px",
                            height:
                              "44px",
                            minWidth:
                              "44px",
                            borderRadius:
                              "50%",
                            background:
                              isSelected
                                ? "#dbeafe"
                                : "#f1f5f9",
                            display:
                              "flex",
                            alignItems:
                              "center",
                            justifyContent:
                              "center",
                            color:
                              "#2563eb",
                            position:
                              "relative",
                          }}
                        >

                          <UserRound
                            size={
                              21
                            }
                          />

                          {item.unreadCount >
                            0 && (
                            <span
                              style={{
                                position:
                                  "absolute",
                                top:
                                  "-3px",
                                right:
                                  "-3px",
                                width:
                                  "17px",
                                height:
                                  "17px",
                                borderRadius:
                                  "50%",
                                background:
                                  "#2563eb",
                                border:
                                  "2px solid #ffffff",
                                color:
                                  "#ffffff",
                                fontSize:
                                  "9px",
                                fontWeight:
                                  800,
                                display:
                                  "flex",
                                alignItems:
                                  "center",
                                justifyContent:
                                  "center",
                              }}
                            >
                              {item.unreadCount >
                              9
                                ? "9+"
                                : item.unreadCount}
                            </span>
                          )}

                        </div>

                        <div
                          style={{
                            flex:
                              1,
                            minWidth:
                              0,
                          }}
                        >

                          <div
                            style={{
                              display:
                                "flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "space-between",
                              gap:
                                "8px",
                            }}
                          >

                            <strong
                              style={{
                                color:
                                  "#0f172a",
                                fontSize:
                                  "14px",
                                overflow:
                                  "hidden",
                                textOverflow:
                                  "ellipsis",
                                whiteSpace:
                                  "nowrap",
                              }}
                            >
                              {name}
                            </strong>

                            {item
                              .latestMessage
                              ?.created_at && (
                              <span
                                style={{
                                  color:
                                    "#94a3b8",
                                  fontSize:
                                    "10px",
                                  whiteSpace:
                                    "nowrap",
                                }}
                              >
                                {formatTime(
                                  item
                                    .latestMessage
                                    .created_at
                                )}
                              </span>
                            )}

                          </div>

                          <p
                            style={{
                              margin:
                                "5px 0 0",
                              color:
                                item.unreadCount >
                                0
                                  ? "#334155"
                                  : "#64748b",
                              fontSize:
                                "12px",
                              fontWeight:
                                item.unreadCount >
                                0
                                  ? 700
                                  : 400,
                              overflow:
                                "hidden",
                              textOverflow:
                                "ellipsis",
                              whiteSpace:
                                "nowrap",
                            }}
                          >
                            {preview}
                          </p>

                        </div>

                      </button>
                    );
                  }
                )
              )}

            </div>

          </aside>

          {/* ======================================
              RIGHT CHAT
          ====================================== */}

          <section
            style={{
              minWidth:
                0,
              display:
                "flex",
              flexDirection:
                "column",
              background:
                "#ffffff",
            }}
          >

            {!selectedConnection ? (
              <div
                style={{
                  flex:
                    1,
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  textAlign:
                    "center",
                  padding:
                    "30px",
                  color:
                    "#64748b",
                }}
              >

                <MessageCircle
                  size={42}
                  style={{
                    marginBottom:
                      "12px",
                  }}
                />

                <h2
                  style={{
                    margin:
                      "0 0 6px",
                    color:
                      "#0f172a",
                    fontSize:
                      "19px",
                  }}
                >
                  Select a conversation
                </h2>

                <p
                  style={{
                    margin:
                      0,
                    fontSize:
                      "14px",
                  }}
                >
                  Choose a travel companion
                  from the list to start
                  chatting.
                </p>

              </div>
            ) : (
              <>

                {/* CHAT HEADER */}

                <div
                  style={{
                    padding:
                      "18px 20px",
                    borderBottom:
                      "1px solid #e2e8f0",
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap:
                      "14px",
                  }}
                >

                  <div
                    style={{
                      width:
                        "48px",
                      height:
                        "48px",
                      borderRadius:
                        "50%",
                      background:
                        "#eff6ff",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                      flexShrink:
                        0,
                    }}
                  >

                    <UserRound
                      size={
                        24
                      }
                      color="#2563eb"
                    />

                  </div>

                  <div
                    style={{
                      flex:
                        1,
                      minWidth:
                        0,
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "8px",
                        flexWrap:
                          "wrap",
                      }}
                    >

                      <h1
                        style={{
                          margin:
                            0,
                          fontSize:
                            "18px",
                          fontWeight:
                            800,
                          color:
                            "#0f172a",
                        }}
                      >
                        {companion?.full_name ||
                          "Travel Companion"}
                      </h1>

                      {companion?.identity_verified && (
                        <span
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            gap:
                              "4px",
                            fontSize:
                              "12px",
                            fontWeight:
                              700,
                            color:
                              "#16a34a",
                          }}
                        >
                          <CheckCircle2
                            size={
                              14
                            }
                          />

                          Verified
                        </span>
                      )}

                    </div>

                    <p
                      style={{
                        margin:
                          "4px 0 0",
                        color:
                          "#64748b",
                        fontSize:
                          "13px",
                      }}
                    >
                      {companion?.city ||
                        companion?.state ||
                        "Traveller"}
                    </p>

                  </div>

                  <div
                    style={{
                      padding:
                        "7px 10px",
                      borderRadius:
                        "999px",
                      background:
                        "#ecfdf5",
                      color:
                        "#16a34a",
                      fontSize:
                        "12px",
                      fontWeight:
                        700,
                    }}
                  >
                    Connected
                  </div>

                </div>

                {/* TRIP INFO */}

                {tripRequest && (
                  <div
                    style={{
                      padding:
                        "14px 20px",
                      background:
                        "#f8fafc",
                      borderBottom:
                        "1px solid #e2e8f0",
                      display:
                        "flex",
                      gap:
                        "18px",
                      flexWrap:
                        "wrap",
                    }}
                  >

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "7px",
                        color:
                          "#475569",
                        fontSize:
                          "13px",
                        fontWeight:
                          600,
                      }}
                    >

                      <MapPin
                        size={
                          15
                        }
                        color="#2563eb"
                      />

                      {tripRequest.destination}

                    </div>

                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "7px",
                        color:
                          "#475569",
                        fontSize:
                          "13px",
                        fontWeight:
                          600,
                      }}
                    >

                      <CalendarDays
                        size={
                          15
                        }
                        color="#2563eb"
                      />

                      {formatDate(
                        tripRequest.travel_date
                      )}

                    </div>

                    {tripRequest.duration && (
                      <div
                        style={{
                          display:
                            "flex",
                          alignItems:
                            "center",
                          gap:
                            "7px",
                          color:
                            "#475569",
                          fontSize:
                            "13px",
                          fontWeight:
                            600,
                        }}
                      >

                        <Clock3
                          size={
                            15
                          }
                          color="#2563eb"
                        />

                        {tripRequest.duration}

                      </div>
                    )}

                  </div>
                )}

                {/* MESSAGES */}

                <div
                  style={{
                    flex:
                      1,
                    minHeight:
                      "420px",
                    maxHeight:
                      "calc(100vh - 330px)",
                    overflowY:
                      "auto",
                    padding:
                      "22px 18px",
                    background:
                      "#f8fafc",
                  }}
                >

                  {chatLoading ? (
                    <div
                      style={{
                        minHeight:
                          "360px",
                        display:
                          "flex",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        color:
                          "#64748b",
                        fontWeight:
                          600,
                      }}
                    >
                      Loading conversation...
                    </div>
                  ) : messages.length ===
                    0 ? (
                    <div
                      style={{
                        minHeight:
                          "360px",
                        display:
                          "flex",
                        flexDirection:
                          "column",
                        alignItems:
                          "center",
                        justifyContent:
                          "center",
                        textAlign:
                          "center",
                        color:
                          "#64748b",
                      }}
                    >

                      <MessageCircle
                        size={
                          40
                        }
                        style={{
                          marginBottom:
                            "12px",
                        }}
                      />

                      <h2
                        style={{
                          margin:
                            "0 0 6px",
                          color:
                            "#0f172a",
                          fontSize:
                            "18px",
                        }}
                      >
                        Start the conversation
                      </h2>

                      <p
                        style={{
                          margin:
                            0,
                          fontSize:
                            "14px",
                        }}
                      >
                        Say hello and start
                        planning your trip.
                      </p>

                    </div>
                  ) : (
                    messages.map(
                      (message) => {
                        const isMine =
                          message.sender_id ===
                          user?.id;

                        return (
                          <div
                            key={
                              message.id
                            }
                            style={{
                              display:
                                "flex",
                              justifyContent:
                                isMine
                                  ? "flex-end"
                                  : "flex-start",
                              marginBottom:
                                "12px",
                            }}
                          >

                            <div
                              style={{
                                maxWidth:
                                  "78%",
                                padding:
                                  "11px 14px",
                                borderRadius:
                                  isMine
                                    ? "16px 16px 4px 16px"
                                    : "16px 16px 16px 4px",
                                background:
                                  isMine
                                    ? "#2563eb"
                                    : "#ffffff",
                                color:
                                  isMine
                                    ? "#ffffff"
                                    : "#0f172a",
                                border:
                                  isMine
                                    ? "none"
                                    : "1px solid #e2e8f0",
                                boxShadow:
                                  "0 2px 8px rgba(15, 23, 42, 0.04)",
                              }}
                            >

                              <p
                                style={{
                                  margin:
                                    0,
                                  whiteSpace:
                                    "pre-wrap",
                                  wordBreak:
                                    "break-word",
                                  fontSize:
                                    "14px",
                                  lineHeight:
                                    1.5,
                                }}
                              >
                                {
                                  message.message
                                }
                              </p>

                              <div
                                style={{
                                  marginTop:
                                    "5px",
                                  display:
                                    "flex",
                                  justifyContent:
                                    "flex-end",
                                  alignItems:
                                    "center",
                                  gap:
                                    "4px",
                                  fontSize:
                                    "10px",
                                  opacity:
                                    0.75,
                                }}
                              >

                                {formatTime(
                                  message.created_at
                                )}

                                {isMine &&
                                  message.read_at && (
                                    <CheckCircle2
                                      size={
                                        11
                                      }
                                    />
                                  )}

                              </div>

                            </div>

                          </div>
                        );
                      }
                    )
                  )}

                  <div
                    ref={
                      messagesEndRef
                    }
                  />

                </div>

                {/* MESSAGE COMPOSER */}

                <form
                  onSubmit={
                    handleSend
                  }
                  style={{
                    padding:
                      "14px 16px",
                    borderTop:
                      "1px solid #e2e8f0",
                    background:
                      "#ffffff",
                    display:
                      "flex",
                    gap:
                      "10px",
                    alignItems:
                      "flex-end",
                  }}
                >

                  <textarea
                    value={
                      text
                    }
                    onChange={(
                      event
                    ) =>
                      setText(
                        event.target.value
                      )
                    }
                    onKeyDown={
                      handleKeyDown
                    }
                    placeholder="Write a message..."
                    rows={
                      1
                    }
                    maxLength={
                      2000
                    }
                    disabled={
                      sending ||
                      chatLoading
                    }
                    style={{
                      flex:
                        1,
                      resize:
                        "none",
                      minHeight:
                        "44px",
                      maxHeight:
                        "110px",
                      border:
                        "1px solid #cbd5e1",
                      borderRadius:
                        "12px",
                      padding:
                        "11px 13px",
                      outline:
                        "none",
                      fontFamily:
                        "inherit",
                      fontSize:
                        "14px",
                      color:
                        "#0f172a",
                      background:
                        "#ffffff",
                    }}
                  />

                  <button
                    type="submit"
                    disabled={
                      sending ||
                      chatLoading ||
                      !text.trim()
                    }
                    className="btn btn-primary"
                    style={{
                      minWidth:
                        "48px",
                      height:
                        "44px",
                      padding:
                        "0 14px",
                      display:
                        "flex",
                      alignItems:
                        "center",
                      justifyContent:
                        "center",
                    }}
                  >

                    <Send
                      size={
                        18
                      }
                    />

                    <span
                      style={{
                        marginLeft:
                          "6px",
                      }}
                    >
                      {sending
                        ? "Sending..."
                        : "Send"}
                    </span>

                  </button>

                </form>

              </>
            )}

          </section>

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
          <Search
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
          style={{
            color:
              "#2563eb",
          }}
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