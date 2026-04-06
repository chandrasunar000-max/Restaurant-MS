import React, { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import api from "../api/axios";

const BillModal = ({ show, onClose, rid, restaurantInfo, sessionId, tableNumber, isRoom }) => {
  const [billOrders, setBillOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!show || !rid) {
      setLoading(false);
      return;
    }

    const fetchBillOrders = async () => {
      setLoading(true);
      setError("");
      try {
        let orders = [];
        if (!sessionId || !tableNumber) {
          setError("Missing table or session information.");
          setBillOrders([]);
          return;
        }
        const url = isRoom ? `/public/orders/${rid}/room/${tableNumber}` : `/public/orders/${rid}/${tableNumber}`;
        const response = await api.get(url, { params: { sessionId } });
        // For public, we get all recent orders, let's filter for 'accepted' to match bill logic
        orders = (Array.isArray(response.data) ? response.data : []).filter(o => o.status === 'accepted');

        setBillOrders(orders);
      } catch (err) {
        console.error("Error fetching bill orders:", err);
        setError(err?.response?.data?.message || "Error fetching bill orders.");
      } finally {
        setLoading(false);
      }
    };

    fetchBillOrders();
  }, [show, rid, sessionId, tableNumber, isRoom]);

  const { subtotal, grandTotal } = useMemo(() => {
    let currentSubtotal = 0;
    billOrders.forEach(order => {
      order.items.forEach(item => {
        currentSubtotal += (item.price || 0) * (item.quantity || 1);
      });
    });

    return {
      subtotal: currentSubtotal,
      grandTotal: +currentSubtotal.toFixed(2),
    };
  }, [billOrders, restaurantInfo]);


  const getStatusColor = (status) => {
    const colors = {
      pending: "#f59e0b", // Amber
      accepted: "#10b981", // Green
      rejected: "#ef4444", // Red
      completed: "#06b6d4", // Cyan
      cancelled: "#6b7280", // Gray
    };
    return colors[status] || "#6b7280";
  };


  if (!show) return null;

  const darkRed = "#991b1b";
  const darkGrey = "#1f2937";
  const mediumGrey = "#6b7280";
  const lightBg = "#f9fafb";
  const borderColor = "#e5e7eb";


  return (
    <>
      {/* Backdrop - Full Screen */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[997]"
        onClick={onClose}
        style={{ cursor: "pointer" }}
      />

      {/* Bill Panel - Slide from Right */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-[998] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Your Bill</h2>
            <p className="text-xs text-gray-500 mt-1">
              {billOrders.length} accepted order{billOrders.length !== 1 ? 's' : ''} for today
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 bg-white text-primary rounded-full transition-colors"
          >
            <X className="w-6 h-6 text-primary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading your bill...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center">
              <p className="text-red-600 font-medium mb-2">Error</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          )}

          {!loading && !error && billOrders.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <div className="text-5xl mb-4">🧾</div>
                <p className="text-gray-600 font-medium">No orders for today</p>
                <p className="text-xs text-gray-500 mt-2">
                  Today's accepted orders will appear here.
                </p>
              </div>
            </div>
          )}

          {!loading && billOrders.length > 0 && (
            <div className="divide-y divide-gray-100">
              {billOrders.map((order) => (
                <div key={order._id} className="p-4 hover:bg-gray-50 transition-colors">
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        Order #{order.orderId?.slice(-6).toUpperCase() || order._id?.slice(-6).toUpperCase() || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                    <div
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: getStatusColor(order.status) }}
                    >
                      {order.status?.toUpperCase() || 'PENDING'}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="mb-3 space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-gray-600">
                          <span>• {item.item?.name || 'Unknown Item'} x{item.quantity || 1} ({item.size})</span>
                          <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500">No items</p>
                    )}
                  </div>

                  {/* Order Total - for individual order, not bill total */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-gray-600">Order Total</p>
                      <p className="text-sm font-bold text-gray-900">
                        ₹{(order.total || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bill Summary - Fixed at bottom */}
        {!loading && !error && billOrders.length > 0 && (
          <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Total Bill Summary</h3>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm text-gray-700">
                <span>Subtotal ({billOrders.length} order{billOrders.length !== 1 ? 's' : ''})</span>
                <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <p className="text-base font-bold text-gray-900">Grand Total</p>
              <p className="text-xl font-extrabold text-red-700">₹{grandTotal.toFixed(2)}</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default BillModal;
