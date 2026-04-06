import "../assets/css/Dashboard.css";
import React, { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { useLocation, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import MenuList from "./MenuList";
import AddItemForm from "../components/AddItemForm";
import RestaurantProfile from "../components/restaurantProfile";
import OrdersList from "../components/OrdersList";
import RecentOrdersCards from "../components/RecentOrdersCards.jsx";
import { getSocket, joinRestaurant } from "../api/socket";
import { motion, AnimatePresence } from "framer-motion";
import notificationSound from "../assets/sounds/confirmation_tune.wav";

function Dashboard() {
  const [restaurant, setRestaurant] = useState(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("home");
  const [addedItems, setAddedItems] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const orderAudioRef = useRef(null);

  useEffect(() => {
    orderAudioRef.current = new Audio(notificationSound);
  }, []);

  const playOrderSound = () => {
    if (orderAudioRef.current) {
      orderAudioRef.current.play().catch(e => console.error("Failed to play order sound:", e));
    }
  };

  const fetchData = React.useCallback(async () => {
    try {
      const res = await api.get("/restaurants/me");
      setRestaurant(res.data);

      const ordersRes = await api.get("/orders");
      const pendingOrders = Array.isArray(ordersRes.data)
        ? ordersRes.data.filter((o) => o.status === "pending").length
        : 0;
      setPendingCount(pendingOrders);

    } catch {
      setError("Failed to load restaurant. Please login again.");
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const params = new URLSearchParams(location.search || '');
    const viewParam = params.get('view');
    if (viewParam) {
      setView(viewParam);
    }
  }, [location.search]);

  useEffect(() => {
    if (!restaurant?._id) return;

    joinRestaurant(restaurant._id);
    const socket = getSocket();

    const handleNewOrder = (order) => {
      if (order.status === "pending") {
        setPendingCount((c) => c + 1);
        playOrderSound();
      }
    };

    const handleOrderUpdate = (order) => {
      if (order.status !== "pending") {
        setPendingCount((c) => Math.max(0, c - 1));
      }
    };

    socket.on("order:new", handleNewOrder);
    socket.on("order:update", handleOrderUpdate);

    return () => {
      socket.off("order:new", handleNewOrder);
      socket.off("order:update", handleOrderUpdate);
    };
  }, [restaurant?._id]);

  const handleAddItem = (item) => {
    setAddedItems((prev) => [item, ...prev]);
  };

  if (error) return <p className="error">{error}</p>;
  if (!restaurant) return <p>Loading...</p>;

  return (
    <div className="dashboard-root">
      <Sidebar
        onNavigate={setView}
        currentView={view}
        restaurantName={restaurant.name}
        restaurantPlan={restaurant.plan}
        pendingCount={pendingCount}
      />

      <div className="main-area">
        {view === "home" && <RecentOrdersCards />}
        {view === "menu" && <MenuList restaurantId={restaurant._id} />}
        {view === "add" && (
          <div className="cards-grid">
            <div className="add-column">
              <h3>Add Item</h3>
              <AddItemForm restaurantId={restaurant._id} onAdd={handleAddItem} />
            </div>
            <div className="recent-column">
              <h3>Recently added <span>({addedItems.length})</span></h3>
              <div className="recent-items-list">
                <AnimatePresence>
                  {addedItems.map((it, idx) => {
                    // Helper to get first price
                    const firstPrice = it.sizes ? Object.values(it.sizes)[0] : null;
                    
                    return (
                      <motion.div
                        key={it._id || idx}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="recent-item-card"
                      >
                        <div className="recent-item-info">
                          <strong>{it.name}</strong>
                          <div className="item-category">{it.category}</div>
                        </div>
                        {firstPrice !== undefined && (
                          <div className="recent-item-price">
                            ₹{firstPrice}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
                {addedItems.length === 0 && (
                  <div className="muted text-center py-8">
                    Items added in this session will appear here.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {view === "profile" && <RestaurantProfile />}
        {view === "orders" && <OrdersList />}
      </div>
    </div>
  );
}

export default React.memo(Dashboard);
