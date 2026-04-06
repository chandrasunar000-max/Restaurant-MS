import React, { useEffect, useState } from 'react';

export default function CookieConsent(){
  const [show, setShow] = useState(false);
  useEffect(()=>{
    const val = localStorage.getItem('cookie-consent');
    if(!val) setShow(true);
  },[]);
  function accept(){
    localStorage.setItem('cookie-consent','accepted');
    setShow(false);
  }
  if(!show) return null;
  return (
    <div className="cookie-consent" role="dialog" aria-live="polite">
      <div>We use cookies to improve your experience. By using this site, you agree to our cookie policy.</div>
      <button className="cta-btn" onClick={accept}>Got it</button>
    </div>
  );
}
