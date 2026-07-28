"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../../context/AppContext";
import { IndianRupee, Calendar, CheckCircle2, Clock, Building2, TrendingUp, Filter, Loader2 } from "lucide-react";

interface LibraryStat {
  id: string;
  name: string;
  totalEarnings: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  totalBookings: number;
  completedBookings: number;
}

interface EarningsData {
  lifetimeEarnings: number;
  monthlyEarnings: number;
  weeklyEarnings: number;
  pendingEarnings: number;
  totalBookings: number;
  completedBookings: number;
  libraries: LibraryStat[];
}

export default function EarningsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [timeframeFilter, setTimeframeFilter] = useState<"lifetime" | "monthly" | "weekly">("lifetime");
  const [selectedLibraryId, setSelectedLibraryId] = useState<string>("ALL");

  useEffect(() => {
    if (!token) return;

    const fetchEarnings = async () => {
      setLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
        const res = await fetch(`${apiBase}/owner/earnings`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to fetch owner earnings:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand" /> Loading earnings analytics...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-sm text-red-600">
        Failed to load earnings analytics. Please try again.
      </div>
    );
  }

  // Calculate filtered values based on dropdown selection
  const selectedLibrary = selectedLibraryId !== "ALL"
    ? data.libraries.find((lib) => lib.id === selectedLibraryId)
    : null;

  const displayedEarnings = selectedLibrary
    ? timeframeFilter === "weekly"
      ? selectedLibrary.weeklyEarnings
      : timeframeFilter === "monthly"
      ? selectedLibrary.monthlyEarnings
      : selectedLibrary.totalEarnings
    : timeframeFilter === "weekly"
    ? data.weeklyEarnings
    : timeframeFilter === "monthly"
    ? data.monthlyEarnings
    : data.lifetimeEarnings;

  const totalBookingsCount = selectedLibrary ? selectedLibrary.totalBookings : data.totalBookings;
  const completedBookingsCount = selectedLibrary ? selectedLibrary.completedBookings : data.completedBookings;

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header & Filter Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-brand" /> Earnings Dashboard
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Overview of revenue, completed reservations, and library performance.
            </p>
          </div>

          {/* Clean Dropdown Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 bg-white text-xs">
              <Filter className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={timeframeFilter}
                onChange={(e) => setTimeframeFilter(e.target.value as any)}
                className="bg-transparent text-gray-800 font-bold outline-none cursor-pointer"
              >
                <option value="lifetime">Lifetime</option>
                <option value="monthly">This Month</option>
                <option value="weekly">This Week</option>
              </select>
            </div>

            <div className="flex items-center gap-2 border border-gray-300 rounded-xl px-3 py-2 bg-white text-xs">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <select
                value={selectedLibraryId}
                onChange={(e) => setSelectedLibraryId(e.target.value)}
                className="bg-transparent text-gray-800 font-bold outline-none cursor-pointer"
              >
                <option value="ALL">All Libraries ({data.libraries.length})</option>
                {data.libraries.map((lib) => (
                  <option key={lib.id} value={lib.id}>
                    {lib.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Clean Metrics Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Selected Timeframe Revenue Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                {timeframeFilter === "weekly" ? "Weekly Revenue" : timeframeFilter === "monthly" ? "Monthly Revenue" : "Lifetime Revenue"}
              </span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">₹{displayedEarnings.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-400">
              {selectedLibrary ? selectedLibrary.name : "Across all listings"}
            </p>
          </div>

          {/* Pending Earnings Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending Earnings</span>
              <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">₹{data.pendingEarnings.toLocaleString()}</p>
            <p className="text-[11px] font-medium text-gray-400">Hold & Pending payments</p>
          </div>

          {/* Total Bookings Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Bookings</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                <Calendar className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">{totalBookingsCount}</p>
            <p className="text-[11px] font-medium text-gray-400">Seats reserved by students</p>
          </div>

          {/* Completed Bookings Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Completed Sessions</span>
              <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-3xl font-black text-gray-900">{completedBookingsCount}</p>
            <p className="text-[11px] font-medium text-gray-400">Finished study slots</p>
          </div>
        </div>

        {/* Per-Library Breakdown Table Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 sm:p-8 space-y-4">
          <h3 className="text-lg font-bold text-gray-900">Per-Library Performance</h3>
          
          {data.libraries.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">No libraries listed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-700">
                <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">
                  <tr>
                    <th className="py-3 px-4">Library Name</th>
                    <th className="py-3 px-4">This Week</th>
                    <th className="py-3 px-4">This Month</th>
                    <th className="py-3 px-4">Lifetime Revenue</th>
                    <th className="py-3 px-4 text-center">Bookings</th>
                    <th className="py-3 px-4 text-center">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {data.libraries.map((lib) => (
                    <tr key={lib.id} className="hover:bg-gray-50 transition">
                      <td className="py-3.5 px-4 font-bold text-gray-900">{lib.name}</td>
                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">₹{lib.weeklyEarnings.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-emerald-700 font-semibold">₹{lib.monthlyEarnings.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-gray-900 font-black">₹{lib.totalEarnings.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center">{lib.totalBookings}</td>
                      <td className="py-3.5 px-4 text-center font-bold text-emerald-600">{lib.completedBookings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
