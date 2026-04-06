import { memo, useMemo } from "react";

const MenuOrderConfirmation = ({
  show,
  cartList = [],
  items = [],
  restaurantInfo = {},
  tipForChef,
  orderLoading,
  onCancel,
  onConfirm,
}) => {
  if (!show) return null;

  // 🧮 Price Helpers
  const getItemPrice = (itemId, size, storedPrice) => {
    // If price is stored in cart (offer-applied or base price), use it
    if (storedPrice !== undefined && storedPrice !== null) {
      return Number(storedPrice);
    }
    // Fallback: look up from items if price not stored (backward compatibility)
    const item = items.find((it) => it._id === itemId);
    if (!item || !item.sizes) return null;
    if (size && item.sizes[size]) return Number(item.sizes[size]);
    return Number(Object.values(item.sizes)[0]);
  };

  // Subtotal
  const subtotal = useMemo(() => {
    return cartList.reduce((sum, [, v]) => {
      const price = getItemPrice(v.itemId, v.size, v.price);
      if (!price) return sum;
      return sum + Number(price) * v.qty;
    }, 0);
  }, [cartList, items]);

  const grandTotal = +subtotal.toFixed(2);

  // 🎨 Theme Constants
  const darkRed = "#991b1b";
  const darkGrey = "#1f2937";
  const mediumGrey = "#6b7280";
  const lightBg = "#f9fafb";
  const borderColor = "#e5e7eb";

  return (
    <>
      <style>
        {`
          @keyframes modal-pop {
            0% { transform: scale(0.95); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>

      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
          zIndex: 200, // Highest z-index to overlay everything
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "16px",
        }}
        role="dialog"
        aria-modal="true"
      >
        <div
          style={{
            background: "#fff",
            width: "100%",
            maxWidth: "380px",
            borderRadius: "20px",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            overflow: "hidden",
            animation: "modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* HEADER */}
          <div style={{ padding: "20px 24px", borderBottom: `1px solid ${borderColor}`, textAlign: "center" }}>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: "800", color: darkGrey }}>
              Confirm Your Order
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: mediumGrey }}>
              Please review your items below
            </p>
          </div>

          {/* ORDER LIST (Scrollable if long) */}
          <div style={{ padding: "0 24px", maxHeight: "40vh", overflowY: "auto" }}>
            <ul style={{ listStyle: "none", padding: 0, margin: "20px 0" }}>
              {cartList.map(([key, v]) => {
                const price = getItemPrice(v.itemId, v.size, v.price);
                // Show item totals
                const total = price ? Number(price) * v.qty : 0;

                return (
                  <li
                    key={key}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "12px",
                      fontSize: "14px",
                    }}
                  >
                    <div style={{ paddingRight: "12px" }}>
                      <div style={{ color: darkGrey, fontWeight: "600" }}>
                        <span style={{ color: darkRed, marginRight: "6px" }}>{v.qty}x</span>
                        {v.name}
                      </div>
                      <div style={{ fontSize: "12px", color: mediumGrey, marginTop: "2px" }}>
                        {v.size || "Standard"}
                      </div>
                    </div>
                    <div style={{ fontWeight: "600", color: darkGrey, whiteSpace: "nowrap" }}>
                      {price ? `₹${total.toFixed(2)}` : "-"}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* SUMMARY SECTION */}
          <div style={{ padding: "20px 24px", background: lightBg, borderTop: `1px dashed ${borderColor}` }}>
            
            {/* Note Display */}
            {tipForChef && (
              <div style={{ 
                background: "#fff", 
                border: "1px solid #fed7aa", 
                borderRadius: "8px", 
                padding: "10px", 
                marginBottom: "16px",
                fontSize: "12px",
                color: "#9a3412"
              }}>
                <strong>Note:</strong> {tipForChef}
              </div>
            )}

            {/* Subtotal and Grand Total */}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "14px", color: mediumGrey }}>Subtotal</div>
                <div style={{ fontSize: "14px", fontWeight: "700", color: darkGrey }}>₹{subtotal.toFixed(2)}</div>
              </div>

              <div style={{ borderTop: `1px dashed ${borderColor}`, paddingTop: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "12px", color: mediumGrey }}>Grand Total</div>
                <div style={{ fontSize: "20px", fontWeight: "900", color: darkGrey }}>₹{grandTotal.toFixed(2)}</div>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "12px" }}>
              <button
                onClick={onCancel}
                disabled={orderLoading}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: `1px solid ${borderColor}`,
                  background: "#fff",
                  color: darkGrey,
                  fontSize: "14px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={onConfirm}
                disabled={orderLoading}
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  border: "none",
                  background: orderLoading ? mediumGrey : darkRed,
                  color: "#fff",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: orderLoading ? "default" : "pointer",
                  boxShadow: "0 4px 6px rgba(153, 27, 27, 0.2)",
                  transition: "background 0.2s",
                }}
              >
                {orderLoading ? "Processing..." : `Confirm Order · ₹${grandTotal.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default memo(MenuOrderConfirmation);
