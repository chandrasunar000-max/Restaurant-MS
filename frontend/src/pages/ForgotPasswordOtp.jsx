import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/landing/Header";

function ForgotPasswordOtp() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      await api.post("/restaurants/password/forgot-otp", { email: String(email).trim() });
      setMessage("If an account exists, an OTP has been sent to the registered email address. Check your email and continue to reset.");
      // Redirect to reset page where restaurant can enter OTP and set a new password
      setTimeout(() => navigate("/reset-password-otp", { state: { email } }), 600);
    } catch (err) {
      setMessage(err?.response?.data?.message || "Failed to send OTP");
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
            <Link to="/login" className="btn-secondary" style={{textDecoration:'none'}}>Back to Login</Link>
            <Link to="/" className="btn-secondary" style={{textDecoration:'none'}}>Home</Link>
          </div>
          <h1 className="auth-title premium-title">Forgot Password (OTP)</h1>
          <p className="auth-subtitle">Enter your registered email to receive a 6-digit OTP.</p>
          <form className="auth-form" onSubmit={handleSubmit}>
            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input
                name="email"
                type="email"
                placeholder="you@restaurant.com"
                value={email}
                onChange={(e)=>setEmail(e.target.value)}
                required
              />
            </label>
            <div className="auth-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Sending…' : 'Send OTP'}</button>
            </div>
          </form>
          {message && <p className="auth-message">{message}</p>}
        </div>
      </main>
    </div>
  );
}

export default React.memo(ForgotPasswordOtp);
