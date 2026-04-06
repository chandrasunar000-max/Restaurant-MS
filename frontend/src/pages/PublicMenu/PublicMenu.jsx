import React, { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import api from "../../api/axios";
import { getSocket, joinTable } from "../../api/socket";
import LightBox from "../../components/lightBox";
import { PublicMenuProvider, usePublicMenu } from "../../context/PublicMenuContext";
import "../../assets/css/PublicMenu.css";
import "../../assets/css/lightBox.css";
import MenuHeader from "./MenuHeader";
import MenuFiltering from "./MenuFiltering";
import MenuFooter from "./MenuFooter";
import MenuCategory from "./MenuCategory";
import MenuOrderConfirmation from "./MenuOrderConfirmation";
import MenuCart from "./MenuCart";
import MenuItemPreview from "./MenuItemPreview";
import MenuMyOrders from "./MenuMyOrders";
import MenuCardSkeleton from "../../components/MenuCardSkeleton";
import MenuOrderStatusModal from "./MenuOrderStatusModal";
import BillModal from "../../components/BillModal"; // Import the new BillModal

// Main PublicMenu component - wrapper with context
function PublicMenu() {
  const params = useParams();
  const rid = params.rid;
  const table = params.table ? Number(params.table) : null;
  const room = params.room ? Number(params.room) : null;
  const isRoom = !!room;
  const number = isRoom ? room : table;

  return (
    <PublicMenuProvider rid={rid} tableNumber={number} isRoom={isRoom}>
      <PublicMenuContent />
    </PublicMenuProvider>
  );
}

// Content component that uses the context
function PublicMenuContent() {

  // Get all state from context
  const {
    items,
    setItems,
    restaurantInfo,
    setRestaurantInfo,
    error,
    setError,
    loading,
    setLoading,
    cart,
    setCart,
    lastOrder,
    setLastOrder,
    tipForChef,
    setTipForChef,
    showRecent,
    setShowRecent,
    recentOrders,
    setRecentOrders,
    sessionId,
    setSessionId,
    hideMyOrdersBadge,
    setHideMyOrdersBadge,
    isMobile,
    setIsMobile,
    lightBoxItem,
    setLightBoxItem,
    showOrderConfirm,
    setShowOrderConfirm,
    orderLoading,
    setOrderLoading,
    query,
    setQuery,
    debouncedQuery,
    setDebouncedQuery,
    filters,
    setFilters,
    sort,
    setSort,
    showFilters,
    setShowFilters,
    // showPhoneSignup, // Removed
    // setShowPhoneSignup, // Removed
    showSearch,
    setShowSearch,
    clientLocation,
    setClientLocation,
    expandedItem,
    setExpandedItem,
    selectedItem,
    setSelectedItem,
    guestInfo,
    setGuestInfo,
    showGuestModal,
    setShowGuestModal,
    rid,
    tableNumber: number,
    isRoom,
  } = usePublicMenu();

  const [orderStatusModal, setOrderStatusModal] = useState({
    show: false,
    message: '',
    isError: false,
    orderId: null, // To display the order ID
  });

  const [localFirstName, setLocalFirstName] = useState('');
  const [localPhoneNumber, setLocalPhoneNumber] = useState('');
  const [showBillModal, setShowBillModal] = useState(false); // New state for Bill Modal

  const queryDebounceTimer = useRef(null);

  // Cart visibility state
  const [showCart, setShowCart] = useState(true);

  // New function for handling Bill button click
  const handleBillClick = useCallback(() => {
    setShowBillModal(true);
  }, []);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const [menuRes, infoRes] = await Promise.all([
          api.get(`/public/menu/${rid}`),
          api.get(`/public/restaurant/${rid}`)
        ]);
        const fetchedItems = menuRes.data || [];
        setItems(fetchedItems);

        setRestaurantInfo(infoRes.data || {});
        // Try to capture geolocation for geofence (non-blocking)
        if (navigator?.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const { latitude, longitude, accuracy } = pos.coords || {};
              setClientLocation({ lat: latitude, lng: longitude, accuracy });
            },
            () => { /* ignore denial */ },
            { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 }
          );
        }
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load menu");
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, [rid]);

  // Debounce search query - only update debouncedQuery after 1 second of inactivity
  useEffect(() => {
    if (queryDebounceTimer.current) {
      clearTimeout(queryDebounceTimer.current);
    }
    
    queryDebounceTimer.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, 1000);

    return () => {
      if (queryDebounceTimer.current) {
        clearTimeout(queryDebounceTimer.current);
      }
    };
  }, [query]);

  // Socket join table room and receive invoice updates
  useEffect(() => {
    // create or reuse a stable session id per restaurant/table with 2-hour expiration
    try {
      const sessKey = `obqr:sess:${rid}:${number}`;
      const timestampKey = `obqr:sess:time:${rid}:${number}`;
      const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

      let sid = localStorage.getItem(sessKey);
      const timestamp = localStorage.getItem(timestampKey);

      // Check if session exists and is not expired
      if (sid && timestamp) {
        const sessionAge = Date.now() - parseInt(timestamp, 10);
        if (sessionAge > TWO_HOURS) {
          // Session expired, clear it
          localStorage.removeItem(sessKey);
          localStorage.removeItem(timestampKey);
          sid = null;
        }
      }

      // Create new session if needed
      if (!sid) {
        if (typeof crypto !== "undefined" && crypto.randomUUID) sid = crypto.randomUUID();
        else sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem(sessKey, sid);
        localStorage.setItem(timestampKey, Date.now().toString());
      }

      setSessionId(sid);
    } catch (_) { }
  }, [rid, number]);

  useEffect(() => {
    if (!rid || !number) return;
    joinTable(rid, number, isRoom);
    const s = getSocket();
    const onInvoice = (payload) => {
      // Only updates for this session
      if (payload?.orderSessionId && sessionId && payload.orderSessionId !== sessionId) return;
      // payload includes orderId, status, total, items, message
      setLastOrder((cur) => ({
        ...(cur || {}),
        orderId: payload.orderId, // Use orderId instead of _id
        status: payload.status,
        total: payload.total,
        message: payload.message,
        items: payload.items,
        tipForChef: payload.tipForChef,
      }));
      // Re-show badge on new acceptance
      if (payload.status === "accepted") {
        setHideMyOrdersBadge(false);
      }
      // Update recent list as well
      setRecentOrders((prev) => {
        const idx = prev.findIndex((o) => o.orderId === payload.orderId); // Match by orderId
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...copy[idx], status: payload.status };
          return copy;
        }
        const next = [
          { orderId: payload.orderId, status: payload.status, total: payload.total, createdAt: payload.createdAt || new Date().toISOString(), tipForChef: payload.tipForChef },
          ...prev,
        ];
        return next.slice(0, 10);
      });
    };
    s.on("order:invoice", onInvoice);
    return () => {
      s.off("order:invoice", onInvoice);
    };
  }, [rid, number, sessionId]);

  // Track mobile viewport
  useEffect(() => {
    const update = () => setIsMobile((typeof window !== "undefined") && (window.innerWidth <= 640));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Show guest modal on initial load if guest info is missing
  useEffect(() => {
    const savedGuest = localStorage.getItem(`obqr:guest:${rid}`);
    if (savedGuest) {
      try {
        const parsed = JSON.parse(savedGuest);
        if (parsed.name && parsed.phone) {
          setGuestInfo(parsed);
          return;
        }
      } catch (_) {}
    }
    if (!guestInfo.name || !guestInfo.phone) {
      setShowGuestModal(true);
    }
  }, [rid, guestInfo.name, guestInfo.phone, setGuestInfo, setShowGuestModal]);

  // Load recent orders when opened
  useEffect(() => {
    if (!showRecent) return;
    const loadRecent = async () => {
      try {
        const res = await api.get(isRoom ? `/public/orders/${rid}/room/${number}` : `/public/orders/${rid}/${number}`, { params: { sessionId } });
        setRecentOrders(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.error("Failed to load recent orders", e);
      }
    };
    loadRecent();
  }, [showRecent, rid, number, sessionId]);

  // Also fetch recent orders on mount/when session changes to ensure badge reflects accepted orders on mobile
  useEffect(() => {
    const loadInitialRecent = async () => {
      try {
        const res = await api.get(isRoom ? `/public/orders/${rid}/room/${number}` : `/public/orders/${rid}/${number}`, { params: { sessionId } });
        setRecentOrders(Array.isArray(res.data) ? res.data : []);
      } catch (_) {
        // ignore silently for badge
      }
    };
    if (rid && number && sessionId) {
      loadInitialRecent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rid, number, sessionId]);

  const addToCart = (item, sizeKey) => {
    if (item.available === false) return; // Disable for unavailable items
    const key = `${item._id}:${sizeKey || ""}`;
    setCart((c) => {
      const current = c[key]?.qty || 0;
      
      // Get the base price from the item's size
      const basePrice = item.sizes && item.sizes[sizeKey] ? Number(item.sizes[sizeKey]) : 0;

      return { 
        ...c, 
        [key]: { 
          itemId: item._id, 
          size: sizeKey, 
          qty: current + 1, 
          name: item.name,
          price: basePrice
        } 
      };
    });
  };

  const updateQty = (key, qty) => {
    setCart((c) => {
      const n = Math.max(0, Number(qty) || 0);
      if (n === 0) {
        const copy = { ...c };
        delete copy[key];
        return copy;
      }
      return { ...c, [key]: { ...c[key], qty: n } };
    });
  };

  const removeFromCart = (key) => {
    setCart((c) => {
      const copy = { ...c };
      delete copy[key];
      return copy;
    });
  };

  const cartList = useMemo(() => Object.entries(cart), [cart]);

  // Utilities (mirrors MenuList)
  const getPrices = (item) => {
    const vals = Object.values(item.sizes || {})
      .map((v) => (v === null || v === undefined || v === "" ? NaN : Number(v)))
      .filter((n) => Number.isFinite(n));
    return vals;
  };

  // Resolve image URL: if image starts with http(s) or data URI return as-is; otherwise prepend the backend host
  const getImageUrl = (img) => {
    if (!img) return null;
    // If it's already an absolute URL (e.g. cloudinary, s3, http...) or data URI, return as is
    if (/^https?:\/\//i.test(img) || /^data:/i.test(img)) return img;
    try {
      // Use the axios API base URL and strip the trailing '/api' segment if present
      const base = api?.defaults?.baseURL || "";
      const host = base.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
      if (host) {
        const p = img.startsWith('/') ? img : `/${img}`;
        return `${host}${p}`;
      }
      // Fallback to current origin
      if (typeof window !== 'undefined' && window.location && window.location.origin) {
        const origin = window.location.origin.replace(/\/+$/, '');
        const p = img.startsWith('/') ? img : `/${img}`;
        return `${origin}${p}`;
      }
      return img;
    } catch (_) {
      return img;
    }
  };

  const categories = useMemo(() => {
    const set = new Set();
    (items || []).forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  // Derived items based on search, filters, and sort
  const searchedItems = (debouncedQuery?.trim()?.length
    ? items.filter((item) => {
      const q = debouncedQuery.trim().toLowerCase();
      const inName = (item.name || "").toLowerCase().includes(q);
      const inCategory = (item.category || "").toLowerCase().includes(q);
      // price search: if the query has digits, match any size price containing those digits
      const qDigits = q.replace(/[^0-9.]/g, "");
      let inPrice = false;
      if (qDigits.length > 0) {
        const prices = Object.values(item.sizes || {});
        inPrice = prices.some((p) =>
          p !== undefined && p !== null && p !== "" && p.toString().toLowerCase().includes(qDigits)
        );
      }
      return inName || inCategory || inPrice;
    })
    : items);

  const filteredItems = searchedItems.filter((item) => {
    // Category
    if (filters.category !== "all") {
      const cat = (item.category || "").toString();
      if (cat !== filters.category) return false;
    }

    // Type (veg/non-veg)
    if (filters.type !== "all") {
      const t = (item.type || "veg").toLowerCase();
      if (t !== filters.type) return false;
    }

    // Spice level (0/1/2/3)
    if (filters.spice !== "all") {
      const s = Number(item.spiceLevel ?? 0);
      if (s !== Number(filters.spice)) return false;
    }

    // Price range: include item if ANY price is within range; items without prices are excluded when range is set
    const prices = getPrices(item);
    const hasPriceFilter = filters.priceMin !== "" || filters.priceMax !== "";
    if (hasPriceFilter) {
      if (prices.length === 0) return false; // exclude items without prices when filtering by price
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (filters.priceMin !== "" && maxPrice < Number(filters.priceMin)) return false;
      if (filters.priceMax !== "" && minPrice > Number(filters.priceMax)) return false;
    }
    return true;
  });

  const finalItems = useMemo(() => {
    const arr = [...filteredItems];
    const priceKey = (it) => {
      const p = getPrices(it);
      if (p.length === 0) return undefined;
      return Math.min(...p);
    };
    switch (sort) {
      case "name-asc":
        arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name-desc":
        arr.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "category-asc":
        arr.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        break;
      case "price-asc":
        arr.sort((a, b) => {
          const pa = priceKey(a);
          const pb = priceKey(b);
          if (pa === undefined && pb === undefined) return 0;
          if (pa === undefined) return 1; // items without price go last
          if (pb === undefined) return -1;
          return pa - pb;
        });
        break;
      case "price-desc":
        arr.sort((a, b) => {
          const pa = priceKey(a);
          const pb = priceKey(b);
          if (pa === undefined && pb === undefined) return 0;
          if (pa === undefined) return 1;
          if (pb === undefined) return -1;
          return pb - pa;
        });
        break;
      case "relevance":
        // keep original order
        break;

      default:
        // keep original order
        break;
    }
    return arr;
  }, [filteredItems, sort]);

  // Actual order placement logic
  const doPlaceOrder = async () => {
    setOrderLoading(true);
    try {
      const res = await api.post(`/orders`, {
        restaurantId: rid,
        ...(isRoom ? { roomNumber: number } : { tableNumber: number }),
        items: cartList.map(([key, v]) => ({
          item: v.itemId,
          size: v.size,
          quantity: v.qty,
          price: v.price || 0,
        })),
        customerName: guestInfo.name || 'Guest',
        customerPhone: guestInfo.phone || '',
        tipForChef: (tipForChef || "").slice(0, 200),
        orderSessionId: sessionId,
        clientLocation,
        
      });
      const order = res.data;
      setLastOrder(order); // Ensure orderId is reflected in lastOrder
      setCart({});
      setTipForChef("");
      setShowOrderConfirm(false);
      setOrderStatusModal({ show: true, message: `Order placed successfully! Order ID: ${order.orderId}`, isError: false, orderId: order.orderId });
    } catch (err) {
      console.error("Place order error:", err);
      setOrderStatusModal({ show: true, message: err?.response?.data?.message || "Failed to place order. Please try again.", isError: true, orderId: null });
    } finally {
      setOrderLoading(false);
    }
  };

  // Handler for Place Order button
  const handlePlaceOrderClick = () => {
    if (!cartList.length) {
      setError("Cart is empty");
      return;
    }
    // Require guest name and phone before placing order
    if (!guestInfo.name || !guestInfo.phone) {
      setShowGuestModal(true);
      return;
    }
    setShowOrderConfirm(true);
  };

  // Handle guest info submission
  const handleGuestSubmit = (e) => {
    if (e) e.preventDefault();
    if (!localFirstName || !localPhoneNumber) {
      setError("Please provide both name and phone number");
      return;
    }
    const info = { name: localFirstName, phone: localPhoneNumber };
    setGuestInfo(info);
    localStorage.setItem(`obqr:guest:${rid}`, JSON.stringify(info));
    setShowGuestModal(false);
  };

  return (
    <>
      <style>{`
        @keyframes slide-down-fade {
          0% { opacity: 0; transform: translateY(-10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <main className="menu-page">
        {/* ---------- GUEST INFO MODAL ---------- */}
        {showGuestModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm transition-opacity duration-300">
            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 p-6" style={{ animation: "intro-pop 0.3s ease-out" }}>
              <h2 className="text-xl font-bold text-[#991b1b] mb-4 text-center">Welcome!</h2>
              <p className="text-gray-600 text-sm mb-6 text-center">Please provide your details to see the menu and place orders.</p>
              
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Your Name"
                  value={localFirstName}
                  onChange={(e) => setLocalFirstName(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-[15px] text-black focus:ring-2 focus:ring-red-500 focus:outline-none"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={localPhoneNumber}
                  onChange={(e) => setLocalPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-[15px] text-black focus:ring-2 focus:ring-red-500 focus:outline-none"
                  maxLength={10}
                />
                
                <button
                  type="button"
                  onClick={handleGuestSubmit}
                  className="w-full py-3 bg-[#991b1b] hover:bg-red-800 text-white font-bold rounded-lg transition-colors duration-200 shadow-md"
                >
                  Continue
                </button>
                
              </div>
            </div>
          </div>
        )}

        <MenuHeader 
          restaurantInfo={restaurantInfo} 
          isMobile={isMobile} 
          tableNumber={number} 
          isRoom={isRoom} 
        />

        {error && <div role="alert" className="error">{error}</div>}

        {/* Toolbar: search and filters */}
        <MenuFiltering
          showSearch={showSearch}
          setShowSearch={setShowSearch}
          query={query}
          setQuery={setQuery}
          filters={filters} // Pass filters
          setFilters={setFilters} // Pass setFilters
          sort={sort} // Pass sort
          setSort={setSort} // Pass setSort
          categories={categories} // Pass categories
        />



        <MenuCategory
          categories={categories}
          items={items}
          filters={filters}
          setFilters={setFilters}
        />


        {/* menu container */}

        {loading ? (
          <div className="menu-scrollable-container" style={{ justifyContent: "center", width: "100%" }}>
            <section className="menu-grid" style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: isMobile ? "12px" : "24px",
                  padding: isMobile ? "12px" : "24px",
                  width: "100%",
                  boxSizing: "border-box"
                }}
              >
                {[...Array(12)].map((_, idx) => (
                  <MenuCardSkeleton key={idx} isMobile={isMobile} />
                ))}
              </div>
            </section>
          </div>
        ) : (
          <>
            <div className="menu-scrollable-container" style={{ justifyContent: "center", width: "100%", paddingBottom: "100px" }}>
              <section className="menu-grid" aria-live="polite" style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}>
                <div
                  style={{
                    display: "grid",
                    // Mobile: 2 columns (1fr 1fr), Desktop: Adaptive
                    gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(auto-fill, minmax(240px, 1fr))",
                    gap: isMobile ? "6px" : "14px",
                    padding: isMobile ? "6px" : "14px",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                >
                  {finalItems.map((item, idx) => {
                    // Price Calculation logic
                    const prices = getPrices(item);
                    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
                    const displayPrice = Number(minPrice) || 0;

                    // Theme Constants
                    const darkRed = "#991b1b";
                    const darkGrey = "#1f2937";
                    const lightGrey = "#f3f4f6";

                    return (
                      <article
                        key={item._id}
                        className="card public-card"
                        onClick={() => {
                          if (item.available) { setSelectedItem(item); }
                        }}
                        style={{
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                          background: "#fff",
                          borderRadius: "16px",
                          overflow: "hidden",
                          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                          border: "1px solid rgba(0,0,0,0.05)",
                          cursor: item.available ? "pointer" : "default",
                          transition: "transform 0.2s ease",
                          opacity: item.available === false ? 0.7 : 1
                        }}
                      >
                        {/* 1. IMAGE SECTION */}
                        <div style={{ position: "relative", aspectRatio: "4/3", width: "100%", overflow: "hidden", backgroundColor: lightGrey }}>
                          {item.image ? (
                            <img
                              src={getImageUrl(item.image)}
                              alt={item.name}
                              loading="lazy"
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                filter: item.available === false ? "grayscale(100%)" : "none",
                                transition: "transform 0.3s"
                              }}
                            />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", color: "#ccc" }}>
                              {item.name?.charAt(0) || "🍽"}
                            </div>
                          )}

                          {/* Out of Stock Overlay */}
                          {item.available === false && (
                            <div style={{
                              position: "absolute", inset: 0,
                              background: "rgba(255, 255, 255, 0.6)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              zIndex: 2
                            }}>
                              <span style={{
                                background: darkRed, color: "#fff",
                                padding: "6px 12px", borderRadius: "6px",
                                fontSize: "12px", fontWeight: "700", textTransform: "uppercase",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.2)"
                              }}>
                                Sold Out
                              </span>
                            </div>
                          )}

                          {/* Veg/Non-Veg Badge (Top Right of Image) */}
                          {item.type && item.type.toLowerCase() !== 'none' && (
                            <div className={`absolute top-2 right-2 z-10`}>
                              <div className="flex items-center gap-1.5 bg-gray-900/50 px-2 py-1 rounded shadow text-[10px] font-semibold uppercase">

                                {/* COLOR DOT */}
                                <span
                                  className={`w-2 h-2 rounded-full ${(item.type || "veg").toLowerCase() === "veg"
                                      ? "bg-green-500"
                                      : "bg-red-500"
                                    }`}
                                />

                                {/* TEXT */}
                                {/* <span>{item.type}</span> */}
                              </div>
                            </div>

                          )}

                          {/* Spice Level Badge (Bottom Left of Image) */}
                          {Number(item.spiceLevel) > 0 && (
                            <div className="absolute bottom-0 left-2 z-10 bg-gray-900/50 rounded">
                              <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                                
                                padding: "4px 6px",
                                borderRadius: "6px",
                                boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                              }}>
                                <span style={{ color: "#eab308", fontSize: "8px" }}>
                                  {'🌶️'.repeat(Math.min(3, Math.max(1, Number(item.spiceLevel))))}
                                </span>
                              </div>
                                                        </div>
                                                      )}
                                                    </div>

                        {/* 2. CONTENT SECTION */}
                        <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between" }}>

                          {/* Title Only */}
                          <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                              <h3 style={{
                                margin: 0,
                                fontSize: isMobile ? "14px" : "16px",
                                fontWeight: "700",
                                color: darkGrey,
                                lineHeight: "1.3",
                                // Limit to 2 lines
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden"
                              }}>
                                {item.name}
                              </h3>
                            </div>
                          </div>

                          {/* Price & Action */}
                          <div style={{ marginTop: "5px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span style={{ fontSize: "10px", color: "#9ca3af", fontWeight: "500" }}>
                                {Object.keys(item.sizes || {}).length > 1 ? "Starts from" : "Price"}
                              </span>
                              <span style={{ fontSize: "15px", fontWeight: "800", color: darkRed }}>
                                ₹{displayPrice.toFixed(0)}
                              </span>
                            </div>

                            {/* Visual Add Button */}
                            <div style={{
                              width: "28px", height: "28px",
                              borderRadius: "50%",
                              background: lightGrey,
                              color: darkGrey,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontWeight: "bold", fontSize: "16px"
                            }}>
                              +
                            </div>
                          </div>
                          
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              {selectedItem && (
                <MenuItemPreview
                  item={selectedItem}
                  onClose={() => setSelectedItem(null)}
                  addToCart={addToCart}
                  getImageUrl={getImageUrl}
                  isMobile={isMobile}
                />
              )}
            </div>

            {showCart && (
            <MenuCart
              restaurantInfo={restaurantInfo}
              cartList={cartList}
              items={items}
              isMobile={isMobile}
              tipForChef={tipForChef}
              setTipForChef={setTipForChef}
              removeFromCart={removeFromCart}
              updateQty={updateQty}
              onOrderClick={handlePlaceOrderClick}
              style={{ marginBottom: '20px' }}
            />
            )}

            <MenuOrderConfirmation
              show={showOrderConfirm}
              cartList={cartList}
              items={items}
              restaurantInfo={restaurantInfo}
              tipForChef={tipForChef}
              orderLoading={orderLoading}
              onCancel={() => setShowOrderConfirm(false)}
              onConfirm={doPlaceOrder}
            />
          </>
        )}

        {/* Menu Footer with Call Waiter */}
        <MenuFooter
          activeTab="Menu"
          orderNotificationCount={0}
          cartCount={cartList.length}
          showCart={showCart}
          setShowCart={setShowCart}
          onOrdersClick={() => {
            setShowRecent(true);
          }}
          onBillClick={handleBillClick} // Pass handleBillClick
        />
      </main>
      
      {/* My Orders Modal */}
      {showRecent && (
        <MenuMyOrders
          rid={rid}
          tableNumber={number}
          isRoom={isRoom}
          sessionId={sessionId}
        />
      )}

      {/* Order Status Modal */}
      <MenuOrderStatusModal
        show={orderStatusModal.show}
        message={orderStatusModal.message}
        isError={orderStatusModal.isError}
        orderId={orderStatusModal.orderId}
        onClose={() => setOrderStatusModal({ ...orderStatusModal, show: false })}
      />

      {/* LightBox modal */}
      {lightBoxItem && (
        <LightBox
          item={lightBoxItem}
          onClose={() => setLightBoxItem(null)}
        />
      )}
      {/* Bill Modal */}
      {showBillModal && (
        <BillModal
          show={showBillModal}
          onClose={() => setShowBillModal(false)}
          rid={rid}
          restaurantInfo={restaurantInfo}
          sessionId={sessionId}
          tableNumber={number}
          isRoom={isRoom}
        />
      )}
      {/* Removed inline recent orders modal; navigation now routes to dedicated orders page */}
    </>
  );
}

export default React.memo(PublicMenu);
