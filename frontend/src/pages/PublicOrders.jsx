import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { getSocket, joinTable } from '../api/socket';
import { 
  ArrowLeft, 
  RefreshCw, 
  Receipt, 
  Clock, 
  CheckCircle, 
  XCircle, 
  ChefHat, 
  AlertCircle,
  Info
} from 'lucide-react';

function PublicOrders() {
  const params = useParams();
  const rid = params.rid;
  const table = params.table ? Number(params.table) : null;
  const room = params.room ? Number(params.room) : null;
  const isRoom = !!room;
  const number = isRoom ? room : table;
  const [orders, setOrders] = useState([]);
  const [restaurantInfo, setRestaurantInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [unreadMap, setUnreadMap] = useState(() => new Set());
  const [tick, setTick] = useState(Date.now());
  const unreadCount = unreadMap.size;
  const listRef = useRef(null);

  // --- Theme Constants ---
  const darkRed = "#991b1b";
  const darkGrey = "#1f2937"; // High contrast text
  const mediumGrey = "#4b5563"; // Readable secondary text
  const lightBg = "#f3f4f6";
  const white = "#ffffff";
  const borderColor = "#e5e7eb";

  const sessKey = useMemo(() => `obqr:sess:${rid}:${tableNumber}`, [rid, tableNumber]);
  
  // Session Logic
  const sessionId = useMemo(() => {
    const TWO_HOURS = 2 * 60 * 60 * 1000;
    const timestampKey = `obqr:sess:time:${rid}:${tableNumber}`;
    let sid = localStorage.getItem(sessKey);
    const timestamp = localStorage.getItem(timestampKey);
    if (sid && timestamp) {
      const sessionAge = Date.now() - parseInt(timestamp, 10);
      if (sessionAge > TWO_HOURS) {
        localStorage.removeItem(sessKey);
        localStorage.removeItem(timestampKey);
        return '';
      }
    }
    return sid || '';
  }, [sessKey, rid, tableNumber]);

  // Load Orders
  const loadOrders = async () => {
    setLoading(true); setError('');
    try {
      const [ordersRes, restaurantRes] = await Promise.all([
        api.get(isRoom ? `/public/orders/${rid}/room/${number}` : `/public/orders/${rid}/${number}`, { params: { sessionId } }),
        api.get(`/public/restaurant/${rid}`)
      ]);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
      setRestaurantInfo(restaurantRes.data || {});
    } catch (e) { setError(e.response?.data?.message || 'Failed to load orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadOrders(); }, [rid, tableNumber, sessionId]);

  // Socket Logic
  useEffect(() => {
    if (!rid || !tableNumber) return;
    joinTable(rid, number, isRoom);
    const s = getSocket();
    const onConnect = () => joinTable(rid, tableNumber);
    const onNew = (order) => {
      if (order?.tableNumber !== tableNumber) return;
      setOrders(prev => {
        const exists = prev.some(o => o.orderId === order.orderId);
        return exists ? prev : [order, ...prev].slice(0, 50);
      });
    };
    const onUpdate = (order) => {
      if (order?.tableNumber !== tableNumber) return;
      setOrders(prev => prev.map(o => {
        if (o.orderId !== order.orderId) return o;
        const prevStatus = o.status;
        if ((prevStatus === 'pending') && (order.status === 'accepted' || order.status === 'rejected')) {
          setUnreadMap(prev => new Set(prev).add(order.orderId));
        }
        return { ...o, ...order };
      }));
    };
    s.on('connect', onConnect);
    s.on('order:new', onNew);
    s.on('order:update', onUpdate);
    return () => {
      s.off('connect', onConnect);
      s.off('order:new', onNew);
      s.off('order:update', onUpdate);
    };
  }, [rid, tableNumber]);

  // Progress Tick
  useEffect(() => {
    const id = setInterval(() => setTick(Date.now()), 20000);
    return () => clearInterval(id);
  }, []);

  const cancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) return;
    try {
      await api.post(`/public/orders/${rid}/${orderId}/cancel`, { sessionId });
      setOrders(o => o.map(ord => ord.orderId === orderId ? { ...ord, status: 'cancelled' } : ord));
    } catch (e) { alert(e.response?.data?.message || 'Cancel failed'); }
  };

  // Logic: Decorate Orders (Progress/ETA)
  const now = tick;
  const decorated = useMemo(() => {
    return orders.map(o => {
      const avgServe = o.items && o.items.length ? (o.items.reduce((s, it) => s + (it.serveTime || 15), 0) / o.items.length) : 15;
      const acceptedTs = o.acceptedAt || o.statusTimestamps?.accepted || o.updatedAt || o.createdAt;
      const acceptedMs = acceptedTs ? new Date(acceptedTs).getTime() : new Date(o.createdAt).getTime();
      let progress = 0;
      let etaMs = 0;
      if (o.status === 'accepted') {
        const target = acceptedMs + avgServe * 60 * 1000;
        progress = ((now - acceptedMs) / (avgServe * 60 * 1000)) * 100;
        progress = Math.min(100, Math.max(0, progress));
        etaMs = target - now;
      } else if (['served', 'ready', 'completed'].includes(o.status)) {
        progress = 100;
        etaMs = 0;
      } else if (o.status === 'cancelled' || o.status === 'rejected') {
        progress = 0;
        etaMs = 0;
      }
      const displayTotal = (o.status === 'cancelled' || o.status === 'rejected') ? 0 : o.total;
      return { ...o, avgServe, progress, etaMs, displayTotal };
    });
  }, [orders, now]);

  const acceptedOrders = useMemo(() => decorated.filter(o => ['accepted', 'served', 'ready', 'completed'].includes(o.status)), [decorated]);

  const markRead = (orderId) => {
    setUnreadMap(prev => {
      if (!prev.has(orderId)) return prev;
      const next = new Set(prev);
      next.delete(orderId);
      return next;
    });
  };

  // --- Helpers for Status Visuals (High Contrast) ---
  const getStatusConfig = (status, progress) => {
    switch (status) {
      case 'pending': return { color: '#854d0e', bg: '#fef9c3', text: 'Preparing to Accept', icon: <Clock size={16} /> }; // Dark yellow text
      case 'accepted': return { color: '#1e40af', bg: '#dbeafe', text: progress < 100 ? 'Cooking' : 'Finishing Up', icon: <ChefHat size={16} /> }; // Dark blue text
      case 'served':
      case 'ready': 
      case 'completed': return { color: '#166534', bg: '#dcfce7', text: 'Served / Completed', icon: <CheckCircle size={16} /> }; // Dark green text
      case 'cancelled': return { color: '#991b1b', bg: '#fee2e2', text: 'Cancelled', icon: <XCircle size={16} /> }; // Dark red text
      case 'rejected': return { color: '#991b1b', bg: '#fee2e2', text: 'Rejected', icon: <AlertCircle size={16} /> };
      default: return { color: mediumGrey, bg: lightBg, text: status, icon: <Info size={16} /> };
    }
  };

  // --- Invoice Handlers (Calling the function directly) ---
  const openSessionInvoice = () => {
    if (acceptedOrders.length === 0) { alert('No accepted orders to generate invoice.'); return; }
    
    try {
        const allItems = acceptedOrders.flatMap(o => o.items.map(it => ({ ...it, orderId: o.orderId })));
        
        // Use the total from the component logic, or recalculate safely
        const sessionTotal = acceptedOrders.reduce((sum, o) => sum + Number(o.displayTotal || o.total || 0), 0);

        const sessionOrder = {
          ...acceptedOrders[0], // Borrow metadata from first order
          items: allItems,
          total: sessionTotal,
          orderId: acceptedOrders.map(o => o.orderId.slice(-4).toUpperCase()).join(', '), // Shorter IDs for title
          createdAt: acceptedOrders[acceptedOrders.length-1].createdAt,
        };
        
        const html = buildPublicInvoiceHTML(sessionOrder, restaurantInfo, true);
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        window.open(url, '_blank');
    } catch(e) { console.error("Invoice Error:", e); alert("Failed to generate invoice."); }
  };

  const openInvoice = (o) => {
     try {
        const html = buildPublicInvoiceHTML(o, restaurantInfo, false);
        const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
        window.open(url, '_blank');
     } catch(e) { console.error(e); alert("Failed to generate invoice."); }
  };

  return (
    <main style={{ minHeight: '100vh', backgroundColor: lightBg, paddingBottom: '40px', fontFamily: 'sans-serif' }}>
      
      {/* 1. HEADER */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 40,
        backgroundColor: white,
        borderBottom: `1px solid ${borderColor}`,
        padding: '12px 16px',
        display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        gap: '10px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(`/r/${rid}/t/${table}`)}
            style={{ border: 'none', background: 'transparent', color: darkGrey, cursor: 'pointer', padding: 4 }}
            aria-label="Back to Menu"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: darkGrey, display: 'flex', alignItems: 'center', gap: '8px' }}>
            My Orders
            {unreadCount > 0 && (
              <span style={{ 
                backgroundColor: darkRed, color: white, fontSize: '12px', fontWeight: 'bold', 
                padding: '2px 8px', borderRadius: '50px', lineHeight: 1 
              }}>
                {unreadCount} New
              </span>
            )}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'nowrap' }}>
            {/* Session Invoice Button - With Text
            {acceptedOrders.length > 0 && (
                <button 
                    onClick={openSessionInvoice}
                    style={{
                        height: 38, padding: '0 14px', borderRadius: '8px',
                        border: 'none', background: darkRed, color: white,
                        display: 'flex', alignItems: 'center', gap: '6px',
                        fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                >
                    <Receipt size={16} />
                    <span>Session Bill</span>
                </button>
            )} */}

            {/* Refresh Button - With Text */}
            <button 
                onClick={loadOrders} disabled={loading}
                style={{
                    height: 38, padding: '0 14px', borderRadius: '8px',
                    border: `1px solid ${borderColor}`, background: white,
                    display: 'flex', alignItems: 'center', gap: '6px',
                    color: loading ? mediumGrey : darkGrey, cursor: 'pointer',
                    fontSize: '13px', fontWeight: '600'
                }}
            >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                <span style={{ display: 'inline-block' }}>Refresh</span>
            </button>
        </div>
      </header>

      {/* 2. ERROR STATE */}
      {error && (
        <div style={{ margin: '16px', padding: '12px', background: '#fef2f2', color: '#991b1b', borderRadius: '8px', fontSize: '14px', border: '1px solid #fecaca', fontWeight: '600' }}>
          {error}
        </div>
      )}

      {/* 3. EMPTY STATE */}
      {decorated.length === 0 && !loading && (
        <div style={{ 
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            padding: '80px 20px', color: mediumGrey, textAlign: 'center'
        }}>
            <div style={{ width: 70, height: 70, background: '#e5e7eb', borderRadius: '50%', marginBottom: 16, display: 'flex', alignItems:'center', justifyContent:'center', color: '#9ca3af' }}>
              <Receipt size={32} />
            </div>
            <h3 style={{ margin: '0 0 8px', color: darkGrey, fontSize: '18px', fontWeight: '700' }}>No orders yet</h3>
            <p style={{ margin: 0, fontSize: '14px', color: mediumGrey }}>Your submitted orders will appear here.</p>
            <button 
                onClick={() => navigate(`/r/${rid}/t/${table}`)}
                style={{ marginTop: 24, padding: '12px 24px', borderRadius: 8, background: darkGrey, color: white, border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
                Return to Menu
            </button>
        </div>
      )}

      {/* 4. ORDERS LIST */}
      <div 
        ref={listRef}
        style={{ 
            padding: '16px', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '16px' 
        }}
      >
        {decorated.map((o) => {
          const totalIncl = Number(o.displayTotal).toFixed(2);
          const etaMin = o.etaMs > 0 ? Math.ceil(o.etaMs / 60000) : 0;
          const isUnread = unreadMap.has(o.orderId);
          const statusConfig = getStatusConfig(o.status, o.progress);

          return (
            <div 
                key={o.orderId}
                onClick={() => markRead(o.orderId)}
                style={{
                    backgroundColor: white,
                    borderRadius: '12px',
                    border: isUnread ? `2px solid ${darkRed}` : `1px solid ${borderColor}`,
                    boxShadow: isUnread ? '0 4px 12px rgba(153, 27, 27, 0.15)' : '0 1px 3px rgba(0,0,0,0.05)',
                    overflow: 'hidden',
                    transition: 'transform 0.2s',
                    position: 'relative'
                }}
            >
              {/* Card Header */}
              <div style={{ 
                  padding: '12px 16px', 
                  borderBottom: `1px solid ${lightBg}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  backgroundColor: '#fff'
              }}>
                 <div>
                    <div style={{ fontSize: '13px', color: darkGrey, fontWeight: '700' }}>
                        ORDER #{o.orderId.slice(-4).toUpperCase()}
                    </div>
                    <div style={{ fontSize: '11px', color: mediumGrey, marginTop: 2 }}>
                        {new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                 </div>

                 <div style={{ 
                     display: 'flex', alignItems: 'center', gap: 6,
                     backgroundColor: statusConfig.bg, color: statusConfig.color,
                     padding: '6px 12px', borderRadius: '50px', fontSize: '12px', fontWeight: '700'
                 }}>
                    {statusConfig.icon}
                    {statusConfig.text}
                 </div>
              </div>

              {/* Items List */}
              <div style={{ padding: '16px' }}>
                 {o.items.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', fontSize: '14px', color: darkGrey }}>
                        <div style={{ display: 'flex', gap: 10 }}>
                           <span style={{ fontWeight: '700', color: darkGrey, minWidth: '20px' }}>{it.quantity}x</span>
                           <span style={{ fontWeight: '500' }}>
                             {it.name}
                             {it.size && <span style={{ fontSize: '12px', color: mediumGrey, marginLeft: 4 }}>({it.size})</span>}
                           </span>
                        </div>
                    </div>
                 ))}
              </div>

              {/* Progress Bar (Only for accepted orders) */}
              {(o.status === 'accepted') && (
                 <div style={{ padding: '0 16px 16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: 6, fontWeight: 600, color: mediumGrey }}>
                       <span>Kitchen Progress</span>
                       <span>~{etaMin}m remaining</span>
                    </div>
                    <div style={{ height: 8, width: '100%', background: lightBg, borderRadius: 10, overflow: 'hidden' }}>
                       <div style={{ 
                           height: '100%', 
                           width: `${Math.min(100, o.progress)}%`, 
                           backgroundColor: statusConfig.color,
                           transition: 'width 1s linear'
                       }} />
                    </div>
                 </div>
              )}

              {/* Footer: Totals & Actions */}
              <div style={{ 
                  padding: '12px 16px', 
                  backgroundColor: lightBg,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  borderTop: `1px solid ${borderColor}`
              }}>
                 <div>
                    <span style={{ fontSize: '11px', color: mediumGrey, textTransform: 'uppercase', fontWeight: 700 }}>Total</span>
                    <div style={{ fontSize: '17px', fontWeight: '800', color: darkGrey }}>
                        ₹{totalIncl}
                    </div>
                 </div>

                 <div style={{ display: 'flex', gap: 8 }}>
                    {/* Cancel Button (Only if pending) */}
                    {o.status === 'pending' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); cancelOrder(o.orderId); }}
                            style={{ 
                                padding: '8px 16px', borderRadius: 6, 
                                border: '1px solid #fca5a5', background: '#fff', 
                                color: '#b91c1c', fontSize: '13px', fontWeight: 700, cursor: 'pointer' 
                            }}
                        >
                            Cancel
                        </button>
                    )}

                    {/* Individual Invoice */}
                    {['accepted', 'served', 'completed', 'ready'].includes(o.status) && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); openInvoice(o); }}
                            style={{ 
                                padding: '8px 16px', borderRadius: 6, 
                                border: `1px solid ${borderColor}`, background: white, 
                                color: darkGrey, fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 6
                            }}
                        >
                            <Receipt size={14} /> Receipt
                        </button>
                    )}
                 </div>
              </div>

            </div>
          );
        })}
      </div>

    </main>
  );
}

export default React.memo(PublicOrders);

// --- Invoice Generator Helper Function (Defined Outside Component) ---

function buildPublicInvoiceHTML(order, restaurant, isSession = false) {
  const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;
  const created = new Date(order.createdAt).toLocaleString();
  const items = order.items || [];

// ---------- SUBTOTAL ----------
let subTotal = 0;

if (!isSession) {
  // Invoice / paid bill → calculate from items
  subTotal = items.reduce((sum, it) => {
    const qty = Number(it.quantity || 0);
    const price = Number(it.price || 0);
    return sum + price * qty;
  }, 0);
} else {
  // Session bill → backend is source of truth
  subTotal = Number(order.total || 0);
}

// ---------- GRAND TOTAL (AFTER DISCOUNT) ----------
const grandTotal = Number(order.total || 0);

// ---------- DISCOUNT (SAFE) ----------
const discountAmount = Math.max(subTotal - grandTotal, 0);


  const escapeHtml = (str) => String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
  const LINE = (s = "") => escapeHtml(s);
  const pad = (v, w) => {
    const str = String(v ?? "");
    return str.length > w ? str.slice(0, w) : str.padEnd(w, " ");
  };
  const padLeft = (v, w) => {
    const str = String(v ?? "");
    return str.length > w ? str.slice(0, w) : str.padStart(w, " ");
  };

  const NAME_W = 16, SIZE_W = 5, QTY_W = 3, PRICE_W = 6, TOTAL_W = 7;
  const SEP = "-".repeat(NAME_W + SIZE_W + QTY_W + PRICE_W + TOTAL_W + 5);

  const itemLineRenderer = (it) => {
    const name = pad((it.item?.name || it.name || it.item || ""), NAME_W);
    const size = pad(it.size || "", SIZE_W);
    const qty = padLeft(Number(it.quantity || 0), QTY_W);
    const hasPrice = isFinite(Number(it.price));
    const unit = hasPrice ? Number(it.price).toFixed(0) : "-";
    const totalStr = hasPrice ? Number(Number(it.price) * Number(it.quantity || 0)).toFixed(0) : "-";
    const price = padLeft(unit, PRICE_W);
    const total = padLeft(totalStr, TOTAL_W);
    return `${name} ${size} ${qty} ${price} ${total}`;
  };

  let itemLines;
  if (isSession) {
      // Group by Order ID for session bill
      const groupedItems = items.reduce((acc, item) => {
          const orderId = item.orderId || "UNK";
          if (!acc[orderId]) acc[orderId] = [];
          acc[orderId].push(item);
          return acc;
      }, {});

       itemLines = Object.keys(groupedItems).sort().map(orderId => {
         const orderItemsText = groupedItems[orderId].map(itemLineRenderer).join('\n');
         return `ORDER #${orderId.slice(-4).toUpperCase()}\n${orderItemsText}`;
       }).join('\n' + SEP + '\n');
  } else {
      itemLines = items.map(itemLineRenderer).join("\n");
  }

  const esewaId = restaurant?.esewaId || "";
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(esewaId)}`;
  const showEsewaQr = !!esewaId;

  const tableNo = order.tableNumber ?? order.table ?? "—";
  const restaurantName = (restaurant?.name || "INVOICE").toUpperCase();
  const branch = restaurant?.branch || "";
  const addr = restaurant?.address || "";
  const phone = restaurant?.phone || "";
  const restaurantDetails = [branch, addr, phone].filter(x => x).join(", ");

 return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Bill ${isSession ? 'Session' : (order.orderId || '')}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  @page { size: 80mm auto; margin: 0; }
  body { font-family: 'Courier New', monospace; color: #000; margin: 0; padding: 10px; background: #fff; font-size: 12px; font-weight: 600; }
  .center { text-align: center; }
  .hr { margin: 8px 0; border: 0; border-top: 1px dashed #000; }
  pre { white-space: pre-wrap; margin: 0; font-family: 'Courier New', monospace; }
  .btn-print { width: 100%; padding: 10px; background: #000; color: #fff; border: none; font-weight: bold; margin-top: 15px; cursor: pointer; }
  @media print { .btn-print { display: none; } }
</style>
</head>
<body>
  <div class="center" style="font-size:16px; font-weight:800; margin-bottom:4px;">${escapeHtml(restaurantName)}</div>
  ${restaurantDetails ? `<div class="center" style="font-size:11px; margin-bottom:8px;">${escapeHtml(restaurantDetails)}</div>` : ''}
  
  <div class="hr"></div>
  <div style="display:flex; justify-content:space-between;">
     <span>${isSession ? 'SESSION BILL' : 'ORDER BILL'}</span>
     <span>Date: ${created.split(',')[0]}</span>
  </div>
  <div style="display:flex; justify-content:space-between;">
     <span>Table: ${tableNo}</span>
     <span>Time: ${created.split(',')[1]}</span>
  </div>
  <div class="hr"></div>

<pre>
${LINE(pad("ITEM", NAME_W) + " " + pad("SZ", SIZE_W) + " " + padLeft("QT", QTY_W) + " " + padLeft("PRC", PRICE_W) + " " + padLeft("TOT", TOTAL_W))}
${LINE(SEP)}
${itemLines}
${LINE(SEP)}
</pre>
  
  ${discountAmount > 0 ? `
  <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:4px;">
    <span>SUBTOTAL</span>
    <span>${currency(subTotal)}</span>
  </div>

  <div style="display:flex; justify-content:space-between; font-size:14px; margin-top:4px;">
    <span>DISCOUNT</span>
    <span>- ${currency(discountAmount)}</span>
  </div>
` : ``}

<div style="display:flex; justify-content:space-between; font-size:14px; margin-top:6px; font-weight:bold;">
  <span>GRAND TOTAL</span>
  <span>${currency(grandTotal)}</span>
</div>


  ${showEsewaQr ? `
    <div class="hr"></div>
    <div class="center">
      <div style="font-size:11px; margin-bottom:4px;">Scan to Pay (eSewa)</div>
      <img src="${qrImg}" alt="QR" width="120" height="120" style="display:block; margin:0 auto;" />
    </div>` : ''}

  <div class="center" style="margin-top:15px; font-size:11px;">Thank you for dining with us!</div>
  
  <button class="btn-print" onclick="window.print()">PRINT RECEIPT</button>
</body>
</html>`;
}