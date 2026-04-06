import React from "react";

const MenuCardSkeleton = ({ isMobile }) => {
  return (
    <div
      className="card public-card animate-pulse"
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: "#fff",
        borderRadius: "16px",
        overflow: "hidden",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
        border: "1px solid rgba(0,0,0,0.05)",
        cursor: "default"
      }}
    >
      {/* Image Skeleton */}
      <div
        style={{
          position: "relative",
          aspectRatio: "4/3",
          width: "100%",
          overflow: "hidden",
          backgroundColor: "#e5e7eb"
        }}
      />

      {/* Content Skeleton */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1, gap: "8px" }}>
        {/* Title Skeleton - 2 lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <div
            style={{
              height: "16px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              width: "85%"
            }}
          />
          <div
            style={{
              height: "16px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              width: "60%"
            }}
          />
        </div>

        {/* Spice Level Skeleton */}
        <div
          style={{
            height: "12px",
            backgroundColor: "#e5e7eb",
            borderRadius: "4px",
            width: "40%",
            marginTop: "4px"
          }}
        />

        {/* Description Skeleton - 2 lines */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
          <div
            style={{
              height: "12px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              width: "100%"
            }}
          />
          <div
            style={{
              height: "12px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              width: "75%"
            }}
          />
        </div>

        {/* Footer Skeleton - Price and Button */}
        <div
          style={{
            marginTop: "auto",
            paddingTop: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "8px"
          }}
        >
          {/* Price Skeleton */}
          <div
            style={{
              height: "18px",
              backgroundColor: "#e5e7eb",
              borderRadius: "4px",
              width: "50px"
            }}
          />

          {/* Button Skeleton */}
          <div
            style={{
              height: "32px",
              backgroundColor: "#e5e7eb",
              borderRadius: "6px",
              width: "70px"
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MenuCardSkeleton;
