import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import api from "../api/axios";
import { getSocket, joinRestaurant } from "../api/socket";
import { Search, Download, Trash2, ChevronLeft, ChevronRight, CheckSquare, Square, User, Phone, Hash } from 'lucide-react';
import "../assets/css/Dashboard.css";

export default function OrdersList({ view = 'history' }) {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState("");
  const [backendPage, setBackendPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState("");
  const [allOrdersForSearch, setAllOrdersForSearch] = useState([]);

  // --- FETCH DATA ---
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const me = await api.get("/restaurants/me");
        setRestaurant(me.data || null);
        setRestaurantId(me.data?._id || "");
        
        if (search.trim()) {
          try {
            const allOrders = [];
            let page = 1;
            let hasMore = true;
            // Fetch all for search (simplified logic)
            while (hasMore) {
              const res = await api.get(`/orders?page=${page}&view=${view}`);
              const pageOrders = res.data.orders || [];
              allOrders.push(...pageOrders);
              hasMore = res.data.pagination?.currentPage < res.data.pagination?.totalPages;
              page++;
            }
            setAllOrdersForSearch(allOrders);
          } catch (err) {
            const res = await api.get(`/orders?page=1&view=${view}`);
            setAllOrdersForSearch(res.data.orders || []);
          }
        } else {
          const res = await api.get(`/orders?page=${backendPage}&view=${view}`);
          setOrders(res.data.orders || []);
          setPagination(res.data.pagination || null);
          setAllOrdersForSearch([]);
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load orders");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [backendPage, view, search]);

  // --- SOCKETS ---
  useEffect(() => {
    if (!restaurantId) return;
    joinRestaurant(restaurantId);
    const s = getSocket();
    const onNew = (order) => {
      if (view === 'dashboard') {
        const orderDate = new Date(order.createdAt);
        const now = new Date();
        const isSameDay = now.getDate() === orderDate.getDate() && now.getMonth() === orderDate.getMonth();
        if (!isSameDay) return;
      }
      setOrders((prev) => {
        const exists = prev.some((o) => o._id === order._id);
        if (exists) return prev;
        return [order, ...prev];
      });
    };
    const onUpdate = (order) => {
      setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
    };
    s.on("order:new", onNew);
    s.on("order:update", onUpdate);
    return () => {
      s.off("order:new", onNew);
      s.off("order:update", onUpdate);
    };
  }, [restaurantId, view]);

  // --- FILTERS ---
  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const ordersToSearch = search.trim() ? allOrdersForSearch : orders;
    if (!q) return ordersToSearch;
    const safe = (v) => (v == null ? "" : String(v)).toLowerCase();
    return ordersToSearch.filter((o) =>
      safe(o.customerName).includes(q) ||
      safe(o.customerPhone).includes(q) ||
      safe(o.orderId).includes(q) ||
      safe(o._id).includes(q) ||
      safe(o.tableNumber).includes(q) ||
      safe(o.roomNumber).includes(q)
    );
  }, [orders, allOrdersForSearch, search]);

  const pageOrders = filteredOrders;
  const pendingOrderIds = useMemo(() => orders.filter(o => o.status === 'pending').map(o => o._id), [orders]);
  
  // --- SELECTION LOGIC ---
  const allIds = useMemo(() => filteredOrders.map(o => o._id), [filteredOrders]);
  const pageIds = useMemo(() => pageOrders.map(o => o._id), [pageOrders]);
  const isPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id));

  const toggleSelectOne = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectPage = () => {
    setSelected(prev => {
      const next = new Set(prev);
      const allOnPageSelected = pageIds.every(id => next.has(id));
      if (allOnPageSelected) pageIds.forEach(id => next.delete(id));
      else pageIds.forEach(id => next.add(id));
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(allIds));
  const clearSelection = () => setSelected(new Set());

  // --- ACTIONS ---
  const doBulkDelete = async () => {
    try {
      const ids = Array.from(selected);
      if (!ids.length) return;
      await api.post('/orders/bulk-delete', { ids });
      setOrders(prev => prev.filter(o => !selected.has(o._id)));
      setSelected(new Set());
      setShowConfirm(false);
      // Adjust page if needed
      if(pagination) {
          const newTotalPages = Math.max(1, Math.ceil((pagination.totalOrders - ids.length) / 10)); // assuming 10 per page
          setBackendPage(p => Math.min(p, newTotalPages));
      }
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to delete orders');
    }
  };

  const handleExportClick = async () => {
    try {
      const res = await api.get('/orders/export', { responseType: 'blob' });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${new Date().toISOString().slice(0,10)}_orders.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert('Failed to export orders');
    }
  };

  if (loading) return <div className="p-8 text-neutral-500 animate-pulse text-center">Loading orders data...</div>;
  if (error) return <div className="p-8 text-red-500 text-center">{error}</div>;

  const statusColors = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    accepted: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    completed: 'bg-green-500/10 text-green-500 border-green-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
    rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
    default: 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'
  };

  return (
    <div className="bg-neutral-950 min-h-screen text-neutral-200 p-4 md:p-6 font-sans">
      
      {/* --- HEADER --- */}
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Title & Search Row */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-3xl font-bold text-white tracking-tight">Order <span className="text-red-600">History</span></h2>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                <div className="relative group flex-1 md:flex-none">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 group-focus-within:text-red-500 transition-colors" />
                    <input 
                        type="text" 
                        value={search}
                        onChange={(e) => { setBackendPage(1); setSearch(e.target.value); }}
                        placeholder="Search ID, Name, Phone..."
                        className="w-full md:w-64 bg-neutral-900 border border-neutral-800 text-white rounded-xl pl-10 pr-4 py-2.5 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all placeholder-neutral-600"
                    />
                </div>
                
                <button 
                    onClick={handleExportClick}
                    className="flex items-center gap-2 px-4 py-2.5 bg-green-900/20 text-green-500 border border-green-900/50 rounded-xl hover:bg-green-900/30 transition-colors font-medium text-sm"
                >
                    <Download className="w-4 h-4" /> Export
                </button>
            </div>
        </div>

        {/* --- PAGINATION & BULK CONTROLS BAR (Moved Top) --- */}
        <div className="sticky top-2 z-20 bg-neutral-900/80 backdrop-blur-md border border-neutral-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-4 shadow-lg">
            
            {/* Left: Stats & Bulk Select */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-950 rounded-lg border border-neutral-800">
                    <span className="text-neutral-500 text-xs uppercase font-bold tracking-wider">Total Orders</span>
                    <span className="text-white font-bold text-lg">{search.trim() ? filteredOrders.length : pagination?.totalOrders || 0}</span>
                </div>

                <div className="h-8 w-px bg-neutral-800"></div>

                <div className="flex items-center gap-2">
                    <button onClick={toggleSelectPage} className="flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors">
                        {isPageSelected ? <CheckSquare className="w-5 h-5 text-red-500" /> : <Square className="w-5 h-5" />}
                        Select Page
                    </button>
                    {selected.size > 0 && (
                        <>
                           <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-0.5 rounded-full">{selected.size} selected</span>
                           <button onClick={() => setShowConfirm(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 text-red-500 border border-red-600/20 rounded-lg text-xs font-bold hover:bg-red-600 hover:text-white transition-all">
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                           </button>
                           <button onClick={clearSelection} className="text-xs text-neutral-500 hover:text-white underline">Clear</button>
                        </>
                    )}
                </div>
            </div>

            {/* Right: Pagination Controls */}
            {pagination && !search.trim() && (
                <div className="flex items-center gap-2">
                    <span className="text-xs text-neutral-500 mr-2">
                        Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button 
                        disabled={pagination.currentPage <= 1} 
                        onClick={() => setBackendPage(p => Math.max(1, p - 1))}
                        className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-30 disabled:hover:border-neutral-800 transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button 
                        disabled={pagination.currentPage >= pagination.totalPages} 
                        onClick={() => setBackendPage(p => Math.min(pagination.totalPages, p + 1))}
                        className="p-2 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-400 hover:text-white hover:border-neutral-600 disabled:opacity-30 disabled:hover:border-neutral-800 transition-all"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>

        {/* --- GRID LIST --- */}
        {orders.length === 0 ? (
           <div className="text-center py-20 bg-neutral-900/50 rounded-2xl border border-neutral-800 border-dashed">
             <p className="text-neutral-500">No orders found.</p>
           </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            <AnimatePresence mode="popLayout">
                {pageOrders.map((o, idx) => (
                    <motion.div
                        key={o._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`relative group bg-neutral-900 border rounded-2xl p-5 shadow-lg transition-all hover:shadow-xl ${selected.has(o._id) ? 'border-red-500/50 ring-1 ring-red-500/20' : 'border-neutral-800 hover:border-neutral-700'}`}
                    >
                        {/* Card Header */}
                        <div className="flex justify-between items-start mb-4 border-b border-neutral-800 pb-3">
                             <div className="flex items-center gap-3">
                                 <div 
                                    onClick={() => toggleSelectOne(o._id)}
                                    className={`w-5 h-5 rounded border cursor-pointer flex items-center justify-center transition-colors ${selected.has(o._id) ? 'bg-red-600 border-red-600' : 'border-neutral-600 hover:border-neutral-400'}`}
                                 >
                                    {selected.has(o._id) && <CheckSquare className="w-3.5 h-3.5 text-white" />}
                                 </div>
                                 <div>
                                     <div className="flex items-center gap-2">
                                        <div className="bg-neutral-800 p-1 rounded text-neutral-400"><Hash className="w-3 h-3" /></div>
                                        <span className="font-mono text-sm text-neutral-300 tracking-wide">{o.orderId || o._id.slice(-6)}</span>
                                     </div>
                                     <div className="text-[10px] text-neutral-500 mt-0.5">{new Date(o.createdAt).toLocaleString()}</div>
                                 </div>
                             </div>
                             
                             <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-md border ${statusColors[o.status] || statusColors.default}`}>
                                {o.status}
                             </span>
                        </div>

                        {/* Customer Info */}
                        <div className="flex flex-col gap-1 mb-4">
                            <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2 text-sm text-neutral-300">
                                    <User className="w-3.5 h-3.5 text-neutral-500" />
                                    {o.customerName || 'Guest'}
                                 </div>
                                 <div className="text-sm font-bold text-white bg-neutral-800 px-2 py-0.5 rounded border border-neutral-700">
                                    {o.roomNumber ? `Room ${o.roomNumber}` : `Table ${o.tableNumber}`}
                                 </div>
                            </div>
                            {o.customerPhone && (
                                <div className="flex items-center gap-2 text-xs text-neutral-500 ml-0.5">
                                    <Phone className="w-3 h-3" /> {o.customerPhone}
                                </div>
                            )}
                        </div>

                        {/* Items */}
                        <div className="space-y-2 mb-4">
                            {o.items.map((it, i) => (
                                <div key={i} className="flex justify-between items-center text-xs bg-black/40 p-2 rounded-lg border border-neutral-800/50">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-neutral-400">{it.quantity}x</span>
                                        <span className="text-neutral-200">{it.item?.name || it.item}</span>
                                        {it.size && <span className="text-[10px] bg-neutral-800 px-1 rounded text-neutral-400">{it.size}</span>}
                                    </div>
                                    <span className="text-neutral-500 font-mono">₹{Number(it.price * it.quantity).toFixed(0)}</span>
                                </div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-3 border-t border-neutral-800">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-neutral-500 uppercase font-bold">Total Amount</span>
                                <span className={`text-lg font-bold ${['cancelled','rejected'].includes(o.status) ? 'text-neutral-500 line-through decoration-red-500/50' : 'text-white'}`}>
                                    ₹{o.total}
                                </span>
                            </div>
                        </div>

                    </motion.div>
                ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* --- CONFIRM DELETE MODAL --- */}
      <AnimatePresence>
      {showConfirm && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
          >
            <div className="w-12 h-12 rounded-full bg-red-900/30 flex items-center justify-center mb-4 text-red-500">
                <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Delete {selected.size} Orders?</h3>
            <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                This action is <strong>permanent</strong>. These records will be removed from the database forever. <br/>
                <span className="text-green-500 block mt-2">💡 Tip: Export your data before deleting.</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowConfirm(false)} className="flex-1 py-3 bg-neutral-800 text-white rounded-xl font-medium hover:bg-neutral-700 transition-colors">
                Cancel
              </button>
              <button onClick={doBulkDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-900/20 transition-colors">
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}

// Build a basic printable HTML string for the invoice
export function buildInvoiceHTML(order, restaurant, isSession = false) {
  if (!isSession && ['cancelled','rejected'].includes(order.status)) {
    return `<!doctype html><html><head><meta charset="utf-8" /><title>No Invoice</title><meta name="viewport" content="width=device-width,initial-scale=1" /><style>body{font-family:Arial, sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;} .wrap{max-width:340px; padding:20px; border:1px solid #e5e7eb; border-radius:12px; background:#fff; box-shadow:0 8px 24px rgba(0,0,0,0.08);} h1{font-size:1.1rem; margin:0 0 8px;} p{margin:4px 0; font-size:.85rem; color:#374151;} .status{font-weight:700; text-transform:capitalize;} .note{margin-top:10px; font-size:.75rem; color:#6b7280;} button{margin-top:14px; padding:6px 10px; border-radius:6px; border:1px solid #d1d5db; background:#f9fafb; cursor:pointer;} @media print{button{display:none}}</style></head><body><div class="wrap"><h1>No Invoice Generated</h1><p>Order <strong>${escapeHtml(order.orderId || order._id)}</strong></p><p class="status">Status: ${escapeHtml(order.status)}</p><p>This order was ${escapeHtml(order.status)} and does not incur any charges.</p><div class="note">Cancelled or rejected orders are excluded from billing and analytics.</div><button onclick="window.close()">Close</button></div></body></html>`;
  }
  const currency = (n) => `₹${Number(n || 0).toFixed(2)}`;
  const created = new Date(order.createdAt).toLocaleString();
  const items = order.items || [];
  let baseSubtotal = 0;
  let grandTotal = 0;

  if (!isSession) {
    for (const it of items) {
      const base = Number(it.price);
      const qty = Number(it.quantity || 0);
      if (isFinite(base)) {
        baseSubtotal += base * qty;
        grandTotal += base * qty;
      }
    }
  } else {
    grandTotal = Number(order.total);
    baseSubtotal = grandTotal;
  }

  // Render as compact, ATM-style monospace receipt using preformatted lines
  const LINE = (s = "") => escapeHtml(s);
  const pad = (v, w) => {
    const str = String(v ?? "");
    return str.length > w ? str.slice(0, w) : str.padEnd(w, " ");
  };
  const padLeft = (v, w) => {
    const str = String(v ?? "");
    return str.length > w ? str.slice(0, w) : str.padStart(w, " ");
  };

  // Column widths for monospace alignment
  const NAME_W = 18; // item name
  const SIZE_W = 6;  // size/variant
  const QTY_W = 3;   // qty
  const PRICE_W = 7; // price
  const TOTAL_W = 8; // line total
  const SEP = "-".repeat(NAME_W + SIZE_W + QTY_W + PRICE_W + TOTAL_W + 6); // 6 for spaces and separators

  const itemLineRenderer = (it) => {
    const name = pad((it.item?.name || it.item || ""), NAME_W);
    const size = pad(it.size || "", SIZE_W);
    const qty = padLeft(Number(it.quantity || 0), QTY_W);
    const hasPrice = isFinite(Number(it.price));
    const priceStr = hasPrice ? `${currency(Number(it.price))}` : "—";
    const totalStr = hasPrice ? currency(Number(it.price) * Number(it.quantity || 0)) : "—";
    const price = padLeft(priceStr, PRICE_W);
    const total = padLeft(totalStr, TOTAL_W);
    return `${name} ${size} ${qty} ${price} ${total}`;
  };

  let itemLines;
  if (isSession) {
    const groupedItems = items.reduce((acc, item) => {
      const orderId = item.orderId;
      if (!acc[orderId]) acc[orderId] = [];
      acc[orderId].push(item);
      return acc;
    }, {});
    itemLines = Object.keys(groupedItems).sort().map(orderId => {
      const orderItemsText = groupedItems[orderId].map(itemLineRenderer).join('\n');
      return `${LINE(`Order: ${orderId}`)}\n${orderItemsText}`;
    }).join('\n');
  } else {
    itemLines = items.map(itemLineRenderer).join("\n");
  }

  const headerName = (restaurant?.name || "INVOICE").toUpperCase();
  const branch = restaurant?.branch ? `\n${restaurant.branch}` : "";
  const addr = restaurant?.address ? `\n${restaurant.address}` : "";
  const pin = restaurant?.pincode ? `\n${restaurant.pincode}` : "";
  const phone = restaurant?.phone ? `\n${restaurant.phone}` : "";

  // Build UPI payment QR using restaurant's UPI ID
  const upiId = restaurant?.upiId || "";
  const payee = restaurant?.name || "Merchant";
  const note = `Order${isSession ? 's' : ''} ${order.orderId || order._id}`;
  const amountParam = isFinite(Number(grandTotal)) ? `&am=${Number(grandTotal).toFixed(2)}` : "";
  const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}${amountParam}&cu=INR&tn=${encodeURIComponent(note)}`;
  const qrImg = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(upiUrl)}`;
  const showUpiQr = !!upiId;

  const restaurantDetails = [restaurant?.branch, restaurant?.address, restaurant?.pincode, restaurant?.phone].filter(x => x).join(", ");
  const customerName = order.customerName || "—";
  const customerPhone = order.customerPhone || "—";

  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>${isSession ? 'Session Invoice' : `Invoice ${escapeHtml(order.orderId || order._id)}`}</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <style>
        @page { size: 80mm auto; margin: 2mm 0; }
        body { 
          font-family: 'Courier New', monospace; 
          color:#000; 
          margin: 0;
          padding: 4px 6px;
          background: white;
          font-size: 10px;
          line-height: 1.12;
        }
        .wrap { max-width: 80mm; width: 100%; padding-top: 2px; }
        .center { text-align: center; }
        .label { color:#555; font-size: 10px; }
        pre { white-space: pre-wrap; word-wrap: break-word; margin: 2px 0; line-height: 1.12; font-size: 10px; }
        .hr { margin: 4px 0; border:0; border-top:1px dashed #000; }
        button {
          width: 100%;
          margin-top: 10px;
          padding: 8px;
          border-radius: 4px;
          border: 1px solid #8B0000;
          background: #8B0000;
          color: white;
          font-weight: 600;
          cursor: pointer;
          font-size: 12px;
        }
        button:hover { background: #a01010; }
        @media print { 
          button { display:none; }
          body { padding: 4px; }
        }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="center" style="font-weight:700; font-size:14px; margin-bottom:4px;">${escapeHtml((restaurant?.name || "INVOICE").toUpperCase())}</div>
        ${restaurantDetails ? `<div class="center label" style="margin-bottom:6px;">${escapeHtml(restaurantDetails)}</div>` : ''}
        <hr class="hr" />
        <div class="center" style="font-weight:700; font-size:12px; margin:6px 0;">${isSession ? 'SESSION INVOICE' : 'CUSTOMER INVOICE'}</div>
        <pre>${LINE(`Order${isSession ? 's' : ''} : ${order.orderId || order._id}`)}
${LINE(`Date  : ${created}`)}
${LINE(`${order.roomNumber ? 'Room' : 'Table'} : #${order.roomNumber || order.tableNumber}`)}
${LINE(`Name  : ${customerName}`)}
${LINE(`Phone : ${customerPhone}`)}
${LINE(`Status: ${order.status || "—"}`)}
        </pre>
        <hr class="hr" />
        <pre>
${LINE(pad("ITEM", NAME_W) + " " + pad("SIZE", SIZE_W) + " " + padLeft("QTY", QTY_W) + " " + padLeft("PRICE", PRICE_W) + " " + padLeft("TOTAL", TOTAL_W))}
${LINE(SEP)}
${itemLines}
${LINE(SEP)}
${LINE(pad("SUBTOTAL", NAME_W + SIZE_W + QTY_W + PRICE_W + 3) + padLeft(currency(baseSubtotal), TOTAL_W))}
${LINE(pad("TOTAL", NAME_W + SIZE_W + QTY_W + PRICE_W + 3) + padLeft(currency(grandTotal), TOTAL_W))}
        </pre>
        ${showUpiQr 
          ? `<div class="center" style="margin-top:8px">
              <div class="label" style="font-weight:600; margin-bottom:4px;">Scan to pay (UPI)</div>
              <img src="${qrImg}" alt="UPI QR" width="150" height="150" />
              <div class="label" style="margin-top:4px;">${escapeHtml(upiId)}</div>
            </div>`
          : '<div class="center label" style="margin-top:8px; color:#999;">UPI payment not configured</div>'}
        <div class="center label" style="margin-top:8px; font-size:10px;">Thank you for your order!</div>
        <button onclick="window.print()">PRINT INVOICE</button>
      </div>
    </body>
  </html>`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}