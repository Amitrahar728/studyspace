import { Router } from "express";
import * as bcrypt from "bcrypt";
import prisma from "../config/db";
import env from "../config/env";
import { validateBody } from "../middleware/validation";
import { SignupSchema, SigninSchema, UpdateProfileSchema } from "@studyspace/shared";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { authMiddleware } from "../middleware/auth";
import { getPresignedDownloadUrl, getPresignedAvatarUploadUrl } from "../utils/s3";
import { authRateLimiter } from "../middleware/rateLimiter";

const router = Router();

const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

// Helper to set refresh token cookie
const setRefreshTokenCookie = (res: any, token: string) => {
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: "/",
  });
};

// Check email availability (Live check)
router.get("/check-email", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email || typeof email !== "string") {
      return res.status(400).json({ message: "Email query param is required" });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: { id: true },
    });

    return res.json({ available: !existingUser });
  } catch (error) {
    console.error("Check email error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Signup
router.post("/signup", authRateLimiter(10, 900), validateBody(SignupSchema), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        passwordHash,
        role,
        phone,
      },
    });

    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken(user.id);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(201).json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Internal server error during registration" });
  }
});

// Signin
router.post("/signin", authRateLimiter(10, 900), validateBody(SigninSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const accessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const refreshToken = generateRefreshToken(user.id);

    setRefreshTokenCookie(res, refreshToken);

    return res.json({
      accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
      },
    });
  } catch (error) {
    console.error("Signin error:", error);
    return res.status(500).json({ message: "Internal server error during signin" });
  }
});

// Refresh Token
router.post("/refresh", async (req, res) => {
  try {
    const token = req.cookies?.[REFRESH_TOKEN_COOKIE_NAME] || req.body?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Refresh token is missing" });
    }

    const decoded = verifyRefreshToken(token);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const newAccessToken = generateAccessToken({ userId: user.id, email: user.email, role: user.role });
    const newRefreshToken = generateRefreshToken(user.id);

    setRefreshTokenCookie(res, newRefreshToken);

    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("Refresh error:", error);
    return res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });
  return res.json({ message: "Logged out successfully" });
});

// Get User Profile
router.get("/users/me", authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        occupation: true,
        hobbies: true,
        currentlyDoing: true,
        targetGoal: true,
        businessInfo: true,
        experience: true,
        description: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const signedAvatar = user.avatarUrl ? await getPresignedDownloadUrl(user.avatarUrl) : null;
    return res.json({ ...user, avatarUrl: signedAvatar });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update User Profile
router.patch("/users/me", authMiddleware, validateBody(UpdateProfileSchema), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const {
      name,
      phone,
      avatarUrl,
      bio,
      occupation,
      hobbies,
      currentlyDoing,
      targetGoal,
      businessInfo,
      experience,
      description,
    } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(bio !== undefined && { bio }),
        ...(occupation !== undefined && { occupation }),
        ...(hobbies !== undefined && { hobbies }),
        ...(currentlyDoing !== undefined && { currentlyDoing }),
        ...(targetGoal !== undefined && { targetGoal }),
        ...(businessInfo !== undefined && { businessInfo }),
        ...(experience !== undefined && { experience }),
        ...(description !== undefined && { description }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        bio: true,
        occupation: true,
        hobbies: true,
        currentlyDoing: true,
        targetGoal: true,
        businessInfo: true,
        experience: true,
        description: true,
        createdAt: true,
      },
    });

    const signedAvatar = user.avatarUrl ? await getPresignedDownloadUrl(user.avatarUrl) : null;
    return res.json({ ...user, avatarUrl: signedAvatar });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Generate Presigned S3 Avatar Upload URL
router.post("/avatar/upload-url", authMiddleware, async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ message: "fileName and fileType are required" });
    }

    const { uploadUrl, key } = await getPresignedAvatarUploadUrl(fileName, fileType, req.user!.userId);
    return res.json({ uploadUrl, key });
  } catch (error) {
    console.error("Avatar presigned upload URL error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
