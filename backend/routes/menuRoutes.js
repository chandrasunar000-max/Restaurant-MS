import express from 'express';
import MenuItem from '../models/MenuItem.js';
import { protect } from '../middleware/authMiddleware.js';
import { createMenuItem, getMenuItems } from "../controllers/menuControllers.js";

const router = express.Router();

// POST → Create menu item
router.post("/", protect, createMenuItem);

// Get all menu items for a restaurant
router.get("/", protect, getMenuItems);

// Update menu item
router.put('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findOneAndUpdate(
      { _id: req.params.id, restaurant: req.restaurant._id },
      req.body,
      { new: true }
    );
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json(item);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete menu item
router.delete('/:id', protect, async (req, res) => {
  try {
    const item = await MenuItem.findOneAndDelete({
      _id: req.params.id,
      restaurant: req.restaurant._id
    });
    if (!item) return res.status(404).json({ message: 'Item not found' });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
