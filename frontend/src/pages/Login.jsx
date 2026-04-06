import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/landing/Header";
import useUserAuth from "../hooks/useUserAuth";

function Login() {
  const navigate = useNavigate();
  const { loginSuccess } = useUserAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👈 NEW

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value.trim() });
  };

  const handleSubmit = async (e) => {
  e.preventDefault();

  try {
    const res = await api.post("/restaurants/login", form);

    // ✅ Success (200)
    if (res.status === 200) {
      // localStorage.setItem("token", res.data.token); // loginSuccess handles this
      loginSuccess(res.data.token, res.data, 'restaurant'); // sync to global state
      setMessage("Login successful");

      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    }

  } catch (err) {
    const status = err.response?.status;

    // 🔐 Not verified → redirect to OTP page
    if (status === 401) {
      setMessage(err.response?.data?.message || "Please verify your account");

      setTimeout(() => {
        navigate(
          `/verify-registration-otp?email=${encodeURIComponent(form.email)}`
        );
      }, 700);

    } else {
      // ❌ Other errors
      console.error("Login error:", err);
      setMessage(err.response?.data?.message || "Error logging in");
    }
  }
};


  return (
    <div className="auth-shell">
      <Header onGetStartedClick={() => navigate("/signup")} onNav={() => {}} />
      <main className="auth-main">
        <div className="auth-card">

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link to="/" className="btn-secondary" style={{ textDecoration: "none" }}>
              Home
            </Link>
          </div>

          <h1 className="auth-title premium-title">Restaurant Login</h1>
          <p className="auth-subtitle">Login to maintain restaurant orders and menu</p>

          <form className="auth-form" onSubmit={handleSubmit}>
            
            {/* EMAIL */}
            <label className="auth-field">
              <span className="auth-label">Email</span>
              <input
                name="email"
                placeholder="you@restaurant.com"
                onChange={handleChange}
                required
              />
            </label>

            {/* PASSWORD WITH TOGGLE */}
<label className="auth-field">
  <span className="auth-label">Password</span>

  <div className="relative">
    <input
      name="password"
      type={showPassword ? "text" : "password"}
      placeholder="Your password"
      onChange={handleChange}
      required
      className="pr-10"
    />

    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-2 flex items-center 
                 h-full px-2 rounded-md text-slate-400 
                 hover:text-white transition"
    >
      {showPassword ? (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M10.5 10.5a2 2 0 002.5 2.5M4.8 4.8C2.8 6.6 2 9 2 12c1.4 3.7 5.5 7 10 7
               2.2 0 4.2-.6 5.9-1.7M9.5 5c.8-.2 1.6-.3 2.5-.3 5.6 0 9.6 3.4 11 7
               -.4 1-.9 2-1.6 2.8"
          />
        </svg>
      ) : (
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M2.036 12C3.3 7.943 7.09 5 12 5c4.91 0 
               8.7 2.943 9.964 7-1.264 4.057-5.054 7-9.964 
               7-4.91 0-8.7-2.943-9.964-7z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      )}
    </button>
  </div>
</label>





            <div className="auth-actions">
              <button type="submit" className="btn-primary">Login</button>
              <Link to="/signup" className="btn-secondary" style={{ textDecoration: "none" }}>
                Sign Up
              </Link>
            </div>
          </form>

          {message && <p className="auth-message">{message}</p>}

          <div className="auth-footer">
            <Link to="/forgot-password" className="btn-secondary" style={{ textDecoration: "none" }}>
              Forgot Password
            </Link>
          </div>

        </div>
      </main>
    </div>
  );
}

export default React.memo(Login);
