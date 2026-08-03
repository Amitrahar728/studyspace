"use client";

import React, { use, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { 
  Star, 
  MapPin, 
  Calendar, 
  Check, 
  ShieldAlert, 
  Sparkles, 
  User, 
  ShieldCheck,
  Wifi,
  Wind,
  Zap,
  VolumeX,
  Lock,
  Coffee,
  MessageSquare
} from "lucide-react";
import { useAuth } from "../../../context/AppContext";

interface LibraryDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  amenities: string[];
  isActive: boolean;
  createdAt: string;
  ownerId?: string;
  owner?: {
    id: string;
    name: string;
    avatarUrl: string | null;
    email?: string;
  };
  photos: { id: string; url: string }[];
  slotTypes: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    price: string;
  }[];
  reviews: {
    id: string;
    rating: number;
    comment: string | null;
    createdAt: string;
    user: {
      name: string;
      avatarUrl: string | null;
    };
  }[];
  rating: number | null;
  reviewCount: number;
}

const amenityMap: Record<string, { label: string; icon: React.ComponentType<any> }> = {
  "wifi": { label: "High-speed Wi-Fi", icon: Wifi },
  "high-speed wi-fi": { label: "High-speed Wi-Fi", icon: Wifi },
  "high-speed wifi": { label: "High-speed Wi-Fi", icon: Wifi },
  "ac": { label: "Air Conditioning", icon: Wind },
  "air conditioning": { label: "Air Conditioning", icon: Wind },
  "power outlets": { label: "Power Outlets", icon: Zap },
  "silent zone": { label: "Silent Zone", icon: VolumeX },
  "locker": { label: "Personal Locker", icon: Lock },
  "cafeteria": { label: "In-house Cafeteria", icon: Coffee },
};

function getAmenityDetails(amenity: string) {
  const normalized = amenity.toLowerCase().trim();
  if (amenityMap[normalized]) {
    return amenityMap[normalized];
  }
  return { label: amenity, icon: Check };
}

export default function LibraryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const id = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const searchParams = useSearchParams();

  const [selectedStartDate, setSelectedStartDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultTomorrow = tomorrow.toISOString().split("T")[0];
    return searchParams.get("startDate") || searchParams.get("date") || defaultTomorrow;
  });

  const [selectedEndDate, setSelectedEndDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const defaultTomorrow = tomorrow.toISOString().split("T")[0];
    return searchParams.get("endDate") || searchParams.get("date") || defaultTomorrow;
  });

  const [selectedSlotId, setSelectedSlotId] = useState("");

  // Fetch library details via TanStack Query
  const { data: library, isLoading, error } = useQuery<LibraryDetail>({
    queryKey: ["library", id],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries/${id}`);
      if (!res.ok) throw new Error("Library not found");
      return res.json();
    },
  });

  // Handle clicking "Check availability" -> pushes to booking wizard page
  const handleProceedToBooking = () => {
    if (!selectedSlotId) return;
    router.push(
      `/booking/wizard?libraryId=${id}&startDate=${selectedStartDate}&endDate=${selectedEndDate}&slotTypeId=${selectedSlotId}`
    );
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[400px] mb-10">
          <div className="lg:col-span-2 bg-gray-200 rounded-2xl" />
          <div className="bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !library) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center text-red-700">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Study Space Not Found</h3>
        <p className="text-sm text-gray-500 mb-6">The listing you are trying to view does not exist or has been removed.</p>
        <button onClick={() => router.push("/")} className="bg-brand text-white font-semibold px-6 py-2.5 rounded-lg">
          Back to Home
        </button>
      </div>
    );
  }

  // Setup photo list
  const primaryPhoto = library.photos[0]?.url || "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80";
  const gridPhotos = library.photos.slice(1, 5);

  const selectedSlot = library.slotTypes.find((s) => s.id === selectedSlotId);
  const displayPrice = selectedSlot ? Number(selectedSlot.price) : (library.slotTypes[0] ? Number(library.slotTypes[0].price) : 0);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Title Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight mb-2">
          {library.name}
        </h1>
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 font-semibold">
          <span className="flex items-center gap-1">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            {library.rating ? `${library.rating.toFixed(2)}` : "New"} · {library.reviewCount} reviews
          </span>
          <span className="flex items-center gap-1 text-gray-500">
            <MapPin className="w-4 h-4 text-brand" />
            {library.address}, {library.city}
          </span>
        </div>
      </div>

      {/* Photo Gallery Grid - Airbnb layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 rounded-2xl overflow-hidden mb-10 h-[280px] md:h-[420px] shadow-sm">
        
        {/* Large photo */}
        <div className="md:col-span-2 h-full bg-gray-100 overflow-hidden relative">
          <img src={primaryPhoto} alt={library.name} className="w-full h-full object-cover hover:brightness-95 transition" />
        </div>

        {/* Small photos grid */}
        <div className="hidden md:grid col-span-2 grid-cols-2 grid-rows-2 gap-2.5 h-full">
          {[0, 1, 2, 3].map((idx) => {
            const photoUrl = gridPhotos[idx]?.url || "https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&w=400&q=80";
            return (
              <div key={idx} className="bg-gray-100 overflow-hidden relative h-full">
                <img src={photoUrl} alt={`${library.name} supplementary ${idx}`} className="w-full h-full object-cover hover:brightness-95 transition" />
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Layout columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 items-start">
        
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Host header */}
          <div className="border-b border-gray-100 pb-6 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-brand/5 text-brand flex items-center justify-center font-bold text-lg border border-brand/10 shrink-0">
                {library.owner?.name ? library.owner.name.charAt(0).toUpperCase() : library.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-0.5">
                  Hosted by {library.owner?.name || "Library Host"}
                </h2>
                <p className="text-sm text-gray-500">
                  Self-study access with slot bookings, specific desk assignments & quiet space.
                </p>
              </div>
            </div>

            {(library.owner?.id || library.ownerId) && (
              <button
                onClick={() => {
                  const targetOwnerId = library.owner?.id || library.ownerId;
                  if (!user) {
                    router.push("/auth/signin");
                    return;
                  }
                  router.push(`/messages?userId=${targetOwnerId}`);
                }}
                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-semibold text-xs transition flex items-center gap-2 shadow-sm shrink-0 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 text-emerald-400" />
                Chat with Host
              </button>
            )}
          </div>

          {/* Core highlights */}
          <div className="border-b border-gray-100 pb-6 space-y-4">
            <div className="flex gap-4">
              <Sparkles className="w-6 h-6 text-brand shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Quiet Zone</h4>
                <p className="text-xs text-gray-500">Strict silence policies enforced in library seating rooms.</p>
              </div>
            </div>
            <div className="flex gap-4">
              <ShieldCheck className="w-6 h-6 text-brand shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Strict Double-Booking Protection</h4>
                <p className="text-xs text-gray-500">Physical seat-lock checks prevent overlapping bookings on Neon database.</p>
              </div>
            </div>
          </div>

          {/* Amenities details */}
          <div className="border-b border-gray-250 border-gray-200 pb-6 pt-2">
            <h3 className="text-xl font-bold text-gray-900 mb-6 tracking-tight">What this place offers</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-5 gap-x-12">
              {library.amenities.map((amenity) => {
                const details = getAmenityDetails(amenity);
                const IconComponent = details.icon;
                return (
                  <div key={amenity} className="flex items-center gap-4 text-gray-850 text-base">
                    <IconComponent className="w-[22px] h-[22px] text-gray-900 stroke-[1.5] shrink-0" />
                    <span className="font-normal text-gray-800">{details.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Slot pricing list */}
          <div className="border-b border-gray-100 pb-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Available Slots & Timing</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {library.slotTypes.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setSelectedSlotId(slot.id)}
                  className={`text-left p-4 rounded-xl border transition flex flex-col justify-between cursor-pointer ${
                    selectedSlotId === slot.id
                      ? "border-brand bg-brand/5 ring-1 ring-brand"
                      : "border-gray-200 hover:border-gray-900"
                  }`}
                >
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm mb-1">{slot.name}</h4>
                    <p className="text-xs text-gray-500 mb-3">{slot.startTime} - {slot.endTime}</p>
                  </div>
                  <span className="text-sm font-black text-gray-950">₹{slot.price}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Review list */}
          <div>
            <h3 className="text-lg font-bold text-gray-950 mb-6 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              {library.rating ? `${library.rating.toFixed(2)} · ` : ""} {library.reviewCount} reviews
            </h3>

            {library.reviews.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No reviews yet for this study room.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {library.reviews.map((rev) => (
                  <div key={rev.id} className="space-y-2 border-b border-gray-50 pb-6 md:border-none md:pb-0">
                    <div className="flex items-center gap-3">
                      {rev.user.avatarUrl ? (
                        <img src={rev.user.avatarUrl} alt={rev.user.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-400 text-white flex items-center justify-center font-bold text-sm">
                          {rev.user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm">{rev.user.name}</h4>
                        <div className="flex items-center gap-2">
                          <div className="flex text-amber-400">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`w-3 h-3 ${s <= rev.rating ? "fill-amber-400" : "text-gray-200"}`} />
                            ))}
                          </div>
                          <span className="text-[10px] font-semibold text-gray-500">
                            {new Date(rev.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {rev.comment && <p className="text-sm text-gray-650 text-gray-650 leading-relaxed pl-1">{rev.comment}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right Column - Sticky Reservation Panel */}
        <div className="w-full lg:sticky lg:top-24">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-lg sticky-panel-shadow">
            
            {/* Price section */}
            <div className="flex items-end justify-between mb-5">
              <span className="text-xl font-black text-gray-950">
                ₹{displayPrice} <span className="text-sm font-semibold text-gray-500">/ slot</span>
              </span>
              <span className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {library.rating ? `${library.rating.toFixed(1)}` : "New"}
              </span>
            </div>

            {/* Inputs widget panel */}
            <div className="border border-gray-300 rounded-xl overflow-hidden mb-5">
              
              {/* Date selection */}
              <div className="grid grid-cols-2 border-b border-gray-300">
                <div className="p-3 border-r border-gray-300">
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                    From Date
                  </label>
                  <div className="flex items-center gap-1.5 text-xs text-gray-800 font-semibold cursor-pointer">
                    <Calendar className="w-3.5 h-3.5 text-brand shrink-0" />
                    <input
                      type="date"
                      min={new Date().toISOString().split("T")[0]}
                      value={selectedStartDate}
                      onChange={(e) => {
                        setSelectedStartDate(e.target.value);
                        if (new Date(e.target.value) > new Date(selectedEndDate)) {
                          setSelectedEndDate(e.target.value);
                        }
                      }}
                      className="outline-none bg-transparent w-full text-gray-850 text-xs font-bold"
                    />
                  </div>
                </div>

                <div className="p-3">
                  <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                    To Date
                  </label>
                  <div className="flex items-center gap-1.5 text-xs text-gray-800 font-semibold cursor-pointer">
                    <Calendar className="w-3.5 h-3.5 text-brand shrink-0" />
                    <input
                      type="date"
                      min={selectedStartDate}
                      value={selectedEndDate}
                      onChange={(e) => setSelectedEndDate(e.target.value)}
                      className="outline-none bg-transparent w-full text-gray-850 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Slot selection dropdown */}
              <div className="p-3">
                <label className="block text-[10px] font-black text-gray-500 uppercase mb-1">
                  Select Timing Slot
                </label>
                <select
                  value={selectedSlotId}
                  onChange={(e) => setSelectedSlotId(e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-gray-800 font-semibold py-1 cursor-pointer"
                >
                  <option value="">-- Choose Slot --</option>
                  {library.slotTypes.map((slot) => (
                    <option key={slot.id} value={slot.id}>
                      {slot.name} ({slot.startTime} - {slot.endTime})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Action button */}
            <button
              onClick={handleProceedToBooking}
              disabled={!selectedSlotId}
              className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold py-3.5 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
            >
              Check availability
            </button>

            <p className="text-[11px] text-gray-400 text-center mt-4">
              You won't be charged yet. Seat map selection is on the next step.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
