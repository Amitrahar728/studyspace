import { Router } from "express";
import * as bcrypt from "bcrypt";
import prisma from "../config/db";
import env from "../config/env";
import { validateBody } from "../middleware/validation";
import { SignupSchema, SigninSchema, UpdateProfileSchema } from "@studyspace/shared";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { authMiddleware } from "../middleware/auth";
import { getPresignedDownloadUrl } from "../utils/s3";

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

// Signup
router.post("/signup", validateBody(SignupSchema), async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, env.BCRYPT_SALT_ROUNDS);

    const user = await prisma.user.create({
      data: {
        name,
        email,
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
router.post("/signin", validateBody(SigninSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
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
    const user = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
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
    const { name, phone, avatarUrl } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user?.userId },
      data: {
        ...(name !== undefined && { name }),
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
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

export default router;
