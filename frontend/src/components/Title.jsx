import React from "react";
import "../assets/css/Title.css";

export default function Title({
  title = "Welcome to your dashboard",
  subtitle = "Manage your menu, orders and settings",
  branch = "",
  actions = null,
  logoUrl = null,
}) {
  return (
    <section className="dashboard-hero premium-surface">
      <div className="hero-left-row">
        {logoUrl && <img src={logoUrl} alt="Logo" className="hero-logo" />}
        <div className="hero-text">
          <h1 className="hero-title fancy-title gradient-title">{title}</h1>
          {branch && (
            <div className="hero-branch" aria-label="Restaurant branch">{branch}</div>
          )}
          <p className="hero-sub">{subtitle}</p>
        </div>
      </div>
      {actions && <div className="hero-actions">{actions}</div>}
    </section>
  );
}
