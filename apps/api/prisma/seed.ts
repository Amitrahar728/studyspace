import { PrismaClient, Role, ObjectType } from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // 1. Clean existing records
  await prisma.payment.deleteMany({});
  await prisma.review.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.slotType.deleteMany({});
  await prisma.seat.deleteMany({});
  await prisma.layoutObject.deleteMany({});
  await prisma.floorPlan.deleteMany({});
  await prisma.libraryPhoto.deleteMany({});
  await prisma.library.deleteMany({});
  await prisma.user.deleteMany({});

  console.log("Existing records cleared.");

  // 2. Create users with hashed passwords
  const saltRounds = 10;
  const passwordHash = await bcrypt.hash("password123", saltRounds);

  const student = await prisma.user.create({
    data: {
      name: "John Student",
      email: "student@studyspace.com",
      passwordHash,
      role: Role.STUDENT,
      phone: "9876543210",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "Alice Owner",
      email: "owner@studyspace.com",
      passwordHash,
      role: Role.OWNER,
      phone: "9876543211",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80",
    },
  });

  const admin = await prisma.user.create({
    data: {
      name: "Super Admin",
      email: "admin@studyspace.com",
      passwordHash,
      role: Role.ADMIN,
      phone: "9876543212",
    },
  });

  console.log(`Created users: Student(${student.email}), Owner(${owner.email}), Admin(${admin.email})`);

  // 3. Create Library
  const library = await prisma.library.create({
    data: {
      ownerId: owner.id,
      name: "Oakwood Self-Study Library",
      address: "45 Sector C, Near Huda City Centre",
      city: "Gurugram",
      isActive: true, // Auto-approved for seed data
      amenities: ["High-speed Wi-Fi", "Air Conditioning", "Ergonomic Chairs", "Quiet Zone", "Drinking Water"],
      photos: {
        create: [
          { url: "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80" },
          { url: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80" },
          { url: "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=600&q=80" }
        ],
      },
      slotTypes: {
        create: [
          { name: "Morning Slot", startTime: "08:00", endTime: "13:00", price: 150 },
          { name: "Afternoon Slot", startTime: "13:00", endTime: "18:00", price: 150 },
          { name: "Evening Slot", startTime: "18:00", endTime: "23:00", price: 180 },
          { name: "Full Day Slot", startTime: "08:00", endTime: "23:00", price: 400 }
        ],
      },
    },
    include: {
      slotTypes: true,
    },
  });

  console.log(`Created library: ${library.name} with ${library.slotTypes.length} slots.`);

  // 4. Create Floor Plan & Layout Objects
  const floorPlan = await prisma.floorPlan.create({
    data: {
      libraryId: library.id,
      canvasWidth: 800,
      canvasHeight: 600,
    },
  });

  // Helper arrays for objects to be inserted
  // Objects include 6 seats, 2 tables, 1 AC, 1 Bookshelf, 1 Water dispenser
  const layoutObjectsData = [
    // AC
    { type: ObjectType.AC, x: 360, y: 20, width: 80, height: 20, rotation: 0, label: "Voltas AC" },
    // Bookshelf
    { type: ObjectType.BOOKSHELF, x: 20, y: 150, width: 40, height: 150, rotation: 0, label: "Main Bookshelf" },
    // Water
    { type: ObjectType.WATER, x: 720, y: 520, width: 40, height: 40, rotation: 0, label: "RO Water Dispenser" },
    // Table 1 (Desk Row 1)
    { type: ObjectType.TABLE, x: 200, y: 150, width: 300, height: 40, rotation: 0, label: "Study Desk Row 1" },
    // Table 2 (Desk Row 2)
    { type: ObjectType.TABLE, x: 200, y: 300, width: 300, height: 40, rotation: 0, label: "Study Desk Row 2" },
  ];

  for (const obj of layoutObjectsData) {
    await prisma.layoutObject.create({
      data: {
        floorPlanId: floorPlan.id,
        type: obj.type,
        x: obj.x,
        y: obj.y,
        width: obj.width,
        height: obj.height,
        rotation: obj.rotation,
        label: obj.label,
      },
    });
  }

  // Seats with Seat relations
  const seatsData = [
    // Seats for Row 1
    { seatCode: "A-01", seatType: "General", x: 210, y: 100, width: 40, height: 40 },
    { seatCode: "A-02", seatType: "General", x: 280, y: 100, width: 40, height: 40 },
    { seatCode: "A-03", seatType: "Premium", x: 350, y: 100, width: 40, height: 40 },
    { seatCode: "A-04", seatType: "Premium", x: 420, y: 100, width: 40, height: 40 },
    // Seats for Row 2
    { seatCode: "B-01", seatType: "Quiet Zone", x: 210, y: 250, width: 40, height: 40 },
    { seatCode: "B-02", seatType: "Quiet Zone", x: 280, y: 250, width: 40, height: 40 },
    { seatCode: "B-03", seatType: "Premium Quiet", x: 350, y: 250, width: 40, height: 40 },
    { seatCode: "B-04", seatType: "Premium Quiet", x: 420, y: 250, width: 40, height: 40 },
  ];

  for (const seat of seatsData) {
    const layoutObj = await prisma.layoutObject.create({
      data: {
        floorPlanId: floorPlan.id,
        type: ObjectType.SEAT,
        x: seat.x,
        y: seat.y,
        width: seat.width,
        height: seat.height,
        label: seat.seatCode,
      },
    });

    await prisma.seat.create({
      data: {
        layoutObjectId: layoutObj.id,
        seatCode: seat.seatCode,
        seatType: seat.seatType,
        isActive: true,
      },
    });
  }

  console.log("Floor plan layouts and seats seeded successfully.");
  console.log("Database seeding completed.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
