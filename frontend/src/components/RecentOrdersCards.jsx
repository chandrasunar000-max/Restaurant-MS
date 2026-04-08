import { useEffect, useState, useMemo } from "react";
import api from "../api/axios";
import { getSocket, joinRestaurant } from "../api/socket";
import EditOrderModal from "./EditOrderModal";
import { Printer, Check, X, Edit, CreditCard, Banknote, Filter, ChefHat, Users, Clock } from "lucide-react";
import { buildInvoiceHTMLClient, buildKitchenHTMLClient, printHtml } from "../utils/printTemplates";
import QRCode from 'qrcode';

// Helper function to detect if device is mobile/tablet
const isMobileDevice = () => {
  const userAgent = navigator.userAgent || navigator.vendor || window.opera;
  // Check for Android, iOS, and other mobile indicators
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent.toLowerCase());
};

export default function RecentOrdersCards() {
  const NON_PENDING_LIMIT = 30;
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurant, setRestaurant] = useState(null);

  // Tabs & Filters
  const [activeTab, setActiveTab] = useState("pending"); // all | pending | accepted | rejected
  const [selectedTable, setSelectedTable] = useState("all");

  // Actions
  const [editingOrder, setEditingOrder] = useState(null);
  const [paymentModal, setPaymentModal] = useState({ open: false, group: null, showDiscount: false });
  const [manualSelected, setManualSelected] = useState(() => new Set());

  const totalAmount = Number(paymentModal.group?.total || 0);
  // compute subtotal from group items when available
  const subtotalAmount = (() => {
    const items = paymentModal.group?.items || [];
    if (items && items.length) {
      return items.reduce((s, it) => s + ((Number(it.price || 0) * Number(it.quantity || 1)) || 0), 0);
    }
    return Number(paymentModal.group?.subTotal || 0) || totalAmount;
  })();

  const currency = (n) => {
    const num = Number(n || 0);
    return `₹${Number.isInteger(num) ? num : num.toFixed(2)}`;
  };
  const finalAmount = subtotalAmount;



  // --- 1. Data Loading & Socket ---
  useEffect(() => {
    const load = async () => {
      try {
        const me = await api.get("/restaurants/me");
        const rid = me.data?._id || "";
        setRestaurantId(rid);
        setRestaurant(me.data || null);
        const res = await api.get("/orders?view=dashboard");
        setOrders(Array.isArray(res.data.orders) ? res.data.orders : []);
      } catch (e) {
        setError(e?.response?.data?.message || e.message || "Failed to load recent orders");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;
    joinRestaurant(restaurantId);
    const s = getSocket();
    const onConnect = () => joinRestaurant(restaurantId);
    const onNew = (order) => {
      setOrders((prev) => {
        const exists = prev.some((o) => o._id === order._id);
        return exists ? prev : [order, ...prev];
      });
    };
    const onUpdate = (order) => {
      setOrders((prev) => prev.map((o) => (o._id === order._id ? order : o)));
    };
    s.on("connect", onConnect);
    s.on("order:new", onNew);
    s.on("order:update", onUpdate);
    return () => {
      s.off("connect", onConnect);
      s.off("order:new", onNew);
      s.off("order:update", onUpdate);
    };
  }, [restaurantId]);

  // --- 2. Action Handlers ---
  const updateStatus = async (id, status) => {
    try {
      const res = await api.put(`/orders/${id}/status`, { status });
      setOrders((prev) => prev.map((o) => (o._id === id ? res.data : o)));
    } catch (err) {
      alert(err?.response?.data?.message || err.message || "Failed to update status");
    }
  };

  const handleMarkPaid = async (repId, method, options = {}) => {
    const { doPrint = false } = options;

    try {
      const res = await api.put(`/orders/${repId}/mark-paid`, {
        paidMethod: method,
      });

      const updated = Array.isArray(res.data?.updated)
        ? res.data.updated
        : (res.data?.updated || []);

      if (updated.length) {
        const map = new Map(updated.map(u => [u._id, u]));
        setOrders(prev =>
          prev.map(p => map.has(p._id) ? map.get(p._id) : p)
        );

        if (doPrint) {
          // If multiple orders were updated (group payment), open combined invoice PDF
          if (updated.length > 1) {
            try {
              await handleOpenCombinedPdf(updated.map(u => u._id), 'invoice');
            } catch (e) {
              const repOrder = updated.find(u => u._id === repId) || updated[0];
              if (repOrder) handleOpenPdf(repOrder, 'invoice');
            }
          } else {
            const repOrder = updated.find(u => u._id === repId) || updated[0];
            if (repOrder) await handleOpenPdf(repOrder, 'invoice');
          }
        }
      }
    } catch (err) {
      console.error("Mark paid failed", err);
      alert("Failed to mark paid");
    } finally {
      setPaymentModal({ open: false, group: null, showDiscount: false });
    }
  };


  const bulkUpdateStatus = async (ids, status) => {
    if (!ids.length) return;
    const failures = [];
    setOrders(prev => prev.map(o => ids.includes(o._id) ? { ...o, status } : o));
    for (const id of ids) {
      try { await api.put(`/orders/${id}/status`, { status }); } catch (e) { failures.push(id); }
    }
    if (failures.length) {
      const restored = await Promise.all(failures.map(fid => api.get(`/orders/${fid}`)));
      const map = new Map(restored.map(r => [r.data._id, r.data]));
      setOrders(prev => prev.map(o => map.has(o._id) ? map.get(o._id) : o));
      alert(`Failed to update ${failures.length} order(s). Restored.`);
    }
  };

  // --- 3. Printing Logic ---
  // NOTE: Old in-browser `printHtml` logic removed. Printing now uses server-generated PDFs via `/orders/:id/pdf` or `/orders/pdf/combined`.


  const handlePrint = async (order, print = false) => {
    try {
      if (order.status === 'pending') {
        await updateStatus(order._id, 'accepted');
      }
      if (print) {
        // Use server-generated kitchen PDF to avoid in-browser print refresh issues
        await handleOpenPdf(order, 'kitchen');
      }
    } catch (e) {
      console.error("Print failed", e);
      alert("Failed to print. Please try again.");
    }
  }; 

  // Print invoice/kitchen HTML client-side (avoids server PDF render and download)
  const handleOpenPdf = async (order, type) => {
    try {
      const rest = restaurant || {};
      const isMobile = isMobileDevice();

      // Try to generate QR inline (data URL) to avoid slow remote QR server; fall back if generation fails.
      let qrDataUrl = '';
      if (rest?.esewaId) {
        try {
          qrDataUrl = await QRCode.toDataURL(rest.esewaId, { width: 300, margin: 0 });
        } catch (e) {
          qrDataUrl = '';
        }
      }

      const html = type === 'kitchen'
        ? buildKitchenHTMLClient(order, rest)
        : buildInvoiceHTMLClient(order, rest, false, qrDataUrl);

      if (isMobile) {
        // On mobile: open in new tab and show print dialog - user manually closes after printing
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 100);
      } else {
        // On desktop: show print dialog directly without opening new page
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 100);
        // Close window after print dialog opens so no persistent new page is visible
        setTimeout(() => printWindow.close(), 500);
      }
    } catch (e) {
      console.error('Open print failed', e);
      alert('Failed to print. Please check your popup blocker or printer settings.');
    }
  };

  // Generate combined invoice/kitchen HTML client-side and print
  const handleOpenCombinedPdf = async (ids, type) => {
    try {
      if (!Array.isArray(ids) || ids.length === 0) throw new Error('No order ids');
      const selectedOrders = orders.filter(o => ids.includes(o._id));
      if (!selectedOrders.length) throw new Error('Orders not available locally');

      const isMobile = isMobileDevice();

      const sorted = [...selectedOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const first = sorted[0];
      const allItems = selectedOrders.flatMap(o => (o.items || []).map(it => ({ ...it, orderId: o.orderId })));

      const combinedOrder = {
        ...first,
        items: allItems,
        total: selectedOrders.reduce((s, o) => s + Number(o.total || 0), 0),
        orderId: selectedOrders.map(o => o.orderId || o._id).sort().join(', '),
        createdAt: first.createdAt,
        orders: selectedOrders,
        ids: selectedOrders.map(o => o._id)
      };

      const rest = restaurant || {};
      // Generate QR inline for combined invoice if possible to avoid remote QR delay
      let qrDataUrl = '';
      if (rest?.esewaId) {
        try {
          qrDataUrl = await QRCode.toDataURL(rest.esewaId, { width: 300, margin: 0 });
        } catch (e) { qrDataUrl = ''; }
      }
      const html = type === 'kitchen' ? buildKitchenHTMLClient(combinedOrder, rest) : buildInvoiceHTMLClient(combinedOrder, rest, true, qrDataUrl);
      
      if (isMobile) {
        // On mobile: open in new tab and show print dialog - user manually closes after printing
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 100);
      } else {
        // On desktop: show print dialog directly without opening new page
        const printWindow = window.open('', '', 'height=600,width=800');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => printWindow.print(), 100);
        // Close window after print dialog opens so no persistent new page is visible
        setTimeout(() => printWindow.close(), 500);
      }
    } catch (e) {
      console.error('Open combined print failed', e);
      alert('Failed to open combined print.');
    }
  };

  const handlePrintGroupBill = async (group) => {
    try {
      const ordersArr = group.orders || [];
      if (!ordersArr.length) {
        const single = group;
        const id = single._id || single.representativeId || (single.ids && single.ids[0]);
        if (id) {
          const ord = orders.find(o => o._id === id);
          if (ord) {
            await handleOpenPdf(ord, 'invoice');
            return;
          }
          alert('Cannot open invoice: order not available locally');
          return;
        }
        // No order id available — cannot generate invoice
        alert('Cannot open invoice: no order id available');
        return;
      }

      const sorted = [...ordersArr].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      const first = sorted[0];
      const allItems = ordersArr.flatMap(o => (o.items || []).map(it => ({ ...it, orderId: o.orderId })));

      const combinedOrder = {
        ...first,
        items: allItems,
        total: ordersArr.reduce((s, o) => s + Number(o.total || 0), 0),
        orderId: ordersArr.map(o => o.orderId).sort().join(', '),
        createdAt: first.createdAt,
        tableNumber: group.tableNumber,
        isRoom: group.isRoom,
        orders: ordersArr
      };

      // Open server-generated combined PDF (replaces in-browser print)
      try {
        await handleOpenCombinedPdf(ordersArr.map(o => o._id), 'invoice');
      } catch (e) {
        console.error("Group Print failed", e);
        alert("Failed to generate combined PDF. Please try again.");
      }
    } catch (e) {
      console.error("Group Print failed", e);
      alert("Failed to print group bill.");
    }
  };

  const handleManualCombine = async () => {
    if (manualSelected.size < 2) return;
    const selectedOrders = ordersByTab.filter(o => manualSelected.has(o._id));
    const sorted = [...selectedOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const first = sorted[0];
    const allItems = selectedOrders.flatMap(o => (o.items || []).map(it => ({ ...it, orderId: o.orderId })));

    const combinedOrder = {
      ...first,
      items: allItems,
      total: selectedOrders.reduce((s, o) => s + Number(o.total || 0), 0),
      orderId: selectedOrders.map(o => o.orderId).sort().join(', '),
      createdAt: first.createdAt,
      orders: selectedOrders,
      representativeId: first._id,
      ids: selectedOrders.map(o => o._id)
    };

    try {
      // Prefer client-side combined print (falls back to server combined PDF if local data missing)
      try {
        await handleOpenCombinedPdf(combinedOrder.ids || [], 'invoice');
      } catch (err) {
        console.error('Manual combined print failed', err);
        // fallback: try server endpoint
        try {
          const res = await api.post('/orders/pdf/combined', { ids: combinedOrder.ids || [], type: 'invoice' }, { responseType: 'blob' });
          const blob = new Blob([res.data], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (err2) {
          console.error('Fallback combined PDF failed', err2);
          alert('Failed to generate combined invoice. Please try again.');
        }
      }

      setManualSelected(new Set());
    } catch (e) {
      alert('Failed to print combined invoice.');
    }
  };


  // --- 4. Filtering & Memoization ---

  const ordersByTab = useMemo(() => {
    let filtered;
    if (activeTab === "all") filtered = orders.filter(o => o.status === 'paid');
    else if (activeTab === "pending") filtered = orders.filter((o) => o.status === 'pending');
    else if (activeTab === "accepted") filtered = orders.filter((o) => o.status === 'accepted' && o.paid === 'unpaid');
    else filtered = orders.filter((o) => o.status === activeTab);

    const sorted = [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return activeTab === 'all' ? sorted.slice(0, NON_PENDING_LIMIT) : sorted;
  }, [orders, activeTab]);

  const availableTables = useMemo(() => {
    const locations = new Set();
    ordersByTab.forEach(o => {
      const loc = o.roomNumber ? `room-${o.roomNumber}` : `table-${o.tableNumber}`;
      locations.add(loc);
    });
    if (activeTab === 'accepted') {
      const candidates = orders.filter(o => (o.status === 'completed' || o.status === 'accepted') && o.paid === 'unpaid');
      candidates.forEach(c => {
        const loc = c.roomNumber ? `room-${c.roomNumber}` : `table-${c.tableNumber}`;
        locations.add(loc);
      });
    }
    return Array.from(locations).sort((a, b) => {
      const numA = parseInt(a.split('-')[1]);
      const numB = parseInt(b.split('-')[1]);
      if (isNaN(numA) || isNaN(numB)) return String(a).localeCompare(String(b));
      if (a.startsWith('room') && b.startsWith('table')) return 1;
      if (a.startsWith('table') && b.startsWith('room')) return -1;
      return numA - numB;
    });
  }, [ordersByTab, orders, activeTab]);

  const recent = useMemo(() => {
    if (selectedTable === 'all') return ordersByTab;
    return ordersByTab.filter(o => {
      const loc = o.roomNumber ? `room-${o.roomNumber}` : `table-${o.tableNumber}`;
      return loc === selectedTable;
    });
  }, [ordersByTab, selectedTable]);

  const completedUnpaidGroups = useMemo(() => {
    let candidates = orders.filter(o => (o.status === 'completed' || o.status === 'accepted') && o.paid === 'unpaid');
    if (selectedTable !== 'all') {
      candidates = candidates.filter(o => {
        const loc = o.roomNumber ? `room-${o.roomNumber}` : `table-${o.tableNumber}`;
        return loc === selectedTable;
      });
    }

    const map = new Map();
    for (const o of candidates) {
      const key = `${o.roomNumber ? 'room' : 'table'}::${o.roomNumber || o.tableNumber}::${o.customerPhone || ''}::${o.orderSessionId || ''}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(o);
    }
    const groups = [];
    for (const [key, arr] of map.entries()) {
      if (arr.length < 2) continue;
      const mergedMap = new Map();
      for (const o of arr) {
        for (const it of (o.items || [])) {
          const subKey = `${it.item?._id || it.item}::${it.size || ''}`;
          const ex = mergedMap.get(subKey) || { item: it.item, size: it.size, quantity: 0, price: it.price || 0 };
          ex.quantity = (ex.quantity || 0) + (it.quantity || 0);
          mergedMap.set(subKey, ex);
        }
      }
      const mergedItems = Array.from(mergedMap.values());
      // const total = mergedItems.reduce((s, it) => s + ((Number(it.price) || 0) * (Number(it.quantity) || 0)), 0);
      const total = arr.reduce(
        (sum, o) => sum + Number(o.total || 0),
        0
      );




      groups.push({
        key, orders: arr, ids: arr.map(a => a._id),
        representativeId: arr[0]._id, tableNumber: arr[0].tableNumber, roomNumber: arr[0].roomNumber,
        isRoom: !!arr[0].roomNumber,
        customerPhone: arr[0].customerPhone, customerName: arr[0].customerName,
        items: mergedItems, total
      });
    }
    return groups;
  }, [orders, selectedTable]);

  const counts = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const acceptedCandidates = orders.filter(o => (o.status === 'accepted' || o.status === 'completed') && o.paid === 'unpaid');
    const acceptedKeySet = new Set(acceptedCandidates.map(o => `${o.tableNumber}::${o.customerPhone || ''}::${o.orderSessionId || ''}`));
    return { all: orders.length, pending, accepted: acceptedKeySet.size, rejected: orders.filter(o => o.status === 'rejected').length };
  }, [orders]);

  const pendingIds = useMemo(() => orders.filter(o => o.status === 'pending').map(o => o._id), [orders]);

  const toggleManualSelect = (id) => setManualSelected(p => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const toggleGroupSelect = (ids) => setManualSelected(p => { const n = new Set(p); const all = ids.every(id => n.has(id)); ids.forEach(id => all ? n.delete(id) : n.add(id)); return n; });
  const clearManualSelection = () => setManualSelected(new Set());


  if (loading) return (
    <div className="flex flex-col items-center  justify-center h-[50vh] text-zinc-400">
      <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-600 mb-4"></div>
      <p className="font-medium text-zinc-500">Loading orders...</p>
    </div>
  );
  if (error) return <p className="text-red-500 text-center p-8 bg-red-50 rounded-lg mx-4 mt-8">{error}</p>;





  //-------------BODY------------------------------------------------






  return (
    <div className="flex flex-col h-screen bg-zinc-50 text-zinc-900 overflow-hidden relative font-sans">

      {/* --- HEADER --- */}
      <div className="flex flex-col gap-3 pb-2 shrink-0 pt-2 px-2 md:px-4 bg-white border-b border-zinc-200 shadow-sm z-10">
        <h3 className="text-lg font-bold text-center text-zinc-800 flex items-center justify-center gap-2">
          {activeTab === "pending" && <Clock size={18} className="text-yellow-600" />}
          {activeTab === "accepted" && <ChefHat size={18} className="text-green-600" />}
          {activeTab === "pending" ? "Pending Orders" :
            activeTab === "accepted" ? "Unpaid Orders" :
              activeTab === "rejected" ? "Rejected Orders" : "History (Last 24h)"}
        </h3>

        {/* Status Tabs */}
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { id: 'all', label: 'History', count: counts.all, color: 'zinc' },
            { id: 'pending', label: 'Pending', count: counts.pending, color: 'yellow' },
            { id: 'accepted', label: 'Unpaid', count: counts.accepted, color: 'green' },
            { id: 'rejected', label: 'Rejected', count: counts.rejected, color: 'red' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            // Dynamic styling based on color prop
            const colors = {
              zinc: isActive ? 'bg-zinc-800 text-white border-zinc-800' : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
              yellow: isActive ? 'bg-yellow-500 text-white border-yellow-500' : 'bg-white text-yellow-700 border-yellow-200 hover:bg-yellow-50',
              green: isActive ? 'bg-green-600 text-white border-green-600' : 'bg-white text-green-700 border-green-200 hover:bg-green-50',
              red: isActive ? 'bg-red-600 text-white border-red-600' : 'bg-white text-red-700 border-red-200 hover:bg-red-50',
            };

            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setSelectedTable('all'); }}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-all shadow-sm ${colors[tab.color]}`}
              >
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-full font-bold text-[10px] ${isActive ? 'bg-white/20 text-white' : 'bg-zinc-100 text-zinc-600'}`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Pending Bulk Actions */}
        {activeTab === 'pending' && pendingIds.length > 0 && (
          <div className="flex justify-center gap-3 mt-1">
            <button
              onClick={() => bulkUpdateStatus(pendingIds, 'accepted')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <Check size={14} /> Accept All ({pendingIds.length})
            </button>
            <button
              onClick={() => window.confirm("Reject all pending orders?") && bulkUpdateStatus(pendingIds, 'rejected')}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-white hover:bg-red-50 text-red-600 border border-red-200 text-xs font-bold rounded-lg shadow-sm transition-colors"
            >
              <X size={14} /> Reject All
            </button>
          </div>
        )}

        {/* Accepted Bulk Actions */}
        {activeTab === 'accepted' && manualSelected.size > 0 && (
          <div className="flex justify-center items-center gap-3 bg-blue-50 p-2 rounded-lg border border-blue-100 mx-auto w-fit shadow-sm">
            <span className="text-xs font-semibold text-blue-700">{manualSelected.size} selected</span>
            <button
              disabled={manualSelected.size < 2}
              onClick={handleManualCombine}
              className="flex items-center gap-1 px-3 py-1 bg-blue-600 disabled:bg-blue-300 text-white text-xs font-bold rounded shadow-sm hover:bg-blue-700 transition-colors"
            >
              <Printer size={12} /> Combine & Print
            </button>
            <button onClick={clearManualSelection} className="text-xs text-white hover:text-red-600 font-medium">Clear</button>
          </div>
        )}

        {/* --- TABLE PILLS FILTER --- */}
        {availableTables.length > 0 && (
          <div className="w-full pt-2">
            <div className="flex items-center gap-2 overflow-x-auto px-1 pb-2 no-scrollbar">
              <div className="flex items-center text-zinc-400 text-xs font-bold uppercase tracking-wider mr-1 sticky left-0 bg-white z-10 pl-1">
                <Filter size={12} className="mr-1" /> Tables
              </div>

              <button
                onClick={() => setSelectedTable('all')}
                className={`shrink-0 px-3 py-1 rounded-md text-xs font-bold transition-all border
                            ${selectedTable === 'all'
                    ? 'bg-zinc-800 text-white border-zinc-800'
                    : 'bg-white text-zinc-500 border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50'}`}
              >
                ALL
              </button>

              {availableTables.map(t => (
                <button
                  key={t}
                  onClick={() => setSelectedTable(t)}
                  className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-md text-xs font-bold transition-all border
                                ${String(selectedTable) === String(t)
                      ? 'bg-red-600 text-white border-red-600 shadow-sm'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50 hover:border-zinc-300'}`}
                >
                  {t.startsWith('room-') ? `R${t.split('-')[1]}` : `T${t.split('-')[1]}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- ORDER LIST --- */}
      <div className="flex-1 overflow-y-auto pb-20 p-2 md:p-4 bg-zinc-50">

        {recent.length === 0 && completedUnpaidGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-zinc-400">
            <div className="bg-white p-4 rounded-full mb-3 shadow-sm border border-zinc-100">
              <ChefHat size={32} className="opacity-20 text-zinc-900" />
            </div>
            <p className="text-sm font-medium">No orders found for this view.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* 1. Grouped Orders */}
            {activeTab === 'accepted' && completedUnpaidGroups.map((g) => (
              <div key={g.key} className="bg-white border border-yellow-200 rounded-xl p-4 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-50 to-transparent pointer-events-none"></div>

                <div className="flex justify-between items-start border-b border-zinc-100 pb-3 mb-3 relative z-10">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={g.ids.every(id => manualSelected.has(id))}
                      onChange={() => toggleGroupSelect(g.ids)}
                      className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <div>
                      <h4 className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                        {g.isRoom ? 'Room' : 'Table'} {g.isRoom ? g.roomNumber : g.tableNumber}
                        <span className="text-xs font-normal text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded-full border border-zinc-200">{g.ids.length} orders</span>
                      </h4>
                      <div className="text-sm text-zinc-500 mt-0.5 flex items-center gap-1">
                        <Users size={12} />
                        <span className="font-semibold text-zinc-700">{g.customerName || 'Guest'}</span>
                        {g.customerPhone && <span className="text-xs">· {g.customerPhone}</span>}
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold uppercase tracking-wide rounded-md border border-yellow-200">Grouped</span>
                </div>

                <div className="bg-zinc-50 rounded-lg p-2 mb-3 max-h-40 overflow-y-auto border border-zinc-100">
                  {g.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1 border-b border-zinc-200 last:border-0 text-zinc-700">
                      <span><span className="font-bold">{it.quantity}</span> x {it.item?.name || it.item} <span className="text-xs text-zinc-400 ml-1">{it.size}</span></span>
                    </div>
                  ))}
                </div>

                <div className="flex items-end justify-between mt-auto">
                  <div>
                    <p className="text-[10px] text-zinc-400 uppercase tracking-wider font-bold">Total</p>
                    <p className="text-xl font-bold text-zinc-900">₹{g.total}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    <button onClick={() => {
                      // Open combined edit modal: create a merged order object and set editingOrder to it
                      // Use representative order's own items when opening group for edit
                      const representativeOrder = (g.orders || []).find(o => o._id === g.representativeId) || orders.find(o => o._id === (g.representativeId || (g.ids && g.ids[0]))) || null;
                      const repItems = Array.isArray(representativeOrder?.items) && representativeOrder.items.length ? representativeOrder.items : (g.items || []);

                      const combinedOrder = {
                        _id: g.representativeId || g.ids?.[0],
                        orderId: g.orderId || (g.ids || []).join(', '),
                        // initialize with representative order items only to avoid duplicating other orders' items
                        items: repItems.map(it => ({
                          item: it.item?._id || it.item || null,
                          itemName: it.item?.name || it.itemName || it.item || '',
                          size: it.size || '',
                          quantity: Number(it.quantity || 1),
                          price: Number(it.price || 0),
                        })),
                        subTotal: Number(representativeOrder?.subTotal ?? g.total ?? 0),
                        total: Number(representativeOrder?.total ?? g.total ?? 0),
                        isGroup: true,
                        ids: g.ids || [],
                        orders: g.orders || [],
                        tableNumber: g.tableNumber,
                        roomNumber: g.roomNumber
                      };
                      setEditingOrder(combinedOrder);
                    }} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-xs font-semibold shadow-sm">
                      <Edit size={14} /> Edit
                    </button>
                    <button onClick={() => handlePrintGroupBill(g)} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-zinc-200 text-zinc-700 rounded-lg hover:bg-zinc-50 hover:border-zinc-300 transition-colors text-xs font-semibold shadow-sm">
                      <Printer size={14} /> Print
                    </button>

                    <button onClick={() => setPaymentModal({ open: true, group: { ...g, orders: g.orders || [] } })} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-semibold shadow-sm">
                      <CreditCard size={14} /> Pay
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* 2. Individual Orders */}
            {recent.map((o) => {
              if (completedUnpaidGroups.some(g => g.ids.includes(o._id))) return null;

              // Styling based on status
              const statusStyles = {
                pending: "border-yellow-300 bg-yellow-50/30",
                accepted: "border-green-300 bg-green-50/30",
                rejected: "border-red-200 bg-red-50/30",
                paid: "border-zinc-200 bg-white"
              };
              const currentStyle = statusStyles[o.status] || "border-zinc-200 bg-white";

              const badgeColor = {
                pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
                accepted: "bg-green-100 text-green-700 border-green-200",
                rejected: "bg-red-100 text-red-700 border-red-200",
                paid: "bg-zinc-100 text-zinc-600 border-zinc-200"
              }[o.status];

              return (
                <div key={o._id} className={`bg-white border rounded-xl p-4 shadow-sm flex flex-col ${currentStyle} relative transition-all hover:shadow-md`}>
                  <div className="flex justify-between items-start border-b border-zinc-100 pb-2 mb-3">
                    <div className="flex items-center gap-3">
                      {activeTab === 'accepted' && (
                        <input
                          type="checkbox"
                          checked={manualSelected.has(o._id)}
                          onChange={() => toggleManualSelect(o._id)}
                          className="w-5 h-5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      )}
                      <div>
                        <h4 className="text-xl font-bold text-zinc-800">{o.roomNumber ? 'Room' : 'Table'} {o.roomNumber || o.tableNumber}</h4>
                        <p className="text-xs text-zinc-400 font-mono">#{o.orderId.slice(-6)}</p>
                      </div>
                    </div>
                    <span className="grid grid-cols-1 w-1/2">

                      <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border w-fit justify-self-center ${badgeColor}`}>
                        {o.status}
                      </span>
                      <div className="flex justify-between text-xs w-full mt-2"><span>
                        {new Date(o.createdAt).toLocaleDateString('en-GB').replace(/\//g, '-')}
                      </span>
                        <span>
                          {new Date(o.createdAt).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </span>

                  </div>

                  <div className="flex justify-between text-xs text-zinc-500 mb-3">
                    <span className="font-semibold text-zinc-700">{o.customerName || 'Guest'}</span>
                    <span>{o.customerPhone || '—'}</span>
                  </div>

                  <div className="flex-1 space-y-1 mb-4">
                    {(o.items || []).map((it, i) => (
                      <div key={i} className="flex justify-between text-sm text-zinc-700 bg-white/50 px-2 py-1 rounded border border-transparent hover:border-zinc-100">
                        <span><span className="font-semibold">{it.quantity}</span> x {it.item?.name || it.item}</span>
                        {it.size && <span className="text-xs text-zinc-400 self-center">{it.size}</span>}
                      </div>
                    ))}
                    {o.tipForChef && (
                      <div className="mt-2 text-xs italic text-zinc-600 bg-yellow-50 p-2 rounded border border-yellow-100 flex items-start gap-1">
                        <span className="font-bold text-yellow-600 not-italic">Note:</span> {o.tipForChef}
                      </div>
                    )}
                  </div>

                  <div className="mt-auto border-t border-zinc-100 pt-3 flex items-end justify-between">
                    <div>
                      <p className="text-[10px] text-zinc-400 font-bold uppercase">Total</p>
                      <p className="text-lg font-bold text-zinc-900">{currency(o.total || o.subTotal)}</p>
                    </div>

                    <div className="flex gap-2">
                      {o.status === 'pending' && (
                        <div className="grid grid-cols-2 gap-1">
                          <button onClick={() => updateStatus(o._id, 'rejected')} className="px-3 py-1.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-xs font-bold transition-colors shadow-sm">Reject</button>
                          <button onClick={() => setEditingOrder(o)} className="px-3 py-1.5 bg-white border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-xs font-bold transition-colors shadow-sm">Edit</button>
                          <button onClick={() => handlePrint(o, true)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                            <Printer size={12} /> Accept
                          </button>
                          <button onClick={() => handlePrint(o)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold shadow-sm transition-colors flex items-center gap-1">
                            Accept
                          </button>
                        </div>
                      )}
                      {o.status === 'accepted' && (
                        <div className="grid grid-cols-2 gap-1">
                          <button onClick={() => setEditingOrder(o)} className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 text-xs font-bold shadow-sm">Edit</button>
                          <button onClick={() => handlePrintGroupBill({ items: o.items, customerName: o.customerName, tableNumber: o.tableNumber, roomNumber: o.roomNumber, ids: [o._id], orders: [o], total: o.total })} className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 text-xs font-bold shadow-sm flex items-center gap-1">
                            <Printer size={12} /> Bill
                          </button>
                          <button onClick={() => setPaymentModal({ open: true, group: { representativeId: o._id, ids: [o._id], items: o.items, total: o.total, isRoom: !!o.roomNumber, roomNumber: o.roomNumber, tableNumber: o.tableNumber } })} className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs font-bold shadow-sm flex items-center gap-1">
                            <CreditCard size={12} /> Pay
                          </button>
                        </div>
                      )}
                      {o.status === 'paid' && (
                        <div className="flex items-center gap-2">
                          <button onClick={() => { try { handleOpenPdf(o); } catch (e) { alert('Print error'); } }} className="px-3 py-1.5 bg-white border border-zinc-200 text-zinc-600 rounded-lg hover:bg-zinc-50 text-xs font-bold shadow-sm flex items-center gap-1">
                            <span className="flex items-center gap-1"><Printer size={14} /> Reprint</span>
                          </button>

                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {editingOrder && (
        <EditOrderModal
          order={editingOrder}
          onClose={() => setEditingOrder(null)}
          onUpdate={(updatedOrder) => {
            setOrders(prev => prev.map(o => o._id === updatedOrder._id ? updatedOrder : o));
            setEditingOrder(null);
          }}
        />
      )}

      {paymentModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-zinc-100">

            <h3 className="text-xl font-bold text-zinc-800 mb-2">
              {paymentModal.showDiscount ? "Apply Discount" : "Confirm Payment"}
            </h3>

            <p className="text-zinc-500 mb-2">{paymentModal.group?.isRoom ? 'Room' : 'Table'} {paymentModal.group?.isRoom ? (paymentModal.group?.roomNumber || '?') : (paymentModal.group?.tableNumber || '?')}</p>

            <div className="mb-4">
              <div className="flex justify-between text-sm"><span>Subtotal</span><span className="font-bold">{currency(subtotalAmount)}</span></div>
              <div className="flex justify-between text-sm mt-1"><span className="text-zinc-900 font-bold">Total</span><span className="text-zinc-900 font-bold">{currency(finalAmount)}</span></div>
            </div>

            {/* ================= PAYMENT MODE ================= */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() =>
                  handleMarkPaid(
                    paymentModal.group.representativeId || paymentModal.group.ids?.[0],
                    "cash"
                  )
                }
                className="flex flex-col items-center justify-center gap-2 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl"
              >
                CASH
              </button>

              <button
                onClick={() =>
                  handleMarkPaid(
                    paymentModal.group.representativeId || paymentModal.group.ids?.[0],
                    "online"
                  )
                }
                className="flex flex-col items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl"
              >
                ONLINE
              </button>
            </div>

            <button
              onClick={() => {
                setPaymentModal({ open: false, group: null, showDiscount: false });
              }}
              className="w-full mt-4 py-2 text-sm text-zinc-500 hover:text-red-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
