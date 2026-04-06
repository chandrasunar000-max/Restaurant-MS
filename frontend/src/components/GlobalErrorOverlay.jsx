import React, { useEffect, useState } from 'react';

// Listens for window dispatch of 'api-error' CustomEvent
export default function GlobalErrorOverlay() {
  const [errors, setErrors] = useState([]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e.detail || {}; // { message, status, requestId, url }
      setErrors((prev) => {
        const next = [...prev, { ...detail, id: Date.now() + Math.random() }];
        // keep last 5
        return next.slice(-5);
      });
    };
    window.addEventListener('api-error', handler);
    return () => window.removeEventListener('api-error', handler);
  }, []);

  const dismiss = (id) => setErrors((prev) => prev.filter((e) => e.id !== id));
  if (!errors.length) return null;

  return (
    <div style={{ position:'fixed', bottom:16, right:16, zIndex:1000, display:'flex', flexDirection:'column', gap:12 }}>
      {errors.map(err => (
        <div key={err.id} style={{ minWidth:280, maxWidth:360, background:'#ffffff', border:'1px solid #fecaca', boxShadow:'0 8px 28px rgba(0,0,0,0.12)', borderRadius:12, padding:14 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
            <strong style={{ color:'#b91c1c', fontSize:'0.95rem' }}>Request Error</strong>
            <button onClick={() => dismiss(err.id)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#64748b', fontWeight:700 }}>×</button>
          </div>
          <div style={{ fontSize:'0.8rem', color:'#334155', lineHeight:1.3 }}>
            <div><strong>Status:</strong> {err.status || '—'}</div>
            <div style={{ marginTop:4 }}><strong>Message:</strong> {err.message || 'Unknown error'}</div>
            {err.requestId && <div style={{ marginTop:4, fontSize:'0.7rem', color:'#475569' }}>ID: {err.requestId}</div>}
          </div>
          <div style={{ display:'flex', gap:8, marginTop:10 }}>
            <button className="btn" onClick={() => dismiss(err.id)}>Dismiss</button>
            <button className="btn btn-primary" onClick={() => window.location.reload()}>Reload</button>
          </div>
        </div>
      ))}
    </div>
  );
}
