// Temporary: silence noisy console errors/warnings across the app
// Useful when design work is ongoing and we want a clean console.
// To disable, comment out the assignments below.

/* eslint-disable no-console */
try {
  console.error = () => {};
  console.warn = () => {};
} catch (_) {
  // ignore
}
/* eslint-enable no-console */
