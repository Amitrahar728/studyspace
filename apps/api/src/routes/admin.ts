import { Router } from "express";
import prisma from "../config/db";
import { authMiddleware, requireRole } from "../middleware/auth";
import { Role } from "@prisma/client";

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
    return res.json(libraries);
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

    await prisma.$transaction(async (tx) => {
      // Fetch floor plan to clear layout objects and seats
      const floorPlan = await tx.floorPlan.findUnique({ where: { libraryId: id } });
      if (floorPlan) {
        const layoutObjects = await tx.layoutObject.findMany({
          where: { floorPlanId: floorPlan.id },
          select: { id: true },
        });
        const layoutObjectIds = layoutObjects.map((lo) => lo.id);

        await tx.seat.deleteMany({
          where: { layoutObjectId: { in: layoutObjectIds } },
        });
        await tx.layoutObject.deleteMany({
          where: { floorPlanId: floorPlan.id },
        });
        await tx.floorPlan.delete({
          where: { id: floorPlan.id },
        });
      }

      await tx.libraryPhoto.deleteMany({ where: { libraryId: id } });
      await tx.slotType.deleteMany({ where: { libraryId: id } });
      await tx.booking.deleteMany({ where: { libraryId: id } });
      await tx.review.deleteMany({ where: { libraryId: id } });
      await tx.library.delete({ where: { id } });
    });

    return res.json({ message: "Library listing deleted/rejected successfully." });
  } catch (error) {
    console.error("Delete library error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
