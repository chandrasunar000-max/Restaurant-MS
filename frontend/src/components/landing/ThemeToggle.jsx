import React, { useEffect, useState } from 'react';

export default function ThemeToggle(){
  const [mode, setMode] = useState('light');
  useEffect(()=>{
    const saved = localStorage.getItem('theme-mode');
    if(saved){ setMode(saved); document.body.classList.toggle('dark', saved==='dark'); }
  },[]);
  function toggle(){
    const next = mode === 'light' ? 'dark' : 'light';
    setMode(next);
    document.body.classList.toggle('dark', next==='dark');
    localStorage.setItem('theme-mode', next);
  }
  return (
    <button className="theme-toggle" onClick={toggle} aria-label="Toggle theme">
      <i className="fa-solid fa-circle-half-stroke"></i> {mode==='light'?'Dark':'Light'} Mode
    </button>
  );
}
