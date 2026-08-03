import { Router } from "express";
import prisma from "../config/db";
import { authMiddleware } from "../middleware/auth";
import { validateBody } from "../middleware/validation";
import { SavePublicKeySchema } from "@studyspace/shared";

const router = Router();

// Require authentication for all chat routes
router.use(authMiddleware);

/**
 * POST /keys - Save or update the authenticated user's base64 public key
 */
router.post("/keys", validateBody(SavePublicKeySchema), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { publicKey } = req.body;

    const savedKey = await prisma.publicKey.upsert({
      where: { userId },
      update: { publicKey },
      create: { userId, publicKey },
    });

    return res.status(200).json({
      message: "Public key saved successfully",
      key: savedKey,
    });
  } catch (error) {
    console.error("Save public key error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /keys/:userId - Retrieve a user's public key
 */
router.get("/keys/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const userKey = await prisma.publicKey.findUnique({
      where: { userId },
      select: {
        userId: true,
        publicKey: true,
        createdAt: true,
      },
    });

    if (!userKey) {
      return res.status(404).json({ message: "Public key not found for user" });
    }

    return res.json(userKey);
  } catch (error) {
    console.error("Fetch public key error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /user/:userId - Retrieve user profile details for chat
 */
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        avatarUrl: true,
        role: true,
      },
    });

    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(targetUser);
  } catch (error) {
    console.error("Fetch chat user error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /messages/:recipientId - Retrieve historical encrypted messages
 */
router.get("/messages/:recipientId", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { recipientId } = req.params;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId, recipientId },
          { senderId: recipientId, recipientId: userId },
        ],
      },
      orderBy: { createdAt: "asc" },
      include: {
        sender: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
        recipient: {
          select: { id: true, name: true, avatarUrl: true, role: true },
        },
      },
    });

    return res.json(messages);
  } catch (error) {
    console.error("Fetch messages error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * GET /conversations - Retrieve list of user conversations
 */
router.get("/conversations", async (req, res) => {
  try {
    const userId = req.user!.userId;

    const messages = await prisma.message.findMany({
      where: {
        OR: [{ senderId: userId }, { recipientId: userId }],
      },
      orderBy: { createdAt: "desc" },
      include: {
        sender: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        recipient: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    });

    const partnerMap = new Map<string, { user: any; lastMessage: any }>();

    for (const msg of messages) {
      const partner = msg.senderId === userId ? msg.recipient : msg.sender;
      if (!partnerMap.has(partner.id)) {
        partnerMap.set(partner.id, {
          user: partner,
          lastMessage: {
            id: msg.id,
            encryptedPayload: msg.encryptedPayload,
            createdAt: msg.createdAt,
            senderId: msg.senderId,
          },
        });
      }
    }

    return res.json(Array.from(partnerMap.values()));
  } catch (error) {
    console.error("Fetch conversations error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
