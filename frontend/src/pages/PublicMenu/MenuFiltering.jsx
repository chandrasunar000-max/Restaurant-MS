import { memo, useState } from "react";
import { SlidersHorizontal, Search as SearchIcon, X as XIcon, ChevronDown, ChevronUp } from "lucide-react"; // Import new icons

const MenuFiltering = ({
  showSearch,
  setShowSearch,
  query,
  setQuery,
  // New props for filtering
  filters,
  setFilters,
  sort,
  setSort,
  categories,
}) => {
  const [showFilterPanel, setShowFilterPanel] = useState(false); // State to control filter panel visibility
  
  // Theme Constants (duplicated from MenuFooter, but fine as they are constants)
  const darkRed = "#991b1b";
  const darkGrey = "#1f2937";
  const lightGreyBg = "#f3f4f6";
  const borderColor = "rgba(0,0,0,0.1)";

  // Shared Input Style
  const inputStyle = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: "8px",
    border: `1px solid ${borderColor}`,
    background: "#fff",
    fontSize: "14px",
    color: darkGrey,
    outline: "none",
    appearance: "none",
  };

  const numberInputStyle = {
    ...inputStyle,
    backgroundImage: "none",
  };

  const hasActiveFilters = filters.category !== 'all' || filters.type !== 'all' || filters.spice !== 'all' || filters.priceMin || filters.priceMax;

  return (
    <header 
      className="menu-toolbar px-2 sm:px-4 pt-2 pb-1 bg-white sticky top-0 z-30 shadow-sm" // Added Tailwind classes
      role="search" 
    >
      {/* Search Bar and Filter Toggle */}
      <div className="flex items-center gap-2 sm:gap-4 mb-2"> {/* Responsive gap */}
        
        {/* Search Bar */}
        <div className="flex-1 relative">
          <div className="flex items-center bg-zinc-100 rounded-full py-2 px-4 transition-all duration-200 border border-transparent focus-within:border-red-500">
            <span className="text-zinc-500 flex"><SearchIcon size={18} /></span>
            <input
              type="text"
              placeholder="Search food..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="border-none bg-transparent outline-none ml-2 w-full text-zinc-700 placeholder:text-zinc-400 text-sm"
              onFocus={() => setShowSearch(true)} // Keep existing behavior
            />
            {query && (
              <button 
                onClick={() => setQuery("")}
                className="border-none bg-transparent p-1 cursor-pointer text-zinc-500 flex"
              >
                <XIcon size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter Toggle Button */}
        <button
          onClick={() => setShowFilterPanel(!showFilterPanel)}
          className={`flex items-center justify-center p-2 rounded-full transition-colors duration-200 ${
            hasActiveFilters ? 'bg-red-500 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'
          }`}
          aria-expanded={showFilterPanel}
          aria-controls="filter-panel"
        >
          <SlidersHorizontal size={20} />
          {hasActiveFilters && (
            <span className="absolute top-0 right-0 block w-2 h-2 bg-yellow-400 rounded-full ring-2 ring-white"></span>
          )}
        </button>
      </div>

      {/* Filter Panel (Collapsible) */}
      <div 
        id="filter-panel"
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          showFilterPanel ? 'max-h-screen opacity-100 py-2' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          
          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">Category</label>
            <select
              className="w-full p-2 border border-zinc-300 rounded-lg text-sm bg-white text-zinc-700"
              value={filters.category || 'all'}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Type (Veg/Non-Veg) */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">Type</label>
            <select
              className="w-full p-2 border border-zinc-300 rounded-lg text-sm bg-white text-zinc-700"
              value={filters.type || 'all'}
              onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            >
              <option value="all">Any</option>
              <option value="veg">Veg 🌱</option>
              <option value="non-veg">Non-Veg 🍗</option>
            </select>
          </div>

          {/* Spice Level */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">Spice</label>
            <select
              className="w-full p-2 border border-zinc-300 rounded-lg text-sm bg-white text-zinc-700"
              value={filters.spice || 'all'}
              onChange={(e) => setFilters((f) => ({ ...f, spice: e.target.value }))}
            >
              <option value="all">Any</option>
              <option value={0}>No Spice</option>
              <option value={1}>Mild 🌶️</option>
              <option value={2}>Medium 🌶️🌶️</option>
              <option value={3}>Hot 🌶️🌶️🌶️</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">Sort By</label>
            <select
              className="w-full p-2 border border-zinc-300 rounded-lg text-sm bg-white text-zinc-700"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
            >
              <option value="relevance">Recommended</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>

          {/* Price Range */}
          <div className="col-span-full sm:col-span-1"> {/* Responsive span */}
            <label className="block text-xs font-bold uppercase tracking-wide text-zinc-500 mb-1">Price Range (₹)</label>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm bg-white text-zinc-700"
                placeholder="Min"
                value={filters.priceMin || ''}
                onChange={(e) => setFilters((f) => ({ ...f, priceMin: e.target.value }))}
              />
              <span className="text-zinc-400">—</span>
              <input
                type="number"
                className="w-full p-2 border border-zinc-300 rounded-lg text-sm bg-white text-zinc-700"
                placeholder="Max"
                value={filters.priceMax || ''}
                onChange={(e) => setFilters((f) => ({ ...f, priceMax: e.target.value }))}
              />
            </div>
          </div>

          {/* Clear Filters Button */}
          <button
            type="button"
            onClick={() => {
              setFilters({ category: "all", type: "all", spice: "all", priceMin: "", priceMax: "" });
              setSort("relevance");
            }}
            className="col-span-full sm:col-span-2 py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors duration-200 text-sm"
          >
            Reset Filters
          </button>
        </div>
      </div>
    </header>
  );
};

export default memo(MenuFiltering);
