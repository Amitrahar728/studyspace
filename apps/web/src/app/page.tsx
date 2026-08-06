"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, MapPin, SlidersHorizontal, Star, ShieldAlert, Calendar, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "../context/AppContext";

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

function LibraryCard({ lib }: { lib: LibraryListItem }) {
  const photo = lib.photos && lib.photos.length > 0
    ? lib.photos[0]
    : "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=600&q=80";
  const lowestPrice = lib.slotTypes && lib.slotTypes.length > 0
    ? Math.min(...lib.slotTypes.map((s) => Number(s.price)))
    : 150;

  return (
    <Link
      href={"/libraries/" + lib.id}
      className="group bg-white border border-stone-200/80 rounded-2xl overflow-hidden hover:border-[#A95031]/50 hover:shadow-lg transition duration-200 flex flex-col justify-between cursor-pointer shadow-sm"
    >
      <div>
        <div className="relative h-48 w-full bg-stone-100 overflow-hidden border-b border-stone-100">
          <img
            src={photo}
            alt={lib.name}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
          {lib.rating ? (
            <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm border border-stone-200/80 px-2.5 py-1 rounded-full text-xs font-extrabold text-stone-900 shadow-sm flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{lib.rating.toFixed(1)}</span>
            </div>
          ) : null}
        </div>

        <div className="p-5">
          <h3 className="font-bold text-stone-900 text-base group-hover:text-[#A95031] transition truncate">
            {lib.name}
          </h3>
          <p className="text-xs text-stone-500 flex items-center gap-1 mt-1 truncate">
            <MapPin className="w-3.5 h-3.5 text-[#A95031] shrink-0" />
            {lib.address}, {lib.city}
          </p>

          <div className="flex flex-wrap gap-1.5 mt-3">
            {lib.amenities.slice(0, 3).map((amenity) => (
              <span
                key={amenity}
                className="text-[10px] font-semibold bg-[#F7EBE4] text-[#6E2D17] border border-[#A95031]/20 px-2.5 py-0.5 rounded-md"
              >
                {amenity}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 py-3 border-t border-stone-100 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
        <span className="font-medium text-stone-500">Starting from</span>
        <span className="font-black text-[#A95031] text-base">{"₹" + lowestPrice} <span className="text-[10px] font-normal text-stone-400">per slot</span></span>
      </div>
    </Link>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Search state
  const [cityQuery, setCityQuery] = useState("");
  const [startDateQuery, setStartDateQuery] = useState("");
  const [endDateQuery, setEndDateQuery] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [searchStep, setSearchStep] = useState<1 | 2>(1);
  const [hasSearched, setHasSearched] = useState(false);

  // Filters state
  const [showFilters, setShowFilters] = useState(false);
  const [maxPrice, setMaxPrice] = useState<number>(500);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // Popular shortcut cities
  const popularCities = ["Gurugram", "Mumbai", "Delhi"];

  // Fetch libraries using TanStack Query
  const { data: libraries, isLoading, error } = useQuery<LibraryListItem[]>({
    queryKey: ["libraries", activeSearch],
    enabled: user?.role !== "OWNER",
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const url = activeSearch
        ? `${apiBase}/libraries/search?query=${encodeURIComponent(activeSearch)}`
        : `${apiBase}/libraries`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load libraries");
      return res.json();
    },
  });

  useEffect(() => {
    if (user?.role === "OWNER") {
      router.push("/owner/libraries/create");
    }
  }, [user, router]);

  if (user?.role === "OWNER") {
    return null;
  }

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

  const handleCityShortcutSelect = (city: string) => {
    setCityQuery(city);
    setSearchStep(2);
  };

  const handleExecuteSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setActiveSearch(cityQuery);
    setHasSearched(true);
    // Smooth scroll down to listings
    setTimeout(() => {
      const listingsEl = document.getElementById("search-results-section");
      if (listingsEl) {
        listingsEl.scrollIntoView({ behavior: "smooth" });
      }
    }, 100);
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
    <div className="w-full bg-[#F8F5EE] min-h-screen text-[#221C19]">
      
      {/* Full-Screen Warm Hero Section */}
      <div className="w-full bg-[#F8F5EE] text-[#221C19] min-h-[calc(100vh-80px)] flex flex-col justify-between select-none relative overflow-hidden px-4 sm:px-8 pb-8 pt-4">
        
        {/* Hero Title */}
        <div className="text-center z-10 max-w-4xl mx-auto mt-8 sm:mt-14">
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold font-serif text-[#221C19] tracking-tight leading-tight text-center drop-shadow-sm">
            Find Your Place to Learn and Grow
          </h1>
        </div>

        {/* Sleek Horizontal Search Filter Bar */}
        <div className="relative z-20 max-w-4xl mx-auto w-full mt-auto mb-10 bg-white p-3 sm:p-4 rounded-full shadow-2xl border border-stone-200/80 text-[#221C19] flex flex-col md:flex-row items-center gap-3 md:gap-0 divide-y md:divide-y-0 md:divide-x divide-stone-200/80">
          
          {/* 1. Location Input */}
          <div className="flex-1 px-6 py-1 w-full">
            <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#6B5E57] block mb-1">LOCATION</label>
            <input
              type="text"
              value={cityQuery}
              onChange={(e) => setCityQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleExecuteSearch(e);
              }}
              placeholder="Where do you want to study?"
              className="w-full text-xs sm:text-sm font-bold text-black bg-transparent outline-none placeholder:text-[#88786F]"
            />
          </div>

          {/* 2. Booking Dates */}
          <div className="flex-1 px-6 py-1 w-full">
            <label className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-[#6B5E57] block mb-1">BOOKING DATES</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDateQuery}
                onChange={(e) => setStartDateQuery(e.target.value)}
                className="w-full text-xs sm:text-sm font-extrabold text-black bg-transparent outline-none cursor-pointer"
              />
              <span className="text-black font-extrabold text-xs">-</span>
              <input
                type="date"
                value={endDateQuery}
                min={startDateQuery}
                onChange={(e) => setEndDateQuery(e.target.value)}
                className="w-full text-xs sm:text-sm font-extrabold text-black bg-transparent outline-none cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Search Button */}
          <div className="p-1 w-full md:w-auto shrink-0">
            <button
              type="button"
              onClick={handleExecuteSearch}
              className="w-full md:w-auto bg-[#A95031] hover:bg-[#8E3F24] text-white text-xs sm:text-sm font-extrabold px-8 py-3.5 rounded-full transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <Search className="w-4 h-4 text-white" />
              <span>Search</span>
            </button>
          </div>

        </div>
      </div>

      {hasSearched ? (
        <div id="search-results-section" className="bg-[#F8F5EE] text-[#221C19] py-12 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-300 border-t border-stone-200/60">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col lg:flex-row gap-8 items-start">
        
        {/* Toggle Filters Button for Mobile */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="lg:hidden w-full border border-stone-200/80 bg-white hover:bg-stone-50 text-stone-800 font-semibold p-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-sm"
        >
          <SlidersHorizontal className="w-4 h-4 text-[#A95031]" />
          {showFilters ? "Hide Filters" : "Show Filters"}
        </button>

        {/* Sidebar Filters */}
        <aside
          className={`w-full lg:w-72 shrink-0 border border-stone-200/80 rounded-2xl p-5 bg-white shadow-sm sticky top-24 ${
            showFilters ? "block" : "hidden lg:block"
          }`}
        >
          <h3 className="text-base font-bold text-stone-900 mb-5 flex items-center gap-2 border-b border-stone-200/60 pb-3">
            <SlidersHorizontal className="w-4 h-4 text-[#A95031]" />
            Filters
          </h3>

          {/* Pricing slider */}
          <div className="mb-6">
            <h4 className="text-xs font-semibold text-stone-700 mb-2">Price range (max per slot)</h4>
            <div className="flex justify-between items-center text-xs font-semibold text-stone-400 mb-2">
              <span>₹50</span>
              <span className="text-[#A95031] font-black text-sm">{"₹" + maxPrice}</span>
            </div>
            <input
              type="range"
              min="50"
              max="600"
              step="25"
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-blue-600 h-1.5 bg-stone-100 rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Amenities filter */}
          <div>
            <h4 className="text-xs font-semibold text-stone-700 mb-3">Amenities</h4>
            <div className="space-y-2.5">
              {allAmenities.map((amenity) => (
                <label key={amenity} className="flex items-center gap-2.5 text-xs text-stone-600 hover:text-stone-900 cursor-pointer transition">
                  <input
                    type="checkbox"
                    checked={selectedAmenities.includes(amenity)}
                    onChange={() => handleAmenityToggle(amenity)}
                    className="w-4 h-4 rounded border-stone-300 text-[#A95031] focus:ring-[#A95031] accent-[#A95031] cursor-pointer"
                  />
                  <span>{amenity}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Grid */}
        <div className="flex-1 w-full">
          
          {/* Section Heading */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-[#221C19]">
                {activeSearch ? `Study Spaces in ${activeSearch}` : "Available Study Spaces"}
              </h2>
              <p className="text-xs text-[#6B5E57] mt-1">
                {filteredLibraries?.length || 0} reading rooms available for instant seat selection.
              </p>
            </div>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="animate-pulse bg-white border border-stone-200/80 rounded-2xl h-80 w-full" />
              ))}
            </div>
          )}

          {error && (
            <div className="text-center py-12 bg-red-50 rounded-2xl border border-red-200">
              <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <p className="font-bold text-red-700">Failed to load study spaces.</p>
              <p className="text-xs text-red-500 mt-1">Please verify database connectivity.</p>
            </div>
          )}

          {!isLoading && !error && filteredLibraries && filteredLibraries.length === 0 && (
            <div className="text-center py-20 border border-dashed border-stone-200/80 rounded-3xl bg-white">
              <MapPin className="w-12 h-12 text-[#A0938A] mx-auto mb-3" />
              <h3 className="text-lg font-bold text-[#221C19] mb-1">No Study Spaces Found</h3>
              <p className="text-xs text-[#6B5E57] max-w-sm mx-auto mb-6">
                We couldn&apos;t find any reading rooms matching &quot;{activeSearch || "your criteria"}&quot;. Try adjusting your filters or searching another city.
              </p>
              <button
                onClick={() => {
                  setCityQuery("");
                  setActiveSearch("");
                  setSelectedAmenities([]);
                  setMaxPrice(600);
                  setSearchStep(1);
                }}
                className="bg-[#A95031] hover:bg-[#8E3F24] text-white text-xs font-bold px-6 py-2.5 rounded-full transition shadow-md cursor-pointer"
              >
                Reset All Filters
              </button>
            </div>
          )}

          {!isLoading && !error && filteredLibraries && filteredLibraries.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredLibraries.map((lib) => (
                <LibraryCard key={lib.id} lib={lib} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
  ) : null}
    </div>
  );
}
