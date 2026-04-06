import { memo, useState, useEffect } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { usePublicMenu } from "../../context/PublicMenuContext";
import MenuMyOrders from "./MenuMyOrders";
import api from "../../api/axios";

const MenuHeader = ({ restaurantInfo, isMobile, tableNumber, isRoom = false }) => {
  const navigate = useNavigate();
  const {
    isVegOnly,
    setIsVegOnly,
    isVegConfirmOpen,
    setIsVegConfirmOpen,
    isVegOffModalOpen,
    setIsVegOffModalOpen,
    activeTab,
    setActiveTab,
    cart,
    isSuggestOpen,
    setIsSuggestOpen,
    showRecent,
    setShowRecent,
    rid,
  } = usePublicMenu();

  const cartCount = Object.values(cart).reduce((sum, item) => sum + (item.qty || 0), 0);

  // Colors from reference design
  const darkBg = "#1a1f2e"; // Dark navy (used as black)
  const primary = darkBg; // Now black
  const green = darkBg; // Now black

  // Handle veg mode toggle
  const handleVegToggle = () => {
    if (!isVegOnly) {
      // Turning ON
      setIsVegOnly(true);
      setIsVegConfirmOpen(true);
    } else {
      // Turning OFF
      setIsVegOnly(false);
      setIsVegOffModalOpen(true);
    }
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

  return (
    <>
      {/* MenuMyOrders Component */}
      {showRecent && (
        <MenuMyOrders
          rid={rid}
          tableNumber={tableNumber}
          isRoom={isRoom}
        />
      )}
      {/* ============ VEG MODE CONFIRMATION MODAL ============ */}
      {isVegConfirmOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsVegConfirmOpen(false)}
          />
          <div className="relative bg-white w-full max-w-[340px] rounded-[24px] p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                <Check className="w-6 h-6 text-white stroke-[3]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Vegetarian Mode Enabled
            </h2>
            <p className="text-gray-500 text-xs leading-relaxed mb-8 px-2">
              The menu has been filtered to display only vegetarian items. You
              can disable this at any time using the toggle in the header.
            </p>
            <button
              onClick={() => setIsVegConfirmOpen(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-lg shadow-lg transition-all active:scale-[0.98]"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}

      {/* ============ VEG MODE DISABLED MODAL ============ */}
      {isVegOffModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-6">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsVegOffModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-[340px] rounded-[24px] p-8 shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-200">
                <Check className="w-6 h-6 text-white stroke-[3]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">
              Vegetarian Mode Disabled
            </h2>
            <p className="text-gray-500 text-xs leading-relaxed mb-8 px-2">
              The full menu is now visible. Non-vegetarian items and meat
              preparations are back on the list.
            </p>
            <button
              onClick={() => setIsVegOffModalOpen(false)}
              className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-wider py-4 rounded-lg shadow-lg transition-all active:scale-[0.98]"
            >
              Acknowledged
            </button>
          </div>
        </div>
      )}

      {/* Main Header */}
      <header
        className="sticky top-0 z-40 bg-white shadow-sm"
        style={{
          backgroundColor: "#fff",
          borderBottom: "1px solid rgba(0,0,0,0.06)",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        {/* Header Top Row */}
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Restaurant Info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm border text-lg"
                style={{
                  backgroundColor: "#e0e0e0", // Light grey
                  borderColor: "#d1d5db", // Light grey border
                }}
              >
                {restaurantInfo.image ? (
                  <img
                    src={getImageUrl(restaurantInfo.image)}
                    alt={`${restaurantInfo.name} logo`}
                    className="w-full h-full rounded-xl object-cover"
                  />
                ) : (
                  "🍽️" // Fallback icon
                )}
              </div>
              <div className="flex flex-col justify-center">
                <h1
                  className="text-base font-bold leading-none"
                  style={{ color: "#000" }}
                >
                  {restaurantInfo.name || "Menu"}
                </h1>
                {restaurantInfo.branch && (
                  <p className="text-[11px] text-gray-500 italic mt-0.5 leading-tight">
                    {restaurantInfo.branch}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Table Info & Veg Toggle */}
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end gap-0.5">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide"
                style={{
                  backgroundColor: "#e0e0e0", // Light grey
                  color: "#333", // Dark grey text
                }}
              >
                {isRoom ? "Room" : "Table"}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: "#000" }}
              >
                {tableNumber}
              </span>
            </div>
            <div className="h-8 w-px bg-gray-200"></div>

            {/* Vegetarian Toggle */}
            <div className="flex flex-col items-center gap-2">
              <div
                className="w-4 h-4 border-2 flex items-center justify-center rounded-[2px] transition-colors duration-300"
                style={{
                  borderColor: isVegOnly ? darkBg : "#d1d5db",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full transition-colors duration-300"
                  style={{
                    backgroundColor: isVegOnly ? darkBg : "#e0e0e0",
                  }}
                />
              </div>
              <button
                onClick={handleVegToggle}
                className="w-4 h-8 rounded-full flex justify-center items-end p-0.5 transition-colors duration-300"
                style={{
                  backgroundColor: isVegOnly ? darkBg : "#e0e0e0",
                  boxShadow: !isVegOnly ? "inset 0 2px 4px rgba(0,0,0,0.1)" : "none",
                }}
              >
                <div
                  className="w-3 h-3 bg-white rounded-full shadow-sm transition-transform duration-300"
                  style={{
                    transform: isVegOnly ? "translateY(-1rem)" : "translateY(0)",
                  }}
                />
              </button>
            </div>
          </div>
        </div>

        
      </header>
    </>
  );
};

export default memo(MenuHeader);
