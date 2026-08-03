import express, { Router } from "express";
import prisma from "../config/db";
import redis from "../config/redis";
import env from "../config/env";
import { validateBody } from "../middleware/validation";
import { CreateLibrarySchema, FloorPlanSchema, UpdateLibrarySchema } from "@studyspace/shared";
import { authMiddleware, requireRole } from "../middleware/auth";
import { requireLibraryOwnership } from "../middleware/ownership";
import { Role, ObjectType, Prisma } from "@prisma/client";
import { getPresignedUploadUrl, uploadFileToS3, getPresignedDownloadUrl } from "../utils/s3";

const router = Router();

// GET /libraries - Search & list active libraries
router.get("/", async (req, res) => {
  try {
    const { city, ownerId } = req.query;

    const libraries = await prisma.library.findMany({
      where: {
        ...(ownerId
          ? { ownerId: String(ownerId) }
          : { isActive: true }),
        ...(city && {
          city: {
            contains: String(city),
            mode: "insensitive",
          },
        }),
      },
      include: {
        photos: true,
        slotTypes: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    // Format output with rating average & presigned photo URLs
    const formatted = await Promise.all(
      libraries.map(async (lib) => {
        const avgRating =
          lib.reviews.length > 0
            ? Number((lib.reviews.reduce((sum, r) => sum + r.rating, 0) / lib.reviews.length).toFixed(2))
            : null;

        const signedPhotos = await Promise.all(lib.photos.map((p) => getPresignedDownloadUrl(p.url)));

        return {
          id: lib.id,
          name: lib.name,
          address: lib.address,
          city: lib.city,
          amenities: lib.amenities,
          photos: signedPhotos,
          slotTypes: lib.slotTypes,
          rating: avgRating,
          reviewCount: lib.reviews.length,
        };
      })
    );

    return res.json(formatted);
  } catch (error) {
    console.error("Fetch libraries error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /libraries/geocode - Convert address string to latitude/longitude using Google Geocoding or Nominatim fallback
router.get("/geocode", async (req, res) => {
  try {
    const rawAddress = req.query.address ? String(req.query.address).trim() : "";
    if (!rawAddress) {
      return res.status(400).json({ message: "address query parameter is required" });
    }

    const googleApiKey = env.GOOGLE_MAPS_API_KEY;

    // Generate candidate search strings (from full address down to city/pincode) for fallback resolution
    const parts = rawAddress.split(",").map((p) => p.trim()).filter(Boolean);
    const candidates: string[] = [rawAddress];

    if (parts.length > 2) {
      candidates.push(parts.slice(1).join(", "));
      candidates.push(parts.slice(-3).join(", "));
      candidates.push(parts.slice(-2).join(", "));
    } else if (parts.length === 2) {
      candidates.push(parts[parts.length - 1]);
    }

    const uniqueCandidates = Array.from(new Set(candidates));

    // 1. Try Google Geocoding API if key is configured
    if (googleApiKey) {
      for (const cand of uniqueCandidates) {
        try {
          const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cand)}&key=${googleApiKey}`;
          const response = await fetch(googleUrl);
          const data: any = await response.json();

          if (data.status === "OK" && data.results && data.results.length > 0) {
            const location = data.results[0].geometry.location;
            return res.json({
              latitude: location.lat,
              longitude: location.lng,
              formattedAddress: data.results[0].formatted_address,
              source: "google",
            });
          } else {
            console.warn(`Google Geocoding status for candidate "${cand}": ${data.status}`, data.error_message || "");
            if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
              break;
            }
          }
        } catch (googleError) {
          console.warn("Google Geocoding API exception:", googleError);
          break;
        }
      }
    }

    // 2. Fallback to OpenStreetMap Nominatim API with progressive candidates
    for (const cand of uniqueCandidates) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cand)}&format=json&limit=1`;
        const response = await fetch(nominatimUrl, {
          headers: {
            "User-Agent": "StudySpace/1.0 (contact@studyspace.com)",
          },
        });

        if (response.ok) {
          const data: any = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const result = data[0];
            return res.json({
              latitude: parseFloat(result.lat),
              longitude: parseFloat(result.lon),
              formattedAddress: result.display_name,
              source: "nominatim",
            });
          }
        }
      } catch (nomError) {
        console.warn(`Nominatim geocoding failed for candidate "${cand}":`, nomError);
      }
    }

    return res.status(404).json({ message: "Address not found" });
  } catch (error) {
    console.error("Geocoding error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Helper function to auto-geocode an address string to coordinates
async function autoGeocodeAddress(rawAddress: string): Promise<{ latitude: number; longitude: number } | null> {
  if (!rawAddress || !rawAddress.trim()) return null;

  const googleApiKey = env.GOOGLE_MAPS_API_KEY;
  const parts = rawAddress.split(",").map((p) => p.trim()).filter(Boolean);
  const candidates: string[] = [rawAddress];

  if (parts.length > 2) {
    candidates.push(parts.slice(1).join(", "));
    candidates.push(parts.slice(-3).join(", "));
    candidates.push(parts.slice(-2).join(", "));
  } else if (parts.length === 2) {
    candidates.push(parts[parts.length - 1]);
  }

  const uniqueCandidates = Array.from(new Set(candidates));

  if (googleApiKey) {
    for (const cand of uniqueCandidates) {
      try {
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(cand)}&key=${googleApiKey}`;
        const response = await fetch(googleUrl);
        const data: any = await response.json();

        if (data.status === "OK" && data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return { latitude: loc.lat, longitude: loc.lng };
        } else if (data.status === "REQUEST_DENIED" || data.status === "OVER_QUERY_LIMIT") {
          break;
        }
      } catch (err) {
        break;
      }
    }
  }

  for (const cand of uniqueCandidates) {
    try {
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cand)}&format=json&limit=1`;
      const response = await fetch(nominatimUrl, {
        headers: { "User-Agent": "StudySpace/1.0 (contact@studyspace.com)" },
      });
      if (response.ok) {
        const data: any = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
        }
      }
    } catch (err) {}
  }

  return null;
}

// GET /libraries/search - Spatial search with Haversine formula & text search fallback
router.get("/search", async (req, res) => {
  try {
    const { lat, lng, radius, query } = req.query;

    const latNum = lat !== undefined && lat !== "" && !isNaN(Number(lat)) ? Number(lat) : null;
    const lngNum = lng !== undefined && lng !== "" && !isNaN(Number(lng)) ? Number(lng) : null;
    const radiusNum = radius !== undefined && radius !== "" && !isNaN(Number(radius)) && Number(radius) > 0 ? Number(radius) : 5;
    const searchQuery = query ? String(query).trim() : "";

    // If spatial coordinates are provided, perform Haversine raw SQL radial search
    if (latNum !== null && lngNum !== null) {
      const searchQueryFilter = searchQuery
        ? Prisma.sql`AND ("name" ILIKE ${"%" + searchQuery + "%"} OR "address" ILIKE ${"%" + searchQuery + "%"} OR "city" ILIKE ${"%" + searchQuery + "%"})`
        : Prisma.empty;

      const rawLibraries: any[] = await prisma.$queryRaw`
        SELECT * FROM (
          SELECT *, (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos( radians(${latNum}) ) * cos( radians("latitude") ) * cos( radians("longitude") - radians(${lngNum}) ) + sin( radians(${latNum}) ) * sin( radians("latitude") )
              ))
            )
          ) AS distance
          FROM "Library"
          WHERE "isActive" = true
            AND "latitude" IS NOT NULL
            AND "longitude" IS NOT NULL
            ${searchQueryFilter}
        ) AS sub
        WHERE distance < ${radiusNum}
        ORDER BY distance ASC
      `;

      if (rawLibraries.length === 0) {
        return res.json([]);
      }

      const libraryIds = rawLibraries.map((lib: any) => lib.id);
      const librariesWithRelations = await prisma.library.findMany({
        where: { id: { in: libraryIds } },
        include: {
          photos: true,
          slotTypes: true,
          reviews: {
            select: {
              rating: true,
            },
          },
        },
      });

      const libMap = new Map(librariesWithRelations.map((lib) => [lib.id, lib]));

      const formatted = await Promise.all(
        rawLibraries.map(async (rawLib: any) => {
          const lib = libMap.get(rawLib.id);
          if (!lib) return null;

          const avgRating =
            lib.reviews.length > 0
              ? Number((lib.reviews.reduce((sum, r) => sum + r.rating, 0) / lib.reviews.length).toFixed(2))
              : null;

          const signedPhotos = await Promise.all(lib.photos.map((p) => getPresignedDownloadUrl(p.url)));

          return {
            id: lib.id,
            name: lib.name,
            address: lib.address,
            city: lib.city,
            amenities: lib.amenities,
            latitude: lib.latitude,
            longitude: lib.longitude,
            distance: Number(Number(rawLib.distance).toFixed(2)),
            photos: signedPhotos,
            slotTypes: lib.slotTypes,
            rating: avgRating,
            reviewCount: lib.reviews.length,
          };
        })
      );

      return res.json(formatted.filter(Boolean));
    }

    // Fallback search: If no coordinates are sent, perform simple text matching on city/address/name
    const whereClause: Prisma.LibraryWhereInput = {
      isActive: true,
    };

    if (searchQuery) {
      whereClause.OR = [
        { name: { contains: searchQuery, mode: "insensitive" } },
        { address: { contains: searchQuery, mode: "insensitive" } },
        { city: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const libraries = await prisma.library.findMany({
      where: whereClause,
      include: {
        photos: true,
        slotTypes: true,
        reviews: {
          select: {
            rating: true,
          },
        },
      },
    });

    const formatted = await Promise.all(
      libraries.map(async (lib) => {
        const avgRating =
          lib.reviews.length > 0
            ? Number((lib.reviews.reduce((sum, r) => sum + r.rating, 0) / lib.reviews.length).toFixed(2))
            : null;

        const signedPhotos = await Promise.all(lib.photos.map((p) => getPresignedDownloadUrl(p.url)));

        return {
          id: lib.id,
          name: lib.name,
          address: lib.address,
          city: lib.city,
          amenities: lib.amenities,
          latitude: lib.latitude,
          longitude: lib.longitude,
          distance: null,
          photos: signedPhotos,
          slotTypes: lib.slotTypes,
          rating: avgRating,
          reviewCount: lib.reviews.length,
        };
      })
    );

    return res.json(formatted);
  } catch (error) {
    console.error("Spatial search libraries error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /libraries/:id - Get details of a library
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const library = await prisma.library.findUnique({
      where: { id },
      include: {
        photos: true,
        slotTypes: true,
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          },
        },
        reviews: {
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
        },
      },
    });

    if (!library) {
      return res.status(404).json({ message: "Library not found" });
    }

    const avgRating =
      library.reviews.length > 0
        ? Number((library.reviews.reduce((sum, r) => sum + r.rating, 0) / library.reviews.length).toFixed(2))
        : null;

    const signedPhotos = await Promise.all(
      library.photos.map(async (p) => ({
        ...p,
        url: await getPresignedDownloadUrl(p.url),
      }))
    );

    const signedReviews = await Promise.all(
      library.reviews.map(async (r) => ({
        ...r,
        user: {
          ...r.user,
          avatarUrl: r.user.avatarUrl ? await getPresignedDownloadUrl(r.user.avatarUrl) : null,
        },
      }))
    );

    return res.json({
      ...library,
      photos: signedPhotos,
      reviews: signedReviews,
      rating: avgRating,
      reviewCount: library.reviews.length,
    });
  } catch (error) {
    console.error("Fetch library detail error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /libraries - Create new library listing
router.post("/", authMiddleware, requireRole([Role.OWNER, Role.ADMIN]), validateBody(CreateLibrarySchema), async (req, res) => {
  try {
    const { name, address, city, amenities, slotTypes, latitude, longitude, chairs, tables, acs, fans } = req.body;

    let finalLat = latitude !== undefined && latitude !== null && latitude !== "" ? Number(latitude) : null;
    let finalLng = longitude !== undefined && longitude !== null && longitude !== "" ? Number(longitude) : null;

    if (finalLat !== null) {
      if (isNaN(finalLat) || finalLat < -90 || finalLat > 90) {
        return res.status(400).json({ message: "Latitude must be between -90 and 90" });
      }
    }
    if (finalLng !== null) {
      if (isNaN(finalLng) || finalLng < -180 || finalLng > 180) {
        return res.status(400).json({ message: "Longitude must be between -180 and 180" });
      }
    }

    // Auto-geocode from address if latitude/longitude are omitted
    if (finalLat === null || finalLng === null) {
      const geocoded = await autoGeocodeAddress(`${address}, ${city}`);
      if (geocoded) {
        finalLat = geocoded.latitude;
        finalLng = geocoded.longitude;
      }
    }

    const library = await prisma.library.create({
      data: {
        ownerId: req.user!.userId,
        name,
        address,
        city,
        amenities,
        latitude: finalLat,
        longitude: finalLng,
        chairs: chairs ? Number(chairs) : 0,
        tables: tables ? Number(tables) : 0,
        acs: acs ? Number(acs) : 0,
        fans: fans ? Number(fans) : 0,
        isActive: process.env.NODE_ENV === "development", // Auto-approve in dev mode for testing!
        slotTypes: {
          create: slotTypes.map((slot: any) => ({
            name: slot.name,
            startTime: slot.startTime,
            endTime: slot.endTime,
            price: slot.price,
          })),
        },
      },
      include: {
        slotTypes: true,
      },
    });

    return res.status(201).json(library);
  } catch (error) {
    console.error("Create library error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /libraries/:id - Update library listing (Owner only)
router.put("/:id", authMiddleware, requireRole([Role.OWNER, Role.ADMIN]), requireLibraryOwnership, validateBody(CreateLibrarySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, amenities, slotTypes, latitude, longitude, chairs, tables, acs, fans } = req.body;

    let finalLat = latitude !== undefined && latitude !== null && latitude !== "" ? Number(latitude) : null;
    let finalLng = longitude !== undefined && longitude !== null && longitude !== "" ? Number(longitude) : null;

    if (finalLat !== null) {
      if (isNaN(finalLat) || finalLat < -90 || finalLat > 90) {
        return res.status(400).json({ message: "Latitude must be between -90 and 90" });
      }
    }
    if (finalLng !== null) {
      if (isNaN(finalLng) || finalLng < -180 || finalLng > 180) {
        return res.status(400).json({ message: "Longitude must be between -180 and 180" });
      }
    }

    // Auto-geocode from address if latitude/longitude are omitted
    if (finalLat === null || finalLng === null) {
      const geocoded = await autoGeocodeAddress(`${address}, ${city}`);
      if (geocoded) {
        finalLat = geocoded.latitude;
        finalLng = geocoded.longitude;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      await tx.slotType.deleteMany({ where: { libraryId: id } });

      return tx.library.update({
        where: { id },
        data: {
          name,
          address,
          city,
          amenities,
          latitude: finalLat,
          longitude: finalLng,
          chairs: chairs ? Number(chairs) : 0,
          tables: tables ? Number(tables) : 0,
          acs: acs ? Number(acs) : 0,
          fans: fans ? Number(fans) : 0,
          slotTypes: {
            create: slotTypes.map((slot: any) => ({
              name: slot.name,
              startTime: slot.startTime,
              endTime: slot.endTime,
              price: slot.price,
            })),
          },
        },
        include: {
          slotTypes: true,
          photos: true,
        },
      });
    });

    const signedPhotos = await Promise.all(
      updated.photos.map(async (p) => ({
        ...p,
        url: await getPresignedDownloadUrl(p.url),
      }))
    );

    return res.json({ ...updated, photos: signedPhotos });
  } catch (error) {
    console.error("Update library error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PATCH /libraries/:id - Partial update library listing (Owner/Admin only)
router.patch("/:id", authMiddleware, requireRole([Role.OWNER, Role.ADMIN]), requireLibraryOwnership, validateBody(UpdateLibrarySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, city, amenities, latitude, longitude, chairs, tables, acs, fans, slotTypes } = req.body;

    if (latitude !== undefined && latitude !== null && latitude !== "") {
      const latVal = Number(latitude);
      if (isNaN(latVal) || latVal < -90 || latVal > 90) {
        return res.status(400).json({ message: "Latitude must be between -90 and 90" });
      }
    }

    if (longitude !== undefined && longitude !== null && longitude !== "") {
      const lngVal = Number(longitude);
      if (isNaN(lngVal) || lngVal < -180 || lngVal > 180) {
        return res.status(400).json({ message: "Longitude must be between -180 and 180" });
      }
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (address !== undefined) updateData.address = address;
    if (city !== undefined) updateData.city = city;
    if (amenities !== undefined) updateData.amenities = amenities;
    if (latitude !== undefined) updateData.latitude = latitude !== null && latitude !== "" ? Number(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude !== null && longitude !== "" ? Number(longitude) : null;
    if (chairs !== undefined) updateData.chairs = Number(chairs);
    if (tables !== undefined) updateData.tables = Number(tables);
    if (acs !== undefined) updateData.acs = Number(acs);
    if (fans !== undefined) updateData.fans = Number(fans);

    if (slotTypes && Array.isArray(slotTypes)) {
      const updated = await prisma.$transaction(async (tx) => {
        await tx.slotType.deleteMany({ where: { libraryId: id } });
        return tx.library.update({
          where: { id },
          data: {
            ...updateData,
            slotTypes: {
              create: slotTypes.map((slot: any) => ({
                name: slot.name,
                startTime: slot.startTime,
                endTime: slot.endTime,
                price: slot.price,
              })),
            },
          },
          include: {
            slotTypes: true,
            photos: true,
          },
        });
      });
      const signedPhotos = await Promise.all(
        updated.photos.map(async (p) => ({
          ...p,
          url: await getPresignedDownloadUrl(p.url),
        }))
      );
      return res.json({ ...updated, photos: signedPhotos });
    }

    const updated = await prisma.library.update({
      where: { id },
      data: updateData,
      include: {
        slotTypes: true,
        photos: true,
      },
    });

    const signedPhotos = await Promise.all(
      updated.photos.map(async (p) => ({
        ...p,
        url: await getPresignedDownloadUrl(p.url),
      }))
    );

    return res.json({ ...updated, photos: signedPhotos });
  } catch (error) {
    console.error("Patch library error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// GET /libraries/:id/floorplan - Fetch floor plan
router.get("/:id/floorplan", async (req, res) => {
  try {
    const { id } = req.params;

    const floorPlan = await prisma.floorPlan.findUnique({
      where: { libraryId: id },
      include: {
        objects: {
          include: {
            seat: true,
          },
        },
      },
    });

    if (!floorPlan) {
      return res.status(404).json({ message: "Floor plan not found for this library" });
    }

    return res.json(floorPlan);
  } catch (error) {
    console.error("Fetch floorplan error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /libraries/:id/floorplan - Update or Create Floor Plan layout (Owner only)
router.put("/:id/floorplan", authMiddleware, requireRole([Role.OWNER, Role.ADMIN]), requireLibraryOwnership, validateBody(FloorPlanSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { canvasWidth, canvasHeight, objects } = req.body;

    // Verify ownership
    const library = await prisma.library.findUnique({ where: { id } });
    if (!library) {
      return res.status(404).json({ message: "Library not found" });
    }

    if (library.ownerId !== req.user!.userId && req.user!.role !== Role.ADMIN) {
      return res.status(403).json({ message: "Forbidden: You do not own this library" });
    }

    // 1. Find or create FloorPlan
    let floorPlan = await prisma.floorPlan.findUnique({ where: { libraryId: id } });
    if (!floorPlan) {
      floorPlan = await prisma.floorPlan.create({
        data: {
          libraryId: id,
          canvasWidth,
          canvasHeight,
        },
      });
    } else {
      floorPlan = await prisma.floorPlan.update({
        where: { id: floorPlan.id },
        data: { canvasWidth, canvasHeight },
      });
    }

    // 2. Fetch existing layout object IDs
    const existingObjects = await prisma.layoutObject.findMany({
      where: { floorPlanId: floorPlan.id },
      select: { id: true },
    });
    const existingObjectIds = existingObjects.map((o) => o.id);

    // 3. Clear existing seats and layout objects
    await prisma.seat.deleteMany({
      where: { layoutObjectId: { in: existingObjectIds } },
    });
    await prisma.layoutObject.deleteMany({
      where: { floorPlanId: floorPlan.id },
    });

    // 4. Create new layout objects & seats
    for (const obj of objects) {
      const layoutObj = await prisma.layoutObject.create({
        data: {
          floorPlanId: floorPlan!.id,
          type: obj.type,
          x: obj.x,
          y: obj.y,
          width: obj.width,
          height: obj.height,
          rotation: obj.rotation,
          zIndex: obj.zIndex,
          label: obj.label,
        },
      });

      if (obj.type === ObjectType.SEAT && obj.seat) {
        await prisma.seat.create({
          data: {
            layoutObjectId: layoutObj.id,
            seatCode: obj.seat.seatCode,
            seatType: obj.seat.seatType,
            isActive: obj.seat.isActive ?? true,
          },
        });
      }
    }

    const result = await prisma.floorPlan.findUnique({
      where: { id: floorPlan.id },
      include: {
        objects: {
          include: {
            seat: true,
          },
        },
      },
    });

    return res.json(result);
  } catch (error) {
    console.error("Update floorplan error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

function getDatesBetween(startDateStr: string, endDateStr: string): Date[] {
  const start = new Date(startDateStr);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDateStr);
  end.setHours(0, 0, 0, 0);
  
  const dates: Date[] = [];
  let current = new Date(start);
  
  let count = 0;
  while (current <= end && count < 100) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
    count++;
  }
  return dates;
}

// GET /libraries/:id/availability - Query physical seats availability on date and slot
router.get("/:id/availability", async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startDate, endDate, slotTypeId } = req.query;

    const start = startDate ? String(startDate) : (date ? String(date) : null);
    const end = endDate ? String(endDate) : start;

    if (!start || !end || !slotTypeId) {
      return res.status(400).json({ message: "date or startDate and slotTypeId are required" });
    }

    const dates = getDatesBetween(start, end);
    if (dates.length === 0) {
      return res.status(400).json({ message: "Invalid date range specified" });
    }

    // 1. Fetch all seats for the library floor plan
    const floorPlan = await prisma.floorPlan.findUnique({
      where: { libraryId: id },
      include: {
        objects: {
          where: { type: ObjectType.SEAT },
          include: { seat: true },
        },
      },
    });

    if (!floorPlan) {
      return res.status(404).json({ message: "Floor plan not found" });
    }

    const seats = floorPlan.objects
      .filter((o) => o.seat)
      .map((o) => o.seat!);

    // 2. Fetch all database bookings for this slot type and dates that aren't CANCELLED
    const activeBookings = await prisma.booking.findMany({
      where: {
        libraryId: id,
        slotTypeId: String(slotTypeId),
        date: {
          in: dates,
        },
        status: {
          notIn: ["CANCELLED"],
        },
      },
      select: {
        seatId: true,
        status: true,
      },
    });

    const bookedSeatIds = new Set(activeBookings.map((b) => b.seatId));

    // 3. For each seat, check if there is an active hold in Upstash Redis
    const availability = await Promise.all(
      seats.map(async (seat) => {
        let isHeld = false;
        const isBooked = bookedSeatIds.has(seat.id);

        if (!isBooked) {
          for (const d of dates) {
            const dateStr = d.toISOString().split("T")[0];
            const redisKey = `seat:hold:${seat.id}:${dateStr}:${String(slotTypeId)}`;
            const holdValue = await redis.get(redisKey);
            if (holdValue) {
              isHeld = true;
              break;
            }
          }
        }

        return {
          seatId: seat.id,
          seatCode: seat.seatCode,
          seatType: seat.seatType,
          isActive: seat.isActive,
          isBooked,
          isHeld,
        };
      })
    );

    return res.json(availability);
  } catch (error) {
    console.error("Fetch seat availability error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /libraries/:id/photos/upload-url - Generate presigned AWS S3 photo upload URL
router.post("/:id/photos/upload-url", authMiddleware, requireRole([Role.OWNER, Role.ADMIN]), async (req, res) => {
  try {
    const { fileName, fileType } = req.body;
    if (!fileName || !fileType) {
      return res.status(400).json({ message: "fileName and fileType are required" });
    }

    const { uploadUrl, key } = await getPresignedUploadUrl(fileName, fileType);
    return res.json({ uploadUrl, key });
  } catch (error) {
    console.error("Presigned URL generation error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /libraries/:id/photos - Save uploaded photo link
router.post("/:id/photos", authMiddleware, requireRole([Role.OWNER, Role.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ message: "url is required" });
    }

    const photo = await prisma.libraryPhoto.create({
      data: {
        libraryId: id,
        url,
      },
    });

    const signedUrl = await getPresignedDownloadUrl(photo.url);
    return res.status(201).json({ ...photo, url: signedUrl });
  } catch (error) {
    console.error("Save library photo error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// POST /libraries/:id/photos/upload-direct - Upload image directly to backend buffer and pass to S3
router.post(
  "/:id/photos/upload-direct",
  authMiddleware,
  requireRole([Role.OWNER, Role.ADMIN]),
  express.raw({ type: ["image/jpeg", "image/png", "image/webp"], limit: "10mb" }),
  async (req, res) => {
    try {
      const { id } = req.params;
      const buffer = req.body as Buffer;

      if (!buffer || buffer.length === 0) {
        return res.status(400).json({ message: "Empty file buffer payload" });
      }

      const contentType = req.headers["content-type"] || "image/jpeg";
      const ext = contentType.split("/")[1] || "jpg";
      const key = `libraries/${id}/${Date.now()}.${ext}`;

      const s3Url = await uploadFileToS3(buffer, key, contentType);

      // Auto-save photo record to database
      const photo = await prisma.libraryPhoto.create({
        data: {
          libraryId: id,
          url: s3Url,
        },
      });

      const signedUrl = await getPresignedDownloadUrl(photo.url);
      return res.status(201).json({ ...photo, url: signedUrl });
    } catch (error) {
      console.error("Direct S3 upload failed:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;
