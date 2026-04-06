import express from 'express';
import Restaurant from '../models/Restaurant.js';
import { generateToken } from '../utils/generateToken.js';
import { protect } from '../middleware/authMiddleware.js';
const router = express.Router();

// SIGNUP route
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if restaurant already exists
    const existing = await Restaurant.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already exists' });

    // Create restaurant
    const restaurant = await Restaurant.create({ name, email, password });
    const token = generateToken(restaurant._id);

    res.status(201).json({
      _id: restaurant._id,
      name: restaurant.name,
      email: restaurant.email,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// LOGIN route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(400).json({ message: 'Invalid credentials' });

    const isMatch = await restaurant.comparePassword(password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = generateToken(restaurant._id);

    res.json({
      _id: restaurant._id,
      name: restaurant.name,
      email: restaurant.email,
      token,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/dashboard', protect, (req, res) => {
  res.json({
    message: `Welcome, ${req.restaurant.name}!`,
    restaurant: req.restaurant,
  });
});

export default router;
