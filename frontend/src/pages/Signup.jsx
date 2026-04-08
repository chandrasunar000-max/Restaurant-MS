import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/axios";
import Header from "../components/landing/Header";
import { debounce } from "lodash";

function Signup() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", address: "", phone: "", branch: "", email: "", password: "", confirmPassword: "", pincode: "", image: "", totalTables: "1", totalRooms: "0", esewaId: "", type: "restaurant", username: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [usernameStatus, setUsernameStatus] = useState({ loading: false, available: false });
  const [logoType, setLogoType] = useState('url'); // 'url' or 'file'
  const [imageFile, setImageFile] = useState(null);

  const checkUsername = useCallback(
    debounce(async (username) => {
      if (!username) {
        setUsernameStatus({ loading: false, available: false });
        return;
      }
      setUsernameStatus({ loading: true, available: false });
      try {
        const res = await api.get(`/restaurants/check-username/${username}`);
        setUsernameStatus({ loading: false, available: res.data.available });
      } catch (err) {
        setUsernameStatus({ loading: false, available: false });
      }
    }, 500),
    []
  );

  useEffect(() => {
    checkUsername(form.username);
  }, [form.username, checkUsername]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleFileChange = (e) => {
    setImageFile(e.target.files[0]);
  };

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  const esewaRegex = /^(\d{10}|[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/; // eSewa ID (phone or email)

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameStatus.available) {
      setMessage("Please choose an available username.");
      return;
    }
    setLoading(true);
    const newErrors = {};

    // Password complexity
    if (!passwordRegex.test(form.password || '')) {
      newErrors.password = 'Password must have 8+ chars incl. uppercase, lowercase, number & symbol.';
    }
    // Confirm password match
    if ((form.password || '') !== (form.confirmPassword || '')) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }
    // Optional eSewa ID validation if provided
    if (form.esewaId && !esewaRegex.test(form.esewaId.trim())) {
      newErrors.esewaId = 'eSewa ID must be a 10-digit mobile number or a valid email address.';
    }

    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      setLoading(false);
      return;
    }
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (key !== 'image' && key !== 'confirmPassword') {
          formData.append(key, value);
        }
      });

      if (logoType === 'file' && imageFile) {
        formData.append('image', imageFile);
      } else if (logoType === 'url' && form.image) {
        formData.append('image', form.image);
      }

      const res = await api.post("/restaurants/signup", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      setMessage(res.data.message || "Signed up successfully; check email for OTP.");
      // Redirect to OTP verification page with email
      setTimeout(() => navigate(`/verify-registration-otp?email=${encodeURIComponent(form.email)}`), 700);
    } catch (err) {
      setMessage(err.response?.data?.message || "Error signing up");
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
            <Link to="/" className="btn-secondary" style={{textDecoration:'none'}}>Home</Link>
          </div>
          <h2 className="signup-title premium-title">Create your restaurant account</h2>
          <p className="signup-sub">Quickly create an account to manage your menu and orders.</p>

          <form className="signup-form signup-grid" onSubmit={handleSubmit} style={{display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:16}}>
            <label className="field">
              <span className="field-label">Name</span>
              <input className="field-input" name="name" placeholder="Restaurant name" onChange={handleChange} required />
            </label>
            <label className="field">
              <span className="field-label">Username</span>
              <input className="field-input" name="username" placeholder="Your unique username" onChange={handleChange} required />
              {usernameStatus.loading && <small>Checking...</small>}
              {form.username && !usernameStatus.loading && (
                <small style={{ color: usernameStatus.available ? 'green' : 'red' }}>
                  {usernameStatus.available ? 'Available' : 'Already taken'}
                </small>
              )}
            </label>
            <label className="field">
              <span className="field-label">Branch (optional)</span>
              <input className="field-input" name="branch" placeholder="e.g. Downtown" onChange={handleChange} />
            </label>
            <label className="field">
              <span className="field-label">Address</span>
              <input className="field-input" name="address" placeholder="Street address, city" onChange={handleChange} />
            </label>
            
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <span className="field-label">Logo</span>
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="radio" name="logoType" value="url" checked={logoType === 'url'} onChange={() => setLogoType('url')} />
                  <span>URL</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="radio" name="logoType" value="file" checked={logoType === 'file'} onChange={() => setLogoType('file')} />
                  <span>Upload File</span>
                </label>
              </div>
              {logoType === 'url' ? (
                <div>
                  <input className="field-input" name="image" placeholder="https://example.com/logo.png" onChange={handleChange} value={form.image} />
                  <small className="muted">Link to your logo image.</small>
                </div>
              ) : (
                <div>
                  <input className="field-input" type="file" name="imageFile" onChange={handleFileChange} accept="image/*" />
                  <small className="muted">Upload an image file for your logo.</small>
                </div>
              )}
            </div>

            <label className="field">
              <span className="field-label">Phone</span>
              <input className="field-input" name="phone" placeholder="Phone number" onChange={handleChange} required />
            </label>
            <label className="field">
              <span className="field-label">Payment eSewa ID (optional)</span>
              <input className="field-input" name="esewaId" placeholder="eSewa ID (mobile or email)" onChange={handleChange} />
              {errors.esewaId && <small className="error" style={{color:'#dc2626'}}>{errors.esewaId}</small>}
            </label>
            <label className="field">
              <span className="field-label">Pincode</span>
              <input className="field-input" name="pincode" placeholder="Postal code" onChange={handleChange} required />
            </label>
            <label className="field">
              <span className="field-label">Total Tables</span>
              <input className="field-input" name="totalTables" type="number" min="1" step="1" value={form.totalTables} onChange={handleChange} required />
            </label>
            <label className="field">
              <span className="field-label">Total Rooms</span>
              <input className="field-input" name="totalRooms" type="number" min="0" step="1" value={form.totalRooms} onChange={handleChange} required />
            </label>
            <label className="field">
              <span className="field-label">Email</span>
              <input className="field-input" name="email" type="email" placeholder="you@restaurant.com" onChange={handleChange} required />
            </label>
            <label className="field">
              <span className="field-label">Password</span>
              <input className="field-input" name="password" type="password" placeholder="Choose a secure password" onChange={handleChange} required />
              {errors.password && <small className="error" style={{color:'#dc2626'}}>{errors.password}</small>}
            </label>
            <label className="field">
              <span className="field-label">Confirm Password</span>
              <input className="field-input" name="confirmPassword" type="password" placeholder="Re-enter password" onChange={handleChange} required />
              {errors.confirmPassword && <small className="error" style={{color:'#dc2626'}}>{errors.confirmPassword}</small>}
            </label>
            <label htmlFor="" className="field">
              <span className="field-label mt-3">Type</span>
              <select className="feild-input bg-secondary h-5" name="type" id="type" onChange={handleChange}>
                <option value="restaurant">Restaurant</option>
                <option value="hotel">Hotel</option>
              </select>
            </label>
            <div className="form-actions" style={{gridColumn:'1 / -1'}}>
              <button className="btn-primary" type="submit" disabled={loading || !usernameStatus.available}>{loading ? "Creating..." : "Sign Up"}</button>
            </div>
          </form>
          <div className="signup-footer">
            <span>Already have an account?</span>
            <Link to="/login" className="btn-secondary" style={{textDecoration:'none'}}>Log in</Link>
          </div>

          {message && <div className="form-message" role="status">{message}</div>}
        </div>
      </main>
    </div>
  );
}

export default React.memo(Signup);
