import { Router } from "express";
import { authMiddleware } from "../middleware/auth";

const router = Router();

// POST /payments/create-order - Create stub order
router.post("/create-order", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ message: "bookingId is required" });
    }

    return res.json({
      orderId: `order_${Date.now()}`,
      amount: 15000, // INR 150.00 represented as paise
      currency: "INR",
      status: "created",
    });
  } catch (error) {
    console.error("Create order stub error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /payments/webhook - Webhook stub
router.post("/webhook", async (req, res) => {
  return res.json({ status: "webhook_received", received: true });
});

export default router;
