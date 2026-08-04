import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env";
import prisma from "./config/db";

// Route imports
import authRouter from "./routes/auth";
import libraryRouter from "./routes/libraries";
import bookingRouter from "./routes/bookings";
import paymentRouter from "./routes/payments";
import reviewRouter from "./routes/reviews";
import adminRouter from "./routes/admin";
import notificationRouter from "./routes/notifications";
import earningsRouter from "./routes/earnings";
import chatRouter from "./routes/chat";

const app = express();
const server = http.createServer(app);

// Flexible CORS configuration for development & production
const corsOriginHandler = (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
  if (!origin || origin.startsWith("http://localhost:") || origin === env.CLIENT_URL) {
    callback(null, true);
  } else {
    callback(null, true);
  }
};

// Socket.io configuration
export const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  },
});

app.set("io", io);

// Middleware
app.use(
  cors({
    origin: corsOriginHandler,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Base Route
app.get("/", (req, res) => {
  res.json({ message: "Alcove API is online" });
});

// Mount Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", authRouter); // Expose GET /users/me, PATCH /users/me under /api/v1
app.use("/api/v1/libraries", libraryRouter);
app.use("/api/v1/libraries", reviewRouter); // Mount reviews under libraries to match POST /libraries/:id/reviews
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/owner/earnings", earningsRouter);
app.use("/api/v1/admin", adminRouter);
app.use("/api/v1/chat", chatRouter);

// Socket.io event handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Join a user channel to receive personal real-time notifications
  socket.on("join-user", (userId: string) => {
    socket.join(userId);
    console.log(`Socket ${socket.id} joined user room: ${userId}`);
  });

  // Join a library channel to receive real-time seat updates
  socket.on("join-library", (libraryId: string) => {
    socket.join(libraryId);
    console.log(`Socket ${socket.id} joined library room: ${libraryId}`);
  });

  // Leave library room
  socket.on("leave-library", (libraryId: string) => {
    socket.leave(libraryId);
    console.log(`Socket ${socket.id} left library room: ${libraryId}`);
  });

  // Join chat room (room format: `chat:user1_user2`)
  socket.on("join-chat", (data: string | { room: string }) => {
    const roomName = typeof data === "string" ? data : data?.room;
    if (roomName) {
      socket.join(roomName);
      console.log(`Socket ${socket.id} joined chat room: ${roomName}`);
    }
  });

  // Send encrypted message event
  socket.on("send-message", async (data: { senderId: string; recipientId: string; encryptedPayload: string }) => {
    try {
      const { senderId, recipientId, encryptedPayload } = data;
      if (!senderId || !recipientId || !encryptedPayload) {
        return;
      }

      const message = await prisma.message.create({
        data: {
          senderId,
          recipientId,
          encryptedPayload,
        },
        include: {
          sender: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
          recipient: {
            select: { id: true, name: true, avatarUrl: true, role: true },
          },
        },
      });

      const room = `chat:${[senderId, recipientId].sort().join("_")}`;
      io.to(room).emit("new-message", message);
      io.to(recipientId).emit("new-message-notification", message);
    } catch (err) {
      console.error("Error processing send-message event:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: err.message || "Internal server error" });
});

// Start Server
const PORT = env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 StudySpace server running on port ${PORT} in ${env.NODE_ENV} mode.`);
});
