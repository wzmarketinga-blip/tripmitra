import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileCheck2,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
  XCircle,
  RefreshCw,
  Search,
  Eye,
  UserRound,
  Clock3,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function Admin() {
  const navigate = useNavigate();

  const [loading, setLoading] =
    useState(true);

  const [isAdmin, setIsAdmin] =
    useState(false);

  const [error, setError] =
    useState("");

  const [
    activeSection,
    setActiveSection,
  ] = useState("overview");

  const [profiles, setProfiles] =
    useState([]);

  const [
    verificationRequests,
    setVerificationRequests,
  ] = useState([]);

  const [reports, setReports] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  const [loadingData, setLoadingData] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [searchUsers, setSearchUsers] =
    useState("");

  const [searchReports, setSearchReports] =
    useState("");

  const [
    reportFilter,
    setReportFilter,
  ] = useState("ALL");

  const [
    reportActionId,
    setReportActionId,
  ] = useState(null);

  // ==================================================
  // ADMIN ACCESS CHECK
  // ==================================================

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } =
        await supabase.auth.getUser();

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
        data: adminProfile,
        error: profileError,
      } =
        await supabase
          .from("profiles")
          .select(
            "id, email, full_name, is_admin"
          )
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!adminProfile) {
        setIsAdmin(false);

        setError(
          "Admin access is not available for this account."
        );

        return;
      }

      if (
        adminProfile.is_admin !==
        true
      ) {
        setIsAdmin(false);

        setError(
          "You do not have administrator access."
        );

        return;
      }

      setIsAdmin(true);

      await loadAdminData();
    } catch (err) {
      console.error(
        "Admin check error:",
        err
      );

      setIsAdmin(false);

      setError(
        err?.message ||
          "Unable to verify administrator access."
      );
    } finally {
      setLoading(false);
    }
  };

  // ==================================================
  // LOAD ADMIN DATA
  // ==================================================

  const loadAdminData = async ({
    silent = false,
  } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoadingData(true);
      }

      setError("");

      const [
        profilesResult,
        verificationResult,
        reportsResult,
        paymentsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from(
            "verification_requests"
          )
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("reports")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),

        supabase
          .from("payments")
          .select("*")
          .order(
            "created_at",
            {
              ascending: false,
            }
          ),
      ]);

      const errors = [];

      if (
        profilesResult.error
      ) {
        console.error(
          "Profiles error:",
          profilesResult.error
        );

        errors.push(
          `Profiles: ${profilesResult.error.message}`
        );
      }

      if (
        verificationResult.error
      ) {
        console.error(
          "Verification error:",
          verificationResult.error
        );

        errors.push(
          `Verification: ${verificationResult.error.message}`
        );
      }

      if (
        reportsResult.error
      ) {
        console.error(
          "Reports error:",
          reportsResult.error
        );

        errors.push(
          `Reports: ${reportsResult.error.message}`
        );
      }

      if (
        paymentsResult.error
      ) {
        console.error(
          "Payments error:",
          paymentsResult.error
        );

        errors.push(
          `Payments: ${paymentsResult.error.message}`
        );
      }

      setProfiles(
        profilesResult.data || []
      );

      setVerificationRequests(
        verificationResult.data || []
      );

      setReports(
        reportsResult.data || []
      );

      setPayments(
        paymentsResult.data || []
      );

      if (errors.length > 0) {
        setError(
          `Some admin data could not be loaded. ${errors.join(
            " | "
          )}`
        );
      }
    } catch (err) {
      console.error(
        "Admin data loading error:",
        err
      );

      setError(
        err?.message ||
          "Unable to load admin data."
      );
    } finally {
      setLoadingData(false);
      setRefreshing(false);
    }
  };

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = async () => {
    try {
      const {
        error: signOutError,
      } =
        await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      navigate("/login", {
        replace: true,
      });
    } catch (err) {
      console.error(
        "Admin logout error:",
        err
      );

      alert(
        err?.message ||
          "Unable to logout."
      );
    }
  };

  // ==================================================
  // REPORT STATUS UPDATE
  // ==================================================

  const updateReportStatus = async (
    reportId,
    newStatus
  ) => {
    try {
      setReportActionId(
        reportId
      );

      setError("");

      const {
        data: { user },
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

      const {
        data: adminProfile,
        error: adminError,
      } =
        await supabase
          .from("profiles")
          .select("is_admin")
          .eq(
            "id",
            user.id
          )
          .maybeSingle();

      if (adminError) {
        throw adminError;
      }

      if (
        adminProfile?.is_admin !==
        true
      ) {
        throw new Error(
          "Administrator access is required."
        );
      }

      const {
        data: updatedReport,
        error: updateError,
      } =
        await supabase
          .from("reports")
          .update({
            status:
              newStatus,
          })
          .eq(
            "id",
            reportId
          )
          .select("*")
          .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updatedReport) {
        throw new Error(
          "Report could not be updated. Please check the admin RLS policy."
        );
      }

      setReports(
        (currentReports) =>
          currentReports.map(
            (report) =>
              report.id ===
              reportId
                ? {
                    ...report,
                    status:
                      newStatus,
                  }
                : report
          )
      );
    } catch (err) {
      console.error(
        "Report status update error:",
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
          "Report update permission issue. Please check the admin RLS policy for reports."
        );
      } else {
        setError(
          message ||
            "Report status could not be updated."
        );
      }
    } finally {
      setReportActionId(
        null
      );
    }
  };

  // ==================================================
  // STATS
  // ==================================================

  const stats = useMemo(() => {
    const totalUsers =
      profiles.length;

    const verifiedUsers =
      profiles.filter(
        (user) =>
          user.identity_verified ===
          true
      ).length;

    const paidUsers =
      profiles.filter(
        (user) =>
          user.registration_paid ===
          true
      ).length;

    const pendingVerification =
      verificationRequests.filter(
        (item) => {
          const status =
            String(
              item.status || ""
            ).toLowerCase();

          return (
            status === "" ||
            status ===
              "pending"
          );
        }
      ).length;

    const pendingReports =
      reports.filter(
        (item) => {
          const status =
            String(
              item.status || ""
            ).toLowerCase();

          return (
            status === "" ||
            status ===
              "pending" ||
            status === "open"
          );
        }
      ).length;

    const totalPayments =
      payments.length;

    const successfulPayments =
      payments.filter(
        (payment) => {
          const status =
            String(
              payment.status ||
                ""
            ).toLowerCase();

          return (
            status === "success" ||
            status === "paid" ||
            status ===
              "completed"
          );
        }
      ).length;

    const totalRevenue =
      payments
        .filter(
          (payment) => {
            const status =
              String(
                payment.status ||
                  ""
              ).toLowerCase();

            return (
              status === "success" ||
              status === "paid" ||
              status ===
                "completed"
            );
          }
        )
        .reduce(
          (
            total,
            payment
          ) =>
            total +
            (Number(
              payment.amount
            ) || 0),
          0
        );

    return {
      totalUsers,
      verifiedUsers,
      paidUsers,
      pendingVerification,
      pendingReports,
      totalPayments,
      successfulPayments,
      totalRevenue,
    };
  }, [
    profiles,
    verificationRequests,
    reports,
    payments,
  ]);

  // ==================================================
  // FILTER USERS
  // ==================================================

  const filteredUsers =
    useMemo(() => {
      const query =
        searchUsers
          .trim()
          .toLowerCase();

      if (!query) {
        return profiles;
      }

      return profiles.filter(
        (user) => {
          const name =
            String(
              user.full_name ||
                user.fullName ||
                ""
            ).toLowerCase();

          const email =
            String(
              user.email ||
                ""
            ).toLowerCase();

          const city =
            String(
              user.city ||
                ""
            ).toLowerCase();

          const state =
            String(
              user.state ||
                ""
            ).toLowerCase();

          return (
            name.includes(
              query
            ) ||
            email.includes(
              query
            ) ||
            city.includes(
              query
            ) ||
            state.includes(
              query
            )
          );
        }
      );
    }, [
      profiles,
      searchUsers,
    ]);

  // ==================================================
  // FILTER REPORTS
  // ==================================================

  const filteredReports =
    useMemo(() => {
      const query =
        searchReports
          .trim()
          .toLowerCase();

      return reports.filter(
        (report) => {
          const status =
            String(
              report.status ||
                "PENDING"
            ).toUpperCase();

          const matchesStatus =
            reportFilter ===
              "ALL" ||
            status ===
              reportFilter;

          if (
            !matchesStatus
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const reporter =
            String(
              report.reporter_id ||
                ""
            ).toLowerCase();

          const reported =
            String(
              report.reported_user_id ||
                ""
            ).toLowerCase();

          const reason =
            String(
              report.reason ||
                ""
            ).toLowerCase();

          const description =
            String(
              report.description ||
                ""
            ).toLowerCase();

          return (
            reporter.includes(
              query
            ) ||
            reported.includes(
              query
            ) ||
            reason.includes(
              query
            ) ||
            description.includes(
              query
            )
          );
        }
      );
    }, [
      reports,
      searchReports,
      reportFilter,
    ]);

  // ==================================================
  // LOADING
  // ==================================================

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
          padding:
            "24px",
          background:
            "#f8fafc",
        }}
      >
        <div
          style={{
            textAlign:
              "center",
            color:
              "#64748b",
          }}
        >
          <ShieldCheck
            size={42}
          />

          <h2
            style={{
              color:
                "#0f172a",
            }}
          >
            Checking admin access...
          </h2>

          <p>
            Please wait.
          </p>
        </div>
      </div>
    );
  }

  // ==================================================
  // NOT ADMIN
  // ==================================================

  if (!isAdmin) {
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
          padding:
            "24px",
          background:
            "#f8fafc",
        }}
      >
        <div
          style={{
            width:
              "100%",
            maxWidth:
              "520px",
            background:
              "#fff",
            borderRadius:
              "20px",
            padding:
              "32px",
            textAlign:
              "center",
            boxShadow:
              "0 10px 40px rgba(15,23,42,0.08)",
          }}
        >
          <div
            style={{
              width:
                "64px",
              height:
                "64px",
              margin:
                "0 auto 18px",
              borderRadius:
                "50%",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              background:
                "#fee2e2",
              color:
                "#dc2626",
            }}
          >
            <XCircle
              size={34}
            />
          </div>

          <h1>
            Admin Access Required
          </h1>

          <p
            style={{
              color:
                "#64748b",
              marginTop:
                "10px",
              lineHeight:
                1.6,
            }}
          >
            {error ||
              "You do not have administrator access to this page."}
          </p>

          <div
            style={{
              display:
                "flex",
              gap:
                "12px",
              justifyContent:
                "center",
              marginTop:
                "24px",
              flexWrap:
                "wrap",
            }}
          >
            <button
              type="button"
              className="btn btn-primary"
              onClick={() =>
                navigate(
                  "/dashboard"
                )
              }
            >
              Go to Dashboard
            </button>

            <button
              type="button"
              className="btn"
              onClick={
                handleLogout
              }
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==================================================
  // ADMIN DASHBOARD
  // ==================================================

  return (
    <div
      style={{
        minHeight:
          "100vh",
        background:
          "#f8fafc",
      }}
    >
      {/* =============================================
          ADMIN HEADER
      ============================================= */}

      <header
        style={{
          background:
            "#ffffff",
          borderBottom:
            "1px solid #e2e8f0",
          padding:
            "16px 24px",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          gap:
            "16px",
          flexWrap:
            "wrap",
          position:
            "sticky",
          top: 0,
          zIndex:
            20,
        }}
      >
        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "12px",
          }}
        >
          <div
            style={{
              width:
                "42px",
              height:
                "42px",
              borderRadius:
                "12px",
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              background:
                "#2563eb",
              color:
                "#fff",
            }}
          >
            <ShieldCheck
              size={23}
            />
          </div>

          <div>
            <h2
              style={{
                margin: 0,
                color:
                  "#0f172a",
              }}
            >
              TripMitra Admin
            </h2>

            <p
              style={{
                margin: 0,
                color:
                  "#64748b",
                fontSize:
                  "14px",
              }}
            >
              Administration &
              Moderation
            </p>
          </div>
        </div>

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            gap:
              "10px",
            flexWrap:
              "wrap",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={() =>
              loadAdminData({
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

          <button
            type="button"
            className="btn"
            onClick={
              handleLogout
            }
          >
            <LogOut
              size={17}
            />
            Logout
          </button>
        </div>
      </header>

      {/* =============================================
          CONTENT
      ============================================= */}

      <main
        style={{
          maxWidth:
            "1400px",
          margin:
            "0 auto",
          padding:
            "24px",
        }}
      >
        {/* ==========================================
            ERROR
        ========================================== */}

        {error && (
          <div
            style={{
              display:
                "flex",
              alignItems:
                "flex-start",
              gap:
                "10px",
              padding:
                "14px 16px",
              marginBottom:
                "20px",
              borderRadius:
                "12px",
              background:
                "#fef2f2",
              color:
                "#b91c1c",
              border:
                "1px solid #fecaca",
              lineHeight:
                1.5,
            }}
          >
            <AlertTriangle
              size={19}
              style={{
                flexShrink: 0,
                marginTop:
                  "2px",
              }}
            />

            <span>
              {error}
            </span>

            <button
              type="button"
              onClick={() =>
                setError("")
              }
              style={{
                marginLeft:
                  "auto",
                border:
                  "none",
                background:
                  "transparent",
                cursor:
                  "pointer",
                color:
                  "#b91c1c",
              }}
            >
              <XCircle
                size={18}
              />
            </button>
          </div>
        )}

        {/* ==========================================
            NAVIGATION
        ========================================== */}

        <div
          style={{
            display:
              "flex",
            gap:
              "8px",
            flexWrap:
              "wrap",
            marginBottom:
              "24px",
          }}
        >
          <AdminNavButton
            active={
              activeSection ===
              "overview"
            }
            onClick={() =>
              setActiveSection(
                "overview"
              )
            }
            icon={
              <LayoutDashboard
                size={17}
              />
            }
            label="Overview"
          />

          <AdminNavButton
            active={
              activeSection ===
              "verification"
            }
            onClick={() =>
              setActiveSection(
                "verification"
              )
            }
            icon={
              <FileCheck2
                size={17}
              />
            }
            label="Verification"
            badge={
              stats.pendingVerification >
              0
                ? stats.pendingVerification
                : null
            }
          />

          <AdminNavButton
            active={
              activeSection ===
              "reports"
            }
            onClick={() =>
              setActiveSection(
                "reports"
              )
            }
            icon={
              <AlertTriangle
                size={17}
              />
            }
            label="Reports"
            badge={
              stats.pendingReports >
              0
                ? stats.pendingReports
                : null
            }
          />

          <AdminNavButton
            active={
              activeSection ===
              "payments"
            }
            onClick={() =>
              setActiveSection(
                "payments"
              )
            }
            icon={
              <CreditCard
                size={17}
              />
            }
            label="Payments"
          />

          <AdminNavButton
            active={
              activeSection ===
              "users"
            }
            onClick={() =>
              setActiveSection(
                "users"
              )
            }
            icon={
              <Users
                size={17}
              />
            }
            label="Users"
          />
        </div>

        {/* ==========================================
            OVERVIEW
        ========================================== */}

        {activeSection ===
          "overview" && (
          <>
            <div
              style={{
                marginBottom:
                  "24px",
              }}
            >
              <h1
                style={{
                  marginBottom:
                    "6px",
                }}
              >
                Admin Overview
              </h1>

              <p
                style={{
                  color:
                    "#64748b",
                  margin: 0,
                }}
              >
                Monitor users, verification,
                reports and payment activity.
              </p>
            </div>

            <div
              style={{
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(210px, 1fr))",
                gap:
                  "16px",
              }}
            >
              <StatCard
                icon={
                  <Users
                    size={23}
                  />
                }
                title="Total Users"
                value={
                  stats.totalUsers
                }
              />

              <StatCard
                icon={
                  <ShieldCheck
                    size={23}
                  />
                }
                title="Verified Users"
                value={
                  stats.verifiedUsers
                }
              />

              <StatCard
                icon={
                  <CheckCircle2
                    size={23}
                  />
                }
                title="Paid Users"
                value={
                  stats.paidUsers
                }
              />

              <StatCard
                icon={
                  <FileCheck2
                    size={23}
                  />
                }
                title="Pending Verification"
                value={
                  stats.pendingVerification
                }
              />

              <StatCard
                icon={
                  <AlertTriangle
                    size={23}
                  />
                }
                title="Open Reports"
                value={
                  stats.pendingReports
                }
              />

              <StatCard
                icon={
                  <CreditCard
                    size={23}
                  />
                }
                title="Successful Payments"
                value={
                  stats.successfulPayments
                }
              />

              <StatCard
                icon={
                  <CreditCard
                    size={23}
                  />
                }
                title="Revenue"
                value={
                  formatAmount(
                    stats.totalRevenue
                  )
                }
              />
            </div>

            {/* SYSTEM STATUS */}

            <div
              style={{
                marginTop:
                  "24px",
                background:
                  "#ffffff",
                borderRadius:
                  "18px",
                padding:
                  "24px",
                border:
                  "1px solid #e2e8f0",
              }}
            >
              <h2>
                System Status
              </h2>

              <div
                style={{
                  display:
                    "grid",
                  gap:
                    "12px",
                  marginTop:
                    "16px",
                }}
              >
                <StatusRow
                  label="Admin authentication"
                  status="Active"
                />

                <StatusRow
                  label="User database"
                  status="Connected"
                />

                <StatusRow
                  label="Verification system"
                  status="Connected"
                />

                <StatusRow
                  label="Payment records"
                  status="Connected"
                />

                <StatusRow
                  label="Moderation reports"
                  status="Connected"
                />
              </div>
            </div>

            {/* QUICK ACTIONS */}

            <div
              style={{
                marginTop:
                  "24px",
                display:
                  "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(240px, 1fr))",
                gap:
                  "16px",
              }}
            >
              <QuickAction
                icon={
                  <AlertTriangle
                    size={22}
                  />
                }
                title="Review Reports"
                description="Open reported users and moderation reports."
                onClick={() =>
                  setActiveSection(
                    "reports"
                  )
                }
              />

              <QuickAction
                icon={
                  <FileCheck2
                    size={22}
                  />
                }
                title="Verification Queue"
                description="Review pending verification requests."
                onClick={() =>
                  setActiveSection(
                    "verification"
                  )
                }
              />

              <QuickAction
                icon={
                  <Users
                    size={22}
                  />
                }
                title="User Directory"
                description="Search and inspect registered users."
                onClick={() =>
                  setActiveSection(
                    "users"
                  )
                }
              />
            </div>
          </>
        )}

        {/* ==========================================
            VERIFICATION
        ========================================== */}

        {activeSection ===
          "verification" && (
          <AdminDataSection
            title="Verification Requests"
            description="Review user verification requests."
          >
            {loadingData ? (
              <EmptyState text="Loading verification requests..." />
            ) : verificationRequests.length ===
              0 ? (
              <EmptyState text="No verification requests found." />
            ) : (
              <DataTable
                columns={[
                  "User",
                  "Status",
                  "Created",
                  "Action",
                ]}
                rows={verificationRequests.map(
                  (
                    item
                  ) => [
                    <span
                      title={
                        item.user_id ||
                        item.profile_id ||
                        ""
                      }
                    >
                      {shortId(
                        item.user_id ||
                          item.profile_id
                      )}
                    </span>,

                    <StatusBadge
                      status={
                        item.status ||
                        "Pending"
                      }
                    />,

                    formatDate(
                      item.created_at
                    ),

                    <button
                      type="button"
                      className="btn"
                      onClick={() =>
                        setActiveSection(
                          "users"
                        )
                      }
                    >
                      <Eye
                        size={
                          15
                        }
                      />
                      Users
                    </button>,
                  ]
                )}
              />
            )}
          </AdminDataSection>
        )}

        {/* ==========================================
            REPORTS
        ========================================== */}

        {activeSection ===
          "reports" && (
          <AdminDataSection
            title="Reports"
            description="Review safety and moderation reports."
          >
            {/* REPORT FILTERS */}

            <div
              style={{
                padding:
                  "16px",
                borderBottom:
                  "1px solid #e2e8f0",
                display:
                  "flex",
                gap:
                  "10px",
                flexWrap:
                  "wrap",
              }}
            >
              <div
                style={{
                  flex:
                    "1 1 260px",
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
                    "10px",
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
                    searchReports
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchReports(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Search reports..."
                  style={{
                    width:
                      "100%",
                    border:
                      "none",
                    outline:
                      "none",
                    background:
                      "transparent",
                    fontFamily:
                      "inherit",
                  }}
                />
              </div>

              <select
                value={
                  reportFilter
                }
                onChange={(
                  event
                ) =>
                  setReportFilter(
                    event
                      .target
                      .value
                  )
                }
                style={{
                  minWidth:
                    "150px",
                  padding:
                    "10px 12px",
                  border:
                    "1px solid #cbd5e1",
                  borderRadius:
                    "10px",
                  background:
                    "#ffffff",
                }}
              >
                <option value="ALL">
                  All Reports
                </option>

                <option value="PENDING">
                  Pending
                </option>

                <option value="OPEN">
                  Open
                </option>

                <option value="RESOLVED">
                  Resolved
                </option>

                <option value="REJECTED">
                  Rejected
                </option>
              </select>
            </div>

            {loadingData ? (
              <EmptyState text="Loading reports..." />
            ) : filteredReports.length ===
              0 ? (
              <EmptyState text="No matching reports found." />
            ) : (
              <div
                style={{
                  padding:
                    "16px",
                  display:
                    "grid",
                  gap:
                    "14px",
                }}
              >
                {filteredReports.map(
                  (
                    report
                  ) => {
                    const status =
                      String(
                        report.status ||
                          "PENDING"
                      ).toUpperCase();

                    const isProcessing =
                      reportActionId ===
                      report.id;

                    return (
                      <article
                        key={
                          report.id
                        }
                        style={{
                          border:
                            "1px solid #e2e8f0",
                          borderRadius:
                            "16px",
                          padding:
                            "18px",
                          background:
                            "#ffffff",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "flex-start",
                            gap:
                              "14px",
                            flexWrap:
                              "wrap",
                          }}
                        >
                          <div>
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
                              <strong
                                style={{
                                  fontSize:
                                    "17px",
                                  color:
                                    "#0f172a",
                                }}
                              >
                                {
                                  report.reason ||
                                  "Safety Report"
                                }
                              </strong>

                              <StatusBadge
                                status={
                                  status
                                }
                              />
                            </div>

                            <p
                              style={{
                                margin:
                                  "7px 0 0",
                                color:
                                  "#64748b",
                                fontSize:
                                  "13px",
                              }}
                            >
                              Reported on{" "}
                              {formatDate(
                                report.created_at
                              )}
                            </p>
                          </div>

                          <div
                            style={{
                              display:
                                "flex",
                              gap:
                                "8px",
                              flexWrap:
                                "wrap",
                            }}
                          >
                            {status !==
                              "RESOLVED" && (
                              <button
                                type="button"
                                className="btn btn-primary"
                                disabled={
                                  isProcessing
                                }
                                onClick={() =>
                                  updateReportStatus(
                                    report.id,
                                    "RESOLVED"
                                  )
                                }
                              >
                                <CheckCircle2
                                  size={
                                    15
                                  }
                                />

                                {isProcessing
                                  ? "Updating..."
                                  : "Resolve"}
                              </button>
                            )}

                            {status ===
                              "RESOLVED" && (
                              <button
                                type="button"
                                className="btn"
                                disabled={
                                  isProcessing
                                }
                                onClick={() =>
                                  updateReportStatus(
                                    report.id,
                                    "PENDING"
                                  )
                                }
                              >
                                <Clock3
                                  size={
                                    15
                                  }
                                />

                                Reopen
                              </button>
                            )}
                          </div>
                        </div>

                        <div
                          style={{
                            display:
                              "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(220px, 1fr))",
                            gap:
                              "12px",
                            marginTop:
                              "16px",
                          }}
                        >
                          <InfoBox
                            label="Reporter"
                            value={
                              shortId(
                                report.reporter_id
                              )
                            }
                          />

                          <InfoBox
                            label="Reported User"
                            value={
                              shortId(
                                report.reported_user_id
                              )
                            }
                          />

                          <InfoBox
                            label="Reason"
                            value={
                              report.reason ||
                              "-"
                            }
                          />
                        </div>

                        <div
                          style={{
                            marginTop:
                              "14px",
                            padding:
                              "14px",
                            borderRadius:
                              "12px",
                            background:
                              "#f8fafc",
                          }}
                        >
                          <span
                            style={{
                              display:
                                "block",
                              marginBottom:
                                "5px",
                              fontSize:
                                "12px",
                              color:
                                "#94a3b8",
                              fontWeight:
                                700,
                            }}
                          >
                            DESCRIPTION
                          </span>

                          <p
                            style={{
                              margin:
                                0,
                              color:
                                "#475569",
                              lineHeight:
                                1.6,
                              fontSize:
                                "14px",
                            }}
                          >
                            {report.description ||
                              "No additional details provided."}
                          </p>
                        </div>
                      </article>
                    );
                  }
                )}
              </div>
            )}
          </AdminDataSection>
        )}

        {/* ==========================================
            PAYMENTS
        ========================================== */}

        {activeSection ===
          "payments" && (
          <AdminDataSection
            title="Payments"
            description="View registration and transaction records."
          >
            {loadingData ? (
              <EmptyState text="Loading payments..." />
            ) : payments.length ===
              0 ? (
              <EmptyState text="No payment records found." />
            ) : (
              <DataTable
                columns={[
                  "User",
                  "Amount",
                  "Type",
                  "Status",
                  "Created",
                ]}
                rows={payments.map(
                  (
                    item
                  ) => [
                    shortId(
                      item.user_id ||
                        item.profile_id
                    ),

                    formatAmount(
                      item.amount
                    ),

                    item.payment_type ||
                      "Registration",

                    <StatusBadge
                      status={
                        item.status ||
                        "Pending"
                      }
                    />,

                    formatDate(
                      item.created_at
                    ),
                  ]
                )}
              />
            )}
          </AdminDataSection>
        )}

        {/* ==========================================
            USERS
        ========================================== */}

        {activeSection ===
          "users" && (
          <AdminDataSection
            title="Users"
            description="Search and inspect registered TripMitra users."
          >
            {/* USER SEARCH */}

            <div
              style={{
                padding:
                  "16px",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >
              <div
                style={{
                  maxWidth:
                    "520px",
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
                    "10px",
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
                    searchUsers
                  }
                  onChange={(
                    event
                  ) =>
                    setSearchUsers(
                      event
                        .target
                        .value
                    )
                  }
                  placeholder="Search by name, email, city..."
                  style={{
                    width:
                      "100%",
                    border:
                      "none",
                    outline:
                      "none",
                    background:
                      "transparent",
                    fontFamily:
                      "inherit",
                  }}
                />
              </div>

              <p
                style={{
                  margin:
                    "10px 0 0",
                  color:
                    "#94a3b8",
                  fontSize:
                    "12px",
                }}
              >
                Showing{" "}
                {
                  filteredUsers.length
                }{" "}
                of{" "}
                {
                  profiles.length
                }{" "}
                users
              </p>
            </div>

            {loadingData ? (
              <EmptyState text="Loading users..." />
            ) : filteredUsers.length ===
              0 ? (
              <EmptyState text="No matching users found." />
            ) : (
              <DataTable
                columns={[
                  "Name",
                  "Email",
                  "Location",
                  "Identity",
                  "Registration",
                  "Created",
                ]}
                rows={filteredUsers.map(
                  (
                    user
                  ) => [
                    <div
                      style={{
                        display:
                          "flex",
                        alignItems:
                          "center",
                        gap:
                          "9px",
                      }}
                    >
                      <div
                        style={{
                          width:
                            "34px",
                          height:
                            "34px",
                          borderRadius:
                            "50%",
                          background:
                            "#eff6ff",
                          color:
                            "#2563eb",
                          display:
                            "flex",
                          alignItems:
                            "center",
                          justifyContent:
                            "center",
                        }}
                      >
                        <UserRound
                          size={
                            16
                          }
                        />
                      </div>

                      <div>
                        <strong
                          style={{
                            display:
                              "block",
                            color:
                              "#0f172a",
                          }}
                        >
                          {user.full_name ||
                            user.fullName ||
                            "-"}
                        </strong>

                        <span
                          style={{
                            color:
                              "#94a3b8",
                            fontSize:
                              "11px",
                          }}
                        >
                          {shortId(
                            user.id
                          )}
                        </span>
                      </div>
                    </div>,

                    user.email ||
                      "-",

                    `${user.city || "-"}${
                      user.state
                        ? `, ${user.state}`
                        : ""
                    }`,

                    <StatusBadge
                      status={
                        user.identity_verified
                          ? "Verified"
                          : "Pending"
                      }
                    />,

                    <StatusBadge
                      status={
                        user.registration_paid
                          ? "Paid"
                          : "Pending"
                      }
                    />,

                    formatDate(
                      user.created_at
                    ),
                  ]
                )}
              />
            )}
          </AdminDataSection>
        )}
      </main>
    </div>
  );
}

/* ====================================================
   ADMIN NAV BUTTON
==================================================== */

function AdminNavButton({
  active,
  onClick,
  icon,
  label,
  badge,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        gap:
          "8px",
        border:
          "1px solid #e2e8f0",
        borderRadius:
          "10px",
        padding:
          "10px 14px",
        cursor:
          "pointer",
        background:
          active
            ? "#2563eb"
            : "#ffffff",
        color:
          active
            ? "#ffffff"
            : "#0f172a",
        fontWeight:
          600,
      }}
    >
      {icon}

      {label}

      {badge !== null &&
        badge !== undefined && (
          <span
            style={{
              minWidth:
                "20px",
              height:
                "20px",
              padding:
                "0 5px",
              borderRadius:
                "999px",
              background:
                active
                  ? "#ffffff"
                  : "#fee2e2",
              color:
                active
                  ? "#2563eb"
                  : "#dc2626",
              fontSize:
                "10px",
              fontWeight:
                800,
              display:
                "inline-flex",
              alignItems:
                "center",
              justifyContent:
                "center",
            }}
          >
            {badge}
          </span>
        )}
    </button>
  );
}

/* ====================================================
   STAT CARD
==================================================== */

function StatCard({
  icon,
  title,
  value,
}) {
  return (
    <div
      style={{
        background:
          "#ffffff",
        borderRadius:
          "18px",
        padding:
          "20px",
        border:
          "1px solid #e2e8f0",
      }}
    >
      <div
        style={{
          width:
            "44px",
          height:
            "44px",
          borderRadius:
            "12px",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          background:
            "#eff6ff",
          color:
            "#2563eb",
          marginBottom:
            "14px",
        }}
      >
        {icon}
      </div>

      <p
        style={{
          margin:
            0,
          color:
            "#64748b",
          fontSize:
            "14px",
        }}
      >
        {title}
      </p>

      <strong
        style={{
          display:
            "block",
          marginTop:
            "5px",
          fontSize:
            "25px",
          color:
            "#0f172a",
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/* ====================================================
   STATUS ROW
==================================================== */

function StatusRow({
  label,
  status,
}) {
  return (
    <div
      style={{
        display:
          "flex",
        alignItems:
          "center",
        justifyContent:
          "space-between",
        gap:
          "12px",
        padding:
          "12px 0",
        borderBottom:
          "1px solid #f1f5f9",
      }}
    >
      <span
        style={{
          color:
            "#334155",
          fontSize:
            "14px",
        }}
      >
        {label}
      </span>

      <span
        style={{
          display:
            "inline-flex",
          alignItems:
            "center",
          gap:
            "6px",
          color:
            "#16a34a",
          fontWeight:
            600,
          fontSize:
            "14px",
        }}
      >
        <CheckCircle2
          size={16}
        />

        {status}
      </span>
    </div>
  );
}

/* ====================================================
   QUICK ACTION
==================================================== */

function QuickAction({
  icon,
  title,
  description,
  onClick,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border:
          "1px solid #e2e8f0",
        borderRadius:
          "16px",
        background:
          "#ffffff",
        padding:
          "18px",
        display:
          "flex",
        alignItems:
          "flex-start",
        gap:
          "12px",
        textAlign:
          "left",
        cursor:
          "pointer",
      }}
    >
      <div
        style={{
          width:
            "42px",
          height:
            "42px",
          minWidth:
            "42px",
          borderRadius:
            "12px",
          background:
            "#eff6ff",
          color:
            "#2563eb",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
        }}
      >
        {icon}
      </div>

      <div>
        <strong
          style={{
            display:
              "block",
            color:
              "#0f172a",
            marginBottom:
              "4px",
          }}
        >
          {title}
        </strong>

        <span
          style={{
            color:
              "#64748b",
            fontSize:
              "13px",
            lineHeight:
              1.5,
          }}
        >
          {description}
        </span>
      </div>
    </button>
  );
}

/* ====================================================
   DATA SECTION
==================================================== */

function AdminDataSection({
  title,
  description,
  children,
}) {
  return (
    <section>
      <div
        style={{
          marginBottom:
            "20px",
        }}
      >
        <h1
          style={{
            marginBottom:
              "6px",
          }}
        >
          {title}
        </h1>

        <p
          style={{
            color:
              "#64748b",
            margin:
              0,
          }}
        >
          {description}
        </p>
      </div>

      <div
        style={{
          background:
            "#ffffff",
          borderRadius:
            "18px",
          border:
            "1px solid #e2e8f0",
          overflow:
            "hidden",
        }}
      >
        {children}
      </div>
    </section>
  );
}

/* ====================================================
   EMPTY STATE
==================================================== */

function EmptyState({
  text,
}) {
  return (
    <div
      style={{
        padding:
          "50px 24px",
        textAlign:
          "center",
        color:
          "#64748b",
      }}
    >
      <FileCheck2
        size={32}
        style={{
          marginBottom:
            "10px",
          opacity:
            0.55,
        }}
      />

      <div>
        {text}
      </div>
    </div>
  );
}

/* ====================================================
   DATA TABLE
==================================================== */

function DataTable({
  columns,
  rows,
}) {
  return (
    <div
      style={{
        overflowX:
          "auto",
      }}
    >
      <table
        style={{
          width:
            "100%",
          borderCollapse:
            "collapse",
          minWidth:
            "760px",
        }}
      >
        <thead>
          <tr>
            {columns.map(
              (
                column
              ) => (
                <th
                  key={
                    column
                  }
                  style={{
                    textAlign:
                      "left",
                    padding:
                      "14px 16px",
                    background:
                      "#f8fafc",
                    borderBottom:
                      "1px solid #e2e8f0",
                    fontSize:
                      "13px",
                    color:
                      "#475569",
                    whiteSpace:
                      "nowrap",
                  }}
                >
                  {
                    column
                  }
                </th>
              )
            )}
          </tr>
        </thead>

        <tbody>
          {rows.map(
            (
              row,
              rowIndex
            ) => (
              <tr
                key={
                  rowIndex
                }
              >
                {row.map(
                  (
                    cell,
                    cellIndex
                  ) => (
                    <td
                      key={
                        cellIndex
                      }
                      style={{
                        padding:
                          "14px 16px",
                        borderBottom:
                          "1px solid #f1f5f9",
                        color:
                          "#334155",
                        fontSize:
                          "14px",
                        verticalAlign:
                          "middle",
                      }}
                    >
                      {cell}
                    </td>
                  )
                )}
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ====================================================
   STATUS BADGE
==================================================== */

function StatusBadge({
  status,
}) {
  const normalized =
    String(
      status ||
        "Pending"
    ).toUpperCase();

  let background =
    "#fef3c7";

  let color =
    "#92400e";

  let icon =
    <Clock3
      size={13}
    />;

  if (
    normalized ===
      "VERIFIED" ||
    normalized ===
      "PAID" ||
    normalized ===
      "SUCCESS" ||
    normalized ===
      "COMPLETED" ||
    normalized ===
      "RESOLVED" ||
    normalized ===
      "ACCEPTED"
  ) {
    background =
      "#dcfce7";

    color =
      "#166534";

    icon =
      <CheckCircle2
        size={13}
      />;
  }

  if (
    normalized ===
      "REJECTED" ||
    normalized ===
      "DECLINED"
  ) {
    background =
      "#fee2e2";

    color =
      "#b91c1c";

    icon =
      <XCircle
        size={13}
      />;
  }

  return (
    <span
      style={{
        display:
          "inline-flex",
        alignItems:
          "center",
        gap:
          "5px",
        padding:
          "5px 8px",
        borderRadius:
          "999px",
        background,
        color,
        fontSize:
          "11px",
        fontWeight:
          800,
        whiteSpace:
          "nowrap",
      }}
    >
      {icon}

      {normalized}
    </span>
  );
}

/* ====================================================
   INFO BOX
==================================================== */

function InfoBox({
  label,
  value,
}) {
  return (
    <div
      style={{
        padding:
          "12px",
        borderRadius:
          "12px",
        background:
          "#f8fafc",
        border:
          "1px solid #e2e8f0",
      }}
    >
      <span
        style={{
          display:
            "block",
          color:
            "#94a3b8",
          fontSize:
            "11px",
          fontWeight:
            800,
          marginBottom:
            "5px",
        }}
      >
        {label}
      </span>

      <strong
        style={{
          color:
            "#334155",
          fontSize:
            "13px",
          wordBreak:
            "break-word",
        }}
      >
        {value}
      </strong>
    </div>
  );
}

/* ====================================================
   DATE FORMAT
==================================================== */

function formatDate(
  value
) {
  if (!value) {
    return "-";
  }

  try {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return "-";
    }

    return date.toLocaleString(
      "en-IN",
      {
        dateStyle:
          "medium",
        timeStyle:
          "short",
      }
    );
  } catch {
    return String(
      value
    );
  }
}

/* ====================================================
   AMOUNT FORMAT
==================================================== */

function formatAmount(
  value
) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "-";
  }

  const number =
    Number(value);

  if (
    Number.isNaN(
      number
    )
  ) {
    return String(
      value
    );
  }

  return `₹${number.toLocaleString(
    "en-IN"
  )}`;
}

/* ====================================================
   SHORT ID
==================================================== */

function shortId(
  value
) {
  if (!value) {
    return "-";
  }

  const text =
    String(value);

  if (
    text.length <=
    16
  ) {
    return text;
  }

  return `${text.slice(
    0,
    8
  )}...${text.slice(
    -5
  )}`;
}