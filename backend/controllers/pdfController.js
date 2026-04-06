// import puppeteer from 'puppeteer';
// import Order from '../models/Order.js';
// import Restaurant from '../models/Restaurant.js';

// // Build a small server-side invoice HTML (kept in sync with frontend invoice layout)
// function buildInvoiceHTMLServer(order, rest = {}, isSession = false) {
//   const currency = (n) => {
//     const num = Number(n || 0);
//     return `₹${Number.isInteger(num) ? num : num.toFixed(2)}`;
//   };

//   const items = order.items || [];
//   const subTotal = items.reduce((sum, it) => {
//     const qty = Number(it.quantity || 1);
//     const price = Number(it.price || 0);
//     return sum + price * qty;
//   }, 0);

//   // use aggregated discount when present (order.discountValue or sum of order.orders)
//   let discountAmount = 0;
//   if (Array.isArray(order.orders) && order.orders.length) {
//     discountAmount = order.orders.reduce((s, o) => s + Number(o.discountValue || 0), 0);
//   } else {
//     const itemSum = items.reduce((s, it) => s + (Number(it.discountValue || 0) * Number(it.quantity || 1)), 0);
//     if (itemSum > 0) discountAmount = itemSum;
//     else discountAmount = Number(order.discountValue || 0);
//   }

//   const enableGST = rest?.enableGST || false;
//   const GST = Number(rest?.GST || 0);
//   const taxableAmount = Math.max(subTotal - discountAmount, 0);
//   const halfGSTPercent = (GST || 0) / 2;
//   const cgstAmount = enableGST ? (taxableAmount * halfGSTPercent) / 100 : 0;
//   const sgstAmount = enableGST ? (taxableAmount * halfGSTPercent) / 100 : 0;
//   const grandTotal = Number(order.total || 0);

//   const headerName = (rest?.name || 'RESTAURANT').toUpperCase();
//   const created = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { hour12: true });

//   // UPI QR (if available)
//   const upiId = rest?.upiId || '';
//   const payee = rest?.name || 'Merchant';
//   const note = `Order ${order.orderId || order._id}`;
//   const amountParam = isFinite(Number(order.total || 0)) ? `&am=${Number(order.total || 0).toFixed(2)}` : '';
//   const upiUrl = upiId ? `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}${amountParam}&cu=INR&tn=${encodeURIComponent(note)}` : '';
//   const qrImg = upiId ? `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(upiUrl)}` : '';

//   // Basic HTML (kept simple for server-side rendering)
//   return `<!doctype html>
// <html>
// <head>
// <meta charset="utf-8" />
// <title>Invoice</title>
// <style>
//   @page { size: 80mm auto; margin: 0; }
//   body { width: 76mm; margin: 0 auto; padding: 4mm; font-family: 'Courier New', monospace; font-size: 12.5px; color: #000; }
//   .center { text-align: center; }
//   .hr { border-top: 1px dashed #000; margin: 6px 0; }
//   .items { margin-top:6px }
//   .row { display:flex; justify-content:space-between; }
// </style>
// </head>
// <body>
//   <div class="center" style="font-size:16px;margin-bottom:4px">${escapeHtml(headerName)}</div>
//   <div class="center" style="font-size:10px;margin-bottom:8px">${escapeHtml([rest?.branch, rest?.address, rest?.phone].filter(Boolean).join(', '))}</div>
//   <div class="hr"></div>
//   <div class="center">${isSession ? 'ESTIMATE / BILL' : 'TAX INVOICE'}</div>
//   <div style="font-size:11px;margin-top:6px">
//     <div>Order No : ${escapeHtml(order.orderId || order._id)}</div>
//     <div>Date     : ${created}</div>
//     <div>Location : ${escapeHtml(order.roomNumber ? `Room ${order.roomNumber}` : `Table ${order.tableNumber || '-'}`)}</div>
//     <div>Guest    : ${escapeHtml(order.customerName || 'Walk-in')}</div>
//   </div>
//   <div class="hr"></div>
//   <div class="items">
//     ${items.map(it => {
//       const qty = Number(it.quantity || 1);
//       const price = Number(it.price || 0);
//       const name = escapeHtml(it.item?.name || it.name || '');
//       const size = escapeHtml(it.size || '');
//       // Show unit price alongside quantity, and line total on the right
//       return `<div class="row"><div>${name}${size ? ' ' + size : ''} <span style="font-size:11px">x${qty} @ ${currency(price)}</span></div><div>${currency(price * qty)}</div></div>`;
//     }).join('')}
//   </div>

//   <div class="hr"></div>
//   <div class="row"><span>SUBTOTAL</span><span>${currency(subTotal)}</span></div>
//   ${discountAmount > 0 ? `<div class="row"><span>DISCOUNT</span><span>- ${currency(discountAmount)}</span></div>` : ''}
//   ${enableGST && GST > 0 ? `<div class="row"><span>CGST (${halfGSTPercent}%)</span><span>${currency(cgstAmount)}</span></div><div class="row"><span>SGST (${halfGSTPercent}%)</span><span>${currency(sgstAmount)}</span></div>` : ''}
//   <div class="hr"></div>
//   <div class="row"><strong>GRAND TOTAL</strong><strong>${currency(grandTotal)}</strong></div>

//   ${upiId ? `
//     <div style="margin-top:8px;text-align:center">
//       <div style="font-size:11px;margin-bottom:6px">Scan & Pay</div>
//       <img src="${qrImg}" style="width:120px;height:120px;display:block;margin:0 auto" />
//       <div style="font-size:10px;margin-top:4px">UPI ID: ${escapeHtml(upiId)}</div>
//     </div>
//   ` : ''}

//   <div class="center" style="margin-top:12px;font-size:10px">Thank you! Visit again 🙏</div>
// </body>
// </html>`;
// }

// function escapeHtml(str) {
//   return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
// }

// // Build a small server-side kitchen ticket
// function buildKitchenHTMLServer(order, rest = {}) {
//   const items = order.items || [];
//   const customerName = order.customerName || 'Guest';
//   const created = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', { hour12: true });

//   return `<!doctype html>
// <html>
// <head>
// <meta charset="utf-8" />
// <title>KOT</title>
// <style>
//   @page { size: 80mm auto; margin: 0; }
//   body { width: 76mm; margin: 0 auto; padding: 4mm; font-family: 'Courier New', monospace; font-size: 12px; color: #000; }
//   .table { border: 2px solid #000; text-align: center; padding: 8px; font-size: 22px; font-weight: 900; margin-bottom: 8px; }
//   .items { margin-top:6px }
//   .row { display:flex; justify-content:space-between; margin-bottom:6px }
//   .footer { margin-top:8px; font-size:11px; text-align:center }
// </style>
// </head>
// <body>
//   <div class="table">${escapeHtml(order.roomNumber ? `ROOM ${order.roomNumber}` : `TABLE ${order.tableNumber || '-'}`)}</div>
//   <div><strong>Guest:</strong> ${escapeHtml(customerName)}</div>
//   <div><strong>Order No:</strong> ${escapeHtml(order.orderId || order._id)}</div>
//   ${order?.message ? `<div style="margin-top:6px"><strong>Message:</strong> ${escapeHtml(order.message)}</div>` : ''}
//   ${order?.tipForChef ? `<div style="margin-top:6px"><strong>Note:</strong> ${escapeHtml(order.tipForChef)}</div>` : ''}
//   <div style="margin-top:6px" class="items">
//     ${items.map(it => {
//       const qty = Number(it.quantity || 1);
//       return `<div class="row"><div>${escapeHtml(it.item?.name || it.name || '')} ${escapeHtml(it.size || '')}</div><div>x${qty}</div></div>`;
//     }).join('')}
//   </div>
//   <div class="footer">${escapeHtml(created)}</div>
// </body>
// </html>`;
// }

// export const invoicePdf = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const type = String(req.query?.type || 'invoice'); // 'invoice' or 'kitchen'

//     const order = await Order.findById(id).populate({ path: 'items.item', select: 'name category' });
//     if (!order) return res.status(404).json({ message: 'Order not found' });

//     // Verify ownership
//     if (String(order.restaurant) !== String(req.restaurant._id)) {
//       return res.status(403).json({ message: 'Not allowed' });
//     }

//     const rest = await Restaurant.findById(order.restaurant).lean();

//     const html = type === 'kitchen'
//       ? buildKitchenHTMLServer(order.toObject ? order.toObject() : order, rest || {})
//       : buildInvoiceHTMLServer(order.toObject ? order.toObject() : order, rest || {}, false);

//     const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: 'networkidle0' });

//     const pdf = await page.pdf({ printBackground: true, width: '80mm', margin: { top: '4mm', bottom: '4mm' } });
//     await browser.close();

//     res.setHeader('Content-Type', 'application/pdf');
//     // sanitize filename and quote it to avoid commas being parsed as multiple header values
//     const rawName = `${type === 'kitchen' ? 'kot' : 'invoice'}-${order.orderId || order._id}`;
//     const safeName = String(rawName).replace(/\"/g, '').replace(/,\s*/g, '_');
//     res.setHeader('Content-Disposition', `inline; filename="${safeName}.pdf"`);
//     return res.send(pdf);
//   } catch (err) {
//     console.error('Invoice PDF generation error:', err);
//     return res.status(500).json({ message: 'Failed to generate PDF' });
//   }
// };

// export const combinedInvoicePdf = async (req, res) => {
//   try {
//     const ids = Array.isArray(req.body?.ids) ? req.body.ids : (typeof req.body?.ids === 'string' ? req.body.ids.split(',') : []);
//     const type = String(req.body?.type || 'invoice');
//     if (!ids.length) return res.status(400).json({ message: 'No order ids provided' });

//     const orders = await Order.find({ _id: { $in: ids } }).populate({ path: 'items.item', select: 'name category' }).lean();
//     if (!orders.length) return res.status(404).json({ message: 'Orders not found' });

//     // Ensure all orders belong to the requesting restaurant
//     const invalid = orders.find(o => String(o.restaurant) !== String(req.restaurant._id));
//     if (invalid) return res.status(403).json({ message: 'Not allowed to access one or more orders' });

//     // Sort by createdAt ascending, pick the first as representative
//     const sorted = orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
//     const first = sorted[0];

//     // Merge items by (item id + size)
//     const mergedMap = new Map();
//     for (const o of sorted) {
//       for (const it of (o.items || [])) {
//         const key = `${(it.item?._id || it.item)}::${it.size || ''}`;
//         const existing = mergedMap.get(key) || { item: it.item, size: it.size, quantity: 0, price: it.price || 0 };
//         existing.quantity = (existing.quantity || 0) + (it.quantity || 0);
//         existing.price = it.price || existing.price;
//         mergedMap.set(key, existing);
//       }
//     }

//     const mergedItems = Array.from(mergedMap.values());
//     const total = orders.reduce((s, o) => s + Number(o.total || 0), 0);
//     const discountValue = orders.reduce((s, o) => s + Number(o.discountValue || 0), 0);

//     const combinedOrder = {
//       ...first,
//       items: mergedItems.map(it => ({ item: it.item, size: it.size, quantity: it.quantity, price: it.price })),
//       total,
//       orderId: orders.map(o => o.orderId || o._id).sort().join(', '),
//       createdAt: first.createdAt,
//       orders,
//       discountValue,
//       representativeId: first._id,
//       ids: orders.map(o => o._id)
//     };

//     const rest = await Restaurant.findById(first.restaurant).lean();

//     const html = type === 'kitchen'
//       ? buildKitchenHTMLServer(combinedOrder, rest || {})
//       : buildInvoiceHTMLServer(combinedOrder, rest || {}, true);

//     const browser = await puppeteer.launch({ args: ['--no-sandbox', '--disable-setuid-sandbox'] });
//     const page = await browser.newPage();
//     await page.setContent(html, { waitUntil: 'networkidle0' });

//     const pdf = await page.pdf({ printBackground: true, width: '80mm', margin: { top: '4mm', bottom: '4mm' } });
//     await browser.close();

//     res.setHeader('Content-Type', 'application/pdf');
//     // Sanitize filename: remove quotes and replace commas with underscores to avoid header parsing issues
//     const safeCombinedName = `invoice-combined-${String(combinedOrder.orderId).replace(/\"/g, '').replace(/,\s*/g, '_')}`;
//     res.setHeader('Content-Disposition', `inline; filename="${safeCombinedName}.pdf"`);
//     return res.send(pdf);
//   } catch (err) {
//     console.error('Combined invoice PDF error:', err);
//     return res.status(500).json({ message: 'Failed to generate combined PDF' });
//   }
// };

// export const combinedInvoicePdfGet = async (req, res) => {
//   // Support GET /pdf/combined?ids=1,2 to allow non-preflight testing
//   req.body = req.body || {};
//   const raw = req.query?.ids || '';
//   req.body.ids = Array.isArray(raw) ? raw : (String(raw).split(',').filter(Boolean));
//   req.body.type = req.query?.type || req.body.type || 'invoice';
//   return combinedInvoicePdf(req, res);
// };
