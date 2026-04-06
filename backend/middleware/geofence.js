import Restaurant from "../models/Restaurant.js";

// Simple haversine distance in meters
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000; // earth radius in m
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Middleware assumes body.restaurantId and optional body.clientLocation {lat,lng}
// If restaurant has geofenceEnabled and location + radius set, validates clientLocation.
export default async function geofence(req, res, next) {
  try {
    const { restaurantId, clientLocation } = req.body || {};
    if (!restaurantId) return res.status(400).json({ message: "restaurantId required for geofence" });
    const r = await Restaurant.findById(restaurantId).select("geofenceEnabled geofenceRadiusMeters location plan");
    if (!r) return res.status(404).json({ message: "Restaurant not found" });
    // Only enforce geofence for business plan
    if ((r.plan || 'free') !== 'business') {
      return next();
    }
    if (!r.geofenceEnabled || !r.location || typeof r.location.lat !== 'number' || typeof r.location.lng !== 'number' || !r.geofenceRadiusMeters) {
      return next(); // nothing to enforce
    }
    if (!clientLocation || typeof clientLocation.lat !== 'number' || typeof clientLocation.lng !== 'number') {
      return res.status(403).json({ message: "Location required to place order at this restaurant" });
    }
    const dist = distanceMeters(clientLocation.lat, clientLocation.lng, r.location.lat, r.location.lng);
    if (dist > r.geofenceRadiusMeters) {
      return res.status(403).json({ message: "You're outside the ordering zone.", distanceMeters: dist, allowedRadiusMeters: r.geofenceRadiusMeters });
    }
    req.geofenceDistanceMeters = dist;
    next();
  } catch (err) {
    console.error("Geofence middleware error", err);
    return res.status(500).json({ message: "Geofence check failed" });
  }
}
