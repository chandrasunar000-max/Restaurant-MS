import React from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Header({ onGetStartedClick, onNav }) {
  const { pathname } = useLocation();
  const isAuth = pathname === '/login' || pathname === '/signup';
  React.useEffect(() => {
    // Use Vite-aware URL so the built asset path is correct in production
    try {
      const href = new URL('../../assets/css/landing.css', import.meta.url).href;
      if (!document.querySelector(`link[href="${href}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        // Non-blocking load
        link.media = 'print';
        link.onload = () => { link.media = 'all'; };
        link.setAttribute('data-landing-css', 'true');
        document.head.appendChild(link);
      }
    } catch (e) {
      // If something goes wrong, skip loading (avoid throwing in render)
      // Fall back to not blocking and let app still function.
      // console.warn('Failed to load landing CSS dynamically', e);
    }
  }, []);

  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <strong>OrderByQR</strong>
        </div>
        <nav className="nav-links">
          <a href="#home" onClick={(e)=>{e.preventDefault(); onNav('home');}} className="active">Home</a>
        </nav>
        <div className="header-actions">
          {!isAuth && (
            <>
              <Link to="/login" className="cta-btn cta-outline">Login</Link>
              <Link to="/signup" className="cta-btn">Sign Up</Link>
            </>
          )}
          {isAuth && (
            <button className="cta-btn" onClick={onGetStartedClick}>Get Started</button>
          )}
        </div>
      </div>
    </header>
  );
}
