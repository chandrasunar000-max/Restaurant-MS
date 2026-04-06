import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/landing/Header";

function ResetPasswordOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefillEmail = location?.state?.email || "";
  const [email, setEmail] = useState(prefillEmail);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    if (password !== confirm) {
      setMessage("Passwords do not match");
      return;
    }
    // simple strength hint; server enforces real rules
    if (password.length < 8) {
      setMessage("Use at least 8 characters for a strong password");
      return;
    }
    setLoading(true);
    try {
      await api.post("/restaurants/password/reset-otp", { email: String(email).trim(), otp: String(otp).trim(), password });
      setMessage("Password reset successful. Redirecting to login…");
      setTimeout(()=> navigate('/login'), 800);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <Header onGetStartedClick={()=>navigate('/signup')} onNav={()=>{}} />
      <main className="auth-main">
        <div className="auth-card">
          <div style={{display:'flex', justifyContent:'space-between'}}>
            <Link to="/forgot-password" className="btn-secondary" style={{textDecoration:'none'}}>Back</Link>
            <Link to="/" className="btn-secondary" style={{textDecoration:'none'}}>Home</Link>
          </div>
          <h1 className="auth-title premium-title">Reset Password with OTP</h1>
          <p className="auth-subtitle">Enter the 6-digit OTP sent to your email and set a new password.</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input type="email" placeholder="you@restaurant.com" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </label>
            <label className="auth-field">
              <span className="auth-label">OTP</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="6-digit code"
                value={otp}
                onChange={(e)=>setOtp(e.target.value.replace(/[^0-9]/g,''))}
                required
              />
            </label>
            <label className="auth-field">
              <span className="auth-label">New Password</span>
              <input type="password" placeholder="New strong password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
            </label>
            <label className="auth-field">
              <span className="auth-label">Confirm Password</span>
              <input type="password" placeholder="Confirm password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} required />
            </label>
            <div className="auth-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</button>
              <Link to="/login" className="btn-secondary" style={{textDecoration:'none'}}>Back to Login</Link>
            </div>
          </form>
          {message && <p className="auth-message">{message}</p>}
        </div>
      </main>
    </div>
  );
}

export default React.memo(ResetPasswordOtp);
