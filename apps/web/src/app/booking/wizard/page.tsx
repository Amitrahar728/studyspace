"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useAuth, useSocket } from "../../../context/AppContext";
import { Calendar, User, ArrowLeft, ArrowRight, CreditCard, CheckCircle2, ShieldAlert, Clock, Armchair, MapPin } from "lucide-react";

// Dynamically import Konva Seat Canvas with SSR disabled
const SeatCanvas = dynamic(() => import("../../../components/SeatCanvas"), {
  ssr: false,
});

interface LibraryDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  slotTypes: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    price: string;
  }[];
  photos: { id: string; url: string }[];
}

interface FloorPlanDetail {
  id: string;
  canvasWidth: number;
  canvasHeight: number;
  objects: any[];
}

interface SeatAvailability {
  seatId: string;
  seatCode: string;
  seatType: string;
  isActive: boolean;
  isBooked: boolean;
  isHeld: boolean;
}

// Inner wizard logic to wrap in Suspense for searchParams use in App Router
function BookingWizardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const { socket } = useSocket();

  const libraryId = searchParams.get("libraryId") || "";
  const date = searchParams.get("date") || "";
  const slotTypeId = searchParams.get("slotTypeId") || "";

  // Wizard state: 1 = Dates Confirm, 2 = Seat Selection, 3 = Details, 4 = Payment, 5 = Confirmation
  const [step, setStep] = useState(1);
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [selectedSeatCode, setSelectedSeatCode] = useState<string | null>(null);
  
  // Hold timer expiration
  const [holdExpiresAt, setHoldExpiresAt] = useState<string | null>(null);
  const [timerText, setTimerText] = useState("");

  // Input states
  const [fullName, setFullName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 1. Fetch library details
  const { data: library } = useQuery<LibraryDetail>({
    queryKey: ["library-wizard", libraryId],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries/${libraryId}`);
      if (!res.ok) throw new Error("Library not found");
      return res.json();
    },
    enabled: !!libraryId,
  });

  // 2. Fetch floor plan
  const { data: floorPlan } = useQuery<FloorPlanDetail>({
    queryKey: ["floorplan-wizard", libraryId],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries/${libraryId}/floorplan`);
      if (!res.ok) throw new Error("Floor plan not found");
      return res.json();
    },
    enabled: !!libraryId,
  });

  // 3. Fetch seat availability
  const { data: availability, refetch: refetchAvailability } = useQuery<SeatAvailability[]>({
    queryKey: ["availability-wizard", libraryId, date, slotTypeId],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(
        `${apiBase}/libraries/${libraryId}/availability?date=${date}&slotTypeId=${slotTypeId}`
      );
      if (!res.ok) throw new Error("Failed to load seat availability");
      return res.json();
    },
    enabled: !!libraryId && !!date && !!slotTypeId,
  });

  // Socket.io listeners
  useEffect(() => {
    if (!socket || !libraryId) return;

    // Join room
    socket.emit("join-library", libraryId);

    // Listen to real-time seat locks
    socket.on("seat-status-changed", (data: { seatId: string; status: string }) => {
      // Invalidate query to update canvas state
      queryClient.invalidateQueries({
        queryKey: ["availability-wizard", libraryId, date, slotTypeId],
      });
    });

    return () => {
      socket.emit("leave-library", libraryId);
      socket.off("seat-status-changed");
    };
  }, [socket, libraryId, date, slotTypeId, queryClient]);

  // Hold Timer countdown hook
  useEffect(() => {
    if (!holdExpiresAt) {
      setTimerText("");
      return;
    }

    const interval = setInterval(() => {
      const remaining = Date.parse(holdExpiresAt) - Date.now();
      if (remaining <= 0) {
        setTimerText("Expired");
        setSelectedSeatId(null);
        setSelectedSeatCode(null);
        setHoldExpiresAt(null);
        setError("Your seat hold has expired. Please select a seat again.");
        setStep(2); // kick back to seat selection
        clearInterval(interval);
      } else {
        const mins = Math.floor(remaining / 60000);
        const secs = Math.floor((remaining % 60000) / 1000);
        setTimerText(`${mins}:${secs.toString().padStart(2, "0")}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [holdExpiresAt]);

  const selectedSlot = useMemo(() => {
    return library?.slotTypes.find((s) => s.id === slotTypeId);
  }, [library, slotTypeId]);

  // Select Seat (Step 2)
  const handleSeatSelect = async (seatId: string) => {
    setError(null);

    // If clicking already selected seat, release it
    if (selectedSeatId === seatId) {
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
        await fetch(`${apiBase}/bookings/${seatId}/release`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ slotTypeId, date }),
        });
        setSelectedSeatId(null);
        setSelectedSeatCode(null);
        setHoldExpiresAt(null);
      } catch (err) {
        console.error("Release hold error:", err);
      }
      return;
    }

    // Place hold on new seat
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiBase}/bookings/hold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seatId, slotTypeId, date }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to hold seat");
      }

      setSelectedSeatId(seatId);
      setHoldExpiresAt(data.expiresAt);

      // Find seat code from availability list
      const seatObj = availability?.find((a) => a.seatId === seatId);
      if (seatObj) {
        setSelectedSeatCode(seatObj.seatCode);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Perform transaction confirmation (Step 4 -> Step 5)
  const handlePayAndConfirm = async () => {
    if (!selectedSeatId) return;
    setError(null);
    setSubmitting(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiBase}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seatId: selectedSeatId, slotTypeId, date }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to complete reservation");
      }

      setHoldExpiresAt(null); // clear timer
      setStep(5); // goto confirmation screen
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentLibraryName = library?.name || "Study Library";
  const seatCodeDisplay = selectedSeatCode || "Not selected";
  const slotPrice = selectedSlot ? Number(selectedSlot.price) : 0;
  const serviceFee = Number((slotPrice * 0.1).toFixed(2)); // 10%
  const totalPrice = slotPrice + serviceFee;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Wizard Steps Header Navigation */}
      <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
        <div className="flex items-center gap-2">
          {step > 1 && step < 5 && (
            <button
              onClick={() => setStep(step - 1)}
              className="p-2 border border-gray-200 rounded-full hover:bg-gray-50 transition cursor-pointer mr-2"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
          )}
          <span className="text-sm font-semibold text-gray-500">
            Step {step} of 5 · {step === 1 && "Confirm Slot"} {step === 2 && "Seat Assignment"}{" "}
            {step === 3 && "Details"} {step === 4 && "Check-out Payment"}{" "}
            {step === 5 && "Confirmation receipt"}
          </span>
        </div>

        {/* Real-time hold indicator */}
        {timerText && step < 5 && (
          <div className="flex items-center gap-2 bg-amber-50 text-amber-700 px-3.5 py-1.5 rounded-full text-xs font-black border border-amber-200 animate-pulse">
            <Clock className="w-4 h-4 text-amber-600" />
            Hold expires in: <span className="font-mono text-sm">{timerText}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
        
        {/* Left Column: Form Steps */}
        <div className="lg:col-span-2 space-y-6">
          
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-100 font-medium flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold">Reservation Alert</h4>
                <p className="text-xs text-red-500/90 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* STEP 1: Dates Confirmation */}
          {step === 1 && (
            <div className="bg-white border border-gray-250 border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Review selected timings</h2>
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3.5">
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Calendar className="w-5 h-5 text-brand shrink-0" />
                  <div>
                    <p className="font-bold text-gray-950">Access Date</p>
                    <p className="text-xs text-gray-500">{new Date(date).toDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-700">
                  <Armchair className="w-5 h-5 text-brand shrink-0" />
                  <div>
                    <p className="font-bold text-gray-950">Timing Slot</p>
                    <p className="text-xs text-gray-500">
                      {selectedSlot?.name} ({selectedSlot?.startTime} - {selectedSlot?.endTime})
                    </p>
                  </div>
                </div>
              </div>

              {!token ? (
                <div className="bg-amber-50 text-amber-800 p-4 border border-amber-200 rounded-xl text-xs font-semibold">
                  You must be logged in to proceed.{" "}
                  <Link href={`/auth/signin?redirect=/booking/wizard?libraryId=${libraryId}&date=${date}&slotTypeId=${slotTypeId}`} className="underline text-brand font-bold">
                    Log in here
                  </Link>
                </div>
              ) : (
                <button
                  onClick={() => setStep(2)}
                  className="bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm ml-auto"
                >
                  Choose seat
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* STEP 2: Interactive Seat Selection */}
          {step === 2 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Select desk code assignment</h2>
                  <p className="text-xs text-gray-500">Click on any green available desk layout to place a 10-minute hold.</p>
                </div>
              </div>

              {/* Konva Stage Wrapper */}
              {floorPlan && availability ? (
                <SeatCanvas
                  canvasWidth={floorPlan.canvasWidth}
                  canvasHeight={floorPlan.canvasHeight}
                  objects={floorPlan.objects}
                  availability={availability}
                  selectedSeatId={selectedSeatId}
                  onSeatSelect={handleSeatSelect}
                />
              ) : (
                <div className="h-60 border border-gray-100 rounded-2xl animate-pulse bg-gray-50" />
              )}

              {/* Legend indicators */}
              <div className="flex flex-wrap justify-center gap-6 text-xs font-semibold text-gray-600 border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-white border-2 border-emerald-500 rounded-md" />
                  <span>Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-brand rounded-md" />
                  <span>Your selection</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-amber-100 border border-amber-500 rounded-md" />
                  <span>Held</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 border border-gray-400 rounded-md" />
                  <span>Booked</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <span className="text-sm font-semibold text-gray-700">
                  Selected Seat: <span className="font-black text-brand text-base">{seatCodeDisplay}</span>
                </span>
                <button
                  onClick={() => setStep(3)}
                  disabled={!selectedSeatId}
                  className="bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  Fill details
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Student Details */}
          {step === 3 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-gray-900">Student registration credentials</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Student Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full border border-gray-350 border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Email for Confirmation Receipt
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm"
                    placeholder="9876543210"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  onClick={() => setStep(2)}
                  className="text-sm font-semibold text-gray-500 hover:underline"
                >
                  Back to seat selection
                </button>
                <button
                  onClick={() => setStep(4)}
                  className="bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition cursor-pointer shadow-sm"
                >
                  Proceed to payment
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Stubbed Payment Form */}
          {step === 4 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand" />
                Stubbed Payment
              </h2>
              
              <div className="bg-gray-55/10 bg-slate-50 p-4 border border-gray-150 rounded-xl text-xs text-gray-650 leading-relaxed space-y-2">
                <p className="font-bold text-gray-900 text-sm">💳 Sandbox Mode Active</p>
                <p>As per the system integration checklist requirements, Razorpay SDK is stubbed. Clicking the pay button will immediately trigger database transactional confirmations and dispatch the AWS SES receipt email.</p>
              </div>

              <button
                onClick={handlePayAndConfirm}
                disabled={submitting}
                className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-bold py-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md mt-4"
              >
                {submitting ? "Processing booking transactions..." : `Pay Now (₹${totalPrice})`}
              </button>
            </div>
          )}

          {/* STEP 5: Confirmation Success page */}
          {step === 5 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-10 shadow-sm text-center space-y-6 max-w-lg mx-auto">
              <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto fill-emerald-50" />
              <div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight">Booking Confirmed!</h2>
                <p className="text-sm text-gray-500 mt-2">
                  Your seat assignment has been successfully reserved and locked.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-100 rounded-xl p-5 text-left text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Library</span>
                  <span className="font-bold text-gray-900">{currentLibraryName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Desk Assignment</span>
                  <span className="font-bold text-brand">{seatCodeDisplay}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Reservation Date</span>
                  <span className="font-bold text-gray-900">{new Date(date).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500 font-semibold">Timings</span>
                  <span className="font-bold text-gray-900">{selectedSlot?.name}</span>
                </div>
              </div>

              <div className="bg-emerald-50 text-emerald-800 text-xs font-semibold p-4 rounded-xl border border-emerald-200">
                📨 Confirmation email sent successfully to <span className="underline">{email}</span>.
              </div>

              <button
                onClick={() => router.push("/bookings")}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3.5 rounded-xl transition cursor-pointer text-sm"
              >
                Go to My Bookings
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Sticky Summary Panel */}
        {step < 5 && (
          <div className="w-full lg:sticky lg:top-24">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-md">
              <h3 className="text-base font-black text-gray-900 mb-4 border-b border-gray-100 pb-3">
                Booking Summary
              </h3>

              <div className="flex gap-4 mb-4">
                {library?.photos[0]?.url ? (
                  <img
                    src={library.photos[0].url}
                    alt={library.name}
                    className="w-20 h-20 rounded-xl object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-slate-400">
                    SS
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-gray-900 text-sm truncate max-w-[150px]">{currentLibraryName}</h4>
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-brand" />
                    {library?.city}
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-100 py-4 space-y-2.5 text-xs text-gray-650 font-medium">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date</span>
                  <span className="text-gray-900">{date ? new Date(date).toLocaleDateString() : "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Slot Type</span>
                  <span className="text-gray-900">{selectedSlot?.name || "--"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Selected Desk</span>
                  <span className="text-brand font-bold">{seatCodeDisplay}</span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 space-y-2.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Base Price</span>
                  <span className="font-bold text-gray-900">₹{slotPrice}</span>
                </div>
                <div className="flex justify-between">
                  <span>Service Fee (10%)</span>
                  <span className="font-bold text-gray-900">₹{serviceFee}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-gray-950 pt-1.5 border-t border-gray-100">
                  <span>Total Amount</span>
                  <span>₹{totalPrice}</span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}

export default function BookingWizardPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-gray-500">Loading booking wizard details...</div>}>
      <BookingWizardContent />
    </Suspense>
  );
}
