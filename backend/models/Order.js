import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema({
  item: { type: mongoose.Schema.Types.ObjectId, ref: "MenuItem", required: true },
  size: { type: String },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number }, // unit price captured at order time
});

const orderSchema = new mongoose.Schema(
  {
    orderId: { type: String, unique: true, required: true }, // Unique order identifier
    restaurant: { type: mongoose.Schema.Types.ObjectId, ref: "Restaurant", required: true },
    tableNumber: { type: Number, min: 1 },
    roomNumber: { type: Number, min: 1 },
    orderSessionId: { type: String, trim: true },
    customerName: { type: String, trim: true },
    customerPhone: { type: String, trim: true },
    // message for chef - capped to 200 chars
    tipForChef: { type: String, trim: true, maxlength: 200 },
    items: { type: [orderItemSchema], default: [] },
    status: { type: String, enum: ["pending", "accepted", "completed", "cancelled", "rejected", "refunded", "paid"], default: "pending" },
    paid: { type: String, enum: ["cash", "online", "unpaid"], default: "unpaid" },
    subTotal: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    // order source channel
    source: { type: String, enum: ["dine-in", "takeaway", "online"], default: "dine-in" },
    // lifecycle timestamps for analytics
    acceptedAt: { type: Date },
    completedAt: { type: Date },
    refundedAt: { type: Date },
    refundAmount: { type: Number, default: 0 },
    // optional customer feedback (if collected)
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, trim: true, maxlength: 2000 },
    // captured client geolocation at order time (if provided)
    clientLocation: {
      lat: { type: Number, min: -90, max: 90 },
      lng: { type: Number, min: -180, max: 180 },
      accuracy: { type: Number, min: 0 }
    },
  },
  { timestamps: true }
);

// Ensure a compound index for restaurant and orderId uniqueness
orderSchema.index({ restaurant: 1, orderId: 1 }, { unique: true });

const Order = mongoose.model("Order", orderSchema);
export default Order;
