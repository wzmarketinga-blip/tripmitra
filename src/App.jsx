import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ==========================================
// PAGES
// ==========================================

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyPhone from "./pages/VerifyPhone";
import Verification from "./pages/Verification";
import Payment from "./pages/Payment";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

import Dashboard from "./pages/Dashboard";
import Discover from "./pages/Discover";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Requests from "./pages/Requests";
import Messages from "./pages/Messages";
import Trips from "./pages/Trips";
import Notifications from "./pages/Notifications";
import Safety from "./pages/Safety";
import Admin from "./pages/Admin";

// ==========================================
// CONTEXT / SUPABASE
// ==========================================

import { ProfileProvider } from "./context/ProfileContext";
import { supabase } from "./lib/supabase";

// ==========================================
// CSS
// ==========================================

import "./App.css";

/* =====================================================
   PROTECTED ROUTE
   ===================================================== */

function ProtectedRoute({ children }) {
  const [session, setSession] =
    useState(null);

  const [checking, setChecking] =
    useState(true);

  useEffect(() => {
    let mounted = true;

    // ------------------------------------------
    // CHECK CURRENT SESSION
    // ------------------------------------------

    const checkSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } =
          await supabase.auth.getSession();

        if (!mounted) {
          return;
        }

        if (error) {
          console.error(
            "Session check error:",
            error
          );

          setSession(null);
        } else {
          setSession(
            currentSession
          );
        }
      } catch (error) {
        console.error(
          "Session check failed:",
          error
        );

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setChecking(false);
        }
      }
    };

    checkSession();

    // ------------------------------------------
    // AUTH STATE LISTENER
    // ------------------------------------------

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth.onAuthStateChange(
        (_event, currentSession) => {
          if (!mounted) {
            return;
          }

          setSession(
            currentSession
          );

          setChecking(false);
        }
      );

    return () => {
      mounted = false;

      subscription.unsubscribe();
    };
  }, []);

  // ------------------------------------------
  // SESSION CHECK LOADING
  // ------------------------------------------

  if (checking) {
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

          padding:
            "20px",

          textAlign:
            "center",
        }}
      >
        Checking your session...
      </div>
    );
  }

  // ------------------------------------------
  // NOT LOGGED IN
  // ------------------------------------------

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // ------------------------------------------
  // LOGGED IN
  // ------------------------------------------

  return children;
}

/* =====================================================
   APP
   ===================================================== */

function App() {
  return (
    <ProfileProvider>
      <BrowserRouter>
        <Routes>

          {/* ==========================================
              PUBLIC ROUTES
          ========================================== */}

          <Route
            path="/"
            element={
              <Home />
            }
          />

          <Route
            path="/login"
            element={
              <Login />
            }
          />

          <Route
            path="/register"
            element={
              <Register />
            }
          />

          <Route
            path="/forgot-password"
            element={
              <ForgotPassword />
            }
          />

          <Route
            path="/reset-password"
            element={
              <ResetPassword />
            }
          />

          {/* ------------------------------------------
              PUBLIC SAFETY PAGE
          ------------------------------------------ */}

          <Route
            path="/safety"
            element={
              <Safety />
            }
          />


          {/* ==========================================
              AUTHENTICATED ONBOARDING ROUTES
          ========================================== */}

          <Route
            path="/verify-phone"
            element={
              <ProtectedRoute>
                <VerifyPhone />
              </ProtectedRoute>
            }
          />

          <Route
            path="/verification"
            element={
              <ProtectedRoute>
                <Verification />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <Payment />
              </ProtectedRoute>
            }
          />


          {/* ==========================================
              USER PROTECTED ROUTES
          ========================================== */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <Discover />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/:id"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile/edit"
            element={
              <ProtectedRoute>
                <EditProfile />
              </ProtectedRoute>
            }
          />

          <Route
            path="/requests"
            element={
              <ProtectedRoute>
                <Requests />
              </ProtectedRoute>
            }
          />

          <Route
            path="/messages"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <Trips />
              </ProtectedRoute>
            }
          />

          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <Notifications />
              </ProtectedRoute>
            }
          />


          {/* ==========================================
              ADMIN
          ========================================== */}

          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Admin />
              </ProtectedRoute>
            }
          />


          {/* ==========================================
              UNKNOWN URL
          ========================================== */}

          <Route
            path="*"
            element={
              <Navigate
                to="/"
                replace
              />
            }
          />

        </Routes>
      </BrowserRouter>
    </ProfileProvider>
  );
}

export default App;