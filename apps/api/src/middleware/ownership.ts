import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { Role } from "@prisma/client";

export async function requireLibraryOwnership(req: Request, res: Response, next: NextFunction) {
  try {
    const libraryId = req.params.id || req.params.libraryId || req.body?.libraryId;
    if (!libraryId) {
      return res.status(400).json({ message: "Library ID is required for authorization" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (req.user.role === Role.ADMIN) {
      return next();
    }

    const library = await prisma.library.findUnique({
      where: { id: String(libraryId) },
      select: { ownerId: true },
    });

    if (!library) {
      return res.status(404).json({ message: "Library listing not found" });
    }

    if (library.ownerId !== req.user.userId) {
      return res.status(403).json({ message: "Forbidden: You do not own this library listing" });
    }

    return next();
  } catch (error) {
    console.error("Ownership verification error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
