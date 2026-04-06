import React, { useState } from "react";
import { X, Flame, Leaf, Drumstick, Info, ZoomIn } from "lucide-react";



export default function MenuItemPreview({
  item,
  onClose,
  addToCart,
  getImageUrl,
  isMobile
}) {
  const [isImageFullscreen, setIsImageFullscreen] = useState(false);

  // Theme Constants
  const darkRed = "#991b1b";
  const darkGrey = "#1f2937";
  const mediumGrey = "#6b7280";
  const borderColor = "#e5e7eb";

  return (
    <>
      <style>
        {`
          @keyframes slide-up-fade {
            0% { transform: translateY(20px); opacity: 0; }
            100% { transform: translateY(0); opacity: 1; }
          }
          @keyframes zoom-in {
            0% { transform: scale(0.9); opacity: 0; }
            100% { transform: scale(1); opacity: 1; }
          }
        `}
      </style>

      {/* --- 1. MAIN MODAL BACKDROP --- */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-0"
        onClick={onClose}
        style={{ paddingBottom: isMobile ? "30%" : "20px" }}
      >
        {/* Card Container */}
        <div
          className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          onClick={(e) => e.stopPropagation()}
          style={{ animation: "slide-up-fade 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
        >
          
          {/* IMAGE HEADER (Clickable) */}
          <div 
            className="relative w-full h-64 shrink-0 bg-gray-100 group cursor-pointer overflow-hidden"
            onClick={() => item.image && setIsImageFullscreen(true)}
          >
            {/* Close Button (For Main Modal) */}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="absolute top-4 right-4 z-20 flex items-center justify-center px-3 py-1.5 bg-white/90 backdrop-blur rounded-full text-red-800 text-xs font-bold shadow-lg hover:bg-white transition-transform active:scale-95"
            >
              Close
            </button>

            {item.image ? (
              <>
                <img
                  src={getImageUrl(item.image)}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                
                {/* Zoom Hint Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                  <div className="bg-black/50 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm transform translate-y-2 group-hover:translate-y-0">
                    <ZoomIn size={20} />
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50 text-5xl">
                🍽️
              </div>
            )}
            
            {/* Category Tag */}
            {item.category && (
              <div className="absolute bottom-4 left-4 z-10 bg-black/70 backdrop-blur-md text-white text-xs font-semibold px-3 py-1 rounded-full border border-white/20">
                {item.category}
              </div>
            )}
          </div>

          {/* SCROLLABLE CONTENT */}
          <div className="flex-1 overflow-y-auto p-5">
            
            {/* Title & Badges */}
            <div className="flex justify-between items-start gap-3 mb-2">
              <h2 className="text-xl font-bold leading-tight" style={{ color: darkGrey }}>
                {item.name}
              </h2>
              
              <div className="flex items-center gap-2 shrink-0">
                {item.type && item.type.toLowerCase() !== 'none' && (
                  <div 
                    className={`flex items-center justify-center w-7 h-7 rounded-full ${
                      item.type.toLowerCase() === 'veg' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}
                    title={item.type}
                  >
                    {item.type.toLowerCase() === 'veg' ? <Leaf size={14} /> : <Drumstick size={14} />}
                  </div>
                )}
                {Number(item.spiceLevel) > 0 && (
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-100 text-orange-600">
                    <Flame size={14} fill="currentColor" />
                  </div>
                )}
              </div>
            </div>


            {/* Description */}
            {item.description && (
              <div className="flex gap-2 text-sm leading-relaxed mb-6" style={{ color: mediumGrey }}>
                <Info size={16} className="shrink-0 mt-0.5 opacity-60" />
                <p>{item.description}</p>
              </div>
            )}

            <div className="h-px w-full bg-gray-100 mb-6" />

            {/* SIZE SELECTION */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-3 text-gray-400">
                Select Size to Add
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {Object.entries(item.sizes || {}).map(([size, price]) => {
                  if (!price) return null;

                  return (
                    <button
                      key={size}
                      onClick={() => { addToCart(item, size); onClose(); }}
                      className="group relative flex items-center justify-between px-3 py-2 rounded-xl border transition-all duration-200 active:scale-[0.98]"
                      style={{
                        backgroundColor: "#fff",
                        borderColor: borderColor,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
                      }}
                    >
                      <div 
                        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-5 transition-opacity pointer-events-none"
                        style={{ backgroundColor: darkRed }}
                      />
                      <span className="font-semibold text-gray-700 group-hover:text-gray-900">{size}</span>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm font-bold" style={{ color: darkRed }}>₹{Number(price).toFixed(2)}</span>
                        <div 
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white text-lg font-medium leading-none pb-0.5"
                          style={{ backgroundColor: darkRed }}
                        >+</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- 2. FULL SCREEN IMAGE VIEWER (Z-Index 60 to sit above modal) --- */}
      {isImageFullscreen && item.image && (
        <div 
          className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setIsImageFullscreen(false)}
          style={{ animation: "zoom-in 0.2s ease-out" }}
        >
          {/* Close Button for Viewer */}
          <button 
            className="absolute top-6 right-6 text-white/80 hover:text-white bg-white/10 p-2 rounded-full backdrop-blur-md transition-colors"
            onClick={() => setIsImageFullscreen(false)}
          >
            <X size={28} />
          </button>

          {/* The Image */}
          <img
            src={getImageUrl(item.image)}
            alt={item.name}
            className="max-w-full max-h-full object-contain shadow-2xl rounded-lg"
            onClick={(e) => e.stopPropagation()} // Prevent clicking image from closing
          />

          {/* Caption */}
          <div className="absolute bottom-6 left-0 right-0 text-center pointer-events-none">
            <span className="bg-black/60 text-white px-4 py-2 rounded-full text-sm font-medium backdrop-blur-md">
              {item.name}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
