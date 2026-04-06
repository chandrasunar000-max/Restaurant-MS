import { memo, useMemo } from "react";

const MenuCategory = ({
  categories = [],
  items = [],
  filters,
  setFilters,
}) => {
  // Pre-calculate counts for performance
  const categoryStats = useMemo(() => {
    const stats = {};
    categories.forEach((c) => {
      const itemsInCat = items.filter((item) => item.category === c);
      const availableCount = itemsInCat.filter(
        (item) => item.available !== false
      ).length;

      stats[c] = {
        total: itemsInCat.length,
        available: availableCount,
      };
    });
    return stats;
  }, [categories, items]);

  if (!categories.length) return null;

  // Theme Constants
  const darkRed = "#991b1b";
  const darkGrey = "#1f2937";
  const lightGreyBg = "#f3f4f6";

  return (
    <>
      {/* Hide scrollbar styles locally for this component */}
      <style>
        {`
          .no-scrollbar::-webkit-scrollbar { display: none; }
          .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        `}
      </style>

      <div
        className="cat-chips no-scrollbar"
        role="tablist"
        aria-label="Filter by category"
        style={{
          display: "flex",
          gap: "10px",
          justifyContent: "flex-start",
          overflowX: "auto",
          flexWrap: "nowrap",
          WebkitOverflowScrolling: "touch",
          padding: "5px 10px",
          // Sticky positioning for better UX
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(8px)",

          marginBottom: "0px"
        }}
      >
        {/* ALL Button */}
        <CategoryChip
          label="All"
          count={items.length}
          isActive={filters.category === "all"}
          onClick={() => setFilters((f) => ({ ...f, category: "all" }))}
          activeColor={darkRed}
          inactiveColor={darkGrey}
          inactiveBg={lightGreyBg}
        />

        {/* Categories */}
        {categories.map((c) => {
          const stats = categoryStats[c];
          return (
            <CategoryChip
              key={c}
              label={c}
              // format: "Available / Total" or just "Total" depending on preference
              count={`${stats.available}/${stats.total}`} 
              isActive={filters.category === c}
              onClick={() => setFilters((f) => ({ ...f, category: c }))}
              activeColor={darkRed}
              inactiveColor={darkGrey}
              inactiveBg={lightGreyBg}
            />
          );
        })}
      </div>
    </>
  );
};

// Sub-component for individual chips to keep code clean
const CategoryChip = ({ label, count, isActive, onClick, activeColor, inactiveColor, inactiveBg }) => (
  <button
    role="tab"
    aria-selected={isActive}
    onClick={onClick}
    style={{
      appearance: "none",
      border: "none",
      outline: "none",
      cursor: "pointer",
      padding: "8px 16px",
      borderRadius: "50px", // Pill shape
      fontSize: "13px",
      fontWeight: "600",
      whiteSpace: "nowrap",
      transition: "all 0.2s ease",
      // Active vs Inactive Styling
      backgroundColor: isActive ? activeColor : inactiveBg,
      color: isActive ? "#fff" : inactiveColor,
      boxShadow: isActive ? "0 2px 6px rgba(153, 27, 27, 0.3)" : "none",
      display: "flex",
      alignItems: "center",
      gap: "6px"
    }}
  >
    <span>{label}</span>
    <span
      style={{
        fontSize: "11px",
        opacity: isActive ? 0.8 : 0.6,
        fontWeight: "500"
      }}
    >
      {count}
    </span>
  </button>
);

export default memo(MenuCategory);