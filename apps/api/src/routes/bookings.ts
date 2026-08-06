import { Router } from "express";
import prisma from "../config/db";
import redis from "../config/redis";
import { validateBody } from "../middleware/validation";
import { BookingHoldSchema } from "@studyspace/shared";
import { authMiddleware, requireRole } from "../middleware/auth";
import { BookingStatus, Role } from "@prisma/client";
import { sendBookingConfirmationEmail } from "../utils/email";
import { getPresignedDownloadUrl } from "../utils/s3";

const router = Router();

function generateReadableAccessKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const p1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const p2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `AL-${p1}-${p2}`;
}

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

function getDatesBetween(startDateStr: string, endDateStr: string): Date[] {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);

  const dates: Date[] = [];
  let current = new Date(start);

  let count = 0;
  while (current <= end && count < 100) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
    count++;
  }
  return dates;
}

// POST /bookings/hold - Place temporary Redis-backed hold on seat (supports ranges)
router.post("/hold", authMiddleware, validateBody(BookingHoldSchema), async (req, res) => {
  try {
    const io = req.app.get("io");
    const { seatId, slotTypeId, date, startDate, endDate } = req.body;
    const userId = req.user!.userId;

    const start = startDate || date;
    const end = endDate || start;

    if (!start) {
      return res.status(400).json({ message: "date or startDate is required" });
    }

    const dates = getDatesBetween(start, end);
    if (dates.length === 0) {
      return res.status(400).json({ message: "Invalid date range specified" });
    }

    // 1. Fetch seat and verify library
    const seatInfo = await getSeatLibraryInfo(seatId);
    if (!seatInfo || !seatInfo.isActive) {
      return res.status(404).json({ message: "Seat not found or inactive" });
    }
    const libraryId = seatInfo.layoutObject.floorPlan.libraryId;

    // 2. Check if seat is already booked in database for any date in the range
    const existingBooking = await prisma.booking.findFirst({
      where: {
        seatId,
        slotTypeId,
        date: {
          in: dates,
        },
        status: {
          in: [BookingStatus.PENDING_PAYMENT, BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
      },
    });

    if (existingBooking) {
      return res.status(409).json({ message: "This seat is already booked for one or more dates in this range." });
    }

    // 3. Check Redis holds for all dates
    const holdDuration = 600; // 10 minutes in seconds
    for (const d of dates) {
      const dateStr = d.toISOString().split("T")[0];
      const redisKey = `seat:hold:${seatId}:${dateStr}:${slotTypeId}`;
      const holdOwner = await redis.get(redisKey);
      if (holdOwner && holdOwner !== userId) {
        return res.status(409).json({ message: `Seat is currently held on ${dateStr} by another user.` });
      }
    }

    // 4. Acquire Redis holds
    const expiresAt = new Date(Date.now() + holdDuration * 1000);
    for (const d of dates) {
      const dateStr = d.toISOString().split("T")[0];
      const redisKey = `seat:hold:${seatId}:${dateStr}:${slotTypeId}`;
      await redis.set(redisKey, userId, "EX", holdDuration);
    }

    // 5. Broadcast update via Socket.io
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

// POST /bookings/:id/release - Release seat hold (where :id is the seatId, supports ranges)
router.post("/:id/release", authMiddleware, async (req, res) => {
  try {
    const io = req.app.get("io");
    const seatId = req.params.id;
    const { slotTypeId, date, startDate, endDate } = req.body;
    const userId = req.user!.userId;

    const start = startDate || date;
    const end = endDate || start;

    if (!slotTypeId || !start) {
      return res.status(400).json({ message: "slotTypeId and date are required to release hold" });
    }

    const dates = getDatesBetween(start, end);

    for (const d of dates) {
      const dateStr = d.toISOString().split("T")[0];
      const redisKey = `seat:hold:${seatId}:${dateStr}:${slotTypeId}`;
      const holdUser = await redis.get(redisKey);
      if (holdUser && holdUser === userId) {
        await redis.del(redisKey);
      }
    }

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

// POST /bookings - Create final booking (Stubbed Payment Flow, supports ranges)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const io = req.app.get("io");
    const { seatId, slotTypeId, date, startDate, endDate, email, fullName, phone } = req.body;
    const userId = req.user!.userId;

    const start = startDate || date;
    const end = endDate || start;

    if (!seatId || !slotTypeId || !start) {
      return res.status(400).json({ message: "seatId, slotTypeId, and date/startDate are required" });
    }

    const dates = getDatesBetween(start, end);
    if (dates.length === 0) {
      return res.status(400).json({ message: "Invalid date range specified" });
    }

    const firstDateStr = dates[0].toISOString().split("T")[0];

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

    // 3. Verify holds in Redis (must not belong to someone else)
    for (const d of dates) {
      const dateStr = d.toISOString().split("T")[0];
      const redisKey = `seat:hold:${seatId}:${dateStr}:${slotTypeId}`;
      const holdOwner = await redis.get(redisKey);
      if (holdOwner && holdOwner !== userId) {
        return res.status(409).json({ message: `Hold for ${dateStr} has expired or belongs to someone else.` });
      }
    }

    // 4. Create bookings sequentially with unique readable access keys
    const createdList = [];
    for (const d of dates) {
      const accessKey = generateReadableAccessKey();
      const newBooking = await prisma.booking.create({
        data: {
          userId,
          libraryId,
          seatId,
          slotTypeId,
          date: d,
          status: BookingStatus.CONFIRMED,
          totalPrice: slotType.price,
          accessKey,
          payment: {
            create: {
              amount: slotType.price,
              status: "paid",
              gatewayRef: `mock_txn_${Date.now()}_${d.getTime()}`,
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
      createdList.push(newBooking);
    }

    const booking = createdList[0];

    // 5. Delete Redis locks now that they are booked
    for (const d of dates) {
      const dateStr = d.toISOString().split("T")[0];
      const redisKey = `seat:hold:${seatId}:${dateStr}:${slotTypeId}`;
      await redis.del(redisKey);
    }

    const recipientEmail = (email && typeof email === "string" && email.trim()) ? email.trim() : booking.user.email;
    const recipientName = (fullName && typeof fullName === "string" && fullName.trim()) ? fullName.trim() : booking.user.name;

    // 6. Broadcast updated state & create owner notification
    if (io) {
      io.to(libraryId).emit("seat-status-changed", {
        seatId,
        status: "BOOKED",
        userId,
      });

      if (booking.library && booking.library.ownerId) {
        io.to(booking.library.ownerId).emit("new-notification", {
          title: "New Booking Created",
          message: `Seat ${booking.seat.seatCode} at ${booking.library.name} has been booked by ${recipientName || "a student"}. Access Key: ${booking.accessKey}`,
        });
      }
    }

    if (booking.library && booking.library.ownerId) {
      try {
        await prisma.notification.create({
          data: {
            userId: booking.library.ownerId,
            title: "New Booking Created",
            message: `Seat ${booking.seat.seatCode} at ${booking.library.name} has been booked by ${recipientName || "a student"}. Access Key: ${booking.accessKey}`,
            type: "BOOKING",
            link: "/owner/dashboard",
          },
        });
      } catch (err) {
        console.error("Notification creation error:", err);
      }
    }

    // 7. Send confirmation email to the provided booking email or account email

    const dateRangeStr = dates.length > 1
      ? `${dates[0].toLocaleDateString()} to ${dates[dates.length - 1].toLocaleDateString()} (${dates.length} days)`
      : dates[0].toLocaleDateString();

    sendBookingConfirmationEmail({
      to: recipientEmail,
      studentName: recipientName,
      libraryName: booking.library.name,
      seatCode: booking.seat.seatCode,
      date: dateRangeStr,
      slotName: booking.slotType.name,
      price: Number(slotType.price) * dates.length,
      accessKey: booking.accessKey,
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
    return res.status(500).json({ message: error?.message || "Internal server error" });
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
    const formatted = await Promise.all(
      bookings.map(async (b) => {
        if (!b.library || !b.library.photos) return b;
        const signedPhotos = await Promise.all(
          b.library.photos.map(async (p) => ({
            ...p,
            url: await getPresignedDownloadUrl(p.url),
          }))
        );
        return {
          ...b,
          library: {
            ...b.library,
            photos: signedPhotos,
          },
        };
      })
    );
    return res.json(formatted);
  } catch (error) {
    console.error("Fetch my bookings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /bookings/owner - Fetch bookings for libraries owned by the authenticated user (for reception validation)
router.get("/owner", authMiddleware, async (req, res) => {
  try {
    const ownerId = req.user!.userId;
    const { libraryId } = req.query;

    const whereClause: any = req.user!.role === Role.ADMIN
      ? {}
      : { library: { ownerId } };

    if (libraryId && typeof libraryId === "string" && libraryId !== "ALL") {
      whereClause.libraryId = libraryId;
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        library: {
          select: {
            id: true,
            name: true,
          },
        },
        seat: {
          select: {
            id: true,
            seatCode: true,
            seatType: true,
          },
        },
        slotType: {
          select: {
            id: true,
            name: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: {
        date: "desc",
      },
    });

    return res.json(bookings);
  } catch (error) {
    console.error("Fetch owner bookings error:", error);
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
