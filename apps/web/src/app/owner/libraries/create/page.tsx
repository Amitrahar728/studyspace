"use client";
// Force Next.js manifest cache refresh

import React, { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../../context/AppContext";
import AlcoveLogo from "../../../../components/AlcoveLogo";
import { LayoutObject } from "../../../../components/CleanCanvasEditor";
import {
  ArrowLeft,
  ArrowRight,
  MapPin,
  Check,
  Plus,
  Minus,
  Upload,
  Trash2,
  Wifi,
  Wind,
  Zap,
  VolumeX,
  Lock,
  Coffee,
  AlertCircle,
  X,
  Search,
  Building2,
  ChevronRight,
  HelpCircle,
  Home,
  Copy,
  Camera,
  Sparkles,
  Clock,
  User,
  Key,
  MessageSquare,
  LogOut,
  Menu,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle,
  Image,
} from "lucide-react";

// Dynamically import CleanCanvasEditor to prevent SSR window reference issues
const CleanCanvasEditor = dynamic(
  () => import("../../../../components/CleanCanvasEditor"),
  { ssr: false }
);

interface PhotoItem {
  file: File;
  previewUrl: string;
  isCover: boolean;
}

interface ExistingLibrary {
  id: string;
  name: string;
  address: string;
  createdAt: string;
}

interface CustomSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  price: number;
}

interface FaqItem {
  id: string;
  category: "General" | "Pricing" | "Photos";
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const faqData: FaqItem[] = [
  // General Tab
  {
    id: "g1",
    category: "General",
    question: "How do I list my study space?",
    answer: "Fill in your address details, drop the coordinate pin, select amenities, specify inventory counts, upload exactly 5 photos, and set your pricing rates. We'll verify it within 24 hours.",
    icon: <HelpCircle className="w-4 h-4 text-stone-700" />,
  },
  {
    id: "g2",
    category: "General",
    question: "Are there listing fees?",
    answer: "Creating a listing is completely free. We only charge a small platform convenience fee of 5% on successful bookings.",
    icon: <Tag className="w-4 h-4 text-stone-700" />,
  },
  {
    id: "g3",
    category: "General",
    question: "What criteria must my space meet?",
    answer: "Spaces must offer a quiet, study-focused environment, comfortable seating, proper lighting, and reliable cooling (fans or AC).",
    icon: <CheckCircle className="w-4 h-4 text-stone-700" />,
  },

  // Pricing Tab
  {
    id: "p1",
    category: "Pricing",
    question: "How does shift slot pricing work?",
    answer: "Students can book morning, afternoon, evening, or full-day shifts. You can set custom rates for each shift to optimize off-peak capacity.",
    icon: <Clock className="w-4 h-4 text-stone-700" />,
  },
  {
    id: "p2",
    category: "Pricing",
    question: "Can I offer discounts for long-term stays?",
    answer: "Yes, our system automatically applies discounts (10% off weekly, 20% off monthly, 25% off quarterly stays).",
    icon: <Sparkles className="w-4 h-4 text-stone-700" />,
  },

  // Photos Tab
  {
    id: "ph1",
    category: "Photos",
    question: "Why do I need exactly 5 photos?",
    answer: "We display a standardized 5-photo grid layout on student search pages to give them a trusted, comprehensive view before booking.",
    icon: <Image className="w-4 h-4 text-stone-700" />,
  },
  {
    id: "ph2",
    category: "Photos",
    question: "How does the map coordinator work?",
    answer: "Click on the map block in Step 1 to drop the location pin. This pin is used by student navigation and geolocation filters.",
    icon: <MapPin className="w-4 h-4 text-stone-700" />,
  },
];

export default function CreateLibraryWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  // Creation Step Flow:
  // Step 0: Welcome / Finish listing / Start new listing
  // Step 1: Intro banner - "Set up your Library setup" (step-1 image.avif)
  // Step 2: Step 1 Overview with 3D embed - "Tell us about your place"
  // Step 3: Map pin confirmation - "Is the pin in the right spot?"
  // Step 4: Step 2 Overview - "Make your place stand out" (step-2 image 2.avif)
  // Step 5: Amenities selection - "Tell guests which amenities they'll find at your place"
  // Step 6: Photos - "Add some photos of your library" (5 photos requirement)
  // Step 7: Title & Description - "Now, let's give your library a title"
  // Step 8: Step 3 Overview - "Finish up and publish" (step-3 image.avif)
  // Step 9: Dynamic Pricing Slots (Default 1 slot, owner can add/remove/edit slots)
  // Step 10: Integrated Canvas Floorplan Layout Builder (S1, S2... seats, tables, ACs) -> Complete & Submit
  const [step, setStep] = useState(0);
  const [editingLibraryId, setEditingLibraryId] = useState<string | null>(null);
  const [ownerMenuOpen, setOwnerMenuOpen] = useState(false);

  // FAQ Helper Sidebar state
  const [faqSidebarOpen, setFaqSidebarOpen] = useState(false);
  const [faqCategory, setFaqCategory] = useState<"General" | "Pricing" | "Photos">("General");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("g1");

  // Address Modal state
  const [addressModalOpen, setAddressModalOpen] = useState(false);

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);

  // Address Fields
  const [country, setCountry] = useState("India - IN");
  const [flatHouse, setFlatHouse] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("Fatehabad");
  const [stateName, setStateName] = useState("Haryana");
  const [pinCode, setPinCode] = useState("125050");

  // Geocoded Coordinates
  const [latitude, setLatitude] = useState<number>(28.4595);
  const [longitude, setLongitude] = useState<number>(77.0266);

  // Library Name & Description
  const [libraryName, setLibraryName] = useState("");
  const [description, setDescription] = useState("");

  // Amenities & Custom Amenity Text
  const [amenities, setAmenities] = useState<string[]>([]);
  const [customAmenity, setCustomAmenity] = useState("");

  // Photos (Exactly 5 requirement)
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Dynamic Pricing Slots (Default 1 slot choice)
  const [slots, setSlots] = useState<CustomSlot[]>([
    {
      id: "slot_1",
      name: "Full Day Shift",
      startTime: "08:00",
      endTime: "20:00",
      price: 300,
    },
  ]);

  // Canvas Layout Objects
  const [layoutObjects, setLayoutObjects] = useState<LayoutObject[]>([
    {
      id: "seat_1",
      type: "SEAT",
      x: 100,
      y: 100,
      width: 38,
      height: 38,
      rotation: 0,
      zIndex: 0,
      label: "S1",
      seat: { seatCode: "S1", seatType: "General", isActive: true },
    },
    {
      id: "seat_2",
      type: "SEAT",
      x: 160,
      y: 100,
      width: 38,
      height: 38,
      rotation: 0,
      zIndex: 0,
      label: "S2",
      seat: { seatCode: "S2", seatType: "General", isActive: true },
    },
    {
      id: "table_1",
      type: "TABLE",
      x: 100,
      y: 160,
      width: 140,
      height: 36,
      rotation: 0,
      zIndex: 0,
      label: "Table",
      seat: null,
    },
  ]);

  // Fetch past/existing owner listings for Step 0 screen
  const { data: ownerLibraries } = useQuery<ExistingLibrary[]>({
    queryKey: ["owner-existing-libraries", user?.id],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries?ownerId=${user?.id}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Reset wizard form for starting a fresh listing
  const handleStartNewListing = () => {
    setEditingLibraryId(null);
    setLibraryName("");
    setDescription("");
    setFlatHouse("");
    setStreetAddress("");
    setLandmark("");
    setDistrict("");
    setCity("Fatehabad");
    setStateName("Haryana");
    setPinCode("125050");
    setLatitude(28.4595);
    setLongitude(77.0266);
    setAmenities([]);
    setCustomAmenity("");
    setPhotos([]);
    setSlots([
      {
        id: "slot_1",
        name: "Full Day Shift",
        startTime: "08:00",
        endTime: "20:00",
        price: 300,
      },
    ]);
    setLayoutObjects([
      {
        id: "seat_1",
        type: "SEAT",
        x: 100,
        y: 100,
        width: 44,
        height: 44,
        rotation: 0,
        zIndex: 0,
        label: "S1",
        seat: { seatCode: "S1", seatType: "General", isActive: true },
      },
      {
        id: "seat_2",
        type: "SEAT",
        x: 160,
        y: 100,
        width: 44,
        height: 44,
        rotation: 0,
        zIndex: 0,
        label: "S2",
        seat: { seatCode: "S2", seatType: "General", isActive: true },
      },
      {
        id: "table_1",
        type: "TABLE",
        x: 100,
        y: 160,
        width: 140,
        height: 38,
        rotation: 0,
        zIndex: 0,
        label: "Table",
        seat: null,
      },
    ]);
    setFormError(null);
    setStep(1);
  };

  // Load existing listing data into wizard steps for editing
  const handleEditListing = async (libraryId: string) => {
    try {
      setIsSubmitting(true);
      setFormError(null);
      setEditingLibraryId(libraryId);

      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

      // 1. Fetch library details
      const res = await fetch(`${apiBase}/libraries/${libraryId}`);
      if (!res.ok) throw new Error("Failed to load listing details.");
      const libData = await res.json();

      setLibraryName(libData.name || "");
      setCity(libData.city || "Fatehabad");
      setStreetAddress(libData.address || "");
      if (libData.latitude) setLatitude(Number(libData.latitude));
      if (libData.longitude) setLongitude(Number(libData.longitude));
      if (libData.amenities && Array.isArray(libData.amenities)) {
        setAmenities(libData.amenities);
      }

      if (libData.slotTypes && Array.isArray(libData.slotTypes) && libData.slotTypes.length > 0) {
        setSlots(
          libData.slotTypes.map((s: any, idx: number) => ({
            id: s.id || `slot_${idx + 1}`,
            name: s.name,
            startTime: s.startTime,
            endTime: s.endTime,
            price: Number(s.price),
          }))
        );
      }

      if (libData.photos && Array.isArray(libData.photos) && libData.photos.length > 0) {
        setPhotos(
          libData.photos.map((photoObj: any, idx: number) => {
            const photoUrl = typeof photoObj === "string" ? photoObj : photoObj.url;
            return {
              file: null,
              previewUrl: photoUrl,
              isCover: idx === 0,
            };
          })
        );
      }

      // 2. Fetch floorplan canvas objects
      try {
        const fpRes = await fetch(`${apiBase}/libraries/${libraryId}/floorplan`);
        if (fpRes.ok) {
          const fpData = await fpRes.json();
          if (fpData.objects && Array.isArray(fpData.objects) && fpData.objects.length > 0) {
            setLayoutObjects(fpData.objects);
          }
        }
      } catch (fpErr) {
        console.warn("Floorplan fetch warning:", fpErr);
      }

      setIsSubmitting(false);
      setStep(1);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormError(err.message || "Failed to load listing for editing.");
    }
  };

  const amenitiesList = [
    { id: "AC", name: "Air conditioning", icon: Wind },
    { id: "WiFi", name: "High-speed Wi-Fi", icon: Wifi },
    { id: "Power Outlets", name: "Power Outlets", icon: Zap },
    { id: "Silent Zone", name: "Silent Zone", icon: VolumeX },
    { id: "Cafeteria", name: "Cafeteria", icon: Coffee },
    { id: "Locker", name: "Locker", icon: Lock },
    { id: "Others", name: "Others", icon: Sparkles },
  ];

  const handleAmenityToggle = (id: string) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // Dynamic Slot Handlers
  const addCustomSlot = () => {
    const newId = `slot_${Date.now()}`;
    setSlots((prev) => [
      ...prev,
      {
        id: newId,
        name: `Slot ${prev.length + 1}`,
        startTime: "09:00",
        endTime: "14:00",
        price: 150,
      },
    ]);
  };

  const updateSlot = (id: string, updates: Partial<CustomSlot>) => {
    setSlots((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  };

  const removeSlot = (id: string) => {
    if (slots.length <= 1) {
      setFormError("At least one shift slot is required.");
      return;
    }
    setSlots((prev) => prev.filter((s) => s.id !== id));
  };

  // Address Submit from Modal -> Geocode lat/long & move to Step 2
  const handleAddressConfirm = async () => {
    if (!streetAddress || !city || !stateName || !pinCode) {
      setFormError("Please fill in street address, city, state, and pin code.");
      return;
    }

    setFormError(null);
    setIsGeocoding(true);

    const fullAddrString = `${flatHouse ? `${flatHouse}, ` : ""}${streetAddress}${landmark ? `, Near ${landmark}` : ""}${district ? `, ${district}` : ""}, ${city}, ${stateName} ${pinCode}, India`;

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries/geocode?address=${encodeURIComponent(fullAddrString)}`);
      if (res.ok) {
        const geoData = await res.json();
        if (geoData.latitude && geoData.longitude) {
          setLatitude(geoData.latitude);
          setLongitude(geoData.longitude);
        }
      }
    } catch (err) {
      console.warn("Geocoding fallback default coordinates used.");
    } finally {
      setIsGeocoding(false);
      setAddressModalOpen(false);
      setStep(2);
    }
  };

  // Photo handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addPhotos(files);
  };

  const addPhotos = (files: File[]) => {
    setFormError(null);
    const newPhotos: PhotoItem[] = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError(`File ${file.name} exceeds the 5MB size limit.`);
        return;
      }

      newPhotos.push({
        file,
        previewUrl: URL.createObjectURL(file),
        isCover: false,
      });
    }

    setPhotos((prev) => {
      const combined = [...prev, ...newPhotos].slice(0, 5);
      if (combined.length > 0 && !combined.some((p) => p.isCover)) {
        combined[0].isCover = true;
      }
      return combined;
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev.filter((_, i) => i !== index);
      if (removed.length > 0 && !removed.some((p) => p.isCover)) {
        removed[0].isCover = true;
      }
      return removed;
    });
  };

  // Final Submit Handler: Creates Library + Uploads S3 Photos + Saves Canvas Floorplan
  const handleSubmitListing = async () => {
    if (photos.length !== 5) {
      setFormError("You must upload exactly 5 images to proceed.");
      return;
    }

    if (slots.length === 0) {
      setFormError("Please configure at least one pricing slot.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const fullAddress = `${flatHouse ? `${flatHouse}, ` : ""}${streetAddress}${landmark ? `, Near ${landmark}` : ""}, ${city}, ${stateName} - ${pinCode}`;
      const finalName = libraryName.trim() || `${city} StudySpace Library`;

      // Count equipment automatically from canvas
      const totalChairs = layoutObjects.filter((o) => o.type === "SEAT").length;
      const totalTables = layoutObjects.filter((o) => o.type === "TABLE").length;
      const totalAcs = layoutObjects.filter((o) => o.type === "AC").length;

      // Combine default amenities + custom amenity if entered
      const finalAmenities = [...amenities];
      if (amenities.includes("Others") && customAmenity.trim()) {
        finalAmenities.push(customAmenity.trim());
      }

      // 1. Create or Update Library in database
      let libraryId = editingLibraryId;

      if (editingLibraryId) {
        const response = await fetch(`${apiBase}/libraries/${editingLibraryId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: finalName,
            city,
            address: fullAddress,
            latitude,
            longitude,
            amenities: finalAmenities,
            chairs: totalChairs,
            tables: totalTables,
            acs: totalAcs,
            fans: 0,
            slotTypes: slots.map((s) => ({
              name: s.name,
              startTime: s.startTime,
              endTime: s.endTime,
              price: Number(s.price),
            })),
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.message || "Failed to update library listing.");
        }
      } else {
        const response = await fetch(`${apiBase}/libraries`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: finalName,
            city,
            address: fullAddress,
            latitude,
            longitude,
            amenities: finalAmenities,
            chairs: totalChairs,
            tables: totalTables,
            acs: totalAcs,
            fans: 0,
            slotTypes: slots.map((s) => ({
              name: s.name,
              startTime: s.startTime,
              endTime: s.endTime,
              price: Number(s.price),
            })),
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Failed to create library listing.");
        }
        libraryId = data.id;
      }

      // 2. Upload any newly added photo files to S3
      const sortedPhotos = [...photos].sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0));

      for (const p of sortedPhotos) {
        if (p.file) {
          await fetch(`${apiBase}/libraries/${libraryId}/photos/upload-direct`, {
            method: "POST",
            headers: {
              "Content-Type": p.file.type,
              Authorization: `Bearer ${token}`,
            },
            body: p.file,
          });
        }
      }

      // 3. Save Floorplan Layout Objects to DB
      await fetch(`${apiBase}/libraries/${libraryId}/floorplan`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          canvasWidth: 750,
          canvasHeight: 500,
          objects: layoutObjects,
        }),
      });

      queryClient.invalidateQueries({ queryKey: ["owner-libraries", user?.id] });
      router.push("/owner/dashboard");
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred during submission.");
      setIsSubmitting(false);
    }
  };

  const getFullAddressDisplay = () => {
    return `${flatHouse ? `${flatHouse}, ` : ""}${streetAddress || "Professor Colony"}, ${landmark ? `${landmark}, ` : ""}${district ? `${district}, ` : ""}${city || "Fatehabad"}, ${stateName || "Haryana"} ${pinCode || "125050"}, India`;
  };

  // Check if current step allows proceeding
  const canProceed = () => {
    if (step === 1) return !!streetAddress;
    if (step === 6) return photos.length === 5;
    if (step === 7) return libraryName.trim().length > 0;
    if (step === 9) return slots.length > 0;
    return true;
  };

  return (
    <div className="min-h-screen bg-white text-[#222222] font-sans flex flex-col justify-between select-none">

      {/* Universal Top Header Bar */}
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-stone-200/60 bg-white sticky top-0 z-30">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => setStep(0)}>
          <AlcoveLogo size="md" />
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFaqSidebarOpen(!faqSidebarOpen)}
            className={`text-xs font-semibold px-4 py-2 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${faqSidebarOpen
                ? "bg-black text-white border-black"
                : "text-stone-700 hover:text-black bg-stone-100/80 hover:bg-stone-200/60 border-stone-200"
              }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Questions?
          </button>

          {step === 0 ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setOwnerMenuOpen(!ownerMenuOpen)}
                className="flex items-center gap-2.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-full px-3.5 py-1.5 transition cursor-pointer shadow-xs"
              >
                <Menu className="w-4 h-4 text-stone-700" />
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl.startsWith("http") ? user.avatarUrl : `http://localhost:8000/api/v1/auth/avatar/${user.avatarUrl}`}
                    alt={user.name || "Host"}
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                    className="w-7 h-7 rounded-full object-cover border border-stone-200 shrink-0"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#222222] text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {user ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
              </button>

              {ownerMenuOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 text-xs text-[#222222] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-stone-100 font-bold">
                    <p className="truncate text-sm">{user?.name || "Host"}</p>
                    <p className="text-[11px] font-normal text-stone-500 truncate">{user?.email}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerMenuOpen(false);
                      setStep(0);
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 font-semibold text-stone-700 hover:text-black transition cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-stone-500" />
                    Host Home
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerMenuOpen(false);
                      router.push("/owner/bookings");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 font-semibold text-stone-700 hover:text-black transition cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-stone-500" />
                    Reservations
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerMenuOpen(false);
                      router.push("/owner/profile");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 font-semibold text-stone-700 hover:text-black transition cursor-pointer"
                  >
                    <User className="w-4 h-4 text-stone-500" />
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOwnerMenuOpen(false);
                      router.push("/owner/messages");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 font-semibold text-stone-700 hover:text-black transition cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-stone-500" />
                    Messages
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setOwnerMenuOpen(false);
                      router.push("/auth/signup");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-2.5 font-bold text-red-600 border-t border-stone-100 mt-1 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-500" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-xs font-semibold text-stone-700 hover:text-black bg-white hover:bg-stone-100 border border-stone-300 px-4 py-2 rounded-full transition cursor-pointer shadow-xs"
            >
              Save & exit
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Container: Wizard Content Left + Slide-out FAQ Sidebar Right */}
      <div className="flex-grow flex relative overflow-hidden">

        {/* Wizard Main Steps Container */}
        <div className="flex-grow flex flex-col justify-between min-w-0 transition-all duration-300">

          {/* STEP 0: Owner Home Welcome Screen */}
          {step === 0 && (
            <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-12 max-w-2xl mx-auto w-full">
              <div className="w-full space-y-10">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#222222] tracking-tight">
                  Welcome back, {user?.name || "Host"}
                </h1>

                {/* Section 1: Current listing */}
                <div className="space-y-3">
                  <h2 className="text-base font-bold text-[#222222]">Current listing</h2>
                  {ownerLibraries && ownerLibraries.length > 0 ? (
                    <div className="space-y-2">
                      {ownerLibraries.map((lib) => (
                        <div
                          key={lib.id}
                          onClick={() => handleEditListing(lib.id)}
                          className="p-5 border border-stone-200 rounded-2xl flex items-center justify-between hover:border-stone-800 transition cursor-pointer bg-white shadow-xs group"
                        >
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-stone-100 rounded-xl text-stone-700">
                              <Home className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-[#222222]">{lib.name}</p>
                              <p className="text-xs text-stone-500">{lib.address}</p>
                            </div>
                          </div>
                          <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-black transition" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      onClick={handleStartNewListing}
                      className="p-5 border border-stone-200 rounded-2xl flex items-center gap-4 hover:border-stone-800 transition cursor-pointer bg-white shadow-xs group"
                    >
                      <div className="p-3 bg-stone-100 rounded-xl text-stone-700">
                        <Home className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-sm text-[#222222]">
                        Your Unique space listing started on {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                  )}
                </div>

                {/* Section 2: Start a new listing */}
                <div className="space-y-4 pt-2 border-t border-stone-100">
                  <h2 className="text-base font-bold text-[#222222]">Start a new listing</h2>

                  <div className="space-y-3">
                    <div
                      onClick={handleStartNewListing}
                      className="py-4 border-b border-stone-200 flex items-center justify-between hover:text-black cursor-pointer group transition"
                    >
                      <div className="flex items-center gap-3">
                        <Plus className="w-5 h-5 text-stone-700 group-hover:text-black" />
                        <span className="font-semibold text-sm text-[#222222]">Create a new listing</span>
                      </div>
                      <ChevronRight className="w-5 h-5 text-stone-400 group-hover:text-black transition" />
                    </div>
                  </div>
                </div>

              </div>
            </main>
          )}

          {/* STEP 1: Set up your Library setup (step-1 image.avif) */}
          {step === 1 && (
            <main className="flex-grow flex items-center justify-center p-6 md:p-12 max-w-6xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
                <div className="space-y-6 max-w-lg">
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-[#222222] tracking-tight leading-tight">
                    Set up your Library setup
                  </h1>
                  <p className="text-base text-stone-600 font-medium">
                    It's easy to create a library listing &ndash; let's start with your address.
                  </p>
                  <div
                    onClick={() => setAddressModalOpen(true)}
                    className="w-full p-4 pl-5 border border-stone-300 hover:border-stone-800 rounded-full flex items-center gap-3 cursor-pointer shadow-xs bg-white transition group"
                  >
                    <Search className="w-5 h-5 text-stone-500 group-hover:text-black" />
                    <span className="text-sm font-semibold text-stone-500 group-hover:text-black">
                      {streetAddress ? `${streetAddress}, ${city}` : "Enter your address"}
                    </span>
                  </div>
                </div>

                <div className="w-full flex items-center justify-center">
                  <img
                    src="https://studyspace-photos.s3.ap-south-1.amazonaws.com/owner_end/step-1+image.avif"
                    alt="Set up your library"
                    className="w-full max-w-xl h-[440px] sm:h-[500px] object-cover rounded-[32px] border border-stone-200/90 shadow-md transition duration-200"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                </div>
              </div>
            </main>
          )}

          {/* ADDRESS CONFIRMATION MODAL */}
          {addressModalOpen && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white border border-stone-200 rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-8 relative animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between pb-4 border-b border-stone-100 mb-6">
                  <button
                    type="button"
                    onClick={() => setAddressModalOpen(false)}
                    className="p-2 rounded-full hover:bg-stone-100 text-stone-700 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h3 className="text-lg font-bold text-[#222222]">Confirm your address</h3>
                  <button
                    type="button"
                    onClick={() => setAddressModalOpen(false)}
                    className="p-2 rounded-full hover:bg-stone-100 text-stone-700 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {formError && (
                  <div className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-xl border border-rose-200 mb-4 font-semibold">
                    {formError}
                  </div>
                )}

                <div className="border border-stone-300 rounded-2xl overflow-hidden divide-y divide-stone-200 mb-6">
                  <div className="p-3.5 bg-white">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      Country/region
                    </label>
                    <select
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      className="w-full text-sm font-semibold text-[#222222] bg-transparent outline-none cursor-pointer mt-0.5"
                    >
                      <option value="India - IN">India - IN</option>
                      <option value="United States - US">United States - US</option>
                      <option value="United Kingdom - UK">United Kingdom - UK</option>
                    </select>
                  </div>

                  <div className="p-3.5 bg-white">
                    <input
                      type="text"
                      placeholder="Flat, house, etc. (if applicable)"
                      value={flatHouse}
                      onChange={(e) => setFlatHouse(e.target.value)}
                      className="w-full text-sm font-medium text-[#222222] bg-transparent outline-none placeholder-stone-400"
                    />
                  </div>

                  <div className="p-3.5 bg-white">
                    <input
                      type="text"
                      placeholder="Street address"
                      value={streetAddress}
                      onChange={(e) => setStreetAddress(e.target.value)}
                      className="w-full text-sm font-medium text-[#222222] bg-transparent outline-none placeholder-stone-400"
                    />
                  </div>

                  <div className="p-3.5 bg-white">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      Nearby landmark (if applicable)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Fatehabad"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      className="w-full text-sm font-semibold text-[#222222] bg-transparent outline-none mt-0.5"
                    />
                  </div>

                  <div className="p-3.5 bg-white">
                    <input
                      type="text"
                      placeholder="District/locality (if applicable)"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full text-sm font-medium text-[#222222] bg-transparent outline-none placeholder-stone-400"
                    />
                  </div>

                  <div className="p-3.5 bg-white">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      City/town
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full text-sm font-semibold text-[#222222] bg-transparent outline-none mt-0.5"
                    />
                  </div>

                  <div className="p-3.5 bg-white">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      State/union territory
                    </label>
                    <input
                      type="text"
                      value={stateName}
                      onChange={(e) => setStateName(e.target.value)}
                      className="w-full text-sm font-semibold text-[#222222] bg-transparent outline-none mt-0.5"
                    />
                  </div>

                  <div className="p-3.5 bg-white">
                    <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                      PIN code
                    </label>
                    <input
                      type="text"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      className="w-full text-sm font-semibold text-[#222222] bg-transparent outline-none mt-0.5"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleAddressConfirm}
                  disabled={isGeocoding}
                  className="w-full bg-[#222222] hover:bg-black text-white text-sm font-bold py-4 rounded-xl transition cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isGeocoding ? "Geocoding address..." : "Next"}
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Step 1 Overview with 3D Embed */}
          {step === 2 && (
            <main className="flex-grow flex items-center justify-center p-6 md:p-12 max-w-6xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
                <div className="space-y-6 max-w-lg">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest block">Step 1</span>
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-[#222222] tracking-tight leading-tight">
                    Tell us about your place
                  </h1>
                  <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-medium">
                    In this step, we'll ask you which type of property you have and if guests will book the entire place or just a room. Then let us know the location and how many guests can stay.
                  </p>
                </div>

                <div className="w-full h-80 sm:h-[400px] rounded-3xl overflow-hidden shadow-lg border border-stone-200 bg-white">
                  <iframe
                    title="Little Library"
                    className="w-full h-full border-0"
                    allow="autoplay; fullscreen; xr-spatial-tracking"
                    src="https://sketchfab.com/models/d808894048b64eb89d9d3783fb1f5a16/embed?autostart=1"
                  />
                </div>
              </div>
            </main>
          )}

          {/* STEP 3: Map Pin Confirmation */}
          {step === 3 && (
            <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-10 max-w-4xl mx-auto w-full">
              <div className="w-full space-y-6 text-center">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
                    Is the pin in the right spot?
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    Your address is only shared with guests after they've made a reservation.
                  </p>
                </div>

                <div className="relative w-full max-w-2xl mx-auto h-96 sm:h-[420px] rounded-3xl overflow-hidden border border-stone-200/90 shadow-md bg-stone-100 flex flex-col justify-between p-4">
                  <div className="bg-white/95 backdrop-blur-xs border border-stone-200 rounded-full px-5 py-3 shadow-sm mx-auto text-xs font-bold text-[#222222] flex items-center gap-2 max-w-xl truncate z-10">
                    <MapPin className="w-4 h-4 text-[#222222] shrink-0" />
                    <span className="truncate">{getFullAddressDisplay()}</span>
                  </div>

                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="relative flex flex-col items-center">
                      <div className="bg-[#222222] text-white p-3 rounded-full shadow-xl">
                        <Home className="w-6 h-6" />
                      </div>
                      <div className="bg-[#222222] text-white text-[10px] font-bold px-3 py-1 rounded-full mt-2 shadow-md">
                        Drag the map to reposition the pin
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </main>
          )}

          {/* STEP 4: Step 2 Overview - "Make your place stand out" */}
          {step === 4 && (
            <main className="flex-grow flex items-center justify-center p-6 md:p-12 max-w-6xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
                <div className="space-y-6 max-w-lg">
                  <span className="text-xs font-bold text-stone-500 uppercase tracking-widest block">Step 2</span>
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-[#222222] tracking-tight leading-tight">
                    Make your place stand out
                  </h1>
                  <p className="text-sm sm:text-base text-stone-600 leading-relaxed font-medium">
                    In this step, you'll add some of the amenities your place offers, plus 5 or more photos. Then you'll create a title and description.
                  </p>
                </div>

                <div className="w-full flex items-center justify-center">
                  <img
                    src="https://studyspace-photos.s3.ap-south-1.amazonaws.com/owner_end/step-2+image+2.avif"
                    alt="Make your place stand out"
                    className="w-full max-w-xl h-[440px] sm:h-[500px] object-cover rounded-[32px] border border-stone-200/90 shadow-md transition duration-200"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80";
                    }}
                  />
                </div>
              </div>
            </main>
          )}

          {/* STEP 5: Amenities Selection */}
          {step === 5 && (
            <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-12 max-w-4xl mx-auto w-full">
              <div className="w-full max-w-2xl space-y-8">
                <div>
                  <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">
                    Tell guests which amenities they'll find at your place
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    You can add more amenities after you publish your listing.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Basics</h3>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {amenitiesList.map((item) => {
                      const IconComp = item.icon;
                      const isSelected = amenities.includes(item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAmenityToggle(item.id)}
                          className={`p-5 border rounded-2xl flex flex-col items-start gap-3 transition cursor-pointer text-left ${isSelected
                            ? "border-black bg-stone-100/80 ring-1 ring-black/10"
                            : "border-stone-200 hover:border-stone-400 bg-white"
                            }`}
                        >
                          <IconComp className="w-6 h-6 text-[#222222]" />
                          <span className="text-sm font-semibold text-[#222222]">{item.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Amenity Text Field when "Others" is selected */}
                  {amenities.includes("Others") && (
                    <div className="pt-3 animate-in fade-in duration-200">
                      <label className="block text-xs font-bold text-stone-600 mb-1.5">
                        Specify custom amenity details:
                      </label>
                      <input
                        type="text"
                        value={customAmenity}
                        onChange={(e) => setCustomAmenity(e.target.value)}
                        placeholder="Enter additional amenity features (e.g. Ergonomic Chairs, Tea/Coffee Counter...)"
                        className="w-full text-xs p-3.5 border border-stone-300 focus:border-black rounded-xl outline-none bg-white font-medium"
                      />
                    </div>
                  )}
                </div>

              </div>
            </main>
          )}

          {/* STEP 6: Photos Upload */}
          {step === 6 && (
            <main className="flex-grow flex flex-col items-center justify-center p-6 md:p-12 max-w-3xl mx-auto w-full">
              <div className="w-full max-w-2xl space-y-8 text-center">
                <div className="text-left">
                  <h1 className="text-3xl font-extrabold text-[#222222] tracking-tight">
                    Add some photos of your library
                  </h1>
                  <p className="text-xs sm:text-sm text-stone-500 mt-1">
                    You'll need 5 photos to get started. You can add more or make changes later.
                  </p>
                </div>

                {formError && (
                  <div className="bg-rose-50 text-rose-700 text-xs p-3.5 rounded-xl border border-rose-200 font-semibold text-left">
                    {formError}
                  </div>
                )}

                <div className="border-2 border-dashed border-stone-300 rounded-3xl p-12 sm:p-16 text-center bg-stone-50/60 hover:bg-stone-50 transition cursor-pointer select-none flex flex-col items-center justify-center space-y-4">
                  <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-3xl bg-transparent flex items-center justify-center p-1">
                    <img
                      src="https://studyspace-photos.s3.ap-south-1.amazonaws.com/owner_end/camera"
                      alt="Camera Icon"
                      className="w-full h-full object-contain filter drop-shadow-md"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  <div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-[#F2F0EA] hover:bg-stone-200 text-[#222222] text-xs font-bold px-6 py-2.5 rounded-xl border border-stone-300 transition cursor-pointer"
                    >
                      Add photos
                    </button>
                    <p className="text-xs text-stone-400 mt-2">({photos.length} of 5 photos uploaded)</p>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      if (e.target.files) addPhotos(Array.from(e.target.files));
                    }}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              </div>
            </main>
          )}

          {/* STEP 7: Title & Description */}
          {step === 7 && (
            <main className="flex-grow flex flex-col items-center justify-center p-6 max-w-2xl mx-auto w-full space-y-8">
              <div className="text-center space-y-2 max-w-xl">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
                  Now, let&apos;s give your library a title
                </h1>
                <p className="text-xs text-stone-500 font-medium">
                  Short titles work best. Have fun with it—you can always change it later.
                </p>
              </div>

              <div className="space-y-6 w-full">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    Library Name / Title
                  </label>
                  <input
                    type="text"
                    value={libraryName}
                    onChange={(e) => setLibraryName(e.target.value)}
                    placeholder="e.g. Professor Colony Quiet Reading Zone"
                    maxLength={50}
                    className="w-full p-4 border border-stone-300 rounded-2xl text-sm font-bold focus:border-black outline-none bg-white text-[#222222]"
                  />
                  <p className="text-[11px] text-stone-400 font-medium text-right">{libraryName.length}/50 characters</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
                    Description & Atmosphere
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what makes your reading room special—high speed internet, silent zones, ergonomic desks..."
                    maxLength={500}
                    rows={5}
                    className="w-full p-4 border border-stone-300 rounded-2xl text-xs font-medium focus:border-black outline-none bg-white text-[#222222] resize-none"
                  />
                  <p className="text-[11px] text-stone-400 font-medium text-right">{description.length}/500 characters</p>
                </div>
              </div>
            </main>
          )}

          {/* STEP 8: Step 3 Overview (step-3 image.avif) */}
          {step === 8 && (
            <main className="flex-grow flex items-center justify-center p-6 md:p-12 max-w-6xl mx-auto w-full">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center w-full">
                <div className="space-y-6 max-w-lg">
                  <span className="text-xs font-extrabold uppercase tracking-widest text-stone-400">Step 3</span>
                  <h1 className="text-4xl sm:text-5xl font-extrabold text-[#222222] tracking-tight leading-tight">
                    Finish up and publish
                  </h1>
                  <p className="text-sm text-stone-600 leading-relaxed font-medium">
                    Finally, configure your custom pricing shifts, design your interactive seat floorplan map, and publish your library.
                  </p>
                </div>

                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-stone-200 max-w-[#500px]">
                  <img
                    src="https://studyspace-photos.s3.ap-south-1.amazonaws.com/owner_end/step+-3+image.avif"
                    alt="Step 3 Preview"
                    className="w-full h-auto object-cover rounded-3xl"
                  />
                </div>
              </div>
            </main>
          )}

          {/* STEP 9: Dynamic Pricing Slots */}
          {step === 9 && (
            <main className="flex-grow flex flex-col items-center justify-center p-6 max-w-3xl mx-auto w-full space-y-8">
              <div className="text-center space-y-2 max-w-xl">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
                  Configure shift slots & pricing
                </h1>
                <p className="text-xs text-stone-500 font-medium">
                  By default one shift slot is provided. You can edit times, prices, or add additional shift choices as needed.
                </p>
              </div>

              <div className="space-y-4 w-full">
                {slots.map((s, idx) => (
                  <div
                    key={s.id}
                    className="p-5 border border-stone-200 rounded-2xl bg-white shadow-xs space-y-4 relative group"
                  >
                    <div className="flex items-center justify-between border-b border-stone-100 pb-3">
                      <span className="font-extrabold text-sm text-[#222222]">
                        Shift Option #{idx + 1}
                      </span>
                      {slots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSlot(s.id)}
                          className="text-stone-400 hover:text-red-600 p-1 rounded-full transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                          Shift Title
                        </label>
                        <input
                          type="text"
                          value={s.name}
                          onChange={(e) => updateSlot(s.id, { name: e.target.value })}
                          placeholder="e.g. Morning Shift"
                          className="w-full p-2.5 border border-stone-300 rounded-xl text-xs font-bold focus:border-black outline-none"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                          Start Time
                        </label>
                        <input
                          type="time"
                          value={s.startTime}
                          onChange={(e) => updateSlot(s.id, { startTime: e.target.value })}
                          className="w-full p-2.5 border border-stone-300 rounded-xl text-xs font-semibold focus:border-black outline-none"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                          End Time
                        </label>
                        <input
                          type="time"
                          value={s.endTime}
                          onChange={(e) => updateSlot(s.id, { endTime: e.target.value })}
                          className="w-full p-2.5 border border-stone-300 rounded-xl text-xs font-semibold focus:border-black outline-none"
                        />
                      </div>

                      <div className="space-y-1 sm:col-span-1">
                        <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider block">
                          Price (₹)
                        </label>
                        <input
                          type="number"
                          value={s.price}
                          onChange={(e) => updateSlot(s.id, { price: Number(e.target.value) })}
                          className="w-full p-2.5 border border-stone-300 rounded-xl text-xs font-bold focus:border-black outline-none text-[#222222]"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addCustomSlot}
                  className="w-full py-4 border-2 border-dashed border-stone-300 hover:border-black rounded-2xl font-bold text-xs text-[#222222] transition cursor-pointer flex items-center justify-center gap-2 bg-stone-50/50"
                >
                  <Plus className="w-4 h-4 text-stone-700" />
                  <span>Add Another Shift Slot</span>
                </button>
              </div>
            </main>
          )}

          {/* STEP 10: Integrated Floorplan Canvas Builder */}
          {step === 10 && (
            <main className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 w-full space-y-4 max-w-7xl mx-auto">
              <div className="text-center space-y-1 max-w-xl">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#222222] tracking-tight">
                  Design your library floorplan map
                </h1>
                <p className="text-xs text-stone-500 font-medium">
                  Add chairs (S1, S2...), tables, ACs, and fans using clean symbols. Resize, rotate, and position them on your grid.
                </p>
              </div>

              <div className="w-full bg-white border border-stone-200 rounded-3xl overflow-hidden shadow-xl min-h-[520px]">
                <CleanCanvasEditor
                  layoutObjects={layoutObjects}
                  onChange={(updated) => setLayoutObjects(updated)}
                />
              </div>
            </main>
          )}

          {/* Universal Sticky Bottom Navigation Bar for Wizard Steps 1-10 */}
          {step > 0 && (
            <footer className="w-full px-6 py-4 border-t border-stone-200/80 bg-white sticky bottom-0 z-30">
              <div className="max-w-6xl mx-auto flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="text-xs font-bold text-[#222222] hover:text-black border border-stone-300 hover:border-stone-800 bg-white hover:bg-stone-50 px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <ArrowLeft className="w-4 h-4 text-stone-700" />
                  <span>Back</span>
                </button>

                {step < 10 ? (
                  <button
                    type="button"
                    disabled={!canProceed()}
                    onClick={() => {
                      setFormError(null);
                      if (step === 1 && !streetAddress) {
                        setAddressModalOpen(true);
                        return;
                      }
                      if (step === 6 && photos.length !== 5) {
                        setFormError("You must upload exactly 5 images to proceed.");
                        return;
                      }
                      if (step === 7 && !libraryName.trim()) {
                        setFormError("Please enter a title for your library.");
                        return;
                      }
                      setStep(step + 1);
                    }}
                    className={`text-xs font-bold px-8 py-3 rounded-xl transition cursor-pointer shadow-sm ${canProceed()
                        ? "bg-[#222222] hover:bg-black text-white"
                        : "bg-stone-200 text-stone-400 cursor-not-allowed"
                      }`}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmitListing}
                    disabled={isSubmitting}
                    className="bg-[#222222] hover:bg-black text-white text-xs font-bold px-8 py-3 rounded-xl transition cursor-pointer shadow-sm disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting Listing..." : "Complete & Submit"}
                  </button>
                )}
              </div>
            </footer>
          )}
        </div>

        {/* FAQ Slide-out Helper Sidebar (Matching Image UI: Solid black pill for active category, square left icons) */}
        {faqSidebarOpen && (
          <aside className="w-80 sm:w-[380px] shrink-0 bg-white border-l border-stone-200 h-[calc(100vh-73px)] sticky top-[73px] overflow-y-auto p-6 flex flex-col space-y-6 shadow-2xl animate-in slide-in-from-right duration-200 z-30">

            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="space-y-1">
                <h3 className="font-extrabold text-[#222222] text-xl tracking-tight">
                  Frequently asked questions
                </h3>
                <p className="text-xs text-stone-500 font-medium leading-relaxed">
                  These are the most commonly asked questions about StudySpace. Can&apos;t find what you&apos;re looking for?{" "}
                  <span className="underline font-bold text-stone-800 cursor-pointer">Chat to our friendly team!</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFaqSidebarOpen(false)}
                className="p-1 text-stone-400 hover:text-black rounded-full transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Pills (Matching Image UI: Solid black pill for active category) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(["General", "Pricing", "Photos"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFaqCategory(cat);
                    const firstMatch = faqData.find((f) => f.category === cat);
                    if (firstMatch) setExpandedFaqId(firstMatch.id);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer shrink-0 ${faqCategory === cat
                      ? "bg-[#222222] text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-300 hover:border-black"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Accordion Questions List */}
            <div className="space-y-3.5 flex-grow pt-1">
              {faqData
                .filter((f) => f.category === faqCategory)
                .map((item) => {
                  const isExpanded = expandedFaqId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="border-b border-stone-100 pb-3.5 transition"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : item.id)}
                        className="w-full flex items-start justify-between text-left gap-3 py-1 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-1">
                          <div className="w-8 h-8 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0">
                            {item.icon}
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-[#222222] group-hover:text-black leading-snug">
                            {item.question}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-stone-600 shrink-0 mt-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400 shrink-0 mt-2 group-hover:text-black transition" />
                        )}
                      </button>

                      {isExpanded && (
                        <p className="text-xs text-stone-500 font-medium leading-relaxed mt-2.5 pl-11 animate-in fade-in duration-150">
                          {item.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Footer Support Info */}
            <div className="pt-4 border-t border-stone-100 text-[11px] text-stone-400 font-medium text-center">
              Still have questions? <span className="underline font-bold text-stone-700 cursor-pointer">Contact Partner Support</span>
            </div>

          </aside>
        )}
      </div>
    </div>
  );
}
