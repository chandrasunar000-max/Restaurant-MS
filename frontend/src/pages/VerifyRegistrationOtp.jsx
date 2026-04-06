import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/landing/Header";

function VerifyRegistrationOtp() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const initialEmail = params.get('email') || '';
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/restaurants/verify-registration-otp', { email, otp });
      setMessage(res.data.message || 'Account verified successfully. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setMessage('');
    try {
      const res = await api.post('/restaurants/resend-registration-otp', { email });
      setMessage(res.data.message || 'OTP resent to email');
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-shell">
      <Header onGetStartedClick={()=>navigate('/login')} onNav={()=>{}} />
      <main className="signup-main">
        <div className="signup-card" style={{ width: '60dvw', maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{display:'flex', justifyContent:'flex-end'}}>
            <button className="btn-secondary" onClick={()=>navigate('/')} style={{textDecoration:'none'}}>Home</button>
          </div>
          <h2 className="signup-title premium-title">Verify your account</h2>
          <p className="signup-sub">Enter the OTP sent to your email to verify your account.</p>
          <form className="signup-form" onSubmit={handleSubmit} style={{display:'grid', gap:12}}>
            <label className="field">
              <span className="field-label">Email</span>
              <input className="field-input" name="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
            </label>
            <label className="field">
              <span className="field-label">OTP</span>
              <input className="field-input" name="otp" value={otp} onChange={(e)=>setOtp(e.target.value)} required />
            </label>
            <div className="form-actions" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <button className="btn-primary" type="submit" disabled={loading}>{loading ? 'Verifying...' : 'Verify Account'}</button>
              <button type="button" className="btn-secondary" onClick={handleResend} disabled={loading} style={{marginLeft:12}}>{loading ? '...' : 'Resend OTP'}</button>
            </div>
          </form>
          {message && <div className="form-message" role="status">{message}</div>}
        </div>
      </main>
    </div>
  );
}

export default React.memo(VerifyRegistrationOtp);
