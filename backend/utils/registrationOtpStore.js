const store = new Map();

// Each entry: email -> { hashedOtp, expiresAt: Date, timeoutId }

export function setRegistrationOtp(email, hashedOtp, ttlMs = 10 * 60 * 1000) {
  // Clear existing
  clearRegistrationOtp(email);
  const expiresAt = new Date(Date.now() + ttlMs);
  const timeoutId = setTimeout(() => {
    store.delete(email);
  }, ttlMs);
  store.set(email, { hashedOtp, expiresAt, timeoutId });
}

export function getRegistrationOtp(email) {
  const item = store.get(email);
  if (!item) return null;
  if (item.expiresAt <= new Date()) {
    clearRegistrationOtp(email);
    return null;
  }
  return item;
}

export function clearRegistrationOtp(email) {
  const item = store.get(email);
  if (item && item.timeoutId) clearTimeout(item.timeoutId);
  store.delete(email);
}

export function hasRegistrationOtp(email) {
  return getRegistrationOtp(email) !== null;
}

export default { setRegistrationOtp, getRegistrationOtp, clearRegistrationOtp, hasRegistrationOtp };