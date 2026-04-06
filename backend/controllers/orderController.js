import Order from "../models/Order.js";
import Restaurant from "../models/Restaurant.js";
import MenuItem from "../models/MenuItem.js";
import { getIO } from "../socket.js";
import { cache, seconds } from "../utils/cache.js";

export const createOrder = async (req, res) => {
  try {
    const {
      restaurantId,
      tableNumber,
      roomNumber,
      items,
      customerName,
      customerPhone,
      tipForChef,
      orderSessionId,
      source,
      clientLocation,
    } = req.body;

    if (!restaurantId || (!tableNumber && !roomNumber) || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "restaurantId, tableNumber or roomNumber, and items are required" });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const isRoom = !!roomNumber;
    const num = isRoom ? Number(roomNumber) : Number(tableNumber);
    const maxNum = isRoom ? restaurant.totalRooms : restaurant.totalTables;
    if (!Number.isFinite(num) || num < 1 || (maxNum && num > maxNum)) {
      return res.status(400).json({ message: `Invalid ${isRoom ? 'room' : 'table'} number` });
    }

    /* ---------- ITEM VALIDATION & SUBTOTAL ---------- */
    let subTotal = 0;
    const normalizedItems = [];

    for (const it of items) {
      const menuItem = await MenuItem.findById(it.item);
      if (!menuItem || String(menuItem.restaurant) !== String(restaurantId)) {
        return res.status(400).json({ message: "Invalid menu item in order" });
      }

      const qty = Math.max(1, Number(it.quantity || 1));
      const sizeKey = it.size;

      const sizes = menuItem.sizes || {};
      const isMap = typeof sizes.get === "function";

      let unitPrice = 0;

      // 🎯 Use price from request (frontend calculates offer prices) if provided
      if (it.price !== undefined && it.price !== null && Number(it.price) > 0) {
        unitPrice = Number(it.price);
      } else {
        // Fallback: Look up original price from menu item
        if (sizeKey) {
          const exists = isMap ? sizes.has(sizeKey) : sizes[sizeKey] !== undefined;
          if (exists) {
            unitPrice = Number(isMap ? sizes.get(sizeKey) : sizes[sizeKey]);
          }
        }

        // fallback to cheapest size
        if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
          const values = isMap ? Array.from(sizes.values()) : Object.values(sizes);
          const prices = values.map(Number).filter(n => n > 0);
          unitPrice = prices.length ? Math.min(...prices) : 0;
        }
      }

      if (unitPrice <= 0) {
        return res.status(400).json({ message: `Invalid price for item ${menuItem.name}` });
      }

      subTotal += unitPrice * qty;

      normalizedItems.push({
        item: menuItem._id,
        size: sizeKey,
        quantity: qty,
        price: unitPrice
      });
    }

    const total = subTotal;

    /* ---------- CUSTOMER DATA ---------- */
    const name = (customerName || "Guest").trim();
    let phone = String(customerPhone || "").replace(/\D+/g, "");
    
    // Generate random phone if blank (99 followed by 8 random digits)
    if (!phone) {
      phone = "99" + Math.floor(10000000 + Math.random() * 90000000).toString();
    } else if (phone.length < 7 || phone.length > 15) {
      return res.status(400).json({ message: "Invalid phone number" });
    }

    /* ---------- ORDER ID ---------- */
    const prefix = (restaurant.name || "").slice(0, 3).toUpperCase();
    const seq = await Restaurant.findByIdAndUpdate(
      restaurantId,
      { $inc: { seq: 1 } },
      { new: true }
    );

    const orderId = `${prefix}-${Date.now()}-${seq.seq}`;

    /* ---------- CREATE ORDER ---------- */
    const order = await Order.create({
      restaurant: restaurantId,
      ...(isRoom ? { roomNumber: num } : { tableNumber: num }),
      orderSessionId: orderSessionId || undefined,
      customerName: name,
      customerPhone: phone,
      tipForChef: tipForChef?.trim() || undefined,

      items: normalizedItems,

      subTotal,
      total,

      status: "pending",
      source: ["dine-in", "takeaway", "online"].includes(source) ? source : "dine-in",
      orderId,
      clientLocation
    });

    // Emit real-time new-order events to restaurant dashboard and the table (for public client)
    try {
      const io = getIO();
      if (io) {
        // populate for richer payload
        const populated = await Order.findById(order._id).populate({ path: "items.item", select: "name serveTime" });
        io.to(`restaurant:${restaurantId}`).emit('order:new', populated || order);
        const locationType = isRoom ? 'room' : 'table';
        io.to(`${locationType}:${restaurantId}:${num}`).emit('order:invoice', {
          _id: (populated || order)._id,
          orderId: (populated || order).orderId,
          orderSessionId: (populated || order).orderSessionId,
          status: (populated || order).status,
          total: (populated || order).total,
          subTotal: (populated || order).subTotal,
          items: (populated || order).items,
          customerName: (populated || order).customerName,
          customerPhone: (populated || order).customerPhone,
          tipForChef: (populated || order).tipForChef,
          createdAt: (populated || order).createdAt,
          message: 'Order received',
        });
      }
    } catch (err) { /* ignore emit errors */ }

    // Invalidate simple cached listing so dashboard fetches fresh data when needed
    try { cache.del(`orders:list:${restaurantId}`); } catch (e) {}

    return res.status(201).json(order);

  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({ message: "Failed to create order. Please try again." });
  }
};


// GET /api/orders (protected) - list orders for logged-in restaurant
export const getOrders = async (req, res) => {
  try {
    const { page = 1, view = 'history' } = req.query;
    const limit = 30;
    const skip = (Number(page) - 1) * limit;

    let query = { restaurant: req.restaurant._id };

    // For dashboard view, apply filters based on status requirements:
    // - Pending/Accepted: no time filter (show all)
    // - Paid: only last 24 hours
    if (view === 'dashboard') {
      // Calculate last 24 hours
      const now = new Date();
      const last24hrs = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Return paid orders from last 24 hours, plus all pending/accepted orders
      query = {
        restaurant: req.restaurant._id,
        $or: [
          { status: 'paid', createdAt: { $gte: last24hrs } },
          { status: 'pending' },
          { status: 'accepted' },
          { status: 'rejected' }
        ]
      };
    }

    const cacheKey = `orders:list:${req.restaurant._id}:${view}:${page}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [orders, totalCount] = await Promise.all([
      Order.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate({ path: "items.item", select: "name category" }),
      Order.countDocuments(query)
    ]);

    const response = {
      orders,
      pagination: {
        currentPage: Number(page),
        totalPages: Math.ceil(totalCount / limit),
        totalOrders: totalCount,
        ordersPerPage: limit
      }
    };

    cache.set(cacheKey, response, seconds(15)); // short TTL to keep fresh
    return res.json(response);
  } catch (err) {
    console.error("Get orders error:", err);
    return res.status(500).json({ message: "Failed to fetch orders. Please try again." });
  }
};

// GET /api/orders/export (protected) - export orders as CSV for the logged-in restaurant
export const exportOrders = async (req, res) => {
  try {
    const orders = await Order.find({ restaurant: req.restaurant._id })
      .sort({ createdAt: -1 })
      .populate({ path: "items.item", select: "name category" });

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    const filename = `orders-${req.restaurant._id}-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // CSV header
    const header = [
      "orderId",
      "createdAt",
      "tableNumber",
      "roomNumber",
      "customerName",
      "customerPhone",
      "status",
      "subTotal",
      "total",
      "tipForChef",
      "items"
    ];

    const csvEscape = (v) => {
      if (v === null || v === undefined) return "";
      const s = typeof v === "string" ? v : String(v);
      // escape double quotes by doubling them
      return `"${s.replace(/"/g, '""')}"`;
    };

    res.write(header.join(",") + "\n");

    for (const o of orders) {
      const itemsStr = (o.items || []).map(it => {
        const name = it.item?.name || "";
        const size = it.size || "";
        const qty = it.quantity || 0;
        const price = isFinite(Number(it.price)) ? Number(it.price) : "";
        return `${name}|${size}|${qty}|${price}`;
      }).join(";;");

      const row = [
        o._id,
        o.createdAt ? o.createdAt.toISOString() : "",
        o.tableNumber || "",
        o.roomNumber || "",
        o.customerName || "",
        o.customerPhone || "",
        o.status || "",
        isFinite(Number(o.total)) ? Number(o.total) : "",
        o.tipForChef || "",
        itemsStr
      ];
      res.write(row.map(csvEscape).join(",") + "\n");
    }

    res.end();
  } catch (err) {
    console.error("Export orders error:", err);
    return res.status(500).json({ message: "Failed to export orders. Please try again." });
  }
};

// PUT /api/orders/:id/status (protected) - update order status
export const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, refundAmount } = req.body || {};
    const allowed = ["pending", "accepted", "completed", "cancelled", "rejected", "refunded"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (String(order.restaurant) !== String(req.restaurant._id)) {
      return res.status(403).json({ message: "Not allowed" });
    }
    order.status = status;
    // set lifecycle timestamps
    if (status === 'accepted' && !order.acceptedAt) order.acceptedAt = new Date();
    if (status === 'completed') order.completedAt = new Date();
    if (status === 'refunded') {
      order.refundedAt = new Date();
      if (Number.isFinite(Number(refundAmount))) order.refundAmount = Number(refundAmount);
    }
    await order.save();
    const populated = await Order.findById(order._id).populate({ path: "items.item", select: "name category" });

    // Emit updates
    try {
      const io = getIO();
      if (io) {
        io.to(`restaurant:${order.restaurant}`).emit("order:update", populated || order);
        const locationType = order.roomNumber ? 'room' : 'table';
        const locationNum = order.roomNumber || order.tableNumber;
        io.to(`${locationType}:${order.restaurant}:${locationNum}`).emit("order:invoice", {
          _id: (populated || order)._id,
          orderId: (populated || order).orderId,
          orderSessionId: (populated || order).orderSessionId,
          status: (populated || order).status,
          total: (populated || order).total,
          subTotal: (populated || order).subTotal,
          items: (populated || order).items,
          customerName: (populated || order).customerName,
          customerPhone: (populated || order).customerPhone,
          tipForChef: (populated || order).tipForChef,
          updatedAt: (populated || order).updatedAt,
          message: status === "accepted" ? "Order accepted" : status === "rejected" || status === "cancelled" ? "Order rejected" : "Order update",
        });
      }
    } catch { }

    // Invalidate caches related to this restaurant
    try {
      cache.del(`orders:list:${order.restaurant}`);
      cache.delByPrefix(`analytics:${order.restaurant}`);
    } catch { }
    return res.json(populated || order);
  } catch (err) {
    console.error("Update order status error:", err);
    return res.status(500).json({ message: "Failed to update order status. Please try again." });
  }
};

// PUT /api/orders/:id (protected) - update order items, total, and table number
export const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, total, tableNumber, roomNumber } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Items are required" });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Verify ownership
    if (String(order.restaurant) !== String(req.restaurant._id)) {
      return res.status(403).json({ message: "Not authorized to update this order" });
    }

    // Validate location if provided
    let newLocationType = null;
    let newLocationNum = null;
    if (tableNumber !== undefined) {
      const num = Number(tableNumber);
      if (!Number.isFinite(num) || num < 1) {
        return res.status(400).json({ message: "Invalid table number" });
      }
      const restaurant = await Restaurant.findById(order.restaurant);
      if (restaurant && restaurant.totalTables && num > restaurant.totalTables) {
        return res.status(400).json({ message: `Table number must be between 1 and ${restaurant.totalTables}` });
      }
      newLocationType = 'table';
      newLocationNum = num;
    } else if (roomNumber !== undefined) {
      const num = Number(roomNumber);
      if (!Number.isFinite(num) || num < 1) {
        return res.status(400).json({ message: "Invalid room number" });
      }
      const restaurant = await Restaurant.findById(order.restaurant);
      if (restaurant && restaurant.totalRooms && num > restaurant.totalRooms) {
        return res.status(400).json({ message: `Room number must be between 1 and ${restaurant.totalRooms}` });
      }
      newLocationType = 'room';
      newLocationNum = num;
    }

    if (newLocationType) {
      // Store old location for socket notification
      const oldLocationType = order.roomNumber ? 'room' : 'table';
      const oldLocationNum = order.roomNumber || order.tableNumber;

      // Update order
      if (newLocationType === 'room') {
        order.roomNumber = newLocationNum;
        order.tableNumber = undefined;
      } else {
        order.tableNumber = newLocationNum;
        order.roomNumber = undefined;
      }

      // If location changed, emit to both old and new location rooms
      if (oldLocationNum !== newLocationNum || oldLocationType !== newLocationType) {
        try {
          const io = getIO();
          if (io) {
            // Notify old location that order has moved
            io.to(`${oldLocationType}:${order.restaurant}:${oldLocationNum}`).emit("order:moved", {
              orderId: order._id,
              oldLocation: oldLocationNum,
              newLocation: newLocationNum,
              oldType: oldLocationType,
              newType: newLocationType,
              message: "Order moved to different location"
            });
          }
        } catch { }
      }
    }

    // Update items and total
    order.items = items;
    const computedSubTotal = items.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 0)), 0);
    order.subTotal = (typeof total !== 'undefined' && total !== null) ? Number(total) : computedSubTotal;
    
    order.total = order.subTotal;

    await order.save();

    const populated = await Order.findById(order._id).populate({ path: "items.item", select: "name category" });

    // Emit real-time update
    try {
      const io = getIO();
      if (io) {
        // Emit to restaurant dashboard
        io.to(`restaurant:${order.restaurant}`).emit("order:update", populated || order);
        
        // Emit to current location room
        const locationType = order.roomNumber ? 'room' : 'table';
        const locationNum = order.roomNumber || order.tableNumber;
        io.to(`${locationType}:${order.restaurant}:${locationNum}`).emit("order:invoice", {
          _id: (populated || order)._id,
          orderId: (populated || order).orderId,
          orderSessionId: (populated || order).orderSessionId,
          status: (populated || order).status,
          total: (populated || order).total,
          subTotal: (populated || order).subTotal,
          items: (populated || order).items,
          customerName: (populated || order).customerName,
          customerPhone: (populated || order).customerPhone,
          tipForChef: (populated || order).tipForChef,
          updatedAt: (populated || order).updatedAt,
          message: 'Order updated',
        });
      }
    } catch { }

    // Invalidate cache
    try {
      cache.del(`orders:list:${order.restaurant}`);
      cache.delByPrefix(`analytics:${order.restaurant}`);
    } catch { }

    return res.json(populated || order);
  } catch (err) {
    console.error("Update order error:", err);
    return res.status(500).json({ message: "Failed to update order. Please try again." });
  }
};

// PUT /api/orders/:id/mark-paid (protected) - mark one order (and merged siblings) as paid
export const markOrderPaid = async (req, res) => {
  try {
    const { id } = req.params;
    const { paidMethod } = req.body || {};

    if (!['cash', 'online', 'unpaid'].includes(paidMethod)) {
      return res.status(400).json({ message: 'Invalid paidMethod' });
    }

    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (String(order.restaurant) !== String(req.restaurant._id)) {
      return res.status(403).json({ message: 'Not allowed' });
    }

    const phone = order.customerPhone || null;
    const tableNumber = order.tableNumber;
    const sessionVal = order.orderSessionId || null;

    const sessionCriteria = sessionVal
      ? { orderSessionId: sessionVal }
      : {
          $or: [
            { orderSessionId: { $exists: false } },
            { orderSessionId: null },
            { orderSessionId: '' }
          ]
        };

    const criteria = {
      restaurant: req.restaurant._id,
      customerPhone: phone,
      tableNumber,
      paid: 'unpaid',
      status: { $in: ['accepted', 'completed'] },
      ...sessionCriteria
    };

    const siblings = await Order.find(criteria);
    const updated = [];

    for (const s of siblings) {
      if (paidMethod !== 'unpaid') {
        s.paid = paidMethod;
        s.status = 'paid';
        s.paidAt = s.paidAt || new Date();
      } else {
        s.paid = 'unpaid';
      }
      await s.save();
      updated.push(s);
    }

    const populatedUpdated = await Order.find({ _id: { $in: updated.map(u => u._id) } }).populate({ path: 'items.item', select: 'name category' });

    // Emit updates for each changed order
    try {
      const io = getIO();
      if (io) {
        for (const pu of populatedUpdated) {
          io.to(`restaurant:${order.restaurant}`).emit('order:update', pu);
          const locationType = pu.roomNumber ? 'room' : 'table';
          const locationNum = pu.roomNumber || pu.tableNumber;
          io.to(`${locationType}:${order.restaurant}:${locationNum}`).emit('order:invoice', {
            _id: pu._id,
            orderId: pu.orderId,
            orderSessionId: pu.orderSessionId,
            status: pu.status,
            total: pu.total,
            subTotal: pu.subTotal,
            items: pu.items,
            customerName: pu.customerName,
            customerPhone: pu.customerPhone,
            tipForChef: pu.tipForChef,
            updatedAt: pu.updatedAt,
            message: paidMethod !== 'unpaid' ? 'Order paid' : 'Order updated',
          });
        }
      }
    } catch (e) {
      // swallow socket errors
    }

    // Invalidate caches related to this restaurant
    try {
      cache.del(`orders:list:${order.restaurant}`);
      cache.delByPrefix(`analytics:${order.restaurant}`);
    } catch {}

    return res.json({ updated: populatedUpdated });
  } catch (err) {
    console.error("Mark order paid error:", err);
    return res.status(500).json({ message: "Failed to process payment. Please try again." });
  }
}



// POST /api/orders/bulk-delete (protected) - cancel multiple orders by ids for logged-in restaurant (instead of deleting, change status to cancelled and set total to 0)
export const bulkDeleteOrders = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.map(String).filter(Boolean) : null;
    if (!ids || ids.length === 0) {
      return res.status(400).json({ message: "No order ids provided" });
    }
    // Only cancel orders belonging to this restaurant
    const criteria = { _id: { $in: ids }, restaurant: req.restaurant._id };
    const toCancel = await Order.find(criteria).select('_id');
    if (!toCancel.length) {
      return res.status(404).json({ message: "No matching orders found" });
    }
    // Update orders: set status to 'cancelled' and total to 0
    await Order.updateMany(
      { _id: { $in: toCancel.map(o => o._id) } },
      { status: 'cancelled', total: 0 }
    );
    try {
      const io = getIO();
      if (io) {
        // Notify restaurant room that orders were cancelled
        io.to(`restaurant:${req.restaurant._id}`).emit('order:cancelled', { ids: toCancel.map(o => String(o._id)) });
      }
    } catch { }
    try {
      cache.del(`orders:list:${req.restaurant._id}`);
      cache.delByPrefix(`analytics:${req.restaurant._id}`);
    } catch { }
    return res.json({ message: 'Cancelled orders', cancelledIds: toCancel.map(o => String(o._id)) });
  } catch (err) {
    console.error('Bulk cancel orders error:', err);
    return res.status(500).json({ message: "Failed to cancel orders. Please try again." });
  }
};

// GET /api/orders/items-sold (protected) - aggregate quantity sold per item for date range
export const getItemsSold = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    // Inclusive end: add end-of-day time if only date provided
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } } },
      { $unwind: '$items' },
      { $lookup: { from: 'menuitems', localField: 'items.item', foreignField: '_id', as: 'menuItem' } },
      { $unwind: '$menuItem' },
      { $group: { _id: '$items.item', itemName: { $first: '$menuItem.name' }, quantitySold: { $sum: '$items.quantity' } } },
      { $sort: { quantitySold: -1 } }
    ];
    const key = `analytics:itemsSold:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);
    const results = await Order.aggregate(pipeline);
    cache.set(key, results, seconds(60));
    return res.json(results);
  } catch (err) {
    console.error('Items sold analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/revenue (protected) - aggregate total revenue per day (base order.total)
export const getRevenueSeries = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    // Interpret start/end as local dates and convert to UTC bounds for Asia/Kolkata (UTC+5:30)
    const kolkataOffset = 5.5 * 60 * 60 * 1000;
    const toKolkataBounds = (d) => {
      const date = new Date(d);
      // shift to kolkata then set local day boundaries via UTC helpers
      const kolkata = new Date(date.getTime() + kolkataOffset);
      kolkata.setUTCHours(0, 0, 0, 0);
      const startUTC = new Date(kolkata.getTime() - kolkataOffset);
      kolkata.setUTCHours(23, 59, 59, 999);
      const endUTC = new Date(kolkata.getTime() - kolkataOffset);
      return { startUTC, endUTC };
    };

    const startDate = start ? toKolkataBounds(start).startUTC : toKolkataBounds(new Date(Date.now() - 6 * 24 * 60 * 60 * 1000)).startUTC; // default last 7 days (inclusive)
    const endDate = end ? toKolkataBounds(end).endUTC : toKolkataBounds(new Date()).endUTC;

    // Only include orders that were paid (cash or online) for analytics, exclude unpaid orders
    const match = { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } };

    // Revenue per Kolkata date (group aware of timezone)
    const seriesPipeline = [
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } }, totalRevenue: { $sum: '$total' }, orderCount: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { date: '$_id', totalRevenue: 1, orderCount: 1, _id: 0 } }
    ];

    // Totals by payment method across the same matched range
    const totalsByMethodPipeline = [
      { $match: match },
      { $group: { _id: '$paid', amount: { $sum: '$total' }, count: { $sum: 1 } } }
    ];

    const cacheKey = `analytics:revenue:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [seriesResults, methodTotals] = await Promise.all([
      Order.aggregate(seriesPipeline),
      Order.aggregate(totalsByMethodPipeline)
    ]);

    const totals = { cash: { amount: 0, count: 0 }, online: { amount: 0, count: 0 }, unpaid: { amount: 0, count: 0 } };
    for (const t of methodTotals) {
      const key = String(t._id || 'unpaid');
      if (!totals[key]) totals[key] = { amount: 0, count: 0 };
      totals[key].amount = Number(t.amount || 0);
      totals[key].count = Number(t.count || 0);
    }

    const response = { series: seriesResults, totalsByMethod: totals };
    cache.set(cacheKey, response, seconds(60));
    return res.json(response);
  } catch (err) {
    console.error('Revenue analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/category-stats (protected) - quantity & revenue per category
export const getCategoryStats = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } } },
      { $unwind: '$items' },
      { $lookup: { from: 'menuitems', localField: 'items.item', foreignField: '_id', as: 'menuItem' } },
      { $unwind: '$menuItem' },
      { $group: { _id: { $ifNull: ['$menuItem.category', 'Uncategorized'] }, quantitySold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } } } },
      { $sort: { revenue: -1 } },
      { $project: { category: '$_id', quantitySold: 1, revenue: 1, _id: 0 } }
    ];
    const key = `analytics:category:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);
    const results = await Order.aggregate(pipeline);
    cache.set(key, results, seconds(60));
    return res.json(results);
  } catch (err) {
    console.error('Category stats analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/dietary-mix (protected) - distribution of veg/non-veg/none
export const getDietaryMix = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } } },
      { $unwind: '$items' },
      { $lookup: { from: 'menuitems', localField: 'items.item', foreignField: '_id', as: 'menuItem' } },
      { $unwind: '$menuItem' },
      { $group: { _id: '$menuItem.type', quantitySold: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } } } },
      { $project: { type: { $ifNull: ['$_id', 'none'] }, quantitySold: 1, revenue: 1, _id: 0 } }
    ];
    const key = `analytics:diet:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);
    const results = await Order.aggregate(pipeline);
    cache.set(key, results, seconds(60));
    return res.json(results);
  } catch (err) {
    console.error('Dietary mix analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/spice-distribution (protected) - quantities per spiceLevel (0-3)
export const getSpiceDistribution = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } } },
      { $unwind: '$items' },
      { $lookup: { from: 'menuitems', localField: 'items.item', foreignField: '_id', as: 'menuItem' } },
      { $unwind: '$menuItem' },
      { $group: { _id: '$menuItem.spiceLevel', quantitySold: { $sum: '$items.quantity' } } },
      { $sort: { _id: 1 } },
      { $project: { spiceLevel: '$_id', quantitySold: 1, _id: 0 } }
    ];
    const key = `analytics:spice:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    const raw = cached || await Order.aggregate(pipeline);
    // ensure all spice levels 0-3 exist
    const complete = [0, 1, 2, 3].map(level => raw.find(r => r.spiceLevel === level) || { spiceLevel: level, quantitySold: 0 });
    if (!cached) cache.set(key, raw, seconds(60));
    return res.json(complete);
  } catch (err) {
    console.error('Spice distribution analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/hourly-revenue (protected) - revenue grouped by hour for selected range (up to 2 days recommended)
export const getHourlyRevenue = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date();
    const endDate = end ? new Date(end) : new Date(startDate);
    endDate.setHours(23, 59, 59, 999);
    // Prevent overly large range for hourly resolution (limit to 3 days)
    if ((endDate - startDate) / (24 * 60 * 60 * 1000) > 3) {
      return res.status(400).json({ message: 'Hourly analytics limited to 3 day ranges' });
    }
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } } },
      { $group: { _id: { hour: { $hour: '$createdAt' }, day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { '_id.day': 1, '_id.hour': 1 } },
      { $project: { hour: '$_id.hour', day: '$_id.day', revenue: 1, orders: 1, _id: 0 } }
    ];
    const key = `analytics:hourly:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);
    const results = await Order.aggregate(pipeline);
    cache.set(key, results, seconds(60));
    return res.json(results);
  } catch (err) {
    console.error('Hourly revenue analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/source-breakdown (protected/business) - distribution of orders & revenue per source
export const getSourceBreakdown = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } } },
      { $group: { _id: '$source', orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      { $project: { source: '$_id', orders: 1, revenue: 1, _id: 0 } },
      { $sort: { revenue: -1 } }
    ];
    const key = `analytics:source:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    if (cached) return res.json(cached);
    const results = await Order.aggregate(pipeline);
    cache.set(key, results, seconds(60));
    return res.json(results);
  } catch (err) {
    console.error('Source breakdown analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/customer-analytics (protected/business)
export const getCustomerAnalytics = async (req, res) => {
  try {
    const { start, end, limit } = req.query || {};
    const topLimit = Math.min(Number(limit) || 5, 25);
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } } },
      { $group: { _id: '$customerPhone', orderCount: { $sum: 1 }, totalSpend: { $sum: '$total' } } },
      { $sort: { totalSpend: -1 } }
    ];
    const key = `analytics:customers:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}:${topLimit}`;
    const cached = cache.get(key);
    const customers = cached || await Order.aggregate(pipeline);
    const totalCustomers = customers.filter(c => c._id).length;
    const repeatCustomers = customers.filter(c => c._id && c.orderCount > 1).length;
    const totalRevenue = customers.reduce((s, c) => s + c.totalSpend, 0);
    const avgSpendPerCustomer = totalCustomers ? totalRevenue / totalCustomers : 0;
    const retentionRate = totalCustomers ? (repeatCustomers / totalCustomers) : 0;
    const topCustomers = customers.slice(0, topLimit).map(c => ({ customerPhone: c._id, orders: c.orderCount, spend: c.totalSpend }));
    // ratings aggregate
    const ratingAgg = cached ? [] : await Order.aggregate([
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, rating: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, count: { $sum: 1 } } }
    ]);
    const avgRating = ratingAgg[0]?.avgRating || null;
    const response = { totalCustomers, repeatCustomers, retentionRate, avgSpendPerCustomer, totalRevenue, avgRating, topCustomers };
    if (!cached) cache.set(key, customers, seconds(60));
    return res.json(response);
  } catch (err) {
    console.error('Customer analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/orders-by-weekday (protected/business) - counts & revenue per weekday
export const getOrdersByWeekday = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, status: { $nin: ['cancelled', 'rejected'] }, paid: { $in: ['cash', 'online'] } } },
      { $group: { _id: { $dayOfWeek: '$createdAt' }, orders: { $sum: 1 }, revenue: { $sum: '$total' } } },
      { $project: { weekday: { $subtract: ['$_id', 1] }, orders: 1, revenue: 1, _id: 0 } }, // 0=Sunday
      { $sort: { weekday: 1 } }
    ];
    const key = `analytics:weekday:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    const results = cached || await Order.aggregate(pipeline);
    const complete = Array.from({ length: 7 }).map((_, i) => results.find(r => r.weekday === i) || { weekday: i, orders: 0, revenue: 0 });
    if (!cached) cache.set(key, results, seconds(60));
    return res.json(complete);
  } catch (err) {
    console.error('Weekday orders analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/cancellations (protected/business) - cancelled/rejected/refunded statistics
export const getCancellations = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ];
    const key = `analytics:cancellations:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    const grouped = cached || await Order.aggregate(pipeline);
    const totalOrders = grouped.reduce((s, g) => s + g.count, 0);
    const cancelled = grouped.find(g => g._id === 'cancelled')?.count || 0;
    const rejected = grouped.find(g => g._id === 'rejected')?.count || 0;
    const refunded = grouped.find(g => g._id === 'refunded')?.count || 0;
    const cancellationRate = totalOrders ? (cancelled + rejected) / totalOrders : 0;
    const response = { totalOrders, cancelled, rejected, refunded, cancellationRate };
    if (!cached) cache.set(key, grouped, seconds(60));
    return res.json(response);
  } catch (err) {
    console.error('Cancellation analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};

// GET /api/orders/prep-time (protected/business) - average prep time (acceptedAt->completedAt)
export const getAveragePrepTime = async (req, res) => {
  try {
    const { start, end } = req.query || {};
    const restaurantId = req.restaurant?._id;
    if (!restaurantId) return res.status(403).json({ message: 'Restaurant context missing' });
    const startDate = start ? new Date(start) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const endDate = end ? new Date(end) : new Date();
    endDate.setHours(23, 59, 59, 999);
    const pipeline = [
      { $match: { restaurant: restaurantId, createdAt: { $gte: startDate, $lte: endDate }, acceptedAt: { $exists: true }, completedAt: { $exists: true }, paid: { $in: ['cash', 'online'] } } },
      { $project: { durationMs: { $subtract: ['$completedAt', '$acceptedAt'] } } },
      { $group: { _id: null, avgDurationMs: { $avg: '$durationMs' }, samples: { $sum: 1 } } }
    ];
    const key = `analytics:prep:${restaurantId}:${startDate.toISOString()}:${endDate.toISOString()}`;
    const cached = cache.get(key);
    const agg = cached || await Order.aggregate(pipeline);
    const avgDurationMs = agg[0]?.avgDurationMs || 0;
    if (!cached) cache.set(key, agg, seconds(60));
    return res.json({ avgDurationMs, samples: agg[0]?.samples || 0 });
  } catch (err) {
    console.error('Prep time analytics error:', err);
    return res.status(500).json({ message: "Failed to fetch analytics. Please try again." });
  }
};
