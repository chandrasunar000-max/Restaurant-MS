import { memo, useMemo } from "react";

// Icons
const TrashIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
);

const MenuCart = ({
  restaurantInfo,
  cartList = [],
  items = [],
  isMobile,
  tipForChef,
  setTipForChef,
  removeFromCart,
  updateQty,
  onOrderClick,
}) => {
  if (cartList.length === 0) return null;

  // 🧮 Logic (Preserved)
  const getItemTotal = (v) => {
    // Use the stored price in cart (offer-applied or base price)
    if (v.price !== undefined && v.price !== null) {
      return Number(v.price) * v.qty;
    }
    // Fallback: look up from items if price not stored (for backward compatibility)
    const item = items.find((it) => it._id === v.itemId);
    if (!item || !item.sizes) return 0;
    let price = v.size && item.sizes[v.size] ? item.sizes[v.size] : Object.values(item.sizes)[0];
    if (!price) return 0;
    return Number(price) * v.qty;
  };

  // Subtotal
  const subtotal = useMemo(() => {
    return cartList.reduce((sum, [, v]) => {
      // Use the stored price in cart (offer-applied or base price)
      if (v.price !== undefined && v.price !== null) {
        return sum + Number(v.price) * v.qty;
      }
      // Fallback: look up from items if price not stored (for backward compatibility)
      const item = items.find((it) => it._id === v.itemId);
      if (!item || !item.sizes) return sum;
      let price = v.size && item.sizes[v.size] ? item.sizes[v.size] : Object.values(item.sizes)[0];
      if (!price) return sum;
      return sum + Number(price) * v.qty;
    }, 0);
  }, [cartList, items]);

  const grandTotal = +subtotal.toFixed(2);

  // 🎨 Theme Constants
  const darkRed = "#991b1b";
  const darkGrey = "#1f2937";
  const lightGrey = "#f3f4f6";
  const borderColor = "#e5e7eb";
  
  return (
    <>
      {/* Spacer to prevent content overlap */}
      <div style={{ height: "140px" }} aria-hidden />

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40, // Below the Order Confirmation Modal (z-50/200)
          backgroundColor: "rgba(255, 255, 255, 0.96)",
          backdropFilter: "blur(12px)",
          borderTop: `1px solid ${borderColor}`,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div style={{ maxWidth: "800px", margin: "0 auto 7vh auto", padding: "10px 12px" }}>
          
          {/* 1. COMPACT ITEMS ROW */}
          <div
            className="no-scrollbar"
            style={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              
            }}
          >
            {cartList.map(([key, v]) => (
              <div
                key={key}
                style={{
                  position: "relative",
                  flex: "0 0 auto",
                  width: "110px", // Fixed small width
                  backgroundColor: "#fff",
                  border: `1px solid ${borderColor}`,
                  borderRadius: "10px",
                  padding: "8px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                }}
              >
                {/* Header: Name + Remove */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                  <div style={{ overflow: "hidden", paddingRight: "4px" }}>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: darkGrey, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {v.name}
                    </div>
                    <div style={{ fontSize: "10px", color: "#6b7280" }}>
                      {v.size || "Reg"}
                    </div>
                  </div>
                  
                  {/* Subtle Remove Icon */}
                  <button
                    onClick={() => removeFromCart(key)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#ef4444",
                      padding: "0",
                      cursor: "pointer",
                      opacity: 0.7
                    }}
                  >
                    <TrashIcon />
                  </button>
                </div>

                {/* Footer: Qty Stepper + Price */}
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  
                  {/* Cohesive Stepper Capsule */}
                  <div style={{ 
                    display: "flex", 
                    alignItems: "center", 
                    justifyContent: "space-between",
                    backgroundColor: lightGrey,
                    borderRadius: "6px",
                    padding: "2px"
                  }}>
                    <button
                      onClick={() => updateQty(key, Math.max(1, v.qty - 1))}
                      style={{ width: "22px", height: "20px", border: "none", background: "#fff", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", color: darkGrey, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                    >
                      -
                    </button>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: darkGrey }}>{v.qty}</span>
                    <button
                      onClick={() => updateQty(key, v.qty + 1)}
                      style={{ width: "22px", height: "20px", border: "none", background: "#fff", borderRadius: "4px", fontSize: "12px", fontWeight: "bold", color: darkGrey, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }}
                    >
                      +
                    </button>
                  </div>

                  <div style={{ fontSize: "11px", fontWeight: "800", color: darkRed, textAlign: "right" }}>
                    ₹{getItemTotal(v).toFixed(0)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* 2. BOTTOM ACTION BAR */}
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr auto", 
            gap: "8px", 
            alignItems: "center",
            paddingTop: "8px",
            borderTop: `1px dashed ${borderColor}`
          }}>
            
            {/* Left: Input */}
            <input
              value={tipForChef}
              onChange={(e) => setTipForChef(e.target.value)}
              placeholder="Any instructions?"
              maxLength={100}
              style={{
                width: "100%",
                height: "38px",
                borderRadius: "8px",
                border: `1px solid ${borderColor}`,
                background: lightGrey,
                padding: "0 12px",
                fontSize: "12px",
                color: darkGrey,
                outline: "none"
              }}
            />

            {/* Right: Order Button (Total integrated) */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <button
                onClick={onOrderClick}
                style={{
                  height: "38px",
                  padding: "0 16px",
                  background: darkRed,
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  minWidth: "110px",
                  boxShadow: "0 4px 10px rgba(153, 27, 27, 0.25)"
                }}
              >
                <span style={{ fontSize: "10px", opacity: 0.9, textTransform: "uppercase", letterSpacing: "0.5px" }}>Place Order</span>
                <span style={{ fontSize: "13px", fontWeight: "800", lineHeight: "1" }}>₹{grandTotal.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(MenuCart);
