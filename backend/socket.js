import { Server } from "socket.io";

let ioInstance = null;

export const initSocket = (httpServer) => {
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  ioInstance = new Server(httpServer, {
    cors: {
      origin: allowedOrigin,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });

  ioInstance.on("connection", (socket) => {
    // Client should call join with roles like { restaurantId } or { restaurantId, tableNumber }
    socket.on("join", (payload = {}) => {
      try {
        const { restaurantId, tableNumber, isRoom } = payload || {};
        if (!restaurantId) return;
        
        if (restaurantId) {
          const restRoom = `restaurant:${restaurantId}`;
          socket.join(restRoom);
          if (tableNumber) {
            const type = isRoom ? 'room' : 'table';
            const locationRoom = `${type}:${restaurantId}:${tableNumber}`;
            socket.join(locationRoom);
          }
        }

      } catch {}
    });

    socket.on("disconnect", () => {});

  });

  return ioInstance;
};

export const getIO = () => ioInstance;
