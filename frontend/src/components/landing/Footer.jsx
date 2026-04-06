import React from 'react';

export default function Footer(){
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <strong>Fusion Labs</strong>
          <p style={{color:'var(--color-muted)'}}>Innovation for modern hospitality</p>
        </div>
        <div>
          <h4>Website</h4>
          <nav style={{display:'grid', gap:'0.4rem'}}>
            <a href="https://fusionlabs.space" target="_blank" rel="noreferrer">visit us</a>
          </nav>
        </div>
        <div>
          <h4>Follow</h4>
          <div className="socials">
            {/* <a href="#" aria-label="Facebook" title="Facebook (placeholder)"><i className="fa-brands fa-facebook-f"></i></a> */}
            <a href="https://www.instagram.com/fusionlabs.space" aria-label="Instagram" target='_blank' title="Instagram (placeholder)"><i className="fa-brands fa-instagram"></i></a>
            <a href="https://www.linkedin.com/company/fusion-labs-official" target='_blank' aria-label="LinkedIn" title="LinkedIn (placeholder)"><i className="fa-brands fa-linkedin-in"></i></a>
          </div>
        </div>
      </div>
      <small>Copyright © 2025 Fusion Labs. All Rights Reserved.</small>
    </footer>
  );
}
