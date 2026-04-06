import React, { useEffect, useState } from 'react';

export default function BackToTop(){
  const [visible, setVisible] = useState(false);
  useEffect(()=>{
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  },[]);
  return (
    <button
      className={`back-to-top ${visible ? 'visible' : ''}`}
      onClick={()=>window.scrollTo({top:0, behavior:'smooth'})}
      aria-label="Back to top"
    >
      <i className="fa-solid fa-arrow-up"></i>
    </button>
  );
}
