import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    // Optionally log to backend later
    // fetch('/api/log-client-error', {method:'POST', body: JSON.stringify({...})})
  }
  handleReload = () => {
    window.location.reload();
  };
  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display:'grid', placeItems:'center', minHeight:'60vh', padding:24 }}>
          <div style={{ maxWidth:480, width:'100%', background:'#fff', border:'1px solid #e5e7eb', borderRadius:16, padding:24, boxShadow:'0 10px 30px rgba(0,0,0,0.06)' }}>
            <h2 style={{ marginTop:0, fontSize:'1.25rem', color:'#b91c1c' }}>Something went wrong</h2>
            <p style={{ color:'#374151', fontSize:'0.95rem' }}>An unexpected error occurred while rendering this section. You can try reloading the page or returning to a safe state.</p>
            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre style={{ background:'#f9fafb', padding:12, borderRadius:8, fontSize:'0.75rem', maxHeight:160, overflow:'auto' }}>
                {(this.state.error?.stack || String(this.state.error)).slice(0,2000)}
              </pre>
            )}
            <div style={{ display:'flex', gap:12, marginTop:12 }}>
              <button className="btn" onClick={this.handleReload}>Reload</button>
              <button className="btn btn-primary" onClick={this.handleReset}>Dismiss</button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
