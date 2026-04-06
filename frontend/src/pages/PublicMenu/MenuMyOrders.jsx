import { memo, useEffect, useState } from "react";
import { X, Clock } from "lucide-react";
import { usePublicMenu } from "../../context/PublicMenuContext";

const MenuMyOrders = ({
  rid,
  tableNumber,
  isRoom = false,
  sessionId
}) => {
  const { setShowRecent, recentOrders } = usePublicMenu();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  // Helper component for Order Progress
  const OrderProgressBar = ({ order }) => {
    const [progress, setProgress] = useState(0);
    const [isServed, setIsServed] = useState(false);

    useEffect(() => {
      if (order.status !== 'accepted') return;

      const maxServeTime = Math.max(...(order.items?.map(it => it.serveTime || 15) || [15]));
      const totalSeconds = maxServeTime * 60;
      
      const calculateProgress = () => {
        const elapsedSeconds = (Date.now() - new Date(order.createdAt).getTime()) / 1000;
        const currentProgress = Math.min((elapsedSeconds / totalSeconds) * 100, 100);
        
        setProgress(currentProgress);
        if (currentProgress >= 100) {
          setIsServed(true);
        }
      };

      calculateProgress();
      const interval = setInterval(calculateProgress, 1000);
      return () => clearInterval(interval);
    }, [order]);

    if (order.status !== 'accepted') return null;

    return (
      <div className="mt-4 space-y-2">
        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
          <span className={isServed ? "text-green-600" : "text-orange-600"}>
            {isServed ? "🎉 Dish is Served" : "🍳 Preparing your meal..."}
          </span>
          <span className="text-gray-400">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden border border-gray-50">
          <div 
            className={`h-full transition-all duration-1000 ease-linear ${isServed ? 'bg-green-500' : 'bg-orange-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  };

  const displayOrders = recentOrders;

  return (
    <>
      {/* Backdrop - Full Screen */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[997]"
        onClick={() => setShowRecent(false)}
        style={{ cursor: "pointer" }}
      />

      {/* Orders Panel - Slide from Right */}
      <div className="fixed top-0 right-0 h-screen w-full max-w-md bg-white shadow-2xl z-[998] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Current Orders</h2>
            <p className="text-xs text-gray-500 mt-1">
              {displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <button
            onClick={() => setShowRecent(false)}
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
                <p className="text-gray-600">Loading your orders...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center">
              <p className="text-red-600 font-medium mb-2">Error</p>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          )}

          {!loading && displayOrders.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-6">
                <div className="text-5xl mb-4">📦</div>
                <p className="text-gray-600 font-medium">No orders yet</p>
                <p className="text-xs text-gray-500 mt-2">
                  Your active orders will appear here
                </p>
              </div>
            </div>
          )}

          {!loading && displayOrders.length > 0 && (
            <div className="p-4 space-y-4 bg-gray-50/30">
              {displayOrders.map((order) => (
                <div 
                  key={order._id || order.orderId} 
                  className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 transition-all hover:shadow-md"
                >
                  {/* Order Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                        <p className="text-sm font-black text-gray-900 tracking-tight">
                          ORDER #{order.orderId?.slice(-6).toUpperCase() || order._id?.slice(-6).toUpperCase() || 'N/A'}
                        </p>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {order.createdAt ? new Date(order.createdAt).toLocaleString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }) : 'N/A'}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div
                        className="px-3 py-1 rounded-full text-[10px] font-black text-white shadow-sm tracking-widest"
                        style={{ backgroundColor: getStatusColor(order.status) }}
                      >
                        {order.status?.toUpperCase() || 'PENDING'}
                      </div>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2">
                    {order.items && order.items.length > 0 ? (
                      order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-xs text-gray-700 bg-gray-50/80 p-3 rounded-xl border border-gray-100/50">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-800">
                              {item.item?.name || item.name || 'Unknown Item'}
                              <span className="text-primary ml-1 text-[10px]">x{item.quantity || item.qty || 1}</span>
                            </span>
                            {item.size && (
                              <span className="text-[10px] text-gray-400 font-medium">Size: {item.size}</span>
                            )}
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-black text-gray-900">₹{(item.price * (item.quantity || item.qty || 1)).toFixed(0)}</span>
                            {order.status === 'accepted' && (
                              <span className="text-[9px] text-gray-400 font-bold flex items-center gap-0.5 mt-0.5">
                                <Clock className="w-2.5 h-2.5 text-orange-400" /> {item.serveTime || 15}m
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-500 italic">No items found in this order</p>
                    )}
                  </div>

                  {/* Order Progress Slider */}
                  <OrderProgressBar order={order} />

                  {/* Order Total & Footer */}
                  <div className="mt-4 pt-4 border-t border-dashed border-gray-200 flex items-center justify-between">
                    <div className="flex flex-col">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Grand Total</p>
                      <p className="text-lg font-black text-gray-900 tracking-tight">
                        ₹{(order.total || 0).toFixed(2)}
                      </p>
                    </div>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default memo(MenuMyOrders);
