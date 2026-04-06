import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// Shows a confirmation dialog when a logged-in user hits the landing page.
// User can choose to logout (clears tokens) or proceed to dashboard/admin without logging out.
export default function LandingGuard({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dest, setDest] = useState('/dashboard');

  const restaurantToken = localStorage.getItem('token');
  const adminToken = localStorage.getItem('adminToken');
  const isLoggedIn = !!(restaurantToken || adminToken);

  useEffect(() => {
    const p = location.pathname;
    const guarded = ['/', '/login', '/signup'];
    if (guarded.includes(p) && isLoggedIn) {
      // Decide default destination based on which token is present
      setDest(adminToken ? '/admin' : '/dashboard');
      setOpen(true);
    } else {
      setOpen(false);
    }
  }, [location.pathname, isLoggedIn, adminToken]);

  if (!open) return children;

  const path = location.pathname;
  const isAuthPage = path === '/login' || path === '/signup';

  return (
    <>
      {children}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', zIndex: 9999 }} role="dialog" aria-modal="true" aria-labelledby="landing-guard-title">
        <div style={{ width: '100%', maxWidth: 520, background: '#1E1E1E', color: '#F5F5F5', border: '1px solid #8B0000', borderRadius: 14, padding: 16, boxShadow: '0 10px 25px rgba(139,0,0,0.18)' }}>
          <h3 id="landing-guard-title" className="fancy-title" style={{ marginTop: 0 }}>You're already logged in</h3>
          {isAuthPage ? (
            <p className="muted" style={{ marginTop: 6 }}>
              To access this page, you’ll need to log out of the current session.
            </p>
          ) : (
            <p className="muted" style={{ marginTop: 6 }}>
              You reached the public landing page while an active session is still stored.
            </p>
          )}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, flexWrap: 'wrap' }}>
            <button className="btn" onClick={() => { setOpen(false); navigate(dest, { replace: true }); }}>Go to {dest === '/admin' ? 'Admin' : 'Dashboard'}</button>
            <button className="btn btn-primary" style={{ background: '#8B0000', borderColor: '#8B0000' }} onClick={() => {
              localStorage.removeItem('token');
              localStorage.removeItem('adminToken');
              setOpen(false);
              if (isAuthPage) {
                // Stay on the requested auth page for login/signup
                navigate(path, { replace: true });
              }
            }}>Logout & Continue</button>
          </div>
        </div>
      </div>
    </>
  );
}
