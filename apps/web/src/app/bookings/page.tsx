"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Calendar,
  RotateCcw,
  Eye,
  Key,
  MessageSquarePlus,
  Clock,
  X,
  CheckCircle2,
  MapPin,
  Building2,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "../../context/AppContext";

interface BookingItem {
  id: string;
  libraryId: string;
  date: string;
  status: string;
  totalPrice: string;
  accessKey: string;
  seat: {
    id: string;
    seatCode: string;
    seatType: string;
  };
  slotType: {
    name: string;
    startTime: string;
    endTime: string;
  };
  library: {
    id: string;
    name: string;
    address: string;
    photos: { url: string }[];
  };
  review: {
    id: string;
    rating: number;
    comment: string | null;
  } | null;
}

export default function BookingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token } = useAuth();

  // Tab State: "upcoming" or "past"
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Access Key Modal State
  const [accessKeyModalOpen, setAccessKeyModalOpen] = useState(false);
  const [selectedAccessKey, setSelectedAccessKey] = useState<string | null>(null);
  const [selectedBookingDetails, setSelectedBookingDetails] = useState<BookingItem | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  // Fetch bookings using TanStack Query
  const { data: bookings, isLoading, error } = useQuery<BookingItem[]>({
    queryKey: ["my-bookings"],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/bookings/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load bookings");
      return res.json();
    },
    enabled: !!token,
  });

  // Post review mutation
  const reviewMutation = useMutation({
    mutationFn: async (payload: { libraryId: string; rating: number; comment: string }) => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiBase}/libraries/${payload.libraryId}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: payload.rating, comment: payload.comment || null }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to submit review");
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-bookings"] });
      setReviewModalOpen(false);
      setComment("");
      setRating(5);
    },
    onError: (err: any) => {
      setReviewError(err.message);
    },
  });

  const openReviewModal = (libraryId: string) => {
    setSelectedLibraryId(libraryId);
    setReviewError(null);
    setReviewModalOpen(true);
  };

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    reviewMutation.mutate({ libraryId: selectedLibraryId, rating, comment });
  };

  const openAccessKeyModal = (booking: BookingItem) => {
    setSelectedBookingDetails(booking);
    setSelectedAccessKey(booking.accessKey);
    setCopiedKey(false);
    setAccessKeyModalOpen(true);
  };

  const handleCopyAccessKey = () => {
    if (selectedAccessKey) {
      navigator.clipboard.writeText(selectedAccessKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F8F5EE] flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-white border border-[#E8E2D5] rounded-3xl p-8 text-center shadow-lg">
          <Clock className="w-12 h-12 text-[#A95031] mx-auto mb-4" />
          <h3 className="text-2xl font-bold font-serif text-[#221C19] mb-2">Sign in Required</h3>
          <p className="text-sm text-[#5A4D45] mb-6">Please log in to your account to view your study seat bookings.</p>
          <button
            onClick={() => router.push("/auth/signin")}
            className="w-full bg-[#A95031] hover:bg-[#8E3F24] text-white font-bold py-3 rounded-xl transition shadow-md cursor-pointer"
          >
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  const now = new Date();

  // Filter Bookings into 2 Clean Tabs: Upcoming vs Past
  const upcomingBookings = bookings?.filter((b) => {
    const bDate = new Date(b.date);
    return bDate >= new Date(now.setHours(0, 0, 0, 0)) && b.status !== "CANCELLED";
  }) || [];

  const pastBookings = bookings?.filter((b) => {
    const bDate = new Date(b.date);
    return bDate < new Date(now.setHours(0, 0, 0, 0)) || b.status === "COMPLETED" || b.status === "CANCELLED";
  }) || [];

  const displayBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#221C19] py-10 px-4 sm:px-6 lg:px-8 select-none font-sans">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Page Title & Clean 2-Tab Switcher (Matching Reference E-Commerce Filter Bar) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[#E8E2D5] pb-6">
          
          {/* 2 Clean Filter Tabs */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setActiveTab("upcoming")}
              className={`pb-3 text-base sm:text-lg font-bold transition cursor-pointer border-b-2 ${
                activeTab === "upcoming"
                  ? "border-[#A95031] text-[#A95031]"
                  : "border-transparent text-stone-500 hover:text-stone-900"
              }`}
            >
              Upcoming Bookings ({upcomingBookings.length})
            </button>

            <button
              onClick={() => setActiveTab("past")}
              className={`pb-3 text-base sm:text-lg font-bold transition cursor-pointer border-b-2 ${
                activeTab === "past"
                  ? "border-[#A95031] text-[#A95031]"
                  : "border-transparent text-stone-500 hover:text-stone-900"
              }`}
            >
              Past Bookings ({pastBookings.length})
            </button>
          </div>

          <div className="text-xs font-mono text-stone-500 bg-white border border-[#E8E2D5] px-3 py-1.5 rounded-full self-start sm:self-auto">
            SHOWING {displayBookings.length} {activeTab.toUpperCase()} RESERVATION{displayBookings.length === 1 ? "" : "S"}
          </div>

        </div>

        {/* Loading Skeleton */}
        {isLoading && (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse bg-white border border-[#E8E2D5] rounded-2xl h-56 w-full shadow-xs" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-10 text-rose-700 bg-rose-50 rounded-2xl border border-rose-200 font-semibold text-sm">
            Failed to load your booking history. Please verify your connection.
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && displayBookings.length === 0 && (
          <div className="text-center py-20 border border-dashed border-[#E8E2D5] rounded-3xl max-w-lg mx-auto bg-white p-8 shadow-sm">
            <Calendar className="w-12 h-12 text-stone-400 mx-auto mb-3" />
            <h3 className="font-bold font-serif text-[#221C19] text-xl mb-1">
              No {activeTab} bookings found
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mb-6">
              {activeTab === "upcoming"
                ? "You don't have any active study seat reservations at this time."
                : "You haven't completed any past study seat reservations yet."}
            </p>
            {activeTab === "upcoming" && (
              <button
                onClick={() => router.push("/")}
                className="bg-[#A95031] hover:bg-[#8E3F24] text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-md cursor-pointer"
              >
                Find & Book a StudySpace
              </button>
            )}
          </div>
        )}

        {/* Bookings List (Exact E-Commerce Style Card Layout Matching Reference Screenshot) */}
        {!isLoading && !error && displayBookings.length > 0 && (
          <div className="space-y-6">
            {displayBookings.map((booking) => {
              const libraryPhoto =
                booking.library?.photos?.[0]?.url ||
                "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80";

              const bookingDateFormatted = new Date(booking.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div
                  key={booking.id}
                  className="bg-white border border-[#E8E2D5] rounded-2xl shadow-xs overflow-hidden transition duration-200 hover:shadow-md"
                >
                  
                  {/* Top Bar Header (Reference Screenshot Metadata Layout) */}
                  <div className="bg-[#FAF8F5] border-b border-[#E8E2D5] p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    
                    {/* Metadata Summary: Date, Amount, Location */}
                    <div className="flex flex-wrap items-center gap-4 sm:gap-8 text-xs font-sans text-stone-600">
                      <div>
                        <span className="text-stone-400 font-medium block uppercase text-[10px] tracking-wider">Booking Date:</span>
                        <span className="font-bold text-[#221C19] text-sm">{bookingDateFormatted}</span>
                      </div>

                      <div>
                        <span className="text-stone-400 font-medium block uppercase text-[10px] tracking-wider">Total Amount:</span>
                        <span className="font-bold text-[#221C19] text-sm">₹{booking.totalPrice}</span>
                      </div>

                      <div>
                        <span className="text-stone-400 font-medium block uppercase text-[10px] tracking-wider">Location:</span>
                        <span className="font-bold text-[#221C19] text-xs sm:text-sm truncate block max-w-[180px]" title={booking.library?.address}>
                          {booking.library?.address || "Main Branch"}
                        </span>
                      </div>
                    </div>

                    {/* Right Header Controls: Access Key Number (Upcoming) or Access Key Expired Badge (Past) */}
                    <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[#E8E2D5]">
                      
                      {activeTab === "upcoming" ? (
                        <>
                          <div className="text-left md:text-right">
                            <span className="text-stone-400 font-mono text-[10px] uppercase block tracking-wider font-semibold">
                              Access Key:
                            </span>
                            <span className="font-mono text-sm font-extrabold text-[#A95031]">
                              #{booking.accessKey && !booking.accessKey.startsWith("eyJ") && booking.accessKey.length <= 16
                                ? booking.accessKey
                                : `AL-${booking.id.slice(0, 4).toUpperCase()}-${booking.id.slice(4, 8).toUpperCase()}`}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openAccessKeyModal(booking)}
                              className="bg-[#A95031] hover:bg-[#8E3F24] text-white text-xs font-bold px-4 py-2 rounded-xl transition shadow-xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Key className="w-3.5 h-3.5" />
                              <span>Access Pass</span>
                            </button>
                            
                            <button
                              onClick={() => router.push(`/libraries/${booking.libraryId}`)}
                              className="bg-white hover:bg-stone-50 border border-[#E8E2D5] text-[#221C19] text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-stone-500" />
                              <span>View Space</span>
                            </button>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-semibold text-stone-500 bg-stone-100 border border-stone-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                            Access Key Expired
                          </span>

                          <button
                            onClick={() => router.push(`/libraries/${booking.libraryId}`)}
                            className="bg-white hover:bg-stone-50 border border-[#E8E2D5] text-[#221C19] text-xs font-bold px-4 py-2 rounded-xl transition shadow-2xs flex items-center gap-1.5 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-stone-500" />
                            <span>View Space</span>
                          </button>
                        </div>
                      )}

                    </div>

                  </div>

                  {/* Status Banner */}
                  <div className="px-5 pt-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-bold text-[#221C19] uppercase tracking-wide">
                        {booking.status === "CONFIRMED" ? `Reserved for ${bookingDateFormatted}` : booking.status}
                      </span>
                    </div>
                  </div>

                  {/* Main Card Body (Photo Left, Details Right) */}
                  <div className="p-5 sm:p-6 flex flex-col sm:flex-row items-start gap-5">
                    
                    {/* Library Photo */}
                    <div className="w-full sm:w-36 h-36 rounded-2xl overflow-hidden border border-[#E8E2D5] shrink-0 bg-stone-100 relative shadow-2xs">
                      <img
                        src={libraryPhoto}
                        alt={booking.library.name}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>

                    {/* Booking Details & Actions */}
                    <div className="flex-1 space-y-3 w-full">
                      <h3 className="font-bold font-serif text-[#221C19] text-lg sm:text-xl leading-snug">
                        {booking.library.name}
                      </h3>

                      <div className="text-xs sm:text-sm text-stone-600 space-y-1 font-medium">
                        <p className="flex items-center gap-1.5 text-stone-500">
                          <MapPin className="w-3.5 h-3.5 text-[#A95031] shrink-0" />
                          <span>{booking.library.address}</span>
                        </p>
                        <p className="flex items-center gap-1.5 text-[#221C19] font-bold">
                          <Clock className="w-3.5 h-3.5 text-[#A95031] shrink-0" />
                          <span>{booking.slotType.name} ({booking.slotType.startTime} - {booking.slotType.endTime}) &bull; Seat {booking.seat.seatCode} ({booking.seat.seatType})</span>
                        </p>
                      </div>

                      {/* Action Links Row (Matching Reference Screenshot Links: "Buy it again | View Product") */}
                      <div className="pt-3 flex items-center gap-4 text-xs font-bold flex-wrap border-t border-stone-100">
                        
                        {/* Book Again Button */}
                        <button
                          onClick={() => router.push(`/libraries/${booking.libraryId}`)}
                          className="inline-flex items-center gap-1.5 text-[#A95031] hover:underline cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Book again</span>
                        </button>

                        <span className="text-stone-300">|</span>

                        {/* View Space Link */}
                        <button
                          onClick={() => router.push(`/libraries/${booking.libraryId}`)}
                          className="inline-flex items-center gap-1.5 text-stone-700 hover:text-black hover:underline cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-stone-500" />
                          <span>View Space Details</span>
                        </button>

                        {/* Review Link (If Past Booking) */}
                        {activeTab === "past" && (
                          <>
                            <span className="text-stone-300">|</span>
                            {booking.review ? (
                              <span className="inline-flex items-center gap-1 text-amber-700 font-semibold bg-amber-50 px-2.5 py-1 rounded-md border border-amber-200">
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                Reviewed ({booking.review.rating}/5)
                              </span>
                            ) : (
                              <button
                                onClick={() => openReviewModal(booking.libraryId)}
                                className="inline-flex items-center gap-1.5 text-[#A95031] hover:underline cursor-pointer"
                              >
                                <MessageSquarePlus className="w-3.5 h-3.5" />
                                <span>Leave a Review</span>
                              </button>
                            )}
                          </>
                        )}

                      </div>

                    </div>

                  </div>

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* ACCESS KEY PASS MODAL */}
      {accessKeyModalOpen && selectedBookingDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E8E2D5] relative space-y-6 text-center select-text">
            
            <button
              onClick={() => setAccessKeyModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-14 h-14 bg-[#A95031]/10 rounded-2xl flex items-center justify-center mx-auto text-[#A95031]">
              <Key className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-2xl font-serif font-bold text-[#221C19]">
                Reception Digital Access Key
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Show this key or code at the library reception desk to verify your reserved desk.
              </p>
            </div>

            <div className="bg-[#FAF8F5] border border-[#E8E2D5] rounded-2xl p-5 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 block">
                YOUR UNIQUE ACCESS PASS
              </span>
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono text-2xl font-black text-[#A95031] tracking-widest">
                  {selectedAccessKey}
                </span>
                <button
                  onClick={handleCopyAccessKey}
                  className="p-2 rounded-lg bg-white border border-[#E8E2D5] text-stone-700 hover:bg-stone-50 transition cursor-pointer"
                  title="Copy Access Key"
                >
                  {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copiedKey && <p className="text-[11px] text-emerald-600 font-bold">Key copied to clipboard!</p>}
            </div>

            <div className="text-left text-xs text-stone-600 bg-stone-50 p-4 rounded-xl space-y-1 font-medium">
              <p className="font-bold text-[#221C19]">{selectedBookingDetails.library.name}</p>
              <p>Seat: <strong className="font-mono text-stone-900">{selectedBookingDetails.seat.seatCode}</strong> ({selectedBookingDetails.seat.seatType})</p>
              <p>Slot: {selectedBookingDetails.slotType.name} ({selectedBookingDetails.slotType.startTime} - {selectedBookingDetails.slotType.endTime})</p>
            </div>

            <button
              onClick={() => setAccessKeyModalOpen(false)}
              className="w-full bg-[#A95031] hover:bg-[#8E3F24] text-white font-bold py-3 rounded-xl transition shadow-md cursor-pointer"
            >
              Done
            </button>

          </div>
        </div>
      )}

      {/* REVIEW MODAL */}
      {reviewModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-[#E8E2D5] relative space-y-6">
            
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-stone-100 text-stone-400 hover:text-stone-700 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-2xl font-serif font-bold text-[#221C19]">
                Rate Your Experience
              </h3>
              <p className="text-xs text-stone-500 mt-1">
                Help other students by leaving a honest review of this study space.
              </p>
            </div>

            {reviewError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              
              <div className="flex justify-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 transition transform hover:scale-110 cursor-pointer"
                  >
                    <Star
                      className={`w-8 h-8 ${
                        star <= rating ? "fill-amber-400 text-amber-400" : "text-stone-300"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Your Review (Optional)
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share details about lighting, quietness, Wi-Fi, or seating comfort..."
                  className="w-full p-3 rounded-xl border border-[#E8E2D5] text-xs text-[#221C19] focus:outline-none focus:border-[#A95031] h-28 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewModalOpen(false)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-3 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewMutation.isPending}
                  className="flex-1 bg-[#A95031] hover:bg-[#8E3F24] text-white font-bold py-3 rounded-xl text-xs transition shadow-md cursor-pointer disabled:opacity-50"
                >
                  {reviewMutation.isPending ? "Submitting..." : "Submit Review"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
