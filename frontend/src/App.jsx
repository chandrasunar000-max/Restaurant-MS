import "./assets/css/App.css";
import "./assets/css/landing.css"; // Moved from LandingPage useEffect
import React, { Suspense, lazy } from "react";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";

// Route pages (lazy)
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const MenuList = lazy(() => import("./pages/MenuList"));
import ProtectedRoute from "./components/ProtectedRoute";
const PublicMenu = lazy(() => import("./pages/PublicMenu/PublicMenu"));
const PublicOrders = lazy(() => import("./pages/PublicOrders"));
const RestaurantProfile = lazy(() => import("./components/restaurantProfile"));

const ForgotPasswordOtp = lazy(() => import("./pages/ForgotPasswordOtp"));
const VerifyRegistrationOtp = lazy(() => import("./pages/VerifyRegistrationOtp"));
const ResetPasswordOtp = lazy(() => import("./pages/ResetPasswordOtp"));
// import FloatingChatButton from "./components/FloatingChatButton"; // disabled per request
import BackGuard from "./components/BackGuard";
import GlobalOrderSound from "./components/GlobalOrderSound";
import ErrorBoundary from "./components/ErrorBoundary";
import GlobalErrorOverlay from "./components/GlobalErrorOverlay";

// Landing pieces (lazy)
const Header = lazy(() => import('./components/landing/Header'));
const Hero = lazy(() => import('./components/landing/Hero'));
const BackToTop = lazy(() => import('./components/landing/BackToTop'));
const CookieConsent = lazy(() => import('./components/landing/CookieConsent'));
const ThemeToggle = lazy(() => import('./components/landing/ThemeToggle'));
const VideoModal = lazy(() => import('./components/landing/VideoModal'));

import { AuthProvider } from "./context/AuthContext";
import LandingGuard from './components/LandingGuard';
import LazyBoundary from './components/LazyBoundary';

function LandingPage(){
  const [videoOpen, setVideoOpen] = React.useState(false);
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const navigate = (hash) => {
    const el = document.getElementById(hash === 'home' ? 'home' : hash);
    if(el){ el.scrollIntoView({behavior:'smooth'}); }
  };

  React.useEffect(() => {
    // Load Font Awesome (only for landing where icons are used)
    let faLink = document.querySelector('link[href*="font-awesome"]');
    if (!faLink) {
      faLink = document.createElement('link');
      faLink.rel = 'stylesheet';
      faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css';
      faLink.onload = () => { faLink.media = 'all'; }; // Load immediately
      document.head.appendChild(faLink);
    }

    return () => {
      // Keep styles in DOM (benefit subsequent visits). Remove only if you prefer to cleanup.
    };
  }, []);

  return (
    <>
      <Header onGetStartedClick={scrollToTop} onNav={navigate} />
      <ThemeToggle />
      <Hero onVideo={()=>setVideoOpen(true)} />
      <BackToTop />
      <CookieConsent />
      <VideoModal open={videoOpen} onClose={()=>setVideoOpen(false)} />
    </>
  );
}

const Loader = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#8B0000'
  }}>
    <div style={{
      width: '60px',
      height: '60px',
      border: '6px solid #f3f3f3',
      borderTop: '6px solid #8B0000',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }}></div>
    <style>{`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `}</style>
  </div>
);

function AppInner() {
  const location = useLocation();
  const path = location.pathname || '';
  const hasToken = !!localStorage.getItem('token');
  return (
    <>
      <BackGuard />
      {hasToken && !path.startsWith('/r/') && (
        <GlobalOrderSound />
      )}
      {path !== '/' && <GlobalErrorOverlay />}
      <Suspense fallback={<Loader/>}>
        <Routes>
          <Route path="/" element={<LandingGuard><LandingPage /></LandingGuard>} />
          <Route path="/signup" element={<LandingGuard><Signup /></LandingGuard>} />
          <Route path="/login" element={<LandingGuard><Login /></LandingGuard>} />
          <Route path="/verify-registration-otp" element={<LandingGuard><VerifyRegistrationOtp /></LandingGuard>} />
          {/* <Route path="/admin/login" element={<LandingGuard><AdminLogin /></LandingGuard>} /> */}
          <Route path="/forgot-password" element={<LandingGuard><ForgotPasswordOtp /></LandingGuard>} />
          <Route path="/reset-password-otp" element={<LandingGuard><ResetPasswordOtp /></LandingGuard>} />
          
          <Route path="/r/:rid/t/:table" element={<LandingGuard><PublicMenu /></LandingGuard>} />
          <Route path="/r/:rid/room/:room" element={<LandingGuard><PublicMenu /></LandingGuard>} />
          <Route path="/r/:rid/t/:table/orders" element={<LandingGuard><PublicOrders /></LandingGuard>} />
          <Route path="/r/:rid/room/:room/orders" element={<LandingGuard><PublicOrders /></LandingGuard>} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <LazyBoundary fallback={<Loader/>}>
                  <Dashboard />
                </LazyBoundary>
              </ProtectedRoute>
            }
          />


          <Route
            path="/restaurant-profile"
            element={
              <ProtectedRoute>
                <ErrorBoundary>
                  <RestaurantProfile />
                </ErrorBoundary>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </>
  );
}

function App() {
  if (typeof window !== 'undefined') {
    const url = new URL(window.location.href);
    const token = url.searchParams.get('token');
    if (token) {
      localStorage.setItem('token', token);
      url.searchParams.delete('token');
      window.history.replaceState({}, document.title, url.toString());
    }
  }

  return (
    <AuthProvider>
      <Router>
        <AppInner />
      </Router>
    </AuthProvider>
  );
}

export default App;
