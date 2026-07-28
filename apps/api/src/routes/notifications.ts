import { Router } from "express";
import prisma from "../config/db";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// Apply auth middleware to all notification routes
router.use(authMiddleware);

// GET /notifications - Get current user's notifications
router.get("/", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return res.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Fetch notifications error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /notifications/:id/read - Mark single notification as read
router.patch("/:id/read", async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    return res.json(updated);
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /notifications/read-all - Mark all notifications as read
router.patch("/read-all", async (req, res) => {
  try {
    const userId = req.user!.userId;
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("Mark all read error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
