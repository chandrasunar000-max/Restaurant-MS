import express from "express";
import mongoose from "mongoose";
import MenuItem from "../models/MenuItem.js";
import Restaurant from "../models/Restaurant.js";
import Order from "../models/Order.js";
import { getIO } from "../socket.js";

const router = express.Router();

// GET /api/public/menu/:restaurantId - list all menu items for a restaurant (public)
router.get("/menu/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }


    let items = await MenuItem.find({ restaurant: restaurantId })
      .select("+lovedBy")
      .sort({ orderCount: -1, createdAt: -1 })
      .lean();


    const transformedItems = items.map(item => {
      const itemObject = {
        ...item,
        sizes: item.sizes ? (item.sizes instanceof Map ?
  Object.fromEntries(item.sizes) : item.sizes) : {}

      };

      return itemObject;
    });

    return res.json(transformedItems);

  } catch (err) {
    console.error("Public menu error:", err);
    return res.status(500).json({ message: err.message });
  }
});



// GET /api/public/restaurant/:restaurantId - public restaurant info
router.get("/restaurant/:restaurantId", async (req, res) => {
  try {
    const { restaurantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ message: "Invalid restaurant id" });
    }
    const r = await Restaurant.findById(restaurantId).select("name branch plan esewaId address pincode phone username image");
    if (!r) return res.status(404).json({ message: "Restaurant not found" });
    return res.json(r);
  } catch (err) {
    console.error("Public restaurant info error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/public/restaurant/by-username/:username - public restaurant info by username
router.get("/restaurant/by-username/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const r = await Restaurant.findOne({ username }).select("name branch plan esewaId address pincode phone totalTables username");
    if (!r) {
      return res.status(404).json({ message: "Restaurant not found" });
    }
    return res.json(r);
  } catch (err) {
    console.error("Public restaurant info error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/public/orders/:restaurantId/:tableNumber - recent orders for a table (public)
router.get("/orders/:restaurantId/:tableNumber", async (req, res) => {
  try {
    const { restaurantId, tableNumber } = req.params;
    const { sessionId } = req.query;
    const tnum = Number(tableNumber);
    if (!Number.isFinite(tnum) || tnum < 1) return res.status(400).json({ message: "Invalid table number" });
    
    // Criteria: must match restaurant AND table AND sessionId
    const criteria = { 
      restaurant: restaurantId, 
      tableNumber: tnum,
      $or: []
    };
    
    if (sessionId) criteria.$or.push({ orderSessionId: sessionId });
    
    if (criteria.$or.length === 0) return res.json([]);

    const orders = await Order.find(criteria)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({ path: "items.item", select: "name serveTime" })
      .select("_id orderId status total createdAt tipForChef items");
    // shape response with item names & serveTime
    const shaped = orders.map(o => ({
      _id: o._id,
      orderId: o.orderId,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      tipForChef: o.tipForChef,
      items: (o.items || []).map(it => ({
        name: it.item?.name || '',
        serveTime: it.item?.serveTime || 15,
        quantity: it.quantity,
        size: it.size,
        price: it.price,
        item: it.item,
      }))
    }));
    return res.json(shaped);
  } catch (err) {
    console.error("Public recent orders error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// GET /api/public/orders/:restaurantId/room/:roomNumber - recent orders for a room (public)
router.get("/orders/:restaurantId/room/:roomNumber", async (req, res) => {
  try {
    const { restaurantId, roomNumber } = req.params;
    const { sessionId } = req.query;
    const rnum = Number(roomNumber);
    if (!Number.isFinite(rnum) || rnum < 1) return res.status(400).json({ message: "Invalid room number" });
    
    const criteria = { 
      restaurant: restaurantId, 
      roomNumber: rnum,
      $or: []
    };
    
    if (sessionId) criteria.$or.push({ orderSessionId: sessionId });
    
    if (criteria.$or.length === 0) return res.json([]);
    
    const orders = await Order.find(criteria)
      .sort({ createdAt: -1 })
      .limit(10)
      .populate({ path: "items.item", select: "name serveTime" })
      .select("_id orderId status total createdAt tipForChef items");
    // shape response with item names & serveTime
    const shaped = orders.map(o => ({
      _id: o._id,
      orderId: o.orderId,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      tipForChef: o.tipForChef,
      items: (o.items || []).map(it => ({
        name: it.item?.name || '',
        serveTime: it.item?.serveTime || 15,
        quantity: it.quantity,
        size: it.size,
        price: it.price,
        item: it.item,
      }))
    }));
    return res.json(shaped);
  } catch (err) {
    console.error("Public recent orders error:", err);
    return res.status(500).json({ message: err.message });
  }
});

// POST /api/public/orders/:restaurantId/:orderId/cancel - cancel a pending order by session
router.post('/orders/:restaurantId/:orderId/cancel', async (req, res) => {
  try {
    const { restaurantId, orderId } = req.params;
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ message: 'Missing sessionId' });
    const order = await Order.findOne({ restaurant: restaurantId, orderId });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.orderSessionId !== sessionId) return res.status(403).json({ message: 'Not allowed to cancel this order' });
    if (order.status !== 'pending') return res.status(400).json({ message: 'Only pending orders can be cancelled' });
    order.status = 'cancelled';
    await order.save();
    const io = getIO();
    if (io) {
      io.to(`restaurant:${restaurantId}`).emit('order:update', order);
      io.to(`table:${restaurantId}:${order.tableNumber}`).emit('order:invoice', {
        orderId: order.orderId,
        orderSessionId: order.orderSessionId,
        status: order.status,
        total: order.total,
        items: order.items,
        tipForChef: order.tipForChef,
        updatedAt: order.updatedAt,
        message: 'Order cancelled by customer'
      });
    }
    return res.json({ message: 'Order cancelled', orderId: order.orderId });
  } catch (err) {
    console.error('Public cancel order error:', err);
    return res.status(500).json({ message: err.message });
  }
});


export default router;
