"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, SlidersHorizontal, Star, ShieldAlert } from "lucide-react";

interface LibraryListItem {
  id: string;
  name: string;
  address: string;
  city: string;
  amenities: string[];
  photos: string[];
  slotTypes: {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    price: string;
  }[];
  rating: number | null;
  reviewCount: number;
}

export default function HomePage() {
  const [cityQuery, setCityQuery] = useState("");
  const [dateQuery, setDateQuery] = useState("");
  const [guestsQuery, setGuestsQuery] = useState(1);
  const [activeSearch, setActiveSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Fetch libraries using TanStack Query
  const { data: libraries, isLoading, error } = useQuery<LibraryListItem[]>({
    queryKey: ["libraries", activeSearch],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const url = activeSearch
        ? `${apiBase}/libraries?city=${encodeURIComponent(activeSearch)}`
        : `${apiBase}/libraries`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load libraries");
      return res.json();
    },
  });

  const allAmenities = [
    "High-speed Wi-Fi",
    "Air Conditioning",
    "Ergonomic Chairs",
    "Quiet Zone",
    "Drinking Water",
  ];

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(cityQuery);
  };

  // Filter listings client side based on pricing and amenities selection
  const filteredLibraries = libraries?.filter((lib) => {
    // 1. Price check (find cheapest slot)
    const cheapestPrice = lib.slotTypes.length
      ? Math.min(...lib.slotTypes.map((s) => Number(s.price)))
      : 0;
    if (cheapestPrice > maxPrice) return false;

    // 2. Amenities check
    if (selectedAmenities.length > 0) {
      const hasAll = selectedAmenities.every((amenity) => lib.amenities.includes(amenity));
      if (!hasAll) return false;
    }

    return true;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Search Header Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 md:p-12 mb-12 relative overflow-hidden flex flex-col justify-center items-center shadow-lg border border-slate-800">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-800/50 via-slate-900/90 to-slate-900 pointer-events-none" />
        
        <h1 className="text-3xl md:text-5xl font-black text-center relative z-10 tracking-tight leading-tight max-w-2xl mb-4 font-serif">
          Find your perfect study environment
        </h1>
        <p className="text-slate-400 text-center relative z-10 text-base md:text-lg max-w-md mb-8">
          Book dedicated quiet desks, premium ergonomics, and amenities in verified study libraries.
        </p>

        {/* Floating Search Bar */}
        <form
          onSubmit={handleSearchSubmit}
          className="w-full max-w-4xl bg-white text-gray-800 rounded-2xl md:rounded-full p-2.5 md:p-1.5 flex flex-col md:flex-row items-center gap-3 md:gap-0 shadow-2xl border border-gray-100 relative z-10 w-full"
        >
          {/* Where */}
          <div className="flex-1 flex flex-col items-start px-5 w-full md:border-r md:border-gray-200">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-800 mb-0.5">Where</label>
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              placeholder="Search destinations"
              className="w-full text-xs text-gray-700 bg-transparent outline-none placeholder-gray-400 font-medium"
            />
          </div>

          {/* When */}
          <div className="flex-1 flex flex-col items-start px-5 w-full md:border-r md:border-gray-200">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-800 mb-0.5">When</label>
            <input
              type="date"
              value={dateQuery}
              onChange={(e) => setDateQuery(e.target.value)}
              className="w-full text-xs text-gray-700 bg-transparent outline-none cursor-pointer font-medium"
            />
          </div>

          {/* Who */}
          <div className="flex-1 flex flex-col items-start px-5 w-full">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-800 mb-0.5">Who</label>
            <input
              type="number"
              min="1"
              value={guestsQuery}
              onChange={(e) => setGuestsQuery(Number(e.target.value))}
              placeholder="Add guests"
              className="w-full text-xs text-gray-700 bg-transparent outline-none font-medium"
            />
          </div>

          {/* Red Search Button */}
          <button
            type="submit"
            className="w-full md:w-auto bg-brand hover:bg-brand-hover text-white p-3.5 rounded-xl md:rounded-full transition flex items-center justify-center cursor-pointer shrink-0 shadow-md md:mr-1"
          >
            <Search className="w-5 h-5" />
            <span className="md:hidden ml-2 font-bold text-sm">Search</span>
          </button>
        </form>
      </div>

      {/* Discovery Section */}
      <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Toggle Filters Button for Mobile */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden w-full border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold p-3.5 rounded-xl flex items-center justify-center gap-2 transition"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>

        {/* Sidebar Filters */}
        <aside
          className={`w-full lg:w-72 shrink-0 border border-gray-100 rounded-2xl p-6 bg-white shadow-sm sticky top-24 ${
            showFilters ? "block" : "hidden lg:block"
          }`}
        >
          <h3 className="text-lg font-bold text-gray-950 mb-6 flex items-center gap-2 border-b border-gray-100 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-gray-500" />
            Filters
          </h3>

          {/* Pricing slider */}
          <div className="mb-8">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Price range (max per slot)</h4>
            <div className="flex justify-between text-xs font-semibold text-gray-500 mb-2">
              <span>₹50</span>
              <span className="text-brand">₹{maxPrice}</span>
            </div>
            <input
              type="range"
              min="50"
              max="600"
              step="25"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-brand h-1.5 bg-gray-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Amenities filter */}
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Amenities</h4>
            <div className="space-y-3">
              {allAmenities.map((amenity) => (
                <label key={amenity} className="flex items-center gap-3 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(amenity)}
                    onChange={() => handleAmenityToggle(amenity)}
                    className="w-4.5 h-4.5 rounded border-gray-300 text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                  {amenity}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Grid */}
        <main className="flex-grow w-full">
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-white border border-gray-100 rounded-2xl overflow-hidden h-80">
                  <div className="bg-gray-200 h-48 w-full" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-2/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-6 bg-gray-200 rounded w-1/4 mt-4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-2xl p-6 text-center text-red-700 max-w-md mx-auto">
              <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
              <h3 className="font-bold text-lg mb-1">Error Loading Spaces</h3>
              <p className="text-sm text-red-600">Please make sure the backend server is running and try again.</p>
            </div>
          )}

          {!isLoading && !error && filteredLibraries?.length === 0 && (
            <div className="text-center py-20 bg-gray-55/10 border border-dashed border-gray-200 rounded-2xl max-w-lg mx-auto px-6">
              <CompassIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <h3 className="font-bold text-gray-800 text-lg mb-1">No study spaces found</h3>
              <p className="text-sm text-gray-500">Try adjusting your filters or searching a different city.</p>
            </div>
          )}

          {!isLoading && !error && filteredLibraries && filteredLibraries.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredLibraries.map((lib) => {
                const cheapestSlot = lib.slotTypes.length
                  ? Math.min(...lib.slotTypes.map((s) => Number(s.price)))
                  : 0;

                const displayImage = lib.photos.length
                  ? lib.photos[0]
                  : "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80";

                return (
                  <Link
                    href={`/libraries/${lib.id}${dateQuery ? `?date=${dateQuery}` : ""}`}
                    key={lib.id}
                    className="group bg-white border border-gray-150 border-gray-100 rounded-2xl overflow-hidden card-hover-effect flex flex-col shadow-sm cursor-pointer"
                  >
                    {/* Cover image */}
                    <div className="relative h-48 w-full bg-gray-100 overflow-hidden shrink-0">
                      <img
                        src={displayImage}
                        alt={lib.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                      />
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm shadow-sm py-1 px-2.5 rounded-full text-xs font-bold text-gray-800 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-brand" />
                        {lib.city}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-5 flex-grow flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <h3 className="font-bold text-gray-900 group-hover:text-brand transition text-base truncate">
                            {lib.name}
                          </h3>
                          <div className="flex items-center gap-1 shrink-0 text-sm font-bold text-gray-800">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            {lib.rating ? lib.rating.toFixed(1) : "New"}
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 line-clamp-1 mb-3">{lib.address}</p>
                        
                        {/* Amenities pills */}
                        <div className="flex flex-wrap gap-1 mb-4">
                          {lib.amenities.slice(0, 3).map((amenity) => (
                            <span
                              key={amenity}
                              className="text-[10px] font-semibold bg-gray-50 text-gray-500 border border-gray-100 px-2 py-0.5 rounded-full"
                            >
                              {amenity}
                            </span>
                          ))}
                          {lib.amenities.length > 3 && (
                            <span className="text-[10px] font-semibold text-gray-400 px-1">
                              +{lib.amenities.length - 3} more
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-3.5 flex items-end justify-between mt-2">
                        <span className="text-xs font-semibold text-gray-500">Starting from</span>
                        <span className="text-base font-black text-gray-950">
                          ₹{cheapestSlot} <span className="text-xs font-semibold text-gray-500">/ slot</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

// Simple compass icon for empty state
function CompassIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-.554-8.243-1.568m16.486 0A11.954 11.954 0 0 0 12 7.5a11.954 11.954 0 0 0-8.243 1.432"
      />
    </svg>
  );
}
