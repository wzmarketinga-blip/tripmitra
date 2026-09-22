import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Filter,
  MapPin,
  Search,
  ShieldCheck,
  UserRound,
  X,
  Loader2,
  Plane,
  Clock3,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Discover() {
  const navigate = useNavigate();

  const [travellers, setTravellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    destination: "",
    date: "",
    city: "",
    travelType: "",
    verifiedOnly: false,
  });

  const [searchActive, setSearchActive] = useState(false);

  // ==========================================
  // LOAD TRAVELLERS
  // ==========================================

  const loadTravellers = async () => {
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

      // ==========================================
      // 1. LOAD BLOCKED USERS
      // ==========================================

      const {
        data: blockedByMe,
        error: blockedError,
      } = await supabase
        .from("blocked_users")
        .select("blocked_id")
        .eq("blocker_id", user.id);

      if (blockedError) {
        throw blockedError;
      }

      const blockedIds = (blockedByMe || []).map(
        (item) => item.blocked_id
      );

      // ==========================================
      // 2. LOAD OTHER PROFILES
      // ==========================================

      const {
        data: profiles,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            dob,
            city,
            state,
            languages,
            travel_interests,
            travel_style,
            about,
            identity_verified,
            created_at
          `
        )
        .neq("id", user.id)
        .order("created_at", {
          ascending: false,
        });

      if (profileError) {
        throw profileError;
      }

      // ==========================================
      // 3. REMOVE BLOCKED USERS
      // ==========================================

      const visibleProfiles = (profiles || []).filter(
        (profile) =>
          !blockedIds.includes(profile.id)
      );

      // ==========================================
      // 4. LOAD OPEN FUTURE TRIPS
      // ==========================================

      const profileIds = visibleProfiles.map(
        (profile) => profile.id
      );

      let openTrips = [];

      if (profileIds.length > 0) {
        const today = new Date()
          .toISOString()
          .split("T")[0];

        const {
          data: tripData,
          error: tripError,
        } = await supabase
          .from("trips")
          .select(
            `
              id,
              user_id,
              destination,
              travel_date,
              duration,
              travel_type,
              status
            `
          )
          .in("user_id", profileIds)
          .eq("status", "OPEN")
          .gte("travel_date", today)
          .order("travel_date", {
            ascending: true,
          });

        if (tripError) {
          throw tripError;
        }

        openTrips = tripData || [];
      }

      // ==========================================
      // 5. FIRST OPEN TRIP PER USER
      // ==========================================

      const tripMap = {};

      openTrips.forEach((trip) => {
        if (!tripMap[trip.user_id]) {
          tripMap[trip.user_id] = trip;
        }
      });

      // ==========================================
      // 6. CREATE DISCOVER DATA
      // ==========================================

      const formattedTravellers =
        visibleProfiles.map((profile) => {
          const trip =
            tripMap[profile.id];

          return {
            id: profile.id,

            name:
              profile.full_name ||
              "TripMitra Traveller",

            age: calculateAge(
              profile.dob
            ),

            city:
              profile.city ||
              profile.state ||
              "India",

            destination:
              trip?.destination ||
              formatValue(
                profile.travel_interests
              ) ||
              "Travel plans",

            travelDate:
              trip?.travel_date || "",

            duration:
              trip?.duration ||
              "Not specified",

            travelType:
              trip?.travel_type ||
              profile.travel_style ||
              "Leisure",

            languages:
              formatValue(
                profile.languages
              ) ||
              "Languages not added",

            about:
              profile.about || "",

            verified:
              Boolean(
                profile.identity_verified
              ),

            hasTrip:
              Boolean(trip),
          };
        });

      setTravellers(
        formattedTravellers
      );
    } catch (err) {
      console.error(
        "Discover error:",
        err
      );

      setError(
        err?.message ||
          "Travellers could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  useEffect(() => {
    loadTravellers();
  }, []);

  // ==========================================
  // FILTER CHANGE
  // ==========================================

  const handleChange = (event) => {
    const {
      name,
      value,
      type,
      checked,
    } = event.target;

    setFilters((previous) => ({
      ...previous,
      [name]:
        type === "checkbox"
          ? checked
          : value,
    }));
  };

  // ==========================================
  // SEARCH
  // ==========================================

  const handleSearch = (event) => {
    event.preventDefault();
    setSearchActive(true);
  };

  // ==========================================
  // CLEAR FILTERS
  // ==========================================

  const clearFilters = () => {
    setFilters({
      destination: "",
      date: "",
      city: "",
      travelType: "",
      verifiedOnly: false,
    });

    setSearchActive(false);
  };

  // ==========================================
  // FILTER RESULTS
  // ==========================================

  const filteredTravellers =
    useMemo(() => {
      return travellers.filter(
        (traveller) => {
          const destinationMatch =
            !filters.destination.trim() ||
            traveller.destination
              .toLowerCase()
              .includes(
                filters.destination
                  .trim()
                  .toLowerCase()
              );

          const dateMatch =
            !filters.date ||
            traveller.travelDate ===
              filters.date;

          const cityMatch =
            !filters.city.trim() ||
            traveller.city
              .toLowerCase()
              .includes(
                filters.city
                  .trim()
                  .toLowerCase()
              );

          const typeMatch =
            !filters.travelType ||
            traveller.travelType
              .toLowerCase() ===
              filters.travelType
                .toLowerCase();

          const verifiedMatch =
            !filters.verifiedOnly ||
            traveller.verified;

          return (
            destinationMatch &&
            dateMatch &&
            cityMatch &&
            typeMatch &&
            verifiedMatch
          );
        }
      );
    }, [travellers, filters]);

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
        Finding travel companions...
      </div>
    );
  }

  // ==========================================
  // PAGE
  // ==========================================

  return (
    <div className="discover-page">

      {/* ========================================
          NAVBAR
      ======================================== */}

      <header className="dashboard-nav">

        <Link
          to="/"
          className="auth-logo"
        >
          <span className="logo-mark">
            ✈
          </span>

          <span>
            Trip<span>Mitra</span>
          </span>
        </Link>

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

      <main className="discover-container">

        {/* HEADER */}

        <section className="discover-header">

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

          <div>

            <p className="discover-eyebrow">
              <CompassIcon />
              TRAVEL COMPANIONS
            </p>

            <h1>
              Find Your Travel Companion
            </h1>

            <p>
              Discover travellers who are
              planning trips similar to yours.
            </p>

          </div>

        </section>

        {/* ========================================
            FILTER CARD
        ======================================== */}

        <section className="discover-filter-card">

          <div className="discover-filter-title">

            <div>

              <h2>
                Search Travellers
              </h2>

              <p>
                Find people based on their
                travel plans.
              </p>

            </div>

            <Filter size={21} />

          </div>

          <form
            onSubmit={handleSearch}
          >

            <div className="discover-filter-grid">

              {/* DESTINATION */}

              <label>

                <span>
                  Destination
                </span>

                <div className="discover-input">

                  <MapPin size={18} />

                  <input
                    type="text"
                    name="destination"
                    value={
                      filters.destination
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Goa"
                  />

                </div>

              </label>

              {/* DATE */}

              <label>

                <span>
                  Travel Date
                </span>

                <div className="discover-input">

                  <CalendarDays
                    size={18}
                  />

                  <input
                    type="date"
                    name="date"
                    value={
                      filters.date
                    }
                    onChange={
                      handleChange
                    }
                  />

                </div>

              </label>

              {/* CITY */}

              <label>

                <span>
                  City
                </span>

                <div className="discover-input">

                  <MapPin size={18} />

                  <input
                    type="text"
                    name="city"
                    value={
                      filters.city
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="e.g. Delhi"
                  />

                </div>

              </label>

              {/* TRAVEL TYPE */}

              <label>

                <span>
                  Travel Type
                </span>

                <div className="discover-input">

                  <select
                    name="travelType"
                    value={
                      filters.travelType
                    }
                    onChange={
                      handleChange
                    }
                  >

                    <option value="">
                      All travel types
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

            </div>

            {/* FILTER BOTTOM */}

            <div className="discover-filter-bottom">

              <label className="verified-checkbox">

                <input
                  type="checkbox"
                  name="verifiedOnly"
                  checked={
                    filters.verifiedOnly
                  }
                  onChange={
                    handleChange
                  }
                />

                <ShieldCheck size={18} />

                <span>
                  Verified travellers only
                </span>

              </label>

              <div className="discover-filter-actions">

                {searchActive && (
                  <button
                    type="button"
                    className="discover-clear-btn"
                    onClick={
                      clearFilters
                    }
                  >
                    <X size={17} />
                    Clear
                  </button>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                >
                  <Search size={18} />
                  Search
                </button>

              </div>

            </div>

          </form>

        </section>

        {/* ========================================
            RESULTS
        ======================================== */}

        <section className="discover-results">

          <div className="discover-results-heading">

            <div>

              <h2>
                Travel Companions
              </h2>

              <p>
                {filteredTravellers.length}{" "}
                {filteredTravellers.length === 1
                  ? "traveller"
                  : "travellers"}{" "}
                found
              </p>

            </div>

          </div>

          {/* ERROR */}

          {error && (
            <div className="discover-empty">

              <X size={40} />

              <h2>
                Could not load travellers
              </h2>

              <p>
                {error}
              </p>

              <button
                type="button"
                className="btn btn-primary"
                onClick={
                  loadTravellers
                }
              >
                Try Again
              </button>

            </div>
          )}

          {/* EMPTY */}

          {!error &&
            filteredTravellers.length ===
              0 && (

              <div className="discover-empty">

                <Search size={40} />

                <h2>
                  No travellers found
                </h2>

                <p>
                  Try changing your destination,
                  city, travel date or travel type.
                </p>

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={
                    clearFilters
                  }
                >
                  <X size={17} />
                  Clear Filters
                </button>

              </div>
            )}

          {/* RESULTS */}

          {!error &&
            filteredTravellers.length >
              0 && (

              <div className="traveller-grid">

                {filteredTravellers.map(
                  (traveller) => (

                    <article
                      className="traveller-card"
                      key={traveller.id}
                    >

                      {/* ==================================
                          PROFILE
                      ================================== */}

                      <div className="traveller-top">

                        <div className="traveller-avatar">
                          <UserRound
                            size={30}
                          />
                        </div>

                        <div className="traveller-basic">

                          <h3>
                            {traveller.name}
                          </h3>

                          <p>
                            {traveller.age
                              ? `${traveller.age} years`
                              : "Age hidden"}{" "}
                            •{" "}
                            {traveller.city}
                          </p>

                          {traveller.verified && (
                            <span className="verified-badge">

                              <CheckCircle2
                                size={14}
                              />

                              Verified

                            </span>
                          )}

                        </div>

                      </div>

                      {/* ==================================
                          TRIP
                      ================================== */}

                      <div className="traveller-trip">

                        <div>

                          <span>
                            Destination
                          </span>

                          <strong>

                            <MapPin
                              size={15}
                            />

                            {
                              traveller.destination
                            }

                          </strong>

                        </div>

                        <div>

                          <span>
                            Travel Date
                          </span>

                          <strong>

                            <CalendarDays
                              size={15}
                            />

                            {traveller.travelDate
                              ? formatDate(
                                  traveller.travelDate
                                )
                              : "Flexible"}

                          </strong>

                        </div>

                        <div>

                          <span>
                            Duration
                          </span>

                          <strong>

                            <Clock3
                              size={15}
                            />

                            {traveller.duration}

                          </strong>

                        </div>

                        <div>

                          <span>
                            Travel Type
                          </span>

                          <strong>

                            <Plane
                              size={15}
                            />

                            {traveller.travelType}

                          </strong>

                        </div>

                      </div>

                      {/* ==================================
                          ABOUT
                      ================================== */}

                      {traveller.about && (

                        <p
                          style={{
                            margin:
                              "14px 0 0",
                            color:
                              "#64748b",
                            fontSize:
                              "14px",
                            lineHeight: 1.6,
                          }}
                        >

                          {traveller.about.length >
                          120
                            ? `${traveller.about.slice(
                                0,
                                120
                              )}...`
                            : traveller.about}

                        </p>

                      )}

                      {/* ==================================
                          TAGS
                      ================================== */}

                      <div className="traveller-tags">

                        <span>
                          {
                            traveller.travelType
                          }
                        </span>

                        <span>
                          {
                            traveller.languages
                          }
                        </span>

                        {traveller.hasTrip && (
                          <span>
                            Active Trip
                          </span>
                        )}

                      </div>

                      {/* ==================================
                          ACTION
                      ================================== */}

                      <button
                        type="button"
                        className="btn btn-primary traveller-button"
                        onClick={() =>
                          navigate(
                            `/profile/${traveller.id}`
                          )
                        }
                      >
                        View Profile
                      </button>

                    </article>

                  )
                )}

              </div>
            )}

        </section>

      </main>

      {/* ========================================
          MOBILE NAVIGATION
      ======================================== */}

      <nav className="dashboard-bottom-nav">

        <button
          type="button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          <Search size={20} />
          <span>Home</span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/discover")
          }
          style={{
            color: "#2563eb",
          }}
        >
          <UserRound size={20} />
          <span>Discover</span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/trips")
          }
        >
          <MapPin size={20} />
          <span>Trips</span>
        </button>

        <button
          type="button"
          onClick={() =>
            navigate("/messages")
          }
        >
          <Search size={20} />
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

      {/* ========================================
          SPINNER
      ======================================== */}

      <style>
        {`
          @keyframes spin {
            from {
              transform: rotate(0deg);
            }

            to {
              transform: rotate(360deg);
            }
          }
        `}
      </style>

    </div>
  );
}

// ==========================================
// AGE
// ==========================================

function calculateAge(dob) {
  if (!dob) {
    return null;
  }

  const birthDate = new Date(dob);

  if (
    Number.isNaN(
      birthDate.getTime()
    )
  ) {
    return null;
  }

  const today = new Date();

  let age =
    today.getFullYear() -
    birthDate.getFullYear();

  const monthDifference =
    today.getMonth() -
    birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (
      monthDifference === 0 &&
      today.getDate() <
        birthDate.getDate()
    )
  ) {
    age--;
  }

  return age;
}

// ==========================================
// FORMAT ARRAY / OBJECT VALUES
// ==========================================

function formatValue(value) {
  if (!value) {
    return "";
  }

  if (Array.isArray(value)) {
    return value.join(", ");
  }

  if (typeof value === "object") {
    return Object.values(value).join(
      ", "
    );
  }

  return String(value);
}

// ==========================================
// FORMAT DATE
// ==========================================

function formatDate(dateString) {
  if (!dateString) {
    return "Not specified";
  }

  const value = new Date(
    `${dateString}T00:00:00`
  );

  if (
    Number.isNaN(
      value.getTime()
    )
  ) {
    return dateString;
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

// ==========================================
// COMPASS
// ==========================================

function CompassIcon() {
  return (
    <span
      style={{
        fontSize: "18px",
      }}
    >
      🧭
    </span>
  );
}