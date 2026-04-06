import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cors from 'cors';
import http from 'http';
import authRoutes from './routes/authRoutes.js';
import uploadRoutes from "./routes/uploadRoutes.js";
import menuRoutes from './routes/menuRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import restaurantRoutes from './routes/restaurantRoutes.js';
import { initSocket } from './socket.js';
import requestId from './middleware/requestId.js';
import { scheduleOrderCountReset } from './jobs/resetOrderCount.js';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();
const app = express();

// ES module-friendly __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CORS: allow specific origin if provided,


const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors({ origin: allowedOrigin || '*'}));


app.use(express.json());
app.use(requestId());

// MongoDB connection (fail fast if missing)
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('❌ MONGO_URI not set. Exiting to avoid buffered timeouts.');
  process.exit(1);
}
mongoose.connect(mongoUri)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Failed:', err.message);
    // Exit so platform restarts and we don't serve broken endpoints
    process.exit(1);
  });

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);
app.use("/api/restaurants", restaurantRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/public", publicRoutes);

// Serve uploaded files from the 'backend/uploads' directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(
  "/uploads",
  express.static("/data/uploads", {
    maxAge: "30d",       // cache for 30 days
    immutable: true,    // image never changes
    etag: true
  })
);

app.use("/api", uploadRoutes);

// Simple health / root check (used by Render or other health monitors)
app.get('/', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});


// 404 handler
app.use((req, res, _next) => {
  res.status(404).json({ message: 'Not Found', path: req.originalUrl, requestId: req.id });
});

// Centralized error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  const status = err.statusCode || err.status || 500;
  const payload = {
    message: err.message || 'Internal Server Error',
    requestId: req.id,
  };
  if (process.env.NODE_ENV !== 'production') {
    payload.stack = err.stack;
  }
  console.error(`❌ [${req.id}]`, err);
  res.status(status).json(payload);
});


const server = http.createServer(app);
initSocket(server);

const PORT = process.env.PORT || 5000;
// Bind on all interfaces for LAN access
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
  // Initialize order count reset scheduler
  try {
    scheduleOrderCountReset();
  } catch (e) {
    console.warn('⚠️ Could not initialize order count reset scheduler:', e?.message || e);
  }
});
