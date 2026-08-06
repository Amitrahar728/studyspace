"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../context/AppContext";
import OwnerHeader from "../../../components/OwnerHeader";
import {
  Key,
  Search,
  Calendar,
  Clock,
  Armchair,
  CheckCircle2,
  ShieldAlert,
  User,
  Mail,
  Phone,
  Building2,
  Filter,
} from "lucide-react";

interface OwnerBooking {
  id: string;
  accessKey: string;
  date: string;
  status: string;
  totalPrice: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  library: {
    id: string;
    name: string;
  };
  seat: {
    id: string;
    seatCode: string;
    seatType: string;
  };
  slotType: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
  };
}

export default function OwnerBookingsPage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("ALL");

  // Fetch owner bookings for all owned libraries
  const { data: bookings, isLoading, error } = useQuery<OwnerBooking[]>({
    queryKey: ["owner-all-bookings", user?.id],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/bookings/owner`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load owner bookings");
      return res.json();
    },
    enabled: !!token,
  });

  const now = new Date();

  // Unique libraries list for filter dropdown
  const uniqueLibraries = Array.from(
    new Map(bookings?.map((b) => [b.library.id, b.library])).values()
  );

  // Categorize bookings into Upcoming / Current vs Past
  const upcomingBookings = bookings?.filter((b) => {
    const bDate = new Date(b.date);
    return bDate >= new Date(now.setHours(0, 0, 0, 0)) && b.status !== "CANCELLED";
  }) || [];

  const pastBookings = bookings?.filter((b) => {
    const bDate = new Date(b.date);
    return bDate < new Date(now.setHours(0, 0, 0, 0)) || b.status === "COMPLETED" || b.status === "CANCELLED";
  }) || [];

  const currentTabBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  // Apply search & library filter
  const filteredBookings = currentTabBookings.filter((b) => {
    // Library filter
    if (selectedLibraryId !== "ALL" && b.library.id !== selectedLibraryId) {
      return false;
    }

    // Search query filter
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      b.user.name.toLowerCase().includes(q) ||
      b.user.email.toLowerCase().includes(q) ||
      (b.user.phone && b.user.phone.toLowerCase().includes(q)) ||
      b.accessKey.toLowerCase().includes(q) ||
      b.seat.seatCode.toLowerCase().includes(q) ||
      b.library.name.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-white">
      <OwnerHeader />
      <div className="bg-[#F8F5EE]/60 py-10 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200/80 pb-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold font-serif text-[#221C19] tracking-tight flex items-center gap-3">
              <Key className="w-8 h-8 text-[#A95031]" />
              Library Reservations
            </h1>
            <p className="text-xs sm:text-sm text-stone-500 mt-1">
              Verify student access keys, track live seat bookings, and review past library reservations.
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-white p-1.5 rounded-2xl border border-stone-200 shadow-sm self-start sm:self-auto">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === "upcoming"
                  ? "bg-[#A95031] text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Current Bookings ({upcomingBookings.length})
            </button>
            <button
              onClick={() => setActiveTab("past")}
              className={`px-5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer ${
                activeTab === "past"
                  ? "bg-[#A95031] text-white shadow-sm"
                  : "text-stone-600 hover:text-stone-900"
              }`}
            >
              Past Bookings ({pastBookings.length})
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white/90 p-4 rounded-2xl border border-stone-200/90 shadow-sm">
          {/* Live Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              placeholder="Search Student Name, Email, Phone, or Key..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs p-3 pl-10 border border-stone-200 rounded-xl outline-none focus:border-[#A95031] focus:ring-1 focus:ring-[#A95031] font-medium bg-white"
            />
          </div>

          {/* Library Filter Dropdown */}
          {uniqueLibraries.length > 1 && (
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-stone-400 shrink-0" />
              <select
                value={selectedLibraryId}
                onChange={(e) => setSelectedLibraryId(e.target.value)}
                className="text-xs p-3 border border-stone-200 rounded-xl outline-none focus:border-[#A95031] bg-white font-medium cursor-pointer w-full sm:w-60"
              >
                <option value="ALL">All Libraries ({uniqueLibraries.length})</option>
                {uniqueLibraries.map((lib) => (
                  <option key={lib.id} value={lib.id}>
                    {lib.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse bg-white border border-stone-200 rounded-3xl h-36 w-full" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-10 text-rose-700 bg-rose-50/80 rounded-2xl border border-rose-200 font-semibold text-sm">
            Failed to load reservation records. Please try again.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredBookings.length === 0 && (
          <div className="text-center py-20 border border-dashed border-stone-300 rounded-3xl max-w-lg mx-auto bg-white/80 p-8 shadow-sm">
            <Key className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h3 className="font-bold text-[#221C19] text-lg mb-1">
              No {activeTab} reservations found
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              {searchFilter
                ? "No booking matching your search criteria."
                : activeTab === "upcoming"
                ? "You don't have any current active student bookings."
                : "No past completed student reservations found."}
            </p>
          </div>
        )}

        {/* Bookings List Cards */}
        {!isLoading && !error && filteredBookings.length > 0 && (
          <div className="space-y-5">
            {filteredBookings.map((b) => {
              const bDateStr = new Date(b.date).toLocaleDateString(undefined, {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              });

              return (
                <div
                  key={b.id}
                  className="bg-white border border-stone-200/90 rounded-3xl p-6 sm:p-7 shadow-sm hover:border-stone-300 transition duration-200 space-y-5"
                >
                  {/* Card Header Row */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-stone-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#ECE6FE] text-[#582BE8] flex items-center justify-center font-bold text-base shrink-0">
                        {b.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-[#221C19] text-base sm:text-lg flex items-center gap-2">
                          <span>{b.user.name}</span>
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-stone-400" />
                            {b.user.email}
                          </span>
                          {b.user.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-stone-400" />
                              {b.user.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-extrabold uppercase py-1 px-3 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {b.status}
                      </span>
                      <span className="text-[11px] font-extrabold text-stone-700 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full">
                        ₹{b.totalPrice}
                      </span>
                    </div>
                  </div>

                  {/* Card Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-medium text-stone-700">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-[#A95031] shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Library</span>
                        <span className="font-bold text-stone-900">{b.library.name}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#A95031] shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Date & Slot</span>
                        <span className="font-bold text-stone-900">{bDateStr} &bull; {b.slotType.name}</span>
                        <span className="text-[10px] text-stone-500 block">({b.slotType.startTime} - {b.slotType.endTime})</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Armchair className="w-4 h-4 text-[#A95031] shrink-0" />
                      <div>
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Reserved Seat</span>
                        <span className="font-bold text-stone-900 font-mono">Seat {b.seat.seatCode}</span>
                        <span className="text-[10px] text-stone-500 block">({b.seat.seatType})</span>
                      </div>
                    </div>
                  </div>

                  {/* Reception Access Key Banner */}
                  <div className="p-3.5 bg-stone-900 text-white rounded-2xl flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-stone-800 rounded-xl text-amber-400">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black text-stone-400 uppercase tracking-widest block leading-none mb-1">
                          STUDENT RECEPTION ACCESS KEY
                        </span>
                        <span className="font-mono text-sm sm:text-base font-black text-amber-400 tracking-wider">
                          {b.accessKey}
                        </span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold bg-stone-800 text-stone-300 px-3 py-1.5 rounded-lg border border-stone-700/80">
                      Verify at Desk
                    </span>
                  </div>

                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
