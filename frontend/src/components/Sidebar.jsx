import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import "../assets/css/Sidebar.css";
import { Home, List, PlusCircle, Receipt, LogOut, Store } from 'lucide-react';
// import "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.0.1/css/all.min.css"
export default function Sidebar({ onLogout, onNavigate, currentView = "home", pendingCount = 0, restaurantPlan = "software", restaurantName = "" }) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) return onLogout();
    localStorage.removeItem("token");
    navigate("/login");
  };

  const handleNav = (view, fallbackPath) => {
    if (onNavigate) return onNavigate(view);
    if (fallbackPath) navigate(fallbackPath);
  };
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div>
        <span className="brand-title">OrderByQR</span>
        {restaurantName && (
          <div className="sidebar-restaurant-name">{restaurantName}</div>
        )}
      </div>
      <nav className="nav flex flex-col ">
        <button
          type="button"
          className={`nav-link ${currentView === "home" ? "active" : ""}`}
          onClick={() => handleNav("home", "/dashboard")}
        >
          <Home size={18} aria-hidden="true" />
          <span className="label">Dashboard</span>
          {pendingCount > 0 && (
            <span className="count-badge" aria-label={`${pendingCount} pending orders`}>{pendingCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`nav-link ${currentView === "menu" ? "active" : ""}`}
          onClick={() => handleNav("menu", "/menu")}
        >
          <List size={18} aria-hidden="true" />
          <span className="label">Our Menu</span>
        </button>

        <button
          type="button"
          className={`nav-link ${currentView === "add" ? "active" : ""}`}
          onClick={() => handleNav("add", "/add-item")}
        >
          <PlusCircle size={18} aria-hidden="true" />
          <span className="label">Add Menu Item</span>
        </button>

        <button
          type="button"
          className={`nav-link ${currentView === "orders" ? "active" : ""}`}
          onClick={() => handleNav("orders", "/dashboard")}
        >
          <Receipt size={18} aria-hidden="true" />
          <span className="label">Order History</span>
        </button>
      </nav>

      <div className="shrink" >
        <button
          className="footer-btn"
          onClick={() => handleNav("profile", "/restaurant-profile")}
          aria-label="Restaurant profile"
          title="Restaurant profile"
        >
          <Store size={18} aria-hidden="true" />
          <span className="label">Profile</span>
          {/* plan badge (Free / Pro / Business) */}
          <span className={`profile-badge profile-${(restaurantPlan||"free").toLowerCase()}`}>{(restaurantPlan||"free").toUpperCase()}</span>
        </button>
        <button className="logout" onClick={handleLogout}>
          <LogOut size={18} aria-hidden="true" />
          <span className="label">Logout</span>
        </button>
      </div>
    </aside>
  );
}
