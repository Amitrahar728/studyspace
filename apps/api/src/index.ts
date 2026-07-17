import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import cookieParser from "cookie-parser";
import env from "./config/env";

// Route imports
import authRouter from "./routes/auth";
import libraryRouter from "./routes/libraries";
import bookingRouter from "./routes/bookings";
import paymentRouter from "./routes/payments";
import reviewRouter from "./routes/reviews";
import adminRouter from "./routes/admin";

const app = express();
const server = http.createServer(app);

// Socket.io configuration
export const io = new Server(server, {
  cors: {
    origin: env.CLIENT_URL,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    credentials: true,
  },
});

// Middleware
app.use(
  cors({
    origin: env.CLIENT_URL,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// Base Route
app.get("/", (req, res) => {
  res.json({ message: "StudySpace API is online" });
});

// Mount Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1", authRouter); // Expose GET /users/me, PATCH /users/me under /api/v1
app.use("/api/v1/libraries", libraryRouter);
app.use("/api/v1/libraries", reviewRouter); // Mount reviews under libraries to match POST /libraries/:id/reviews
app.use("/api/v1/bookings", bookingRouter);
app.use("/api/v1/payments", paymentRouter);
app.use("/api/v1/admin", adminRouter);

// Socket.io event handling
io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

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
