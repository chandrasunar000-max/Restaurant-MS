// Simple request id middleware for correlation in logs and error responses
export default function requestId() {
  return (req, _res, next) => {
    if (!req.id) {
      const rnd = Math.random().toString(36).slice(2, 8);
      req.id = `${Date.now().toString(36)}-${rnd}`;
    }
    next();
  };
}
