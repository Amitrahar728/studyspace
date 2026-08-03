"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AppContext";
import { LayoutDashboard, Plus, MapPin, Sparkles, Image, Settings, Clock, Check, X, ShieldAlert, BadgeCheck, Key, Search, Calendar } from "lucide-react";

interface Library {
  id: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
  amenities: string[];
  photos: string[];
  slotTypes: { id: string; name: string; startTime: string; endTime: string; price: string }[];
}

interface OwnerBooking {
  id: string;
  accessKey: string;
  date: string;
  status: string;
  totalPrice: string;
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
  library: {
    name: string;
  };
  seat: {
    seatCode: string;
    seatType: string;
  };
  slotType: {
    name: string;
    startTime: string;
    endTime: string;
  };
}

export default function OwnerDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token } = useAuth();

  // Photo upload states
  const [uploadingLibraryId, setUploadingLibraryId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");

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

  // Fetch owner bookings for reception validation
  const { data: ownerBookings, isLoading: isBookingsLoading } = useQuery<OwnerBooking[]>({
    queryKey: ["owner-bookings"],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/bookings/owner`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load owner bookings");
      return res.json();
    },
    enabled: !!token && (user?.role === "OWNER" || user?.role === "ADMIN"),
  });

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
          onClick={() => router.push("/owner/libraries/create")}
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
            onClick={() => router.push("/owner/libraries/create")}
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
            const libraryPhoto = lib.photos[0] || "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80";
            
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

      {/* Reception Desk - Bookings & Access Keys Section */}
      <div className="mt-14 pt-10 border-t border-gray-200">
        <div className="flex justify-between items-center flex-wrap gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <Key className="w-6 h-6 text-amber-500" />
              Reception Desk — Student Access Keys
            </h2>
            <p className="text-xs text-gray-500 mt-1">Verify student reservations and access keys upon reception arrival.</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search Name, Email, or Key..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs p-2.5 pl-9 border border-gray-250 rounded-xl outline-none focus:ring-1 focus:ring-brand focus:border-brand"
            />
          </div>
        </div>

        {isBookingsLoading ? (
          <div className="animate-pulse bg-white border border-gray-100 rounded-2xl h-32 w-full" />
        ) : !ownerBookings || ownerBookings.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-gray-200 rounded-2xl text-xs text-gray-400 font-bold">
            No student bookings created yet for your libraries.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-slate-50 border-b border-gray-200 text-[10px] uppercase font-black text-gray-400 tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Student Name</th>
                    <th className="py-3 px-4">Library & Seat</th>
                    <th className="py-3 px-4">Slot & Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Access Key</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {ownerBookings
                    .filter((b) => {
                      if (!searchFilter.trim()) return true;
                      const q = searchFilter.toLowerCase();
                      return (
                        b.user.name.toLowerCase().includes(q) ||
                        b.user.email.toLowerCase().includes(q) ||
                        b.accessKey.toLowerCase().includes(q) ||
                        b.seat.seatCode.toLowerCase().includes(q)
                      );
                    })
                    .map((b) => {
                      const bDate = new Date(b.date).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      });
                      return (
                        <tr key={b.id} className="hover:bg-slate-50/80 transition">
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900">{b.user.name}</div>
                            <div className="text-[10px] text-gray-400">{b.user.email}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-800">{b.library.name}</div>
                            <div className="text-[10px] text-brand font-mono font-bold">Seat {b.seat.seatCode}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div>{bDate}</div>
                            <div className="text-[10px] text-gray-400">{b.slotType.name} ({b.slotType.startTime} - {b.slotType.endTime})</div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                              {b.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono text-xs font-black text-amber-400 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 tracking-wider inline-block">
                              {b.accessKey}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
