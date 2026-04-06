import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import '../assets/css/App.css';

// Intercepts browser back navigation when logged in and shows a confirmation modal.
export default function BackGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const allowBackRef = useRef(false);

  const isLoggedIn = !!(localStorage.getItem('token') || localStorage.getItem('adminToken'));

  useEffect(() => {
    const onPopState = () => {
      if (!isLoggedIn) return;
      // If user is navigating back to landing ('/') let LandingGuard handle it
      if (window.location.pathname === '/' || location.state?.from === '/login') return;
      if (allowBackRef.current) {
        allowBackRef.current = false;
        return;
      }
      setOpen(true);
      navigate(1); // neutralize back
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [isLoggedIn, navigate]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="resubmit-title">
      <div className="modal" style={{ maxWidth: 520 }}>
        <h3 id="resubmit-title">Confirm form resubmission</h3>
        <p>
          You're about to go back. This may resubmit your last action (like saving or submitting a form).
          Do you want to continue?
        </p>
        <div className="modal-actions">
          <button className="btn" onClick={() => setOpen(false)}>Stay on this page</button>
          <button
            className="btn btn-primary"
            onClick={() => {
              // Allow one back navigation and trigger it
              allowBackRef.current = true;
              setOpen(false);
              navigate(-1);
            }}
          >
            Continue back
          </button>
        </div>
      </div>
    </div>
  );
}
