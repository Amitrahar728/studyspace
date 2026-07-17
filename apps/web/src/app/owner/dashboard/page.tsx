"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AppContext";
import { LayoutDashboard, Plus, MapPin, Sparkles, Image, Settings, Clock, Check, X, ShieldAlert, BadgeCheck } from "lucide-react";

interface Library {
  id: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
  amenities: string[];
  photos: { id: string; url: string }[];
  slotTypes: { id: string; name: string; startTime: string; endTime: string; price: string }[];
}

export default function OwnerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  // Create Library modal form states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Photo upload states
  const [uploadingLibraryId, setUploadingLibraryId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Fetch owner libraries
  const { data: libraries, isLoading, error } = useQuery<Library[]>({
    queryKey: ["owner-libraries", user?.id],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries?ownerId=${user?.id}`);
      if (!res.ok) throw new Error("Failed to load owner libraries");
      return res.json();
    },
    enabled: !!user?.id,
  });

  // Create Library Mutation
  const createLibraryMutation = useMutation({
    mutationFn: async (payload: any) => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to create library listing");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["owner-libraries", user?.id] });
      setCreateModalOpen(false);
      setName("");
      setAddress("");
      setCity("");
      setSelectedAmenities([]);
      setFormError(null);
    },
    onError: (err: any) => {
      setFormError(err.message);
    },
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Standard slot configurations
    const defaultSlots = [
      { name: "Morning Slot", startTime: "08:00", endTime: "13:00", price: 150 },
      { name: "Afternoon Slot", startTime: "13:00", endTime: "18:00", price: 150 },
      { name: "Evening Slot", startTime: "18:00", endTime: "23:00", price: 180 },
      { name: "Full Day Slot", startTime: "08:00", endTime: "23:00", price: 400 },
    ];

    createLibraryMutation.mutate({
      name,
      address,
      city,
      amenities: selectedAmenities,
      slotTypes: defaultSlots,
    });
  };

  // Upload S3 Photo handler
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, libraryId: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLibraryId(libraryId);
    setUploadError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

      // Direct raw binary upload to backend to avoid client-side S3 CORS issues
      const response = await fetch(`${apiBase}/libraries/${libraryId}/photos/upload-direct`, {
        method: "POST",
        headers: {
          "Content-Type": file.type,
          Authorization: `Bearer ${token}`,
        },
        body: file,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to upload image.");
      }

      // Refresh listings
      queryClient.invalidateQueries({ queryKey: ["owner-libraries", user?.id] });
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setUploadingLibraryId(null);
    }
  };

  const allAmenities = ["High-speed Wi-Fi", "Air Conditioning", "Ergonomic Chairs", "Quiet Zone", "Drinking Water"];

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  if (user?.role !== "OWNER" && user?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Restrained</h3>
        <p className="text-sm text-gray-500">Only verified library hosts or administrators can view this dashboard.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Dashboard Header */}
      <div className="flex justify-between items-center flex-wrap gap-4 border-b border-gray-100 pb-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-8 h-8 text-brand" />
            Host Workspace Dashboard
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage your self-study reading rooms, slots, floor plans, and photo galleries.</p>
        </div>
        <button
          onClick={() => setCreateModalOpen(true)}
          className="bg-brand hover:bg-brand-hover text-white text-sm font-bold px-6 py-3 rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
        >
          <Plus className="w-5 h-5" />
          Add Library Listing
        </button>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-2xl h-60 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-red-650 bg-red-50 border border-red-100 rounded-2xl">
          Failed to load workspaces. Please check database connectivity.
        </div>
      )}

      {uploadError && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs font-semibold text-red-700 mb-6">
          ⚠️ Photo upload failed: {uploadError}
        </div>
      )}

      {!isLoading && !error && libraries?.length === 0 && (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl max-w-xl mx-auto">
          <LayoutDashboard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-lg mb-1">No libraries registered yet</h3>
          <p className="text-sm text-gray-500 mb-6">Add a listing to start hosting desk reservations.</p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="bg-brand text-white font-semibold px-6 py-2.5 rounded-lg text-sm cursor-pointer"
          >
            Create Library Listing
          </button>
        </div>
      )}

      {/* Grid List */}
      {!isLoading && !error && libraries && libraries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {libraries.map((lib) => {
            const libraryPhoto = lib.photos[0]?.url || "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80";
            
            return (
              <div
                key={lib.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
              >
                <div>
                  {/* Photo slide */}
                  <div className="relative h-44 w-full bg-slate-100">
                    <img src={libraryPhoto} alt={lib.name} className="w-full h-full object-cover" />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm shadow-sm py-1 px-3 rounded-full text-xs font-bold flex items-center gap-1.5">
                      {lib.isActive ? (
                        <>
                          <BadgeCheck className="w-4 h-4 text-emerald-600" />
                          <span className="text-emerald-800">Approved Listing</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span className="text-amber-800">Pending Review</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6">
                    <h3 className="font-bold text-gray-900 text-lg">{lib.name}</h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-brand shrink-0" />
                      {lib.address}, {lib.city}
                    </p>

                    <div className="flex flex-wrap gap-1 mt-4">
                      {lib.amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Foot actions */}
                <div className="border-t border-gray-100 bg-gray-50 px-6 py-4 flex justify-between items-center flex-wrap gap-3">
                  {/* S3 Image Upload */}
                  <label className="text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:border-gray-900 rounded-lg px-4 py-2 cursor-pointer shadow-sm flex items-center gap-1.5 transition">
                    <Image className="w-4 h-4 text-gray-500" />
                    {uploadingLibraryId === lib.id ? "Uploading image..." : "Upload Photo"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handlePhotoUpload(e, lib.id)}
                      disabled={uploadingLibraryId !== null}
                      className="hidden"
                    />
                  </label>

                  {/* Floor plan editor */}
                  <button
                    onClick={() => router.push(`/owner/floorplan/${lib.id}`)}
                    className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                  >
                    <Settings className="w-4 h-4" />
                    Design Floor Plan Layout
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Library modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl max-w-lg w-full p-6 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xl font-bold text-gray-900 mb-2">Register StudySpace Library</h3>
            <p className="text-xs text-gray-500 mb-5">Create your workspace listing. We will automatically pre-populate standard slot structures (Morning, Afternoon, Evening, Full Day).</p>

            {formError && (
              <div className="bg-red-50 text-red-650 text-xs p-3.5 border border-red-100 rounded-xl mb-4 font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Library Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Oakwood Study Room"
                  className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    City location
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    required
                    placeholder="e.g. Gurugram"
                    className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                    placeholder="e.g. 45 Sector C"
                    className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm"
                  />
                </div>
              </div>

              {/* Amenities */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Select Workspace Amenities
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {allAmenities.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => handleAmenityToggle(amenity)}
                      className={`text-left text-xs font-semibold py-2 px-3 border rounded-lg transition flex items-center justify-between cursor-pointer ${
                        selectedAmenities.includes(amenity)
                          ? "border-brand bg-brand/5 text-brand"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {amenity}
                      {selectedAmenities.includes(amenity) && <Check className="w-3.5 h-3.5 text-brand shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={createLibraryMutation.isPending}
                className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold py-3.5 rounded-xl transition cursor-pointer shadow-md mt-4"
              >
                {createLibraryMutation.isPending ? "Creating listing..." : "Create Listing"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
