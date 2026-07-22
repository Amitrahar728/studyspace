import { z } from "zod";

// Roles Enum
export const RoleEnum = z.enum(["STUDENT", "OWNER", "ADMIN"]);
export type Role = z.infer<typeof RoleEnum>;

// Object Types Enum
export const ObjectTypeEnum = z.enum([
  "SEAT",
  "TABLE",
  "AC",
  "FAN",
  "BOOKSHELF",
  "WATER",
  "CUSTOM",
  "WALL",
  "LINE",
]);
export type ObjectType = z.infer<typeof ObjectTypeEnum>;

// Booking Status Enum
export const BookingStatusEnum = z.enum([
  "HELD",
  "PENDING_PAYMENT",
  "CONFIRMED",
  "CANCELLED",
  "COMPLETED",
]);
export type BookingStatus = z.infer<typeof BookingStatusEnum>;

// Signup validation
export const SignupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: RoleEnum.default("STUDENT"),
  phone: z.string().optional().nullable(),
});
export type SignupInput = z.infer<typeof SignupSchema>;

// Signin validation
export const SigninSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});
export type SigninInput = z.infer<typeof SigninSchema>;

// Profile update validation
export const UpdateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

// Slot Type Validation
export const SlotTypeSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Slot name is required"),
  startTime: z.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid start time format (HH:MM)"),
  endTime: z.string().regex(/^([0-9]|0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid end time format (HH:MM)"),
  price: z.number().positive("Price must be greater than 0"),
});
export type SlotTypeInput = z.infer<typeof SlotTypeSchema>;

// Create Library Validation
export const CreateLibrarySchema = z.object({
  name: z.string().min(2, "Library name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  amenities: z.array(z.string()).default([]),
  slotTypes: z.array(SlotTypeSchema).min(1, "At least one slot type is required"),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  chairs: z.number().min(0).default(0).optional(),
  tables: z.number().min(0).default(0).optional(),
  acs: z.number().min(0).default(0).optional(),
  fans: z.number().min(0).default(0).optional(),
});
export type CreateLibraryInput = z.infer<typeof CreateLibrarySchema>;

// Seat Object Validation
export const SeatSchema = z.object({
  id: z.string().optional(),
  seatCode: z.string().min(1, "Seat code is required"),
  seatType: z.string().default("General"),
  isActive: z.boolean().default(true),
});
export type SeatInput = z.infer<typeof SeatSchema>;

// Layout Object Validation
export const LayoutObjectSchema = z.object({
  id: z.string().optional(),
  type: ObjectTypeEnum,
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number().default(0),
  zIndex: z.number().default(0),
  label: z.string().optional().nullable(),
  seat: SeatSchema.optional().nullable(),
});
export type LayoutObjectInput = z.infer<typeof LayoutObjectSchema>;

// Floor Plan Validation
export const FloorPlanSchema = z.object({
  canvasWidth: z.number().int().positive().default(800),
  canvasHeight: z.number().int().positive().default(600),
  objects: z.array(LayoutObjectSchema),
});
export type FloorPlanInput = z.infer<typeof FloorPlanSchema>;

// Hold Seat request validation
export const BookingHoldSchema = z.object({
  seatId: z.string().min(1, "Seat ID is required"),
  slotTypeId: z.string().min(1, "Slot Type ID is required"),
  date: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid date format",
  }).optional(),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid startDate format",
  }).optional(),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid endDate format",
  }).optional(),
});
export type BookingHoldInput = z.infer<typeof BookingHoldSchema>;

// Review schema validation
export const ReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional().nullable(),
});
export type ReviewInput = z.infer<typeof ReviewSchema>;
