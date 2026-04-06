import Restaurant from "../models/Restaurant.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { sendMail } from "../utils/mailer.js";
import { setRegistrationOtp, getRegistrationOtp, clearRegistrationOtp } from '../utils/registrationOtpStore.js';
import { saveBufferToLocal, getRestaurantLogoPath } from "../utils/storage.js";
import path from "path"; // Still used for path.extname

// Dev-only: test mail sender (guarded)
export const testSendMail = async (req, res) => {
  try {
    // Only allow in development or when explicitly enabled
    const allowed = String(process.env.ALLOW_TEST_MAIL || '').toLowerCase() === 'true' || String(process.env.NODE_ENV || '').toLowerCase() === 'development';
    if (!allowed) return res.status(403).json({ message: 'Not allowed' });
    const { to, subject, text, html } = req.body || {};
    if (!to || !subject) return res.status(400).json({ message: 'to and subject are required' });
    const info = await sendMail({ to, subject, text, html });
    return res.json({ ok: true, info });
  } catch (err) {
    console.error('Test send mail failed:', err);
    return res.status(500).json({ message: "Failed to send mail. Please try again." });
  }
};

export const updateMyLogo = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No logo file uploaded.' });
    }

    const restaurant = await Restaurant.findById(req.restaurant._id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found.' });
    }

    // Generate S3 key for the logo
    const filename = `logo_${Date.now()}${path.extname(req.file.originalname)}`;
    const key = `${getRestaurantLogoPath(restaurant.username)}${filename}`;
    
    // Upload to S3
    const logoUrl = await saveBufferToLocal(req.file.buffer, key);
    
    restaurant.image = logoUrl;
    await restaurant.save();

    const updated = await Restaurant.findById(req.restaurant._id).select("-password");

    res.status(200).json({
      message: 'Logo updated successfully',
      restaurant: updated,
    });


  } catch (err) {
    console.error("Update logo error:", err);
    return res.status(500).json({ message: "Failed to update logo. Please try again." });
  }
};


// POST /api/restaurants/contact - receive contact form submissions and forward via email
export const sendContactEmail = async (req, res) => {
  try {
    const { name, email, restaurant, message } = req.body || {};
    if (!name || !email || !message) return res.status(400).json({ message: 'name, email and message are required' });

    const recipient = process.env.CONTACT_EMAIL || 'fusionlabs@orderbyqr.in';
    const subject = `Contact form: ${restaurant || 'No Restaurant'} — ${name}`;
    const safeMessage = String(message).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

    const html = `
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      ${restaurant ? `<p><strong>Restaurant:</strong> ${restaurant}</p>` : ''}
      <p><strong>Message:</strong></p>
      <p>${safeMessage}</p>
      <p style="color:#666;font-size:0.9rem">IP: ${req.ip}</p>
    `;

    const text = `Name: ${name}\nEmail: ${email}\nRestaurant: ${restaurant || ''}\n\n${message}\n\nIP: ${req.ip}`;

    await sendMail({ to: recipient, subject, html, text });

    return res.json({ message: 'Contact request sent' });
  } catch (err) {
    console.error('Send contact email error:', err);
    return res.status(500).json({ message: "Failed to send contact email. Please try again." });
  }
};


export const registerRestaurant = async (req, res) => {
  try {
    const { name, email, password, address, phone, branch, pincode, totalTables, totalRooms, upiId, type, username } = req.body;

    let imagePath = "";
    if (req.file) {
      // Upload logo to S3 during signup
      const filename = `logo_${Date.now()}${path.extname(req.file.originalname)}`;
      const key = `${getRestaurantLogoPath(username)}${filename}`;
      imagePath = await saveBufferToLocal(req.file.buffer, key);
    }

    const existing = await Restaurant.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already registered" });

    const existingUsername = await Restaurant.findOne({ username });
    if (existingUsername) return res.status(400).json({ message: "Username already taken" });

    const restaurant = await Restaurant.create({ 
      name: name.toUpperCase(), 
      email, 
      password, 
      address, 
      phone, 
      branch, 
      pincode, 
      image: imagePath, 
      totalTables: totalTables ?? 1, 
      totalRooms: totalRooms ?? 0, 
      upiId, 
      isVerified: false, 
      type, 
      username 
    });

    // if (imagePath) console.log("Registered restaurant image:", imagePath);

    // Generate registration OTP, store in server-side store, and send via email
    try {
      const n = crypto.randomInt(0, 1000000);
      const otp = n.toString().padStart(6, '0');
      const hashed = crypto.createHash('sha256').update(otp).digest('hex');
      // store hashed OTP server-side and schedule deletion in 10 minutes
      setRegistrationOtp(String(email).toLowerCase(), hashed, 10 * 60 * 1000);

      const subject = "Your OrderByQR registration OTP";
      const text = `Your registration OTP is ${otp}. It expires in 10 minutes.`;
      const html = `<p>Your registration OTP is <strong>${otp}</strong>.</p><p>It expires in <strong>10 minutes</strong>. Please enter this code in the admin panel to verify your account.</p>`;

      // console.log(`Registration OTP for ${email}: ${otp}`);
      await sendMail({ to: email, subject, text, html }).catch(e => console.warn('sendMail (registration OTP) failed:', e?.message || e));
    } catch (otpErr) {
      console.error('Failed to generate/send registration OTP:', otpErr);
    }

    res.status(201).json({ message: "Restaurant registered successfully; an OTP has been sent to the registered email to verify the account.", restaurant });
  } catch (err) {
    console.error("Failed to register restaurant:", err);
    res.status(500).json({ error: "Failed to register restaurant. Please try again." });
  }
};

// POST /api/restaurants/verify-registration-otp - verify OTP for new restaurant
export const verifyRegistrationOtp = async (req, res) => {
  try {
    const { email, otp } = req.body || {};
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });
    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (restaurant.isVerified) return res.status(400).json({ message: 'Account already verified' });
    const item = getRegistrationOtp(String(email).toLowerCase());
    if (!item) return res.status(400).json({ message: 'Invalid or expired OTP' });
    const hashedIncoming = crypto.createHash('sha256').update(String(otp)).digest('hex');
    if (hashedIncoming !== item.hashedOtp) return res.status(400).json({ message: 'Invalid OTP' });
    restaurant.isVerified = true;
    await restaurant.save();
    // clear store
    clearRegistrationOtp(String(email).toLowerCase());
    return res.json({ message: 'Account verified' });
  } catch (err) {
    console.error('Verify registration OTP error:', err);
    return res.status(500).json({ message: "Failed to verify OTP. Please try again." });
  }
};

// POST /api/restaurants/resend-registration-otp - send a new registration OTP to email
export const resendRegistrationOtp = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
    if (restaurant.isVerified) return res.status(400).json({ message: 'Account already verified' });
    // Generate OTP and store
    const n = crypto.randomInt(0, 1000000);
    const otp = n.toString().padStart(6, '0');
    const hashed = crypto.createHash('sha256').update(otp).digest('hex');
    setRegistrationOtp(String(email).toLowerCase(), hashed, 10 * 60 * 1000);
    const subject = 'Your OrderByQR registration OTP';
    const text = `Your registration OTP is ${otp}. It expires in 10 minutes.`;
    const html = `<p>Your registration OTP is <strong>${otp}</strong>.</p><p>It expires in <strong>10 minutes</strong>.</p>`;
    // console.log(`Resend registration OTP for ${email}: ${otp}`);
    await sendMail({ to: email, subject, text, html }).catch(e => console.warn('sendMail (resend registration OTP) failed:', e?.message || e));
    return res.json({ message: 'OTP resent to email' });
  } catch (err) {
    console.error('Resend registration OTP error:', err);
    return res.status(500).json({ message: "Failed to resend OTP. Please try again." });
  }
};


const getMe = async (req, res) => {
  // req.restaurant is populated by protect middleware with password omitted
  const r = req.restaurant;
  res.status(200).json({
    _id: r.id,
    name: r.name,
    username: r.username,
    email: r.email,
    address: r.address || "",
    phone: r.phone || "",
    branch: r.branch || "",
    pincode: r.pincode || "",
    image: r.image || "",
    totalTables: typeof r.totalTables === 'number' ? r.totalTables : 1,
    totalRooms: r.totalRooms,
    upiId: r.upiId || "",
    plan: r.plan || "software",
    type: r.type || "restaurant",
    // msg: msg,
    geofenceEnabled: !!r.geofenceEnabled,
    geofenceRadiusMeters: typeof r.geofenceRadiusMeters === 'number' ? r.geofenceRadiusMeters : 0,
  });
};

// PUT /api/restaurants/me — update allowed profile fields
export const updateMe = async (req, res) => {
  try {
    const allowed = ["name", "address", "branch", "pincode", "image", "totalTables", "geofenceEnabled", "geofenceRadiusMeters", "upiId", "totalRooms"]; // email is read-only; phone conditionally allowed
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }

    // Allow setting phone only if it's currently empty on the account
    if (Object.prototype.hasOwnProperty.call(req.body, "phone")) {
      const currentPhone = req.restaurant.phone;
      const incoming = req.body.phone;
      if (!currentPhone || currentPhone === "") {
        // basic normalization/validation (optional): digits only, 7-15 length
        const cleaned = String(incoming || "").replace(/\D/g, "");
        if (cleaned.length === 0) {
          // allow clearing attempt to be ignored silently
        } else if (cleaned.length < 7 || cleaned.length > 15) {
          return res.status(400).json({ message: "Phone number must be 7 to 15 digits" });
        } else {
          updates.phone = cleaned;
        }
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields provided" });
    }

    // ensure totalTables is a positive integer if provided
    if (Object.prototype.hasOwnProperty.call(updates, "totalTables")) {
      const n = Number(updates.totalTables);
      if (!Number.isFinite(n) || n < 1) {
        return res.status(400).json({ message: "totalTables must be a positive number (min 1)" });
      }
      updates.totalTables = Math.floor(n);
    }

    // ensure totalRooms is a positive integer if provided
    if (Object.prototype.hasOwnProperty.call(updates, "totalRooms")) {
      const n = Number(updates.totalRooms);
      if (!Number.isFinite(n) || n < 0) {
        return res.status(400).json({ message: "totalRooms must be a positive number (min 0)" });
      }
      updates.totalRooms = Math.floor(n);
    }

    // validate geofencing fields
    if (Object.prototype.hasOwnProperty.call(updates, "geofenceEnabled")) {
      updates.geofenceEnabled = Boolean(updates.geofenceEnabled);
    }
    if (Object.prototype.hasOwnProperty.call(updates, "geofenceRadiusMeters")) {
      const rads = Number(updates.geofenceRadiusMeters);
      if (!Number.isFinite(rads) || rads < 0) {
        return res.status(400).json({ message: "geofenceRadiusMeters must be a non-negative number" });
      }
      updates.geofenceRadiusMeters = rads;
    }

    const updated = await Restaurant.findByIdAndUpdate(req.restaurant._id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updated) return res.status(404).json({ message: "Restaurant not found" });

    return res.status(200).json({
      _id: updated.id,
      name: updated.name,
      email: updated.email,
      address: updated.address || "",
      phone: updated.phone || "",
      branch: updated.branch || "",
      pincode: updated.pincode || "",
      image: updated.image || "",
      totalTables: typeof updated.totalTables === 'number' ? updated.totalTables : 1,
      totalRooms: updated.totalRooms,
      upiId: updated.upiId || "",
      plan: updated.plan || "software",
      type: updated.type || "restaurant",
      geofenceEnabled: !!updated.geofenceEnabled,
      geofenceRadiusMeters: typeof updated.geofenceRadiusMeters === 'number' ? updated.geofenceRadiusMeters : 0,
    });
    await invalidateRestaurantPublicCache({ id: updated._id, username: req.restaurant?.username });
  } catch (err) {
    console.error("Update profile error:", err);
    return res.status(500).json({ message: "Failed to update profile. Please try again." });
  }
};

// POST /api/restaurants/me/push-token — register restaurant device push token
export const updateMyPushToken = async (req, res) => {
  try {
    const { token, platform } = req.body || {};
    if (!token || !platform) {
      return res.status(400).json({ message: 'Token and platform are required' });
    }
    const restaurant = await Restaurant.findById(req.restaurant._id);
    if (!restaurant) {
      return res.status(404).json({ message: 'Restaurant not found' });
    }
    const exists = (restaurant.deviceTokens || []).some((t) => t.token === token);
    if (!exists) {
      restaurant.deviceTokens = restaurant.deviceTokens || [];
      restaurant.deviceTokens.push({ token, platform });
      await restaurant.save();
    }
    return res.status(200).json({ message: 'Push token updated successfully' });
  } catch (err) {
    console.error('Update restaurant push token error:', err);
    return res.status(500).json({ message: 'Failed to update push token' });
  }
};


// Helper function to generate token (avoid logging secrets)
const generateToken = (id) => {
  return jwt.sign({ id: id.toString() }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// POST /api/restaurants/login
export const loginRestaurant = async (req, res) => {
  const { email, password } = req.body;

  try {
    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found" });
    }

    const isMatch = await bcrypt.compare(password, restaurant.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid password" });
    }
    if (!restaurant.isVerified){
     return res.status(401).json({ message: "Please verify your account; By sending a new otp to your mail click resend otp ." });
    }

    const token = generateToken(restaurant._id);

    res.status(200).json({
      _id: restaurant._id,
      name: restaurant.name,
      email: restaurant.email,
      token,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const requestRestaurantPasswordOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) {
      return res.status(200).json({ message: "If an account exists, an OTP has been sent" });
    }

    const n = crypto.randomInt(0, 1000000);
    const otp = n.toString().padStart(6, '0');
    const hashed = crypto.createHash('sha256').update(otp).digest('hex');

    restaurant.passwordResetOtp = hashed;
    restaurant.passwordResetOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
    restaurant.passwordResetOtpAttempts = 0;
    await restaurant.save({ validateBeforeSave: false });

    const subject = "Your OrderByQR password reset OTP";
    const text = `Your OTP is ${otp}. It expires in 10 minutes.`;
    const html = `<p>Your OTP is <strong>${otp}</strong>.</p><p>It expires in <strong>10 minutes</strong>.</p>`;

    // Print OTP to server console so admins can provide it to restaurants.
    // If email sending (SMTP) is enabled, sendMail will also dispatch an email.
    // console.log(`Password reset OTP for ${email}: ${otp}`);
    try {
      await sendMail({ to: email, subject, text, html });
    } catch (mailErr) {
      // Do not clear OTP on mail failure — admins can still use console-printed OTP.
      console.warn('sendMail failed for password OTP; OTP stored and console-printed: ', mailErr?.message || mailErr);
    }

    return res.status(200).json({ message: "If an account exists, an OTP has been sent to the registered email address." });
  } catch (err) {
    console.error("Request OTP error:", err);
    return res.status(500).json({ message: "Failed to process request. Please try again." });
  }
};

export const resetRestaurantPasswordWithOtp = async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    if (!email || !otp || !password) {
      return res.status(400).json({ message: "Email, OTP and new password are required" });
    }

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant || !restaurant.passwordResetOtp || !restaurant.passwordResetOtpExpires) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (restaurant.passwordResetOtpExpires.getTime() <= Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    if (typeof restaurant.passwordResetOtpAttempts === 'number' && restaurant.passwordResetOtpAttempts >= 5) {
      return res.status(429).json({ message: "Too many attempts. Request a new OTP." });
    }

    const hashedIncoming = crypto.createHash('sha256').update(String(otp)).digest('hex');
    if (hashedIncoming !== restaurant.passwordResetOtp) {
      restaurant.passwordResetOtpAttempts = (restaurant.passwordResetOtpAttempts || 0) + 1;
      await restaurant.save({ validateBeforeSave: false });
      return res.status(400).json({ message: "Invalid OTP" });
    }

    restaurant.password = password;
    restaurant.passwordResetOtp = undefined;
    restaurant.passwordResetOtpExpires = undefined;
    restaurant.passwordResetOtpAttempts = 0;
    await restaurant.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Reset with OTP error:", err);
    return res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
};

export const requestRestaurantPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const restaurant = await Restaurant.findOne({ email });
    if (!restaurant) {
      return res.status(200).json({ message: "If an account exists, a reset email has been sent" });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(rawToken).digest("hex");

    restaurant.passwordResetToken = hashed;
    restaurant.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);
    await restaurant.save({ validateBeforeSave: false });

    const appBase = process.env.APP_BASE_URL || "https://orderbyqr.in";
    const resetUrl = `${appBase}/restaurant/reset-password?token=${rawToken}`;

    const subject = "Reset your OrderByQR password";
    const text = `You requested a password reset. Use the link below to set a new password. This link expires in 15 minutes.\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`;
    const html = `
      <p>You requested a password reset.</p>
      <p>This link expires in <strong>15 minutes</strong>.</p>
      <p><a href="${resetUrl}" target="_blank" rel="noopener noreferrer">Reset your password</a></p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    try {
      await sendMail({ to: email, subject, text, html });
    } catch (mailErr) {
      restaurant.passwordResetToken = undefined;
      restaurant.passwordResetExpires = undefined;
      await restaurant.save({ validateBeforeSave: false });
      throw mailErr;
    }

    return res.status(200).json({ message: "If an account exists, a reset email has been sent" });
  } catch (err) {
    console.error("Request password reset error:", err);
    return res.status(500).json({ message: "Failed to process request. Please try again." });
  }
};

export const resetRestaurantPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ message: "Token and new password are required" });

    const hashed = crypto.createHash("sha256").update(token).digest("hex");

    const restaurant = await Restaurant.findOne({
      passwordResetToken: hashed,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!restaurant) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    restaurant.password = password;
    restaurant.passwordResetToken = undefined;
    restaurant.passwordResetExpires = undefined;
    await restaurant.save();

    return res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Password reset error:", err);
    return res.status(500).json({ message: "Failed to reset password. Please try again." });
  }
};

export const handleAdvanceTableBooking = async (req, res)=>{
  const {username} = req.params();
  
}

export const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    const restaurant = await Restaurant.findOne({ username });
    if (restaurant) {
      return res.status(200).json({ available: false });
    }
    res.status(200).json({ available: true });
  } catch (error) {
    console.error("Check username error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export { getMe };
