import { Router } from "express";
import prisma from "../config/db";
import { validateBody } from "../middleware/validation";
import { ReviewSchema } from "@studyspace/shared";
import { authMiddleware } from "../middleware/auth";
import { BookingStatus } from "@prisma/client";
import { getPresignedDownloadUrl } from "../utils/s3";

const router = Router();

// POST /libraries/:id/reviews - Create a review for a library (restricted to completed/confirmed bookings)
router.post("/:id/reviews", authMiddleware, validateBody(ReviewSchema), async (req, res) => {
  try {
    const libraryId = req.params.id;
    const userId = req.user!.userId;
    const { rating, comment } = req.body;

    // 1. Find a completed or confirmed booking at this library by this user that has no review yet
    const eligibleBooking = await prisma.booking.findFirst({
      where: {
        userId,
        libraryId,
        status: {
          in: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        },
        review: null, // Ensure they haven't already reviewed this booking
      },
      include: {
        slotType: true,
      },
      orderBy: {
        date: "desc",
      },
    });

    if (!eligibleBooking) {
      return res.status(403).json({
        message: "You can only leave a review if you have a completed or confirmed booking at this library and have not already reviewed it.",
      });
    }

    // Check if the current time is past the slot end time
    const now = new Date();
    const yyyy = eligibleBooking.date.getFullYear();
    const mm = String(eligibleBooking.date.getMonth() + 1).padStart(2, "0");
    const dd = String(eligibleBooking.date.getDate()).padStart(2, "0");
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const endDateTime = new Date(`${dateStr}T${eligibleBooking.slotType.endTime}:00`);

    if (now < endDateTime) {
      return res.status(403).json({
        message: "You can only submit a review after your booked study slot has ended.",
      });
    }

    // 2. Create the review
    const review = await prisma.review.create({
      data: {
        bookingId: eligibleBooking.id,
        userId,
        libraryId,
        rating,
        comment,
      },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    return res.status(201).json(review);
  } catch (error) {
    console.error("Create review error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /libraries/:id/reviews - Fetch all reviews for a library
router.get("/:id/reviews", async (req, res) => {
  try {
    const libraryId = req.params.id;

    const reviews = await prisma.review.findMany({
      where: { libraryId },
      include: {
        user: {
          select: {
            name: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = await Promise.all(
      reviews.map(async (r) => ({
        ...r,
        user: {
          ...r.user,
          avatarUrl: r.user.avatarUrl ? await getPresignedDownloadUrl(r.user.avatarUrl) : null,
        },
      }))
    );

    return res.json(formatted);
  } catch (error) {
    console.error("Fetch reviews error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /libraries/:id/rating - Fetch rating details
router.get("/:id/rating", async (req, res) => {
  try {
    const libraryId = req.params.id;

    const summary = await prisma.review.aggregate({
      where: { libraryId },
      _avg: {
        rating: true,
      },
      _count: {
        id: true,
      },
    });

    return res.json({
      averageRating: summary._avg.rating ? Number(summary._avg.rating.toFixed(2)) : null,
      totalReviews: summary._count.id,
    });
  } catch (error) {
    console.error("Fetch rating summary error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
