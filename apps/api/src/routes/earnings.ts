import { Router } from "express";
import prisma from "../config/db";
import { authMiddleware, requireRole } from "../middleware/auth";
import { Role, BookingStatus } from "@prisma/client";

const router = Router();

// Apply auth & owner role requirement
router.use(authMiddleware, requireRole([Role.OWNER, Role.ADMIN]));

// GET /owner/earnings - Get earnings summary & per-library analytics
router.get("/", async (req, res) => {
  try {
    const ownerId = req.user!.userId;

    // Fetch all libraries owned by this user
    const ownerLibraries = await prisma.library.findMany({
      where: { ownerId },
      select: { id: true, name: true },
    });

    const libraryIds = ownerLibraries.map((lib) => lib.id);

    if (libraryIds.length === 0) {
      return res.json({
        lifetimeEarnings: 0,
        monthlyEarnings: 0,
        weeklyEarnings: 0,
        pendingEarnings: 0,
        totalBookings: 0,
        completedBookings: 0,
        libraries: [],
      });
    }

    // Fetch all bookings for owner's libraries
    const bookings = await prisma.booking.findMany({
      where: {
        libraryId: { in: libraryIds },
      },
      include: {
        payment: true,
      },
    });

    const now = new Date();

    // Start of current month
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Start of current week (Sunday)
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    let lifetimeEarnings = 0;
    let monthlyEarnings = 0;
    let weeklyEarnings = 0;
    let pendingEarnings = 0;
    let completedBookings = 0;

    // Map for per-library stats
    const libraryStatsMap = new Map<
      string,
      {
        id: string;
        name: string;
        totalEarnings: number;
        monthlyEarnings: number;
        weeklyEarnings: number;
        totalBookings: number;
        completedBookings: number;
      }
    >();

    for (const lib of ownerLibraries) {
      libraryStatsMap.set(lib.id, {
        id: lib.id,
        name: lib.name,
        totalEarnings: 0,
        monthlyEarnings: 0,
        weeklyEarnings: 0,
        totalBookings: 0,
        completedBookings: 0,
      });
    }

    for (const b of bookings) {
      const amount = Number(b.totalPrice);
      const isPaid = b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.COMPLETED;
      const isPending = b.status === BookingStatus.HELD || b.status === BookingStatus.PENDING_PAYMENT;
      const bDate = new Date(b.date);

      const stats = libraryStatsMap.get(b.libraryId);
      if (stats) {
        stats.totalBookings += 1;
      }

      if (isPaid) {
        lifetimeEarnings += amount;
        if (stats) stats.totalEarnings += amount;

        if (bDate >= startOfMonth) {
          monthlyEarnings += amount;
          if (stats) stats.monthlyEarnings += amount;
        }

        if (bDate >= startOfWeek) {
          weeklyEarnings += amount;
          if (stats) stats.weeklyEarnings += amount;
        }

        if (b.status === BookingStatus.COMPLETED) {
          completedBookings += 1;
          if (stats) stats.completedBookings += 1;
        }
      } else if (isPending) {
        pendingEarnings += amount;
      }
    }

    return res.json({
      lifetimeEarnings,
      monthlyEarnings,
      weeklyEarnings,
      pendingEarnings,
      totalBookings: bookings.length,
      completedBookings,
      libraries: Array.from(libraryStatsMap.values()),
    });
  } catch (error) {
    console.error("Fetch owner earnings error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
