import { useState, useEffect, useMemo } from "react";
import api from "../api/axios";
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, X, Plus, Minus, Pen,ChefHat, Trash2, Hash } from 'lucide-react';

export default function EditOrderModal({ order, onClose, onUpdate }) {
  const [items, setItems] = useState(Array.isArray(order.items) ? [...order.items] : []); // Current order items
  const [menuItems, setMenuItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // When editing a grouped order, allow selecting which order to edit
  const [selectedOrderId, setSelectedOrderId] = useState(order._id);
  
  // ADD: Table/Room number state
  const [tableNumber, setTableNumber] = useState(order.tableNumber || "");
  const [roomNumber, setRoomNumber] = useState(order.roomNumber || "");

  // Reset selected order and items when modal opens with a new `order` prop
  useEffect(() => {
    const initSelected = (order.isGroup && Array.isArray(order.orders) && order.orders.length)
      ? (order._id || order.orders[0]._id)
      : order._id;
    setSelectedOrderId(initSelected);

    const initialOrder = (order.isGroup && Array.isArray(order.orders))
      ? order.orders.find(o => o._id === initSelected) || order
      : order;

    setItems(Array.isArray(initialOrder?.items) ? [...initialOrder.items] : (Array.isArray(order.items) ? [...order.items] : []));
    // ADD: Set table and room numbers
    setTableNumber(initialOrder.tableNumber || order.tableNumber || "");
    setRoomNumber(initialOrder.roomNumber || order.roomNumber || "");
  }, [order]);

  // When the selected order changes, load its items into the editor
  useEffect(() => {
    if (!selectedOrderId) return;
    const sel = (order.isGroup && Array.isArray(order.orders)) ? order.orders.find(o => o._id === selectedOrderId) : null;
    if (sel) {
      setItems(Array.isArray(sel.items) ? [...sel.items] : []);
      // ADD: Update table and room numbers for selected order
      setTableNumber(sel.tableNumber || "");
      setRoomNumber(sel.roomNumber || "");
    } else {
      setItems(Array.isArray(order.items) ? [...order.items] : []);
      setTableNumber(order.tableNumber || "");
      setRoomNumber(order.roomNumber || "");
    }
  }, [selectedOrderId, order]);

  const selectedOrder = useMemo(() => {
    if (order.isGroup && Array.isArray(order.orders)) return order.orders.find(o => o._id === selectedOrderId) || null;
    return order;
  }, [order, selectedOrderId]);
  
  // View: 'items' | 'menu' | 'custom'
  const [view, setView] = useState("items");
  
  // Filters for menu view
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ category: "all", type: "all", spice: "all", priceMin: "", priceMax: "" });
  const [sort, setSort] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);
  
  // Custom item form
  const [customItem, setCustomItem] = useState({ name: "", price: "", quantity: 1 });

  // --- Helpers ---
  const getImageUrl = (img) => {
    if (!img) return null;
    if (/^https?:\/\//i.test(img) || /^data:/i.test(img)) return img;
    try {
      const base = api?.defaults?.baseURL || "";
      const host = base.replace(/\/api\/?$/i, '').replace(/\/+$/,'');
      const p = img.startsWith('/') ? img : `/${img}`;
      return host ? `${host}${p}` : img;
    } catch (_) {
      return img;
    }
  };

  //------------------FETCH MENU ITEMS------------------//

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get(`/menu`);
        setMenuItems(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError("Failed to load menu items");
      }
    };
    fetchMenu();
  }, []);

  const getPrices = (item) => {
    const vals = Object.values(item.sizes || {})
      .map((v) => (v === null || v === undefined || v === "" ? NaN : Number(v)))
      .filter((n) => Number.isFinite(n));
    return vals;
  };

  const categories = useMemo(() => {
    const set = new Set();
    (menuItems || []).forEach((it) => {
      if (it.category) set.add(it.category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menuItems]);

  // Filtering and sorting logic
  const searchedItems = (query?.trim()?.length
    ? menuItems.filter((item) => {
        const q = query.trim().toLowerCase();
        const inName = (item.name || "").toLowerCase().includes(q);
        const inCategory = (item.category || "").toLowerCase().includes(q);
        return inName || inCategory;
      })
    : menuItems);

  const filteredItems = searchedItems.filter((item) => {
    if (filters.category !== "all") {
      const cat = (item.category || "").toString();
      if (cat !== filters.category) return false;
    }
    if (filters.type !== "all") {
      const t = (item.type || "none").toLowerCase();
      if (t !== filters.type) return false;
    }
    if (filters.spice !== "all") {
      const s = Number(item.spiceLevel ?? 0);
      if (s !== Number(filters.spice)) return false;
    }
    const prices = getPrices(item);
    const hasPriceFilter = filters.priceMin !== "" || filters.priceMax !== "";
    if (hasPriceFilter) {
      if (prices.length === 0) return false;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      if (filters.priceMin !== "" && maxPrice < Number(filters.priceMin)) return false;
      if (filters.priceMax !== "" && minPrice > Number(filters.priceMax)) return false;
    }
    return true;
  });

  const finalMenuItems = useMemo(() => {
    const arr = [...filteredItems];
    const priceKey = (it) => {
      const p = getPrices(it);
      return p.length ? Math.min(...p) : 0;
    };
    if (sort === "name-asc") arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sort === "name-desc") arr.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    else if (sort === "category-asc") arr.sort((a, b) => (a.category || "").localeCompare(b.category || ""));
    else if (sort === "price-asc") arr.sort((a, b) => priceKey(a) - priceKey(b));
    else if (sort === "price-desc") arr.sort((a, b) => priceKey(b) - priceKey(a));
    return arr;
  }, [filteredItems, sort]);

  const addFromMenu = (menuItem, size) => {
    if (menuItem.available === false) return; 
    const sizes = menuItem.sizes || {};
    const price = sizes[size] || 0;
    
    setItems([...items, {
      item: menuItem._id,
      itemName: menuItem.name,
      size,
      quantity: 1,
      price
    }]);
    setView("items");
  };

  const addCustomItem = () => {
    if (!customItem.name.trim() || !customItem.price || Number(customItem.price) <= 0) {
      alert("Please enter valid item name and price");
      return;
    }
    
    setItems([...items, {
      item: null, 
      itemName: customItem.name.trim(),
      size: "Custom",
      quantity: Number(customItem.quantity) || 1,
      price: Number(customItem.price)
    }]);
    
    setCustomItem({ name: "", price: "", quantity: 1 });
    setView("items");
  };

  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, delta) => {
    setItems(items.map((item, i) => {
      if (i === index) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSave = async () => {
    if (items.length === 0) {
      alert("Order must have at least one item");
      return;
    }

    // ADD: Validate table number
    if (!tableNumber && !roomNumber) {
      setError("Please enter a table or room number");
      return;
    }
    if (tableNumber && Number(tableNumber) < 1) {
      setError("Please enter a valid table number");
      return;
    }
    if (roomNumber && Number(roomNumber) < 1) {
      setError("Please enter a valid room number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const orderItems = items.map(item => ({
        item: item.item || "000000000000000000000000",
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        itemName: item.itemName 
      }));

      const updatePayload = {
        items: orderItems,
        total: calculateTotal(),
        tableNumber: tableNumber ? Number(tableNumber) : undefined,
        roomNumber: roomNumber ? Number(roomNumber) : undefined
      };

      // If editing a grouped order, update all orders in the group with the new table/room number
      if (order.isGroup && Array.isArray(order.ids) && order.ids.length > 0) {
        // Update all orders in the group
        const promises = order.ids.map(id => api.put(`/orders/${id}`, updatePayload));
        const results = await Promise.all(promises);
        
        // Return the first updated order to the parent component
        if (onUpdate) onUpdate(results[0].data);
      } else {
        // Single order update
        const res = await api.put(`/orders/${selectedOrderId || order._id}`, updatePayload);
        if (onUpdate) onUpdate(res.data);
      }

      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to update order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-4xl h-[96vh] md:h-[92vh] rounded-[1.25rem] shadow-2xl flex flex-col overflow-hidden font-sans relative">
        
        {/* --- HEADER --- */}
        <div className="px-6 py-4 border-b border-neutral-100 flex justify-between items-center bg-white z-10 shrink-0">
          <div>
            <h2 className="text-xl font-bold text-neutral-900">{order.isGroup ? 'Edit Group Order' : 'Edit Order'}</h2>
            <p className="text-xs text-neutral-500 font-mono">#{(selectedOrder && selectedOrder.orderId) ? selectedOrder.orderId : order.orderId}</p>

            {/* ADD: Table/Room Number Input - Show only active one */}
            <div className="flex items-center gap-2 mt-2">
              <Pen/>
              {!order.roomNumber && (
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 block mb-1">Table Number</label>
                  <input
                    type="number"
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="Enter table number"
                    min="1"
                    className="w-full px-2 py-1 text-sm font-mono font-bold bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              )}
              {order.roomNumber && (
                <div className="flex-1">
                  <label className="text-xs text-neutral-500 block mb-1">Room Number</label>
                  <input
                    type="number"
                    value={roomNumber}
                    onChange={(e) => setRoomNumber(e.target.value)}
                    placeholder="Enter room number"
                    min="1"
                    className="w-full px-2 py-1 text-sm font-mono font-bold bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                </div>
              )}
            </div>

            {/* Per-order selector for grouped orders */}
            {order.isGroup && Array.isArray(order.orders) && order.orders.length > 0 && (
              <div className="flex gap-2 mt-2">
                {order.orders.map(o => (
                  <button
                    key={o._id}
                    onClick={() => setSelectedOrderId(o._id)}
                    className={`px-3 py-1 text-xs rounded-lg border ${selectedOrderId === o._id ? 'bg-neutral-900 text-white border-neutral-900' : 'bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50'}`}>
                    #{(o.orderId || '').slice(-6)}
                  </button>
                ))}
              </div>
            )}

            {order.isGroup && <p className="text-xs text-neutral-400 mt-1">Changes will be applied to the <strong className="font-medium">selected</strong> order.</p>}
          </div>
          <button onClick={onClose} className="p-2 bg-neutral-100 rounded-full hover:bg-neutral-200 transition-colors">
            <X size={20} className="text-neutral-600" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
            {error}
          </div>
        )}

        {/* --- TABS (Updated Styling) --- */}
        <div className="flex gap-2 p-2 mx-6 mt-4 bg-neutral-100/50 rounded-xl shrink-0 absolute z-20 right-[5%] top-1 w-1/2">
          <button
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              view === "items" 
                ? "bg-white text-neutral-900 shadow-sm" 
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            onClick={() => setView("items")}
          >
            Current ({items.length})
          </button>
          <button
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              view === "menu" 
                ? "bg-white text-neutral-900 shadow-sm" 
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            onClick={() => setView("menu")}
          >
            + Menu
          </button>
          <button
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              view === "custom" 
                ? "bg-white text-neutral-900 shadow-sm" 
                : "bg-red-600 text-white hover:bg-red-700"
            }`}
            onClick={() => setView("custom")}
          >
            + Custom
          </button>
        </div>

        {/* --- CONTENT AREA --- */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            
            {/* VIEW: CURRENT ITEMS */}
            {view === "items" && (
              <motion.div
                key="items"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
                  {items.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-neutral-400">
                        <ChefHat size={48} className="mb-2 opacity-20"/>
                        <p>No items in order.</p>
                    </div>
                  ) : (
                    items.map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white border border-neutral-100 rounded-2xl shadow-sm">
                        <div className="flex-1">
                          <div className="font-bold text-neutral-900">{item.item?.name || item.itemName}</div>
                          <div className="text-xs text-neutral-500 uppercase tracking-wide mt-0.5">
                            {item.size} <span className="mx-1">·</span> ₹{item.price}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center bg-neutral-50 rounded-lg p-1 border border-neutral-200">
                                <button onClick={() => updateQuantity(index, -1)} className="w-7 h-7 flex items-center justify-center bg-white rounded-md shadow-sm text-neutral-600 hover:text-red-600 font-bold">-</button>
                                <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                <button onClick={() => updateQuantity(index, 1)} className="w-7 h-7 flex items-center justify-center bg-neutral-900 rounded-md shadow-sm text-white hover:bg-neutral-800 font-bold">+</button>
                            </div>
                            <button onClick={() => removeItem(index)} className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all">
                                <Trash2 size={18} />
                            </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-6 bg-neutral-50 border-t border-neutral-200 shrink-0">
                    <div className="flex justify-between items-center text-lg font-bold text-neutral-900">
                        <span>Total Payable</span>
                        <span>₹{calculateTotal().toFixed(2)}</span>
                    </div>
                </div>
              </motion.div>
            )}

            {/* VIEW: ADD FROM MENU */}
            {view === "menu" && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <div className="p-4 bg-white border-b border-neutral-100 space-y-3 z-10">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 w-4 h-4" />
                        <input 
                            type="text" 
                            value={query} 
                            onChange={e=>setQuery(e.target.value)}
                            placeholder="Search menu..."
                            className="w-full bg-neutral-100 rounded-xl py-3 pl-10 pr-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20"
                        />
                        <button 
                            onClick={()=>setShowFilters(!showFilters)}
                            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg ${showFilters ? 'bg-neutral-900 text-white' : 'text-neutral-400 hover:bg-neutral-200'}`}
                        >
                            <Filter size={16} />
                        </button>
                    </div>

                    {/* Category Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button
                            onClick={() => setFilters(f => ({ ...f, category: "all" }))}
                            className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                filters.category === "all"
                                    ? "bg-neutral-900 text-white border-neutral-900"
                                    : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300"
                            }`}
                        >
                            All
                        </button>
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilters(f => ({ ...f, category: cat }))}
                                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all border ${
                                    filters.category === cat
                                        ? "bg-neutral-900 text-white border-neutral-900"
                                        : "bg-white text-neutral-500 border-neutral-200 hover:border-neutral-300"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-neutral-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {finalMenuItems.map(menuItem => {
                            const isExpanded = expandedItem === menuItem._id;
                            const isVeg = (menuItem.type || 'none').toLowerCase() === 'veg';
                            const isNonVeg = (menuItem.type || 'none').toLowerCase() === 'non-veg';

                            return (
                                <div 
                                    key={menuItem._id} 
                                    className={`bg-white border border-neutral-200 cursor-pointer rounded-2xl overflow-hidden transition-all ${isExpanded ? 'ring-2 ring-red-500/20 shadow-md' : ''}`}
                                    onClick={() => setExpandedItem(isExpanded ? null : menuItem._id)}
                                >
                                    {/* Image Area */}
                                    <div className="relative h-20 md:h-28 bg-neutral-100">
                                        {menuItem.available === false && (
                                            <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center">
                                                <span className="text-[10px] font-bold text-white bg-red-600 px-2 py-1 rounded">SOLD OUT</span>
                                            </div>
                                        )}
                                        {menuItem.image ? (
                                            <img src={getImageUrl(menuItem.image)} alt={menuItem.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-2xl opacity-20">🍽️</div>
                                        )}
                                        <div className="absolute top-2 left-2">
                                            {(isVeg || isNonVeg) && (
                                                <div className={`w-4 h-4 border flex items-center justify-center rounded-sm bg-white ${isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                                    <div className={`w-2 h-2 rounded-full ${isVeg ? 'bg-green-600' : 'bg-red-600'}`}></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-3">
                                        <h4 className="font-bold text-sm text-neutral-900 leading-tight mb-2 line-clamp-1">{menuItem.name}</h4>
                                        
                                        {!isExpanded ? (
                                            <div className="flex flex-wrap gap-1">
                                                {Object.entries(menuItem.sizes || {}).slice(0,2).map(([size, price]) => (
                                                    <span key={size} className="text-[10px] px-2 py-1 bg-neutral-100 rounded text-neutral-600 font-medium">
                                                        {size}: ₹{price}
                                                    </span>
                                                ))}
                                                {Object.keys(menuItem.sizes || {}).length > 2 && <span className="text-[10px] text-neutral-400">+more</span>}
                                            </div>
                                        ) : (
                                            <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {menuItem.available !== false && Object.entries(menuItem.sizes || {}).map(([size, price]) => (
                                                    <button
                                                        key={size}
                                                        onClick={(e) => { e.stopPropagation(); addFromMenu(menuItem, size); }}
                                                        className="w-full flex justify-between items-center px-3 py-1.5 bg-neutral-900 text-white rounded-lg text-xs font-bold hover:bg-red-600 transition-colors"
                                                    >
                                                        <span>{size}</span>
                                                        <span>₹{price} <span className="ml-1 opacity-70 font-normal">+</span></span>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
              </motion.div>
            )}

            {/* VIEW: ADD CUSTOM */}
            {view === "custom" && (
              <motion.div
                key="custom"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="h-full flex flex-col p-6"
              >
                <div className="flex-1 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">Item Name</label>
                        <input
                            type="text"
                            value={customItem.name}
                            onChange={(e) => setCustomItem({ ...customItem, name: e.target.value })}
                            placeholder="e.g. Special Salad"
                            className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">Price (₹)</label>
                            <input
                                type="number"
                                value={customItem.price}
                                onChange={(e) => setCustomItem({ ...customItem, price: e.target.value })}
                                placeholder="0.00"
                                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wide mb-1">Quantity</label>
                            <input
                                type="number"
                                value={customItem.quantity}
                                onChange={(e) => setCustomItem({ ...customItem, quantity: e.target.value })}
                                className="w-full p-4 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-900 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all"
                                min="1"
                            />
                        </div>
                    </div>
                </div>
                <button 
                    onClick={addCustomItem}
                    className="w-full py-4 bg-neutral-900 text-white rounded-xl font-bold text-sm uppercase tracking-wider hover:bg-red-600 transition-colors shadow-lg shadow-neutral-200"
                >
                    Add Item
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* --- FOOTER --- */}
        <div className="p-4 border-t border-neutral-100 flex gap-3 shrink-0 bg-white">
          <button 
            onClick={onClose} 
            className="flex-1 py-3.5 rounded-xl bg-neutral-100 text-neutral-900 font-bold text-sm hover:bg-neutral-200 transition-all"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            onClick={handleSave} 
            className="flex-1 py-3.5 rounded-xl bg-red-600 text-white font-bold text-sm shadow-lg shadow-red-200 hover:bg-red-700 transition-all disabled:opacity-50 disabled:shadow-none"
            disabled={loading || items.length === 0}
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </div>

      </div>
      
      {/* Styles for scrollbars */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e5e5e5; border-radius: 4px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
