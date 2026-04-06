import mongoose from "mongoose";

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  category: { type: String }, // e.g. "Beverage", "Main Course"

  // dietary type and spice level
  type: { type: String, enum: ["veg", "non-veg", "none"], default: "none" },
  spiceLevel: { type: Number, enum: [0, 1, 2, 3], default: 0 },
  // estimated serving time in minutes (used for customer progress indicators)
  serveTime: { type: Number, default: 15, min: 1 },
  
  // 👇 Size-price variants (flexible keys; at least one required)
  sizes: { type: Map, of: Number, default: undefined },

  // whether the item is available for ordering (defaults to true)
  available: { type: Boolean, default: true },

  // track how many times this item has been ordered (for popularity sorting)
  orderCount: { type: Number, default: 0, min: 0 },

  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },

  
});

// ✅ Custom validation — at least one size price must be entered
menuItemSchema.pre("validate", function (next) {
  const s = this.sizes;
  if (!s || (s instanceof Map && s.size === 0) || (typeof s === 'object' && Object.keys(s).length === 0)) {
    return next(new Error("At least one size price must be provided."));
  }
  // 'sizes' may be a plain object or a Map depending on how it's set
  let count = 0;
  if (s instanceof Map) {
    for (const [k, v] of s.entries()) {
      if (k && v != null && !Number.isNaN(Number(v)) && Number(v) > 0) count++;
    }
  } else if (typeof s === 'object') {
    for (const k of Object.keys(s)) {
      const v = s[k];
      if (k && v != null && !Number.isNaN(Number(v)) && Number(v) > 0) count++;
    }
  }
  if (count === 0) return next(new Error("At least one size price must be provided with a positive value."));
  next();
});

const MenuItem = mongoose.model("MenuItem", menuItemSchema);
export default MenuItem;
