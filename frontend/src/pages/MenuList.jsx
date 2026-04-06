import React, { useEffect, useMemo, useState } from "react";
import api from "../api/axios";
import "../assets/css/MenuList.css";


const Icons = {
  Trash: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
  ),
  Save: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
  ),
  X: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
  ),
  Plus: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
  ),
  Upload: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
  ),
  ImageOff: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 15V9a2 2 0 0 0-2-2h-3.59a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 11.26 3H7a2 2 0 0 0-2 2v2"/><circle cx="12" cy="13" r="4"/></svg>
  )
};

// Get backend URL from environment variables
const BACKEND_URL = import.meta.env.BACKEND_URL || "https://orderbyqr-production.up.railway.app/" || "";
const inputBaseClass = "w-full rounded-md border border-gray-300 bg-gray-50 p-2.5 text-sm font-medium text-gray-900 placeholder-gray-400 focus:border-red-600 focus:ring-1 focus:ring-red-600 focus:outline-none transition-all";
const labelClass = "block mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-500";





function MenuList({ restaurantId }) {

  const deleteItemImage = async (item) => {
    try {

      if (item.image) {

        await api.delete(
          `/restaurant/${restaurantId}/menu/upload`,
          {
            data: {
              imageName: item.image.split("/").pop()
            }
          }
        );
      }
    } catch (e) {

    }
  }

  const handleDeleteMenu = async (item) => {
    const confirmed = window.confirm(`Are you sure you want to delete '${item.name}'?`);
    if (!confirmed) return;
    try {

      const imageName = item.image.split("/").pop();
      await api.delete(`/menu/${item._id}`);
      await api.delete(
        `/restaurant/${restaurantId}/menu/upload`,
        {
          data: {
            imageName: imageName
          }
        }
      );

      setMenuItems((prev) => prev.filter((it) => it._id !== item._id));
      setAvailability((s) => {
        const copy = { ...s };
        delete copy[item._id];
        return copy;
      });
    } catch (err) {
      setError("Failed to delete menu item. " + (err?.response?.data?.message || err.message || ""));
    }
  };

  const [menuItems, setMenuItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState({ category: "all", type: "all", spice: "all", availability: "all", priceMin: "", priceMax: "" });
  const [sort, setSort] = useState("relevance");
  // const emptySizes = { regular: "", medium: "", large: "", half: "", full: "" };
  const [newSizeKey, setNewSizeKey] = useState("");
  const [newSizePrice, setNewSizePrice] = useState("");


  const [editForm, setEditForm] = useState({ name: "", description: "", category: "", type: "veg", spiceLevel: 0, serveTime: 15, sizes: {}, image: "", available: true });
  const [customEditSizes, setCustomEditSizes] = useState([]);

  const [editImageFile, setEditImageFile] = useState(null);

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const res = await api.get("/menu");
        const data = res.data || [];
        setMenuItems(data);
        const av = {};
        data.forEach((it) => (av[it._id] = it.available === false ? false : true));
        setAvailability(av);
      } catch (err) {
        console.error("Error fetching menu:", err);
        setError("Failed to load menu items. Please login again.");
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  // --- Helper to resolve Image URL ---
  const getImageUrl = (path) => {
    if (!path) return "https://placehold.co/600x400?text=No+Image";
    // If it's already an absolute URL (e.g. cloudinary, s3, or http...), return as is
    if (path.startsWith("http") || path.startsWith("https") || path.startsWith("data:")) {
      return path;
    }
    // Otherwise prepend the backend URL
    // Handle potential double slashes
    const baseUrl = BACKEND_URL.endsWith("/") ? BACKEND_URL.slice(0, -1) : BACKEND_URL;
    const imgPath = path.startsWith("/") ? path : `/${path}`;
    return `${baseUrl}${imgPath}`;
  };

  // --- Handlers ---
  const toggleCategoryAvailability = async (category) => {
    const itemsInCategory = menuItems.filter((item) => item.category === category);
    if (itemsInCategory.length === 0) return;

    const allAvailable = itemsInCategory.every((item) => {
      const isAvail = availability[item._id] !== undefined ? availability[item._id] : item.available !== false;
      return isAvail;
    });

    const newState = !allAvailable;
    const action = newState ? "available" : "unavailable";
    const confirmed = window.confirm(`Make all items in "${category}" ${action}?`);
    if (!confirmed) return;

    const updates = {};
    itemsInCategory.forEach((item) => { updates[item._id] = newState; });
    setAvailability((s) => ({ ...s, ...updates }));

    try {
      await Promise.all(itemsInCategory.map((item) => api.put(`/menu/${item._id}`, { available: newState })));
      setMenuItems((prev) => prev.map((it) => itemsInCategory.find((ci) => ci._id === it._id) ? { ...it, available: newState } : it));
    } catch (err) {
      console.error("Failed to update category availability:", err);
      const rollback = {};
      itemsInCategory.forEach((item) => { rollback[item._id] = availability[item._id]; });
      setAvailability((s) => ({ ...s, ...rollback }));
      setError("Failed to update category availability.");
    }
  };

  const toggleAvailability = async (id, name) => {
    const currently = availability[id];
    setAvailability((s) => ({ ...s, [id]: !s[id] }));
    try {
      const res = await api.put(`/menu/${id}`, { available: !currently });
      setMenuItems((prev) => prev.map((it) => (it._id === id ? { ...it, available: res.data.available } : it)));
    } catch (err) {
      console.error("Failed to update availability:", err);
      setAvailability((s) => ({ ...s, [id]: currently }));
      setError("Failed to update availability.");
    }
  };

  const startEdit = (item) => {
    setEditingId(item._id);
    setEditImageFile(null);

    setEditForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      type: item.type || "veg",
      spiceLevel: item.spiceLevel ?? 0,
      serveTime: Number(item.serveTime) || 15,
      sizes: { ...(item.sizes || {}) }, // 👈 backend sizes only
      image: item.image || item.imageUrl || "",
      available: item.available !== false
    });
  };



  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({ name: "", description: "", category: "", type: "", sizes: {}, image: "", available: true });
    setCustomEditSizes([]);
    setEditImageFile(null);
  };

  const saveEdit = async (e, id) => {
    e.preventDefault();
    const keys = ["regular", "medium", "large", "half", "full"];
    const sizes = {};
    Object.entries(editForm.sizes || {}).forEach(([key, value]) => {
      const num = Number(value);
      if (key && !Number.isNaN(num) && num > 0) {
        sizes[key] = num;
      }
    });


    customEditSizes.forEach((custom) => {
      const num = Number(custom.price);
      if (custom.key && custom.key.trim() && !Number.isNaN(num) && num > 0) sizes[custom.key.trim()] = num;
    });

    try {
      let finalImageUrl = editForm.image?.trim();

      if (editImageFile) {
        if (!restaurantId) {
          setError("Restaurant ID is missing. Cannot upload image.");
          return;
        }
        const formData = new FormData();
        formData.append("image", editImageFile);

        const uploadRes = await api.post(
          `/restaurants/${restaurantId}/menu/upload`,
          formData,
          { headers: { "Content-Type": "multipart/form-data" } }
        );

        finalImageUrl = uploadRes.data.imageUrl;
      }

      const payload = {
        name: editForm.name,
        description: editForm.description,
        category: editForm.category,
        type: editForm.type,
        spiceLevel: Number(editForm.spiceLevel),
        serveTime: Math.max(1, Number(editForm.serveTime) || 15),
        sizes,
        image: finalImageUrl,
        available: !!editForm.available,
      };

      const res = await api.put(`/menu/${id}`, payload);
      setMenuItems((prev) => prev.map((it) => (it._id === id ? res.data : it)));
      setAvailability((s) => ({ ...s, [id]: res.data.available === false ? false : true }));
      cancelEdit();
    } catch (err) {
      console.error("Failed to save edit:", err);
      setError("Failed to save changes. " + (err?.response?.data?.message || ""));
    }
  };

  const getPrices = (item) => {
    const vals = Object.values(item.sizes || {}).map((v) => Number(v)).filter((n) => Number.isFinite(n));
    return vals;
  };

  const categories = useMemo(() => {
    const set = new Set();
    (menuItems || []).forEach((it) => { if (it.category) set.add(it.category); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [menuItems]);

  const searchedItems = (query?.trim()?.length ? menuItems.filter((item) => {
    const q = query.trim().toLowerCase();
    return (item.name || "").toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q);
  }) : menuItems);

  const filteredItems = searchedItems.filter((item) => {
    if (filters.category !== "all" && item.category !== filters.category) return false;
    const isAvail = availability[item._id] !== undefined ? availability[item._id] : item.available !== false;
    if (filters.availability === "available" && !isAvail) return false;
    if (filters.availability === "unavailable" && isAvail) return false;
    if (filters.type !== "all" && (item.type || "veg").toLowerCase() !== filters.type) return false;
    if (filters.spice !== "all" && Number(item.spiceLevel || 0) !== Number(filters.spice)) return false;

    const prices = getPrices(item);
    if ((filters.priceMin || filters.priceMax) && prices.length === 0) return false;
    if (filters.priceMin && Math.max(...prices) < Number(filters.priceMin)) return false;
    if (filters.priceMax && Math.min(...prices) > Number(filters.priceMax)) return false;
    return true;
  });

  const finalItems = useMemo(() => {
    const arr = [...filteredItems];
    if (sort === "name-asc") arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sort === "name-desc") arr.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    else if (sort === "price-asc") arr.sort((a, b) => (Math.min(...getPrices(a)) || 0) - (Math.min(...getPrices(b)) || 0));
    else if (sort === "price-desc") arr.sort((a, b) => (Math.min(...getPrices(b)) || 0) - (Math.min(...getPrices(a)) || 0));
    return arr;
  }, [filteredItems, sort]);

  // --- Render ---
  return (
    <main className="menu-dashboard-container">
      
      {/* 1. Header & Toolbar */}
      <header className="menu-header">
        <div className="search-bar-wrapper">
          <i className="search-icon">🔍</i>
          <input
            type="text"
            className="premium-search-input"
            placeholder="Search menu items..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="filters-toolbar">
          <select className="premium-select" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })}>
            <option value="all">All Categories</option>
            {categories.map((c) => (<option key={c} value={c}>{c}</option>))}
          </select>

          <select className="premium-select" value={filters.type} onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
            <option value="all">All Types</option>
            <option value="veg">Veg</option>
            <option value="non-veg">Non-Veg</option>
          </select>

          <div className="price-inputs">
            <input type="number" placeholder="Min ₹" value={filters.priceMin} onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })} />
            <span>-</span>
            <input type="number" placeholder="Max ₹" value={filters.priceMax} onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })} />
          </div>

          <button className="btn-reset" onClick={() => { setQuery(""); setFilters({ category: "all", type: "all", spice: "all", availability: "all", priceMin: "", priceMax: "" }); }}>
            Reset
          </button>
        </div>
      </header>

      {/* 2. Category Chips */}
      {categories.length > 0 && (
        <div className="category-chips-scroll">
          <button className={`chip-pill ${filters.category === 'all' ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, category: 'all' }))}>
            All Items
          </button>
          {categories.map((c) => (
            <button key={c} className={`chip-pill ${filters.category === c ? 'active' : ''}`} onClick={() => setFilters(f => ({ ...f, category: c }))}>
              {c}
            </button>
          ))}
        </div>
      )}

      {/* 3. Category Bulk Toggle */}
      {filters.category !== 'all' && !loading && menuItems.length > 0 && (
        <div className="bulk-action-banner">
          {(() => {
            const itemsInCat = menuItems.filter(i => i.category === filters.category);
            const allAvail = itemsInCat.every(i => availability[i._id] !== undefined ? availability[i._id] : i.available);
            return (
              <button className={`btn-bulk-toggle ${allAvail ? 'is-active' : ''}`} onClick={() => toggleCategoryAvailability(filters.category)}>
                <span className="toggle-indicator"></span>
                {allAvail ? `Active: All ${filters.category} are Online` : `Inactive: Set ${filters.category} Online`}
              </button>
            )
          })()}
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      {/* 4. Grid Content */}
      {loading ? (
        <div className="loader-container"><div className="spinner-red"></div></div>
      ) : finalItems.length === 0 ? (
        <div className="empty-state">No items found matching your criteria.</div>
      ) : (
        <section className="menu-grid-premium">
          {finalItems.map((item) => (
            <article className={`menu-card ${!availability[item._id] ? 'card-unavailable' : ''} ${editingId === item._id ? 'card-editing' : ''}`} key={item._id}>

              {/* Display Mode */}
              {editingId !== item._id ? (
                <>
                  <div className="card-image-header relative">
                    <img
                      src={getImageUrl(item.image || item.imageUrl)}
                      alt={item.name}
                      loading="lazy"
                    />
                    <div className="card-badges">
                      {item.type != 'none' && (
                        <span className={`badge-type ${item.type === 'veg' ? 'veg' : 'non-veg'}`}>
                          <span className="dot"></span> {item.type === 'veg' ? 'VEG' : 'NON-VEG'}
                        </span>
                      )}
                      {Number(item.spiceLevel) > 0 && <span className="badge-spice">{"🌶️".repeat(item.spiceLevel)}</span>}
                    </div>
                    {!availability[item._id] && <div className="unavailable-overlay">UNAVAILABLE</div>}
                  </div>

                  <div className="card-content">
                    <div className="content-top">
                      <div className="title-row">
                        <h3>{item.name}</h3>
                        <span className="category-tag">{item.category}</span>
                      </div>
                      <p className="description" title={item.description}>{item.description || "No description provided."}</p>
                    </div>

                    <div className="price-grid">
                      {Object.entries(item.sizes || {}).map(([s, p]) => p ? (
                        <div key={s} className="price-pill">
                          <span className="size-label">{s}</span>
                          <span className="price-val">₹{p}</span>
                        </div>
                      ) : null)}
                    </div>
                  </div>

                  <div className="card-footer">
                    <div className="availability-toggle" onClick={() => toggleAvailability(item._id, item.name)}>
                      <div className={`toggle-switch ${availability[item._id] ? 'on' : 'off'}`}>
                        <div className="knob"></div>
                      </div>
                      <span className="label">{availability[item._id] ? "Online" : "Offline"}</span>
                    </div>
                    <button className="btn-edit" onClick={() => startEdit(item)}>Edit</button>
                  </div>
                </>
              ) : (
                /* Edit Mode Form */
<form 
      className="relative flex flex-col w-full max-w-2xl mx-auto bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden" 
      onSubmit={(e) => saveEdit(e, item._id)}
    >
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
        <div>
          <h4 className="text-lg font-bold text-red-900">Edit Item</h4>
          <p className="text-xs text-gray-400">Update details for {item.name}</p>
        </div>
        <button 
          type="button" 
          onClick={() => handleDeleteMenu(item)} 
          className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
          title="Delete Item"
        >
          <Icons.Trash />
        </button>
      </div>

      {/* --- SCROLLABLE CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 max-h-[70vh]">
        
        {/* Name Input */}
        <div>
          <label className={labelClass}>Item Name</label>
          <input 
            className={inputBaseClass} 
            value={editForm.name} 
            onChange={e => setEditForm({ ...editForm, name: e.target.value })} 
            placeholder="e.g. Butter Chicken"
          />
        </div>

        {/* Row: Category & Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            <input 
              className={inputBaseClass} 
              value={editForm.category} 
              onChange={e => setEditForm({ ...editForm, category: e.target.value.toUpperCase() })} 
              placeholder="e.g. MAIN COURSE"
            />
          </div>
          <div>
            <label className={labelClass}>Dietary Type</label>
            <div className="relative">
              <select 
                className={`${inputBaseClass} appearance-none`} 
                value={editForm.type} 
                onChange={e => setEditForm({ ...editForm, type: e.target.value })}
              >
                <option value="none">None</option>
                <option value="veg">Veg</option>
                <option value="non-veg">Non-Veg</option>
              </select>
              {/* Custom Chevron for select */}
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        </div>

        {/* Spice Level */}
        <div>
          <label className={labelClass}>Spice Level</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: "0", label: "No Spice" },
              { val: "1", label: "Mild" },
              { val: "2", label: "Medium" },
              { val: "3", label: "Hot" }
            ].map((opt) => (
              <label 
                key={opt.val}
                className={`cursor-pointer border rounded-md py-2 text-center text-sm font-medium transition-all ${
                  editForm.spiceLevel === opt.val 
                    ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' 
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <input 
                  type="radio" 
                  name="spiceLevel" 
                  value={opt.val} 
                  checked={editForm.spiceLevel === opt.val}
                  onChange={e => setEditForm({ ...editForm, spiceLevel: e.target.value })}
                  className="sr-only" 
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>Description</label>
          <textarea 
            className={inputBaseClass} 
            rows="3" 
            value={editForm.description} 
            onChange={e => setEditForm({ ...editForm, description: e.target.value })} 
            placeholder="Describe ingredients and taste..."
          />
        </div>

        <hr className="border-gray-100" />

        {/* --- PRICE & SIZES SECTION --- */}
        <div>
          <label className={labelClass}>Pricing & Portions (₹)</label>
          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 space-y-3">
            
            {/* Existing Sizes List */}
            {Object.entries(editForm.sizes || {}).map(([key, value]) => (
              <div key={key} className="flex items-center gap-3 bg-white p-2 rounded border border-gray-200 shadow-sm">
                <span className="w-1/3 pl-2 text-sm font-bold text-gray-700 truncate capitalize">{key}</span>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-1/3 p-1.5 text-sm bg-gray-50 border border-gray-300 rounded text-gray-900 focus:ring-red-500 focus:border-red-500"
                  value={value ?? ""}
                  onChange={(e) =>
                    setEditForm(prev => ({
                      ...prev,
                      sizes: { ...prev.sizes, [key]: e.target.value }
                    }))
                  }
                />
                <div className="w-1/3 flex justify-end">
                  <button
                    type="button"
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                    onClick={() => {
                      if (Object.keys(editForm.sizes).length === 1) return alert("At least one size is required");
                      if (window.confirm(`Delete size "${key}"?`)) {
                        setEditForm(prev => {
                          const updated = { ...prev.sizes };
                          delete updated[key];
                          return { ...prev, sizes: updated };
                        });
                      }
                    }}
                  >
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            ))}

            {/* Add New Size Input */}
            <div className="flex items-center gap-3 pt-2 mt-2 border-t border-gray-200 border-dashed">
              <input
                type="text"
                className="w-1/3 p-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-red-500 focus:border-red-500"
                placeholder="New Size (e.g. Large)"
                value={newSizeKey}
                onChange={(e) => setNewSizeKey(e.target.value)}
              />
              <input
                type="number"
                className="w-1/3 p-2 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:ring-red-500 focus:border-red-500"
                placeholder="Price"
                value={newSizePrice}
                onChange={(e) => setNewSizePrice(e.target.value)}
              />
              <button
                type="button"
                className="w-1/3 flex items-center justify-center gap-1 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold py-2 rounded transition-colors shadow-sm"
                onClick={() => {
                  const key = newSizeKey.trim().toLowerCase();
                  const price = Number(newSizePrice);
                  if (!key || Number.isNaN(price) || price <= 0) return alert("Invalid details");
                  if (editForm.sizes[key]) return alert("Size exists");
                  setEditForm(prev => ({ ...prev, sizes: { ...prev.sizes, [key]: price } }));
                  setNewSizeKey(""); setNewSizePrice("");
                }}
              >
                <Icons.Plus /> ADD
              </button>
            </div>
          </div>
        </div>

        {/* --- IMAGE SECTION --- */}
        <div>
          <label className={labelClass}>Item Image</label>
          <div className="space-y-3">
            
            {/* Custom File Input */}
            <div className="flex items-center gap-2">
              <label className="flex-1 cursor-pointer group">
                <div className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white border border-gray-300 rounded-md hover:border-red-500 hover:text-red-600 text-gray-600 transition-all shadow-sm">
                  <Icons.Upload />
                  <span className="text-sm font-medium">Upload File</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    setEditImageFile(e.target.files?.[0] || null);
                    deleteItemImage(item);
                  }}
                />
              </label>
            </div>

            {/* URL Input */}
            <div className="relative">
              <input
                className={`${inputBaseClass} pl-9`}
                placeholder="Or paste image URL"
                value={editForm.image}
                onChange={e => setEditForm({ ...editForm, image: e.target.value })}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
              </div>
            </div>

            {/* Remove Image Action */}
            {editForm.image && (
               <div className="flex justify-end">
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded border border-red-100 transition-colors"
                  onClick={() => {
                    setEditForm({ ...editForm, image: "" });
                    setEditImageFile(null);
                    deleteItemImage(item);
                  }}
                >
                  <Icons.ImageOff /> Remove Image
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* --- FOOTER ACTIONS --- */}
      <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200">
        <button 
          type="button" 
          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 shadow-sm transition-all" 
          onClick={cancelEdit}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-red-800 rounded-md hover:bg-red-900 shadow-md transition-all focus:ring-2 focus:ring-offset-2 focus:ring-red-900"
        >
          <Icons.Save /> Save Changes
        </button>
      </div>
    </form>
              )}
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default React.memo(MenuList);
