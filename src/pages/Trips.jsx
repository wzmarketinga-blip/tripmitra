import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  MapPin,
  Plane,
  Plus,
  Clock3,
  X,
  Search,
  UserRound,
  AlertCircle,
  MessageCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

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

export default function Trips() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [trips, setTrips] = useState([]);

  const [showCreate, setShowCreate] = useState(false);

  const [form, setForm] = useState({
    destination: "",
    date: "",
    duration: "",
    travelType: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [error, setError] = useState("");

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
  // LOAD TRIPS
  // ==========================================

  const loadTrips = async (currentUser = user) => {
    try {
      if (!currentUser) return;

      const {
        data,
        error: tripsError,
      } = await supabase
        .from("trips")
        .select(`
          id,
          user_id,
          destination,
          travel_date,
          duration,
          travel_type,
          status,
          created_at,
          updated_at
        `)
        .eq("user_id", currentUser.id)
        .order("created_at", {
          ascending: false,
        });

      if (tripsError) {
        throw tripsError;
      }

      setTrips(data || []);
    } catch (err) {
      console.error("Trip loading error:", err);

      setError(
        err?.message ||
          "Unable to load your trips."
      );
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        setLoading(true);
        setError("");

        const currentUser =
          await loadCurrentUser();

        if (!currentUser || !mounted) {
          return;
        }

        await loadTrips(currentUser);
      } catch (err) {
        console.error(
          "Trips initialization error:",
          err
        );

        const message =
          err?.message || "";

        if (
          message
            .toLowerCase()
            .includes("row-level security")
        ) {
          setError(
            "Trip permission issue. Please check the trips RLS policies."
          );
        } else {
          setError(
            message ||
              "Unable to load trips."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  // ==========================================
  // CREATE NOTIFICATION
  // ==========================================

  const createNotification = async ({
    userId,
    title,
    message,
    type,
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
        });

      if (notificationError) {
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
  // CREATE TRIP
  // ==========================================

  const createTrip = async (event) => {
    event.preventDefault();

    setError("");

    const destination =
      form.destination.trim();

    if (!destination) {
      setError(
        "Please enter your destination."
      );
      return;
    }

    if (!form.date) {
      setError(
        "Please select your travel date."
      );
      return;
    }

    if (!form.duration) {
      setError(
        "Please select trip duration."
      );
      return;
    }

    if (!form.travelType) {
      setError(
        "Please select travel type."
      );
      return;
    }

    const selectedDate =
      new Date(
        `${form.date}T00:00:00`
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
        "Travel date cannot be in the past."
      );
      return;
    }

    if (!user) {
      setError(
        "Please login again."
      );
      return;
    }

    try {
      setSaving(true);

      // ========================================
      // INSERT REAL TRIP
      // ========================================

      const {
        data: newTrip,
        error: tripError,
      } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          destination,
          travel_date: form.date,
          duration: form.duration,
          travel_type: form.travelType,
          status: "OPEN",
        })
        .select(`
          id,
          user_id,
          destination,
          travel_date,
          duration,
          travel_type,
          status,
          created_at,
          updated_at
        `)
        .single();

      if (tripError) {
        throw tripError;
      }

      // Add immediately to UI
      setTrips((currentTrips) => [
        newTrip,
        ...currentTrips,
      ]);

      // ========================================
      // RESET FORM
      // ========================================

      setForm({
        destination: "",
        date: "",
        duration: "",
        travelType: "",
      });

      setShowCreate(false);
      setError("");

      // ========================================
      // NOTIFICATION
      // ========================================

      await createNotification({
        userId: user.id,
        title: "Trip created",
        message: `Your trip to ${destination} has been created successfully.`,
        type: "TRIP_CREATED",
      });
    } catch (err) {
      console.error(
        "Create trip error:",
        err
      );

      const message =
        err?.message || "";

      if (
        message
          .toLowerCase()
          .includes("row-level security")
      ) {
        setError(
          "Trip permission issue. Please check the trips INSERT policy."
        );
      } else {
        setError(
          message ||
            "Trip could not be created."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // UPDATE TRIP STATUS
  // ==========================================

  const updateTripStatus = async (
    tripId,
    newStatus
  ) => {
    if (!user) {
      setError(
        "Please login again."
      );
      return;
    }

    try {
      setActionId(tripId);
      setError("");

      const {
        data: updatedTrip,
        error: updateError,
      } = await supabase
        .from("trips")
        .update({
          status: newStatus,
          updated_at:
            new Date().toISOString(),
        })
        .eq("id", tripId)
        .eq("user_id", user.id)
        .select(`
          id,
          user_id,
          destination,
          travel_date,
          duration,
          travel_type,
          status,
          created_at,
          updated_at
        `)
        .single();

      if (updateError) {
        throw updateError;
      }

      setTrips((currentTrips) =>
        currentTrips.map(
          (trip) =>
            trip.id === tripId
              ? updatedTrip
              : trip
        )
      );

      // ========================================
      // STATUS NOTIFICATION
      // ========================================

      let title = "";
      let message = "";

      if (newStatus === "CANCELLED") {
        title = "Trip cancelled";
        message = `Your trip to ${updatedTrip.destination} has been cancelled.`;
      }

      if (newStatus === "OPEN") {
        title = "Trip reopened";
        message = `Your trip to ${updatedTrip.destination} is open again.`;
      }

      if (newStatus === "COMPLETED") {
        title = "Trip completed";
        message = `Your trip to ${updatedTrip.destination} has been marked as completed.`;
      }

      if (title) {
        await createNotification({
          userId: user.id,
          title,
          message,
          type: `TRIP_${newStatus}`,
        });
      }
    } catch (err) {
      console.error(
        "Trip status update error:",
        err
      );

      const message =
        err?.message || "";

      if (
        message
          .toLowerCase()
          .includes("row-level security")
      ) {
        setError(
          "Trip update permission issue. Please check the trips UPDATE policy."
        );
      } else {
        setError(
          message ||
            "Trip could not be updated."
        );
      }
    } finally {
      setActionId(null);
    }
  };

  // ==========================================
  // CANCEL TRIP
  // ==========================================

  const cancelTrip = async (trip) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to cancel your trip to ${trip.destination}?`
      );

    if (!confirmed) {
      return;
    }

    await updateTripStatus(
      trip.id,
      "CANCELLED"
    );
  };

  // ==========================================
  // REOPEN TRIP
  // ==========================================

  const reopenTrip = async (trip) => {
    await updateTripStatus(
      trip.id,
      "OPEN"
    );
  };

  // ==========================================
  // COMPLETE TRIP
  // ==========================================

  const completeTrip = async (trip) => {
    const confirmed =
      window.confirm(
        `Mark your trip to ${trip.destination} as completed?`
      );

    if (!confirmed) {
      return;
    }

    await updateTripStatus(
      trip.id,
      "COMPLETED"
    );
  };

  // ==========================================
  // COUNTS
  // ==========================================

  const openTrips =
    trips.filter(
      (trip) =>
        trip.status === "OPEN"
    );

  const completedTrips =
    trips.filter(
      (trip) =>
        trip.status === "COMPLETED"
    );

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
        Loading your trips...
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="trips-page">

      {/* HEADER */}

      <header className="dashboard-nav">

        <button
          type="button"
          className="auth-back"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <ArrowLeft size={17} />
          Dashboard
        </button>

        <button
          type="button"
          className="dashboard-profile-btn"
          onClick={() =>
            navigate("/profile/edit")
          }
        >
          <UserRound size={18} />
          My Profile
        </button>

      </header>

      {/* MAIN */}

      <main className="trips-container">

        {/* PAGE HEADER */}

        <section className="trips-header">

          <div>

            <p className="trips-eyebrow">
              <Plane size={16} />
              MY TRAVEL PLANS
            </p>

            <h1>
              My Trips
            </h1>

            <p>
              Create and manage your
              upcoming journeys and find
              travel companions.
            </p>

          </div>

          <button
            type="button"
            className="btn btn-primary trips-create-btn"
            onClick={() => {
              setError("");
              setShowCreate(true);
            }}
          >
            <Plus size={18} />
            Create Trip
          </button>

        </section>

        {/* ERROR */}

        {error && (
          <div
            className="auth-message auth-error"
            style={{
              marginBottom: "20px",
            }}
          >
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        {/* SUMMARY */}

        <section className="trips-summary">

          <div>
            <span>
              Total Trips
            </span>

            <strong>
              {trips.length}
            </strong>
          </div>

          <div>
            <span>
              Open Trips
            </span>

            <strong>
              {openTrips.length}
            </strong>
          </div>

          <div>
            <span>
              Completed
            </span>

            <strong>
              {completedTrips.length}
            </strong>
          </div>

        </section>

        {/* TRIP LIST */}

        <section className="trips-list">

          {trips.length === 0 ? (

            <div className="trips-empty">

              <Plane size={42} />

              <h2>
                No trips yet
              </h2>

              <p>
                Create your first trip and
                start finding travel
                companions.
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setError("");
                  setShowCreate(true);
                }}
              >
                <Plus size={18} />
                Create Your First Trip
              </button>

            </div>

          ) : (

            trips.map((trip) => (

              <article
                className="trip-card"
                key={trip.id}
              >

                {/* TOP */}

                <div className="trip-card-top">

                  <div className="trip-destination-icon">
                    <MapPin size={25} />
                  </div>

                  <div className="trip-main-info">

                    <h2>
                      {trip.destination}
                    </h2>

                    <p>
                      {trip.travel_type ||
                        "Travel"}{" "}
                      •{" "}
                      {trip.duration ||
                        "Duration not specified"}
                    </p>

                  </div>

                  <span
                    className={`trip-status trip-status-${String(
                      trip.status
                    ).toLowerCase()}`}
                  >

                    {trip.status ===
                      "OPEN" && (
                      <CheckCircle2
                        size={14}
                      />
                    )}

                    {trip.status ===
                      "CANCELLED" && (
                      <X size={14} />
                    )}

                    {trip.status ===
                      "COMPLETED" && (
                      <CheckCircle2
                        size={14}
                      />
                    )}

                    {trip.status}

                  </span>

                </div>

                {/* DETAILS */}

                <div className="trip-details">

                  <div>

                    <CalendarDays
                      size={17}
                    />

                    <div>
                      <span>
                        Travel Date
                      </span>

                      <strong>
                        {formatDate(
                          trip.travel_date
                        )}
                      </strong>
                    </div>

                  </div>

                  <div>

                    <Clock3
                      size={17}
                    />

                    <div>
                      <span>
                        Duration
                      </span>

                      <strong>
                        {trip.duration ||
                          "Not specified"}
                      </strong>
                    </div>

                  </div>

                  <div>

                    <Plane
                      size={17}
                    />

                    <div>
                      <span>
                        Travel Type
                      </span>

                      <strong>
                        {trip.travel_type ||
                          "Not specified"}
                      </strong>
                    </div>

                  </div>

                </div>

                {/* OPEN ACTIONS */}

                {trip.status ===
                  "OPEN" && (

                  <div className="trip-card-actions">

                    <button
                      type="button"
                      className="trip-cancel-btn"
                      disabled={
                        actionId ===
                        trip.id
                      }
                      onClick={() =>
                        cancelTrip(trip)
                      }
                    >

                      <X size={16} />

                      {actionId ===
                      trip.id
                        ? "Updating..."
                        : "Cancel Trip"}

                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        navigate(
                          "/discover"
                        )
                      }
                    >

                      <Search size={16} />

                      Find Companion

                    </button>

                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={
                        actionId ===
                        trip.id
                      }
                      onClick={() =>
                        completeTrip(trip)
                      }
                      style={{
                        background:
                          "#16a34a",
                      }}
                    >

                      <CheckCircle2
                        size={16}
                      />

                      Complete

                    </button>

                  </div>
                )}

                {/* CANCELLED */}

                {trip.status ===
                  "CANCELLED" && (

                  <div className="trip-cancelled-message">

                    <X size={17} />

                    <span>
                      This trip has been
                      cancelled.
                    </span>

                    <button
                      type="button"
                      className="btn btn-primary"
                      disabled={
                        actionId ===
                        trip.id
                      }
                      onClick={() =>
                        reopenTrip(trip)
                      }
                    >

                      {actionId ===
                      trip.id
                        ? "Updating..."
                        : "Reopen Trip"}

                    </button>

                  </div>
                )}

                {/* COMPLETED */}

                {trip.status ===
                  "COMPLETED" && (

                  <div className="trip-completed-message">

                    <CheckCircle2
                      size={17}
                    />

                    <span>
                      This trip has been
                      completed.
                    </span>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() =>
                        navigate(
                          "/discover"
                        )
                      }
                    >
                      <Search
                        size={16}
                      />
                      Find Another Trip
                    </button>

                  </div>
                )}

              </article>

            ))
          )}

        </section>

      </main>

      {/* CREATE TRIP MODAL */}

      {showCreate && (

        <div
          className="trip-modal-overlay"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              setShowCreate(false);
            }

          }}
        >

          <div className="trip-modal">

            <div className="trip-modal-header">

              <div>

                <h2>
                  Create New Trip
                </h2>

                <p>
                  Tell us about your
                  upcoming journey.
                </p>

              </div>

              <button
                type="button"
                className="trip-modal-close"
                onClick={() =>
                  setShowCreate(false)
                }
              >
                <X size={20} />
              </button>

            </div>

            {error && (
              <div className="trip-form-error">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form
              className="trip-form"
              onSubmit={createTrip}
            >

              {/* DESTINATION */}

              <label>

                <span>
                  Destination
                </span>

                <div className="trip-input">

                  <MapPin size={18} />

                  <input
                    type="text"
                    name="destination"
                    value={
                      form.destination
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Goa, Manali, Jaipur"
                    maxLength={100}
                    disabled={saving}
                  />

                </div>

              </label>

              {/* DATE */}

              <label>

                <span>
                  Travel Date
                </span>

                <div className="trip-input">

                  <CalendarDays
                    size={18}
                  />

                  <input
                    type="date"
                    name="date"
                    value={
                      form.date
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                  />

                </div>

              </label>

              {/* DURATION */}

              <label>

                <span>
                  Duration
                </span>

                <div className="trip-input">

                  <Clock3 size={18} />

                  <select
                    name="duration"
                    value={
                      form.duration
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
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

              {/* TRAVEL TYPE */}

              <label>

                <span>
                  Travel Type
                </span>

                <div className="trip-input">

                  <Plane size={18} />

                  <select
                    name="travelType"
                    value={
                      form.travelType
                    }
                    onChange={
                      handleChange
                    }
                    disabled={saving}
                  >

                    <option value="">
                      Select travel type
                    </option>

                    <option value="Leisure">
                      Leisure
                    </option>

                    <option value="Adventure">
                      Adventure
                    </option>

                    <option value="Beach Trip">
                      Beach Trip
                    </option>

                    <option value="Nature">
                      Nature
                    </option>

                    <option value="Business">
                      Business
                    </option>

                  </select>

                </div>

              </label>

              {/* ACTIONS */}

              <div className="trip-modal-actions">

                <button
                  type="button"
                  className="trip-cancel-btn"
                  disabled={saving}
                  onClick={() =>
                    setShowCreate(false)
                  }
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >

                  <Plus size={17} />

                  {saving
                    ? "Creating..."
                    : "Create Trip"}

                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* BOTTOM NAV */}

      <nav className="dashboard-bottom-nav">

        <button
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <UserRound size={20} />
          <span>Home</span>
        </button>

        <button
          onClick={() =>
            navigate("/discover")
          }
        >
          <MapPin size={20} />
          <span>Discover</span>
        </button>

        <button
          onClick={() =>
            navigate("/trips")
          }
          style={{
            color: "#2563eb",
          }}
        >
          <Plane size={20} />
          <span>Trips</span>
        </button>

        <button
          onClick={() =>
            navigate("/messages")
          }
        >
          <MessageCircle
            size={20}
          />
          <span>Chat</span>
        </button>

        <button
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