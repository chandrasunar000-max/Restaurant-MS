import React from 'react';

export default function VideoModal({ open, onClose }){
  if(!open) return null;
  return (
    <div className="modal-backdrop" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.72)', zIndex:400, display:'flex', alignItems:'center', justifyContent:'center'}}>
      <div style={{width:'min(900px,90vw)', background:'#111', border:'1px solid #333', borderRadius:'18px', position:'relative', boxShadow:'0 20px 40px -10px rgba(0,0,0,0.6)'}}>
        <button onClick={onClose} style={{position:'absolute', top:'8px', right:'10px', background:'transparent', color:'#fff', border:'none', fontSize:'1.4rem', cursor:'pointer'}} aria-label="Close video">×</button>
        <div style={{padding:'1.6rem'}}>
          <h3 style={{margin:'0 0 1rem'}}>How It Works</h3>
          <div style={{position:'relative', paddingBottom:'56.25%', height:0}}>
            <iframe title="How It Works" src="https://www.youtube.com/embed/dQw4w9WgXcQ" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{position:'absolute', top:0, left:0, width:'100%', height:'100%', border:0}}></iframe>
          </div>
        </div>
      </div>
    </div>
  );
}
