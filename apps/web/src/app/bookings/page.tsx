"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, Calendar, Armchair, ShieldCheck, MessageSquarePlus, Clock, X, Key } from "lucide-react";
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
  
  // Review Modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedLibraryId, setSelectedLibraryId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewError, setReviewError] = useState<string | null>(null);

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

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Clock className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Denied</h3>
        <p className="text-sm text-gray-500 mb-6">Please log in to view your booking history.</p>
        <button
          onClick={() => router.push("/auth/signin")}
          className="bg-brand text-white font-semibold px-6 py-2.5 rounded-lg"
        >
          Go to Signin
        </button>
      </div>
    );
  }

  // Tab selection state: "upcoming" or "past"
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const now = new Date();

  const upcomingBookings = bookings?.filter((b) => {
    const bDate = new Date(b.date);
    return bDate >= new Date(now.setHours(0,0,0,0)) && b.status !== "CANCELLED";
  }) || [];

  const pastBookings = bookings?.filter((b) => {
    const bDate = new Date(b.date);
    return bDate < new Date(now.setHours(0,0,0,0)) || b.status === "COMPLETED" || b.status === "CANCELLED";
  }) || [];

  const displayBookings = activeTab === "upcoming" ? upcomingBookings : pastBookings;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">My Bookings</h1>

        {/* Tab Selector */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === "upcoming"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Upcoming Bookings ({upcomingBookings.length})
          </button>
          <button
            onClick={() => setActiveTab("past")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
              activeTab === "past"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            Past Bookings ({pastBookings.length})
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-2xl h-40 w-full" />
          ))}
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-red-600 bg-red-50 rounded-2xl border border-red-100 font-semibold">
          Failed to load reservation data. Please verify your connection.
        </div>
      )}

      {!isLoading && !error && displayBookings.length === 0 && (
        <div className="text-center py-20 border border-dashed border-gray-200 rounded-2xl max-w-lg mx-auto">
          <Calendar className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-gray-800 text-lg mb-1">
            No {activeTab} bookings found
          </h3>
          <p className="text-sm text-gray-500 mb-6">
            {activeTab === "upcoming"
              ? "You don't have any upcoming study seat reservations."
              : "You haven't completed any past study seat reservations yet."}
          </p>
          {activeTab === "upcoming" && (
            <button
              onClick={() => router.push("/")}
              className="bg-brand hover:bg-brand-hover text-white font-semibold px-6 py-2.5 rounded-lg text-sm transition"
            >
              Find a StudySpace
            </button>
          )}
        </div>
      )}

      {!isLoading && !error && displayBookings.length > 0 && (
        <div className="space-y-6">
          {displayBookings.map((booking) => {
            const libraryPhoto = booking.library.photos[0]?.url || "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80";
            const bookingDateStr = new Date(booking.date).toLocaleDateString(undefined, {
              weekday: "short",
              year: "numeric",
              month: "short",
              day: "numeric",
            });

            const currentDate = new Date();
            const bookingDate = new Date(booking.date);
            const yyyy = bookingDate.getFullYear();
            const mm = String(bookingDate.getMonth() + 1).padStart(2, "0");
            const dd = String(bookingDate.getDate()).padStart(2, "0");
            const dateStr = `${yyyy}-${mm}-${dd}`;
            const endDateTime = new Date(`${dateStr}T${booking.slotType.endTime}:00`);

            const isCompleted = currentDate > endDateTime;

            return (
              <div
                key={booking.id}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col md:flex-row items-stretch hover:shadow-md transition"
              >
                {/* Library Image */}
                <div className="w-full md:w-52 h-48 md:h-auto shrink-0 relative bg-slate-100">
                  <img src={libraryPhoto} alt={booking.library.name} className="w-full h-full object-cover" />
                </div>

                {/* Booking Details */}
                <div className="p-6 flex-grow flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start flex-wrap gap-2">
                      <div>
                        <h3 className="font-bold text-gray-900 text-lg">
                          {booking.library.name}
                        </h3>
                        <p className="text-xs text-gray-500">{booking.library.address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Booking Status Badge */}
                        <span className="text-xs font-bold uppercase py-1 px-3 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {booking.status}
                        </span>
                        {/* Payment Status Badge */}
                        <span className="text-xs font-bold uppercase py-1 px-3 rounded-full bg-blue-50 text-blue-800 border border-blue-100">
                          Paid
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-3 text-xs text-gray-650 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-brand shrink-0" />
                        <span>{bookingDateStr}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-brand shrink-0" />
                        <span>
                          {booking.slotType.name} ({booking.slotType.startTime} - {booking.slotType.endTime})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 col-span-2 md:col-span-1">
                        <Armchair className="w-4 h-4 text-brand shrink-0" />
                        <span>
                          Seat: <strong className="text-slate-900 font-mono text-sm">{booking.seat.seatCode}</strong> ({booking.seat.seatType})
                        </span>
                      </div>
                    </div>

                    {/* Reception Access Key Badge */}
                    {booking.accessKey && (
                      <div className="mt-3 p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 bg-slate-800 rounded-lg text-amber-400">
                            <Key className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block leading-none mb-0.5">Reception Access Key</span>
                            <span className="font-mono text-sm font-black text-amber-400 tracking-wider">{booking.accessKey}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-md border border-slate-700">
                          Show at Reception
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-4 flex items-center justify-between flex-wrap gap-4 mt-4">
                    <div className="text-sm">
                      <span className="text-gray-500">Amount Paid:</span>{" "}
                      <strong className="text-gray-950 font-black text-base">₹{booking.totalPrice}</strong>
                    </div>

                    <div className="flex items-center gap-3">
                      {booking.review ? (
                        <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg shadow-sm">
                          <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                          Reviewed · {booking.review.rating}/5
                        </div>
                      ) : isCompleted ? (
                        <button
                          onClick={() => openReviewModal(booking.libraryId)}
                          className="text-xs font-bold text-gray-800 border border-gray-300 hover:border-gray-900 bg-white hover:bg-gray-50 px-4 py-2 rounded-xl transition cursor-pointer shadow-sm flex items-center gap-1.5"
                        >
                          <MessageSquarePlus className="w-3.5 h-3.5 text-brand" />
                          Leave a Review
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Review option available after study slot ends
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal Dialog */}
      {reviewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setReviewModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-bold text-gray-900 mb-2">Write a study space review</h3>
            <p className="text-xs text-gray-500 mb-6">Your review will be moderation-controlled and displayed directly on the library detail view page.</p>

            {reviewError && (
              <div className="bg-red-50 text-red-600 text-xs p-3 rounded-lg border border-red-100 mb-4 font-semibold">
                {reviewError}
              </div>
            )}

            <form onSubmit={handleReviewSubmit} className="space-y-4">
              {/* Rating selection stars */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Rating Selection
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 cursor-pointer focus:outline-none"
                    >
                      <Star
                        className={`w-8 h-8 ${
                          star <= rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment text area */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Comments
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm h-28 resize-none"
                  placeholder="Share your experience studying in this library..."
                />
              </div>

              <button
                type="submit"
                disabled={reviewMutation.isPending}
                className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-3 rounded-xl transition cursor-pointer shadow-md"
              >
                {reviewMutation.isPending ? "Submitting review..." : "Submit Review"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
