import React, { createContext, useState, useContext, useMemo } from 'react';

// Create the context
const PublicMenuContext = createContext();

// Create the provider component
export const PublicMenuProvider = ({ children, rid, tableNumber, isRoom }) => {
  // ============ MENU & RESTAURANT DATA ============
  const [items, setItems] = useState([]);
  const [restaurantInfo, setRestaurantInfo] = useState({ name: "", branch: "" });

  // ============ UI STATE ============
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  // ============ NAVIGATION ============
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("All");

  // ============ VEGETARIAN MODE ============
  const [isVegOnly, setIsVegOnly] = useState(false);
  const [isVegConfirmOpen, setIsVegConfirmOpen] = useState(false);
  const [isVegOffModalOpen, setIsVegOffModalOpen] = useState(false);

  // ============ CART & ORDER ============
  const [cart, setCart] = useState({});
  const [lastOrder, setLastOrder] = useState(null);
  const [tipForChef, setTipForChef] = useState("");
  const [showOrderConfirm, setShowOrderConfirm] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);

  // ============ RECENT ORDERS ============
  const [showRecent, setShowRecent] = useState(false);
  const [recentOrders, setRecentOrders] = useState([]);
  const [sessionId, setSessionId] = useState("");
  const [hideMyOrdersBadge, setHideMyOrdersBadge] = useState(false);

  // ============ SEARCH & FILTERING ============
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters] = useState({
    category: "all",
    type: "all",
    spice: "all",
    priceMin: "",
    priceMax: ""
  });
  const [sort, setSort] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  // ============ GUEST INFO ============
  const [guestInfo, setGuestInfo] = useState({ name: "", phone: "" });
  const [showGuestModal, setShowGuestModal] = useState(false);

  // ============ MODALS & DIALOGS ============
  const [isSuggestOpen, setIsSuggestOpen] = useState(false);

  // ============ UI ELEMENTS & MODALS ============
  const [lightBoxItem, setLightBoxItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [expandedItem, setExpandedItem] = useState(null);
  const [clientLocation, setClientLocation] = useState(null);

  const displayedItems = useMemo(() => {
    if (isVegOnly) {
      return items.filter(item => item.type !== 'non-veg');
    }
    return items;
  }, [isVegOnly, items]);

  // Create the value object
  const value = {
    // Menu & Restaurant Data
    items: displayedItems,
    setItems,
    restaurantInfo,
    setRestaurantInfo,
    

    // UI State
    loading,
    setLoading,
    error,
    setError,
    isMobile,
    setIsMobile,

    // Navigation
    isNavOpen,
    setIsNavOpen,
    activeTab,
    setActiveTab,

    // Vegetarian Mode
    isVegOnly,
    setIsVegOnly,
    isVegConfirmOpen,
    setIsVegConfirmOpen,
    isVegOffModalOpen,
    setIsVegOffModalOpen,

    // Cart & Order
    cart,
    setCart,
    lastOrder,
    setLastOrder,
    tipForChef,
    setTipForChef,
    showOrderConfirm,
    setShowOrderConfirm,
    orderLoading,
    setOrderLoading,

    // Recent Orders
    showRecent,
    setShowRecent,
    recentOrders,
    setRecentOrders,
    sessionId,
    setSessionId,
    hideMyOrdersBadge,
    setHideMyOrdersBadge,

    // Search & Filtering
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
    showSearch,
    setShowSearch,

    // Guest Info
    guestInfo,
    setGuestInfo,
    showGuestModal,
    setShowGuestModal,

    // Modals & Dialogs
    isSuggestOpen,
    setIsSuggestOpen,

    // UI Elements & Modals
    lightBoxItem,
    setLightBoxItem,
    selectedItem,
    setSelectedItem,
    expandedItem,
    setExpandedItem,
    clientLocation,
    setClientLocation,

    // Route params
    rid,
    tableNumber,
    isRoom,
  };

  return (
    <PublicMenuContext.Provider value={value}>
      {children}
    </PublicMenuContext.Provider>
  );
};

// Custom hook to use the context
export const usePublicMenu = () => {
  const context = useContext(PublicMenuContext);
  if (!context) {
    throw new Error('usePublicMenu must be used within a PublicMenuProvider');
  }
  return context;
};

export default PublicMenuContext;
