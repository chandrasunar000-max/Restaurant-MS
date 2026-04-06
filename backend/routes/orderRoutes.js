import express from "express";
import { createOrder, getOrders, updateOrderStatus, updateOrder, exportOrders, bulkDeleteOrders, markOrderPaid } from "../controllers/orderController.js";
// import { invoicePdf, combinedInvoicePdf, combinedInvoicePdfGet } from "../controllers/pdfController.js";
import { protect } from "../middleware/authMiddleware.js";
import rateLimiter from "../middleware/rateLimiter.js";
import geofence from "../middleware/geofence.js";

const router = express.Router();

// IMPORTANT: Specific routes MUST come before generic /:id routes

// public create order (rate limited + optional geofence)
router.post(
	"/",
	rateLimiter({ windowMs: 60_000, max: 20 }), // tighter limit for public create
	geofence,
	createOrder
);

// export orders as CSV - MUST be before /:id routes
router.get("/export", protect, rateLimiter({ windowMs: 60_000, max: 10 }), exportOrders);

// restaurant reads its orders - generic catch-all GET
router.get("/", protect, getOrders);

// Generic /:id routes MUST come LAST
// restaurant updates an order status
router.put("/:id/status", protect, rateLimiter({ windowMs: 60_000, max: 120 }), updateOrderStatus);

// mark an order (and siblings) as paid and optionally merge their items
router.put('/:id/mark-paid', protect, rateLimiter({ windowMs: 60_000, max: 60 }), markOrderPaid);

// restaurant updates order items
router.put("/:id", protect, rateLimiter({ windowMs: 60_000, max: 120 }), updateOrder);

// delete multiple orders
router.post('/bulk-delete', protect, rateLimiter({ windowMs: 300_000, max: 20 }), bulkDeleteOrders);

export default router;
