import { Router } from "express";
import prisma from "../config/db";
import redis from "../config/redis";
import { validateBody } from "../middleware/validation";
import { BookingHoldSchema } from "@studyspace/shared";
import { authMiddleware } from "../middleware/auth";
import { BookingStatus } from "@prisma/client";
import { sendBookingConfirmationEmail } from "../utils/email";

const router = Router();

// Helper to get seat with library details
async function getSeatLibraryInfo(seatId: string) {
  return prisma.seat.findUnique({
    where: { id: seatId },
    include: {
      layoutObject: {
        include: {
          floorPlan: true,
        },
      },
    },
  });
}

// POST /bookings/hold - Place temporary Redis-backed hold on seat
router.post("/hold", authMiddleware, validateBody(BookingHoldSchema), async (req, res) => {
  try {
    const io = req.app.get("io");
    const { seatId, slotTypeId, date } = req.body;
    const userId = req.user!.userId;

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const dateStr = queryDate.toISOString().split("T")[0]; // YYYY-MM-DD

    // 1. Fetch seat and verify library
    const seatInfo = await getSeatLibraryInfo(seatId);
    if (!seatInfo || !seatInfo.isActive) {
      return res.status(404).json({ message: "Seat not found or inactive" });
    }
    const libraryId = seatInfo.layoutObject.floorPlan.libraryId;

    // 2. Check if seat is already booked in database
    const existingBooking = await prisma.booking.findFirst({
      where: {
        seatId,
        slotTypeId,
        date: queryDate,
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
      },
    });

    if (existingBooking) {
      return res.status(409).json({ message: "This seat is already booked for this date and slot." });
    }

    // 3. Acquire temporary hold in Redis (10 minutes TTL)
    const redisKey = `seat:hold:${seatId}:${dateStr}:${slotTypeId}`;
    const holdDuration = 600; // 10 minutes in seconds

    // Set NX (only if not exists)
    const acquired = await redis.set(redisKey, userId, "EX", holdDuration, "NX");
    if (!acquired) {
      return res.status(409).json({ message: "Seat is currently held by another user." });
    }

    const expiresAt = new Date(Date.now() + holdDuration * 1000);

    // 4. Broadcast update via Socket.io
    io.to(libraryId).emit("seat-status-changed", {
      seatId,
      status: "HELD",
      expiresAt: expiresAt.toISOString(),
      userId,
    });

    return res.status(201).json({
      message: "Seat hold placed successfully",
      seatId,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("Place hold error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /bookings/:id/release - Release seat hold (where :id is the seatId)
router.post("/:id/release", authMiddleware, async (req, res) => {
  try {
    const io = req.app.get("io");
    const seatId = req.params.id;
    const { slotTypeId, date } = req.body;
    const userId = req.user!.userId;

    if (!slotTypeId || !date) {
      return res.status(400).json({ message: "slotTypeId and date are required to release hold" });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const dateStr = queryDate.toISOString().split("T")[0];

    const redisKey = `seat:hold:${seatId}:${dateStr}:${slotTypeId}`;
    const holdUser = await redis.get(redisKey);

    if (!holdUser) {
      return res.status(404).json({ message: "No active hold found for this seat." });
    }

    if (holdUser !== userId) {
      return res.status(403).json({ message: "You do not own the hold on this seat." });
    }

    // Release Redis lock
    await redis.del(redisKey);

    // Broadcast update via Socket.io
    const seatInfo = await getSeatLibraryInfo(seatId);
    if (seatInfo) {
      const libraryId = seatInfo.layoutObject.floorPlan.libraryId;
      io.to(libraryId).emit("seat-status-changed", {
        seatId,
        status: "AVAILABLE",
        userId,
      });
    }

    return res.json({ message: "Seat hold released successfully" });
  } catch (error) {
    console.error("Release hold error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /bookings - Create final booking (Stubbed Payment Flow)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const io = req.app.get("io");
    const { seatId, slotTypeId, date } = req.body;
    const userId = req.user!.userId;

    if (!seatId || !slotTypeId || !date) {
      return res.status(400).json({ message: "seatId, slotTypeId, and date are required" });
    }

    const queryDate = new Date(date);
    queryDate.setHours(0, 0, 0, 0);
    const dateStr = queryDate.toISOString().split("T")[0];

    // 1. Verify seat exists and get details
    const seatInfo = await getSeatLibraryInfo(seatId);
    if (!seatInfo) {
      return res.status(404).json({ message: "Seat not found" });
    }
    const libraryId = seatInfo.layoutObject.floorPlan.libraryId;

    // 2. Fetch slot type for pricing details
    const slotType = await prisma.slotType.findUnique({
      where: { id: slotTypeId },
    });
    if (!slotType) {
      return res.status(404).json({ message: "Slot type not found" });
    }

    // 3. Verify hold in Redis belongs to user (or allow if admin)
    const redisKey = `seat:hold:${seatId}:${dateStr}:${slotTypeId}`;
    const holdOwner = await redis.get(redisKey);

    // If hold has expired or doesn't belong to the user, check if we can still book
    if (holdOwner && holdOwner !== userId) {
      return res.status(409).json({ message: "Seat hold has expired or belongs to someone else." });
    }

    // 4. Create booking with Database Transaction
    const booking = await prisma.$transaction(async (tx) => {
      // Generate a unique 8-character verification access key
      const randKey = "SS-" + Math.random().toString(36).substring(2, 6).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase();

      // Create confirmed booking
      const newBooking = await tx.booking.create({
        data: {
          userId,
          libraryId,
          seatId,
          slotTypeId,
          date: queryDate,
          status: BookingStatus.CONFIRMED,
          totalPrice: slotType.price,
          accessKey: randKey,
          payment: {
            create: {
              amount: slotType.price,
              status: "paid",
              gatewayRef: `mock_txn_${Date.now()}`,
            },
          },
        },
        include: {
          library: true,
          seat: true,
          slotType: true,
          user: true,
        },
      });

      return newBooking;
    });

    // 5. Delete Redis lock now that it's booked
    await redis.del(redisKey);

    // 6. Broadcast updated state
    io.to(libraryId).emit("seat-status-changed", {
      seatId,
      status: "BOOKED",
      userId,
    });

    // 7. Send confirmation email in background
    sendBookingConfirmationEmail({
      to: booking.user.email,
      studentName: booking.user.name,
      libraryName: booking.library.name,
      seatCode: booking.seat.seatCode,
      date: dateStr,
      slotName: booking.slotType.name,
      price: Number(booking.totalPrice),
    }).catch((err) => console.error("Email delivery failed:", err));

    return res.status(201).json(booking);
  } catch (error: any) {
    console.error("Create booking error:", error);
    // Handle composite key collision
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "Double booking blocked: This seat has already been booked for this date and slot.",
      });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /bookings/me - Get current user's booking history
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const bookings = await prisma.booking.findMany({
      where: { userId: req.user!.userId },
      include: {
        library: {
          include: {
            photos: true,
          },
        },
        seat: true,
        slotType: true,
        review: true,
      },
      orderBy: {
        date: "desc",
      },
    });
    return res.json(bookings);
  } catch (error) {
    console.error("Fetch my bookings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /bookings/:id - Retrieve details of a booking
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        library: true,
        seat: true,
        slotType: true,
        payment: true,
        review: true,
      },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    if (booking.userId !== req.user!.userId && req.user!.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.json(booking);
  } catch (error) {
    console.error("Fetch booking detail error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
