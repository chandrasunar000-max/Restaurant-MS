import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: {type: String, unique: true},
  // full street address (optional)
  address: { type: String },
  // optional lat/lng for geofencing center (WGS84)
  location: {
    lat: { type: Number, min: -90, max: 90 },
    lng: { type: Number, min: -180, max: 180 }
  },
  // enable/disable geofence enforcement for public ordering
  geofenceEnabled: { type: Boolean, default: false },
  // radius in meters for allowed ordering zone (ignored if geofenceEnabled=false or location missing)
  geofenceRadiusMeters: { type: Number, default: 0, min: 0 },
  // primary contact number for the restaurant
  phone: { type: String },
  // branch identifier or name (optional)
  branch: { type: String },
  // total number of tables available in the restaurant
  totalTables: { type: Number, required: true, default: 1, min: 1 },
  // total number of rooms available in the restaurant
  totalRooms: { type: Number, required: true, default: 0, min: 0 },
  // optional SVG logo URL or data URI (only accept SVGs)
  image: {
    type: String,
  },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  // postal / area code
  pincode: { type: String },
  // merchant UPI ID (optional, validated when present)
  upiId: {
    type: String,
    validate: {
      validator: function (v) {
        if (!v) return true;
        return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/.test(v);
      },
      message: 'UPI ID must contain @ symbol (e.g. username@bank or 1234567890@ybl)'
    }
  },
  // single software plan (no subscription management)
  plan: { type: String, default: "software" },
  // password reset
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date },
  // password reset via OTP
  passwordResetOtp: { type: String },
  passwordResetOtpExpires: { type: Date },
  passwordResetOtpAttempts: { type: Number, default: 0 },
  // registration verification
  isVerified: { type: Boolean, default: false },
   seq: {
    type: Number,
    default: 0
  },
  type:{type: String,enum:["restaurant","hotel"],default:"restaurant"},
}, { timestamps: true });

// 🔐 Hash password before saving
restaurantSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  // Enforce password strength: 8+ chars, uppercase, lowercase, number, symbol
  const strong = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
  if (!strong.test(this.password || '')) {
    return next(new Error('Password must include uppercase, lowercase, number, symbol and be at least 8 characters long.'));
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ✅ Compare password during login
restaurantSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Restaurant = mongoose.model('Restaurant', restaurantSchema);
export default Restaurant;
