import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// --- Inline Lucide Icons for the UI Steps ---

const ScanIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7V5a2 2 0 0 1 2-2h2" />
    <path d="M17 3h2a2 2 0 0 1 2 2v2" />
    <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
    <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
  </svg>
);

const MenuIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M3 12h18" />
    <path d="M3 18h18" />
  </svg>
);

const TouchIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 11v9a2 2 0 0 1-2 2h-6.61a2 2 0 0 1-1.93-1.46L6 14.5" />
    <path d="M9 13v-3a2 2 0 0 1 4 0v3" />
  </svg>
);

// --- Background Food Texture Component ---
// This pattern includes Pizza, Burger, Drink, and Fries
const BackgroundPattern = () => (
  <svg className="bg-pattern"      
    width="100%"
    height="100%"
    viewBox="0 0 400 600"
    preserveAspectRatio="xMidYMid slice"
     xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Pattern Tile Size: 100x100 */}
      <pattern id="food-pattern" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">
        <g stroke="rgb(255, 150, 150)" strokeWidth="1.5" fill="none" opacity="0.7" >
          
          {/* Pizza Slice */}
          <g transform="translate(10, 10) scale(1.1) rotate(-15) ">
             <path d="M12 2L2 22H22L12 2Z" />
             <circle cx="12" cy="12" r="1.5" />
             <circle cx="9" cy="17" r="1.5" />
             <circle cx="15" cy="17" r="1.5" />
          </g>

          {/* Burger */}
          <g transform="translate(45, 45) rotate(-15) scale(1.1)">
             <path d="M4 10C4 6 7 3 12 3C17 3 20 6 20 10" />
             <rect x="4" y="12" width="16" height="3" rx="1.5" />
             <rect x="4" y="17" width="16" height="3" rx="1.5" />
          </g>

          {/* Drink Cup */}
          <g transform="translate(10, 45) scale(1.1)">
             <path d="M6 6L8 20H16L18 6H6Z" />
             <path d="M14 6L16 2" />
          </g>

          {/* Fries */}
          <g transform="translate(45, 10) scale(0.8)">
             <path d="M6 10L7 22H17L18 10" />
             <path d="M8 10V4" />
             <path d="M12 10V2" />
             <path d="M16 10V4" />
          </g>

        </g>
      </pattern>
      
      {/* Vignette Gradient for Depth */}
      <linearGradient id="vignette" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#0a0a0a" stopOpacity="0.85" />
        <stop offset="50%" stopColor="#0a0a0a" stopOpacity="0.6" />
        <stop offset="100%" stopColor="#0a0a0a" stopOpacity="0.95" />
      </linearGradient>
    </defs>
    
    {/* Base Layer */}
    <rect width="100%" height="100%" fill="#1a1a1a" />
    
    {/* Food Pattern Layer */}
    <rect width="100%" height="100%" fill="url(#food-pattern)" />
    
    {/* Vignette Overlay */}
    <rect width="100%" height="100%" fill="url(#vignette)" />
  </svg>
);

export default function QRPrintCard({
  restaurantId,
  tableNumber,
  roomNumber,
  restaurantName = 'Fusion Labs Restaurant',
  hidePreview = false,
  showVisibleLabel = false,
}) {
  const printRef = useRef(null);
  
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const isRoom = roomNumber !== undefined;
  const number = isRoom ? roomNumber : tableNumber;
  const type = isRoom ? 'room' : 't';
  const label = isRoom ? 'Room' : 'Table';
  const qrUrl = `${origin}/r/${restaurantId}/${type}/${number}`;

  // Theme Palette
  const theme = {
    red: '#8b0000',
    black: '#0a0a0a',
    cream: '#f5e6d3',
    white: '#ffffff',
    darkRed:'#5c0000',
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Montserrat:wght@400;500;600;700&display=swap');

    @page {
      size: 4in 6in;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    body {
      margin: 0;
      background: #e0e0e0;
    }

    .print-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 15px;
    }
      .header-eyebrow {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 4px;
      opacity: 0.8;
      margin-bottom: 8px;
    }
      .header-divider {
      width: 150px;
      height: 2px;
      background: ${theme.red};
      margin: 1px auto;
    }

    /* Card Container - 4x6 INCHES */
    .card-root {
      width: 4in;
      height: 6in;
      position: relative;
      overflow: hidden;
      background-color: ${theme.black};
      color: ${theme.cream};
      display: flex;
      flex-direction: column;
      box-shadow: 0 15px 40px rgba(0,0,0,0.5);
    }

    /* Layers */
    .bg-layer {
      position: absolute;
      inset: 0;
      z-index: 0;
    }

    .content-layer {
      position: relative;
      z-index: 10;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      padding: 20px;
      /* Decorative Border */
      border: 8px solid ${theme.red};
    }

    /* Inner Line Border */
    .inner-border {
      position: absolute;
      inset: 8px;
      border: 1px solid ${theme.cream};
      opacity: 0.3;
      pointer-events: none;
      z-index: 20;
    }

    /* --- Header --- */
    .header {
      text-align: center;
      margin-bottom: 15px;
      margin-top: 10px;
    }

    .title {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      font-weight: 900;
      color: ${theme.white};
      line-height: 1.1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
      text-shadow: 0 2px 4px rgba(0,0,0,0.5);
    }

    /* Table Badge */
    .table-pill {
      background: ${theme.red};
      color: ${theme.white};
      display: inline-block;
      padding: 4px 16px;
      // border-radius: 50px;
      font-family: 'Montserrat', sans-serif;
      font-weight: 700;
      font-size: 14px;
      border: 2px solid rgba(255,0,0,0.2);
      box-shadow: 0 4px 10px rgba(0,0,0,0.4);
    }

    /* --- Center Content --- */
    .main-section {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      gap: 15px;
    }

    /* QR Frame */
    .qr-frame {
      background: ${theme.white};
      padding: 12px;
      border-radius: 8px;
      box-shadow: 0 0 0 3px ${theme.black}, 0 0 0 5px ${theme.cream};
    }

    .instruction {
      font-family: 'Playfair Display', serif;
      font-style: italic;
      color: ${theme.cream};
      font-size: 14px;
      opacity: 0.9;
    }

    /* Steps */
    .steps-container {
      display: flex;
      width: 100%;
      justify-content: center;
      gap: 25px;
      margin-top: 5px;
    }

    .step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
    }

    .icon-circle {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      border: 1px solid ${theme.red};
      background: rgba(139,0,0,0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${theme.cream};
      backdrop-filter: blur(2px); /* Blur behind icons */
    }

    .step-text {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-weight: 600;
      color: ${theme.cream};
    }

    /* --- Footer --- */
    .footer {
      margin-top: auto;
      text-align: center;
      padding-top: 10px;
      border-top: 1px solid rgba(245, 230, 211, 0.2);
    }

    .powered-by {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: ${theme.red};
      margin-bottom: 4px;
    }
      .Brand{

        font-family: 'Montserrat', sans-serif;
        font-size: 18px;
        font-weight: 900;
        padding: 6px 200px;
        // border-radius: 6px;
        border: 2px solid rgba(255,255,255,0.2);
        background: rgba(139,0,0,0.8);
        color: ${theme.cream};
        margin-bottom: 4px;
      }

    .footer-links {
      font-family: 'Montserrat', sans-serif;
      font-size: 8px;
      color: ${theme.cream};
      opacity: 0.7;
      line-height: 1.4;
    }
  `;

  const handlePrint = () => {
    if (!printRef.current) return;
    const printContents = printRef.current.innerHTML;
    const win = window.open('', 'PRINT', 'width=800,height=1000');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>QR ${label} ${number}</title>
        <meta charset="utf-8" />
        <style>
          ${styles}
          body, html { height: 100%; margin: 0; }
          .print-wrapper { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
        </style>
      </head>
      <body>
        <div class="print-wrapper">
          ${printContents}
        </div>
      </body>
      </html>
    `);

    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 600);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
      
      <button
        onClick={handlePrint}
        className="btn btn-primary"
        style={{
          padding: '10px 24px',
          background: theme.red,
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontFamily: 'Montserrat, sans-serif',
          fontWeight: 700,
          cursor: 'pointer',
          letterSpacing: '0.5px',
          boxShadow: '0 4px 12px rgba(139,0,0,0.3)'
        }}
      >
        Print QR Card {showVisibleLabel ? `(${label} ${number})` : ''}
      </button>

      {!hidePreview && (
        <div style={{ fontFamily: 'monospace', fontSize: 11, color: '#555' }}>
          {qrUrl}
        </div>
      )}

      {/* Style injection for preview */}
      <style>{styles}</style>

      {/* Preview Container */}
      <div style={{ 
        display: hidePreview ? 'none' : 'block',
        transform: 'scale(0.9)',
        transformOrigin: 'top center',
        marginBottom: '-1in' 
      }}>
        <div ref={printRef}>
          <div className="card-root">
            
            {/* Background */}
            <div className="bg-layer">
              <BackgroundPattern />
            </div>

            {/* Content */}
            <div className="content-layer">
              <div className="inner-border"></div>

              {/* Header */}

              <div className="header">
                <div className="header-eyebrow">Welcome to</div>
                <div className="header-divider"></div>
                <div className="title">{restaurantName}</div>
                <div className="table-pill">{label} {number}</div>
              </div>

              {/* Main Content */}
              <div className="main-section">
                
                {/* QR Code */}
                <div className="qr-frame">
                  <QRCodeSVG
                    value={qrUrl}
                    size={170} 
                    level="H"
                    fgColor={theme.black}
                    includeMargin={false}
                  />
                </div>

                <div className="instruction">Scan to order</div>

                {/* Steps Row */}
                <div className="steps-container">
                  <div className="step">
                    <div className="icon-circle"><ScanIcon /></div>
                    <span className="step-text">Scan</span>
                  </div>
                  <div className="step">
                    <div className="icon-circle"><MenuIcon /></div>
                    <span className="step-text">Menu</span>
                  </div>
                  <div className="step">
                    <div className="icon-circle"><TouchIcon /></div>
                    <span className="step-text">Order</span>
                  </div>
                     
                </div>
                <div className='Brand' >
                 OrderByQR
                </div>

              </div>


              {/* Footer */}
              <div className="footer">
                <div className="powered-by">Powered by Fusion Labs</div>
                <div className="footer-links">
                  www.fusionlabs.space<br/>
                  contact: fusionlabs@orderbyqr.in
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}