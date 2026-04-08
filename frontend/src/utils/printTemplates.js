// Utilities to generate the same HTML used by the server PDF renderer
// and a helper to open a print window and call window.print().

function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

const currency = (n) => {
    const num = Number(n || 0);
    return `₹${Number.isInteger(num) ? num : num.toFixed(2)}`;
};

// Detect if device is Android
function isAndroidDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    return /android/i.test(userAgent.toLowerCase());
}

export function buildInvoiceHTMLClient(order = {}, rest = {}, isSession = false, qrDataUrl = '') {
    if (isAndroidDevice()) {
        return buildInvoiceHTMLAndroid(order, rest, isSession, qrDataUrl);
    }
    // Windows/Desktop version (original)
    const items = order.items || [];
    const subTotal = items.reduce((sum, it) => {
        const qty = Number(it.quantity || 1);
        const price = Number(it.price || 0);
        return sum + price * qty;
    }, 0);

    const grandTotal = Number(order.total || subTotal);

    const headerName = (rest?.name || 'RESTAURANT').toUpperCase();
    const created = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { hour12: true });

    const esewaId = rest?.esewaId || '';
    // Prefer provided inline data URL (generated client-side) to avoid network dependency and speed up printing.
    const qrImg = qrDataUrl || (esewaId ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(esewaId)}` : '');
    //customer bill
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Invoice</title>
<style>
  @page { size: 80mm auto; margin: 0;  }
  body { width: 72mm; margin: 0 auto; padding: 4mm; font-family: 'Courier New', monospace; font-size: 12.5px; font-weight: bold; color: #000; }
  .center { text-align: center; }
  .hr { border-top: 1px dashed #000; margin: 6px 0; }
  .items { margin-top:6px }
  .row { display:flex; justify-content:space-between; margin-right: 2mm; }
</style>
</head>
<body>
  <div class="center" style="font-size:16px;margin-bottom:4px">${escapeHtml(headerName)}</div>
  <div class="center" style="font-size:10px;margin-bottom:8px">${escapeHtml([rest?.branch, rest?.address, rest?.phone].filter(Boolean).join(', '))}</div>
  <div class="hr"></div>
  <div class="center">${isSession ? 'ESTIMATE / BILL' : 'TAX INVOICE'}</div>
  <div style="font-size:11px;margin-top:6px">
    <div>Order No : ${escapeHtml(order.orderId || order._id)}</div>
    <div>Date     : ${created}</div>
    <div>${order.roomNumber ? 'Room' : 'Table'}    : ${escapeHtml(String(order.roomNumber || order.tableNumber || '-'))}</div>
    <div>Guest    : ${escapeHtml(order.customerName || 'Walk-in')}</div>
  </div>
  <div class="hr"></div>
  <div class="items">
    ${items.map(it => {
        const qty = Number(it.quantity || 1);
        const price = Number(it.price || 0);
        const name = escapeHtml(it.item?.name || it.name || '');
        const size = escapeHtml(it.size || '');
        return `<div class="row"><div>${name}${size ? ' ' + size : ''} <span style="font-size:11px">x${qty} @ ${currency(price)}</span></div><div>${currency(price * qty)}</div></div>`;
    }).join('')}
  </div>

  <div class="hr"></div>
  <div class="row"><span>SUBTOTAL</span><span>${currency(subTotal)}</span></div>
  <div class="hr"></div>
  <div class="row"><strong>GRAND TOTAL</strong><strong>${currency(grandTotal)}</strong></div>

  ${esewaId ? `
    <div style="margin-top:8px;text-align:center">
      <div style="font-size:11px;margin-bottom:6px">Scan & Pay (eSewa)</div>
      <img src="${qrImg}" style="width:120px;height:120px;display:block;margin:0 auto" />
      <div style="font-size:10px;margin-top:4px">eSewa ID: ${escapeHtml(esewaId)}</div>
    </div>
  ` : ''}

  <div class="center" style="margin-top:12px;font-size:10px">Thank you! Visit again 🙏</div>
</body>
</html>`;
}
// Android-optimized invoice template with table-based layout and fixed width
export function buildInvoiceHTMLAndroid(order = {}, rest = {}, isSession = false, qrDataUrl = '') {
    const items = order.items || [];
    const subTotal = items.reduce((sum, it) => {
        const qty = Number(it.quantity || 1);
        const price = Number(it.price || 0);
        return sum + price * qty;
    }, 0);

    const grandTotal = Number(order.total || subTotal);

    const headerName = (rest?.name || 'RESTAURANT').toUpperCase();
    const created = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { hour12: true });

    const esewaId = rest?.esewaId || '';
    const qrImg = qrDataUrl || (esewaId ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(esewaId)}` : '');
    
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Invoice</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @media print {
    @page { size: 80mm auto; margin: 0; }
    body { width: 80mm; margin: 0; padding: 0; }
    * { margin: 0; padding: 0; }
    .no-print { display: none !important; }
  }
  body { 
    width: 80mm; 
    margin: 0 auto; 
    padding: 2mm; 
    font-family: 'Courier New', monospace; 
    font-size: 11pt; 
    font-weight: bold; 
    color: #000; 
    line-height: 1.2;
    background: white;
  }
  .header { text-align: center; margin-bottom: 2mm; }
  .header-name { font-size: 14pt; font-weight: 900; margin-bottom: 1mm; }
  .header-info { font-size: 8pt; margin-bottom: 2mm; }
  .divider { border-top: 1px dashed #000; margin: 2mm 0; }
  .bill-type { text-align: center; font-size: 10pt; font-weight: bold; margin-bottom: 2mm; }
  .order-info { font-size: 9pt; margin-bottom: 2mm; }
  .order-info div { margin: 1mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0; font-size: 10pt; }
  table td { padding: 1mm; }
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table td { padding: 1mm 0; }
  .items-table .item-name { width: 50%; text-align: left; }
  .items-table .item-qty { width: 15%; text-align: center; }
  .items-table .item-price { width: 35%; text-align: right; }
  .summary-table { width: 100%; border-collapse: collapse; }
  .summary-table td { padding: 1mm 0; }
  .summary-label { width: 60%; text-align: left; }
  .summary-value { width: 40%; text-align: right; }
  .total-row { border-top: 1px solid #000; border-bottom: 1px solid #000; font-weight: 900; font-size: 11pt; padding-top: 2mm; padding-bottom: 2mm; }
  .qr-section { text-align: center; margin-top: 3mm; margin-bottom: 2mm; }
  .qr-label { font-size: 9pt; margin-bottom: 2mm; }
  .qr-image { max-width: 70mm; height: auto; display: block; margin: 0 auto; }
  .esewa-id { font-size: 8pt; margin-top: 2mm; }
  .footer { text-align: center; margin-top: 3mm; font-size: 9pt; }
  @media screen {
    body { background: #f5f5f5; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="header-name">${escapeHtml(headerName)}</div>
    <div class="header-info">${escapeHtml([rest?.branch, rest?.address, rest?.phone].filter(Boolean).join(', ') || '')}</div>
  </div>
  
  <div class="divider"></div>
  
  <div class="bill-type">${isSession ? 'ESTIMATE / BILL' : 'TAX INVOICE'}</div>
  
  <div class="order-info">
    <div>Order No: ${escapeHtml(order.orderId || order._id)}</div>
    <div>Date: ${created}</div>
    <div>${order.roomNumber ? 'Room' : 'Table'}: ${escapeHtml(String(order.roomNumber || order.tableNumber || '-'))}</div>
    <div>Guest: ${escapeHtml(order.customerName || 'Walk-in')}</div>
  </div>
  
  <div class="divider"></div>
  
  <table class="items-table">
    <tbody>
      ${items.map(it => {
          const qty = Number(it.quantity || 1);
          const price = Number(it.price || 0);
          const name = escapeHtml(it.item?.name || it.name || '');
          const size = escapeHtml(it.size || '');
          return `<tr>
            <td class="item-name">${name}${size ? ' ' + size : ''}</td>
            <td class="item-qty">x${qty}</td>
            <td class="item-price">${currency(price * qty)}</td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>
  
  <div class="divider"></div>
  
  <table class="summary-table">
    <tbody>
      <tr>
        <td class="summary-label">SUBTOTAL</td>
        <td class="summary-value">${currency(subTotal)}</td>
      </tr>
      <tr class="total-row">
        <td class="summary-label">GRAND TOTAL</td>
        <td class="summary-value">${currency(grandTotal)}</td>
      </tr>
    </tbody>
  </table>

  ${esewaId ? `
    <div class="qr-section">
      <div class="qr-label">Scan & Pay (eSewa)</div>
      <img src="${qrImg}" class="qr-image" alt="eSewa QR Code" />
      <div class="esewa-id">eSewa ID: ${escapeHtml(esewaId)}</div>
    </div>
  ` : ''}

  <div class="footer">Thank you! Visit again 🙏</div>
</body>
</html>`;
}
//kitchen recept
export function buildKitchenHTMLClient(order = {}, rest = {}) {
    if (isAndroidDevice()) {
        return buildKitchenHTMLAndroid(order, rest);
    }
    // Windows/Desktop version (original)
    const items = order.items || [];
    const customerName = order.customerName || 'Guest';
    const created = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { hour12: true });

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>KOT</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  body { width: 72mm; margin: 0 auto; padding: 4mm; font-family: 'Courier New', monospace; font-size: 12px; font-weight:bold; color: #000; }
  .table { border: 2px solid #000; text-align: center; padding: 8px; font-size: 22px; font-weight: 900; margin-bottom: 8px; }
  .items { margin-top:6px }
  .row { display:flex; justify-content:space-between; margin-bottom:6px }
  .footer { margin-top:8px; font-size:11px; text-align:center }
</style>
</head>
<body>
  <div class="table">${order.roomNumber ? 'ROOM' : 'TABLE'} ${escapeHtml(String(order.roomNumber || order.tableNumber || '-'))}</div>
  <div><strong>Guest:</strong> ${escapeHtml(customerName)}</div>
  <div><strong>Order No:</strong> ${escapeHtml(order.orderId || order._id)}</div>
  ${order?.message ? `<div style="margin-top:6px"><strong>Message:</strong> ${escapeHtml(order.message)}</div>` : ''}
  ${order?.tipForChef ? `<div style="margin-top:6px"><strong>Note:</strong> ${escapeHtml(order.tipForChef)}</div>` : ''}
  <div style="margin-top:6px; margin-right: 2mm;" class="items">
    ${items.map(it => {
        const qty = Number(it.quantity || 1);
        return `<div class="row"><div>${escapeHtml(it.item?.name || it.name || '')} ${escapeHtml(it.size || '')}</div><div>x${qty}</div></div>`;
    }).join('')}
  </div>
  <div class="footer">${escapeHtml(created)}</div>
</body>
</html>`;
}

// Android-optimized kitchen receipt template with table-based layout and fixed width
export function buildKitchenHTMLAndroid(order = {}, rest = {}) {
    const items = order.items || [];
    const customerName = order.customerName || 'Guest';
    const created = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { hour12: true });

    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>KOT</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @media print {
    @page { size: 80mm auto; margin: 0; }
    body { width: 80mm; margin: 0; padding: 0; }
    * { margin: 0; padding: 0; }
    .no-print { display: none !important; }
  }
  body { 
    width: 80mm; 
    margin: 0 auto; 
    padding: 2mm; 
    font-family: 'Courier New', monospace; 
    font-size: 11pt; 
    font-weight: bold; 
    color: #000; 
    line-height: 1.2;
    background: white;
  }
  .table-box { 
    border: 3px solid #000; 
    text-align: center; 
    padding: 2mm; 
    font-size: 18pt; 
    font-weight: 900; 
    margin-bottom: 3mm; 
  }
  .order-header { font-size: 10pt; margin-bottom: 3mm; }
  .order-header div { margin: 1mm 0; }
  .divider { border-top: 1px solid #000; margin: 2mm 0; }
  table { width: 100%; border-collapse: collapse; margin: 2mm 0; }
  .items-table { width: 100%; border-collapse: collapse; }
  .items-table td { padding: 1.5mm 0; }
  .item-name { width: 70%; text-align: left; font-size: 11pt; }
  .item-qty { width: 30%; text-align: right; font-size: 11pt; }
  .footer { margin-top: 4mm; font-size: 9pt; text-align: center; }
  @media screen {
    body { background: #f5f5f5; }
  }
</style>
</head>
<body>
  <div class="table-box">${order.roomNumber ? 'ROOM' : 'TABLE'} ${escapeHtml(String(order.roomNumber || order.tableNumber || '-'))}</div>
  
  <div class="order-header">
    <div><strong>Guest:</strong> ${escapeHtml(customerName)}</div>
    <div><strong>Order No:</strong> ${escapeHtml(order.orderId || order._id)}</div>
    ${order?.message ? `<div><strong>Message:</strong> ${escapeHtml(order.message)}</div>` : ''}
    ${order?.tipForChef ? `<div><strong>Note:</strong> ${escapeHtml(order.tipForChef)}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <table class="items-table">
    <tbody>
      ${items.map(it => {
          const qty = Number(it.quantity || 1);
          return `<tr>
            <td class="item-name">${escapeHtml(it.item?.name || it.name || '')} ${escapeHtml(it.size || '')}</td>
            <td class="item-qty">x${qty}</td>
          </tr>`;
      }).join('')}
    </tbody>
  </table>
  
  <div class="divider"></div>
  
  <div class="footer">${escapeHtml(created)}</div>
</body>
</html>`;
}

// Prints HTML by opening a temporary window, writing the content and calling print.
// Note: silent printing without dialog is not allowed in standard browsers — see README instructions for kiosk/qz options.
export async function printHtml(html, opts = { closeAfter: 1000, autoClose: true }) {
    return new Promise((resolve, reject) => {
        try {
            // Do not use noopener here: we need a window handle to write into and to print reliably
            const w = window.open('', '_blank');
            if (!w) return reject(new Error('Failed to open print window (popup blocked)'));

            // If autoClose is requested, inject a small script that prints on load and closes the window
            let htmlToWrite = html;
            if (opts.autoClose) {
                const script = `\n<script>(function(){
  function doPrint(){
    try{ window.print(); }catch(e){}
    setTimeout(function(){ try{ window.close(); }catch(e){} }, ${opts.closeAfter || 1000});
  }
  if (document.readyState === 'complete') setTimeout(doPrint, 150);
  else window.addEventListener('load', function(){ setTimeout(doPrint, 150); });
})();</script>\n`;
                if (/<\/body>\s*$/i.test(htmlToWrite)) {
                    htmlToWrite = htmlToWrite.replace(/<\/body>\s*$/i, script + '</body>');
                } else {
                    htmlToWrite += script;
                }
            }

            w.document.open();
            w.document.write(htmlToWrite);
            w.document.close();

            // Try to keep current tab focused by focusing back to opener (best-effort; may be limited by browser)
            try { window.focus(); } catch (e) { }

            if (opts.autoClose) {
                // Resolve when the new window closes (i.e., after print + close script runs) or after timeout
                const start = Date.now();
                const maxWait = (opts.maxWait || 10000) + (opts.closeAfter || 1000);
                const poll = () => {
                    try {
                        if (w.closed) return resolve();
                    } catch (e) { return resolve(); }
                    if (Date.now() - start > maxWait) {
                        try { if (!w.closed) w.close(); } catch (e) { }
                        return resolve();
                    }
                    setTimeout(poll, 200);
                };
                setTimeout(poll, 200);
                return;
            }

            // If not using autoClose, print from opener window (older behavior)
            const maxWait = opts.maxWait || 10000;
            const start = Date.now();

            const doPrint = () => {
                try {
                    try { w.focus(); } catch (e) { }
                    // call print
                    w.print();
                    // attempt to return focus to opener
                    try { window.focus(); } catch (e) { }
                    // close after delay
                    setTimeout(() => {
                        try { if (!w.closed) w.close(); } catch (e) { }
                        resolve();
                    }, opts.closeAfter || 1000);
                } catch (err) {
                    try { if (!w.closed) w.close(); } catch (e) { }
                    reject(err);
                }
            };

            // Wait for DOM content and images to render. Polling approach is robust across browsers.
            const checkReady = () => {
                try {
                    const doc = w.document;
                    const ready = doc.readyState === 'complete';
                    const bodyHasContent = !!(doc.body && doc.body.innerHTML && doc.body.innerHTML.trim().length > 0);
                    if (ready && bodyHasContent) {
                        const imgs = Array.from(doc.images || []);
                        if (imgs.length === 0) return doPrint();

                        let loaded = 0;
                        const finishCheck = () => { loaded++; if (loaded >= imgs.length) doPrint(); };
                        for (const img of imgs) {
                            if (img.complete) finishCheck();
                            else {
                                img.addEventListener('load', finishCheck);
                                img.addEventListener('error', finishCheck);
                            }
                        }
                        return;
                    }
                } catch (e) {
                    // If cross-origin or other access error, try to print after timeout
                }

                if (Date.now() - start > maxWait) {
                    // Timeout: try to print anyway
                    try { doPrint(); } catch (e) { reject(e); }
                    return;
                }
                setTimeout(checkReady, 100);
            };

            setTimeout(checkReady, 50);

        } catch (e) { reject(e); }
    });
}
