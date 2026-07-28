import { Router } from "express";
import prisma from "../config/db";
import { authMiddleware, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";
import { getPresignedDownloadUrl } from "../utils/s3";

const router = Router();

// Apply auth middleware and admin role check to all admin routes
router.use(authMiddleware, requireRole(Role.ADMIN));

// GET /admin/libraries - Fetch all library listings for approval review
router.get("/libraries", async (req, res) => {
  try {
    const libraries = await prisma.library.findMany({
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        photos: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = await Promise.all(
      libraries.map(async (lib) => ({
        ...lib,
        photos: await Promise.all(
          lib.photos.map(async (p) => ({
            ...p,
            url: await getPresignedDownloadUrl(p.url),
          }))
        ),
      }))
    );

    return res.json(formatted);
  } catch (error) {
    console.error("Admin fetch libraries error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /admin/libraries/:id/approve - Approve library listing (set isActive = true)
router.patch("/libraries/:id/approve", async (req, res) => {
  try {
    const { id } = req.params;

    const library = await prisma.library.update({
      where: { id },
      data: { isActive: true },
      include: {
        owner: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    return res.json({
      message: `Library '${library.name}' approved successfully.`,
      library,
    });
  } catch (error) {
    console.error("Approve library error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /admin/libraries/:id - Reject/Delete library listing
router.delete("/libraries/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch floor plan to clear layout objects and seats
    const floorPlan = await prisma.floorPlan.findUnique({ where: { libraryId: id } });
    if (floorPlan) {
      const layoutObjects = await prisma.layoutObject.findMany({
        where: { floorPlanId: floorPlan.id },
        select: { id: true },
      });
      const layoutObjectIds = layoutObjects.map((lo) => lo.id);

      await prisma.seat.deleteMany({
        where: { layoutObjectId: { in: layoutObjectIds } },
      });
      await prisma.layoutObject.deleteMany({
        where: { floorPlanId: floorPlan.id },
      });
      await prisma.floorPlan.delete({
        where: { id: floorPlan.id },
      });
    }

    await prisma.libraryPhoto.deleteMany({ where: { libraryId: id } });
    await prisma.slotType.deleteMany({ where: { libraryId: id } });
    await prisma.booking.deleteMany({ where: { libraryId: id } });
    await prisma.review.deleteMany({ where: { libraryId: id } });
    await prisma.library.delete({ where: { id } });

    return res.json({ message: "Library listing deleted/rejected successfully." });
  } catch (error) {
    console.error("Delete library error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
