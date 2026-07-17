"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../context/AppContext";
import { Search, Menu, User, LogOut, Compass, LayoutDashboard, Settings, MapPin } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);

  // Search overlay inputs
  const [cityVal, setCityVal] = useState("");
  const [dateVal, setDateVal] = useState("");
  const [guestsVal, setGuestsVal] = useState(1);

  // Suggestions state
  const [suggestOpen, setSuggestOpen] = useState(false);
  const suggestRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const suggestions = [
    { name: "Gurugram", desc: "Popular hubs in Haryana" },
    { name: "Mumbai", desc: "Commercial study libraries" },
    { name: "North Goa", desc: "Quiet coastal reading rooms" },
    { name: "Delhi", desc: "Central capital study zones" },
  ];

  // Scroll detection to collapse/expand search pill
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 120) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
        setIsSearchExpanded(false); // Auto-collapse when user scrolls to top
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (suggestRef.current && !suggestRef.current.contains(event.target as Node)) {
        setSuggestOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleOverlaySearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearchExpanded(false);
    
    const params = new URLSearchParams();
    if (cityVal) params.set("city", cityVal);
    if (dateVal) params.set("date", dateVal);
    if (guestsVal) params.set("guests", String(guestsVal));

    router.push(`/?${params.toString()}`);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        
        {/* Logo */}
        <Link href="/" onClick={() => setIsSearchExpanded(false)} className="flex items-center gap-2 shrink-0">
          <span className="text-2xl font-black text-brand tracking-tight flex items-center gap-1">
            <span className="bg-brand text-white p-1.5 rounded-lg flex items-center justify-center font-serif text-lg leading-none">S</span>
            StudySpace
          </span>
        </Link>

        {/* Center Search Pill - Airbnb styling (Always show on subpages, scroll-revealed on home) */}
        {(!isHome || isScrolled) && !isSearchExpanded && (
          <div
            onClick={() => setIsSearchExpanded(true)}
            className="hidden md:flex items-center border border-gray-250 border-gray-200 rounded-full py-2 px-3.5 shadow-sm hover:shadow-md transition cursor-pointer gap-2 divide-x divide-gray-200 animate-in zoom-in-95 duration-200"
          >
            <button className="px-3 text-xs font-bold text-gray-800">Anywhere</button>
            <button className="px-3 text-xs font-bold text-gray-800">Anytime</button>
            <button className="px-3 text-xs font-semibold text-gray-500 flex items-center gap-2">
              Add guests
              <div className="bg-brand text-white p-1.5 rounded-full shadow-sm">
                <Search className="w-3 h-3" />
              </div>
            </button>
          </div>
        )}

        {isSearchExpanded && (
          <div className="hidden md:block w-96" /> // Placeholder spacing spacer
        )}

        {/* User Actions */}
        <div className="flex items-center gap-4">
          {user?.role === "OWNER" && (
            <Link
              href="/owner/dashboard"
              className="hidden lg:inline-block text-sm font-semibold text-gray-700 hover:bg-gray-55/10 hover:bg-gray-50 px-4 py-2.5 rounded-full transition"
            >
              Host Dashboard
            </Link>
          )}
          {user?.role === "ADMIN" && (
            <Link
              href="/admin/dashboard"
              className="hidden lg:inline-block text-sm font-semibold text-gray-700 hover:bg-gray-50 px-4 py-2.5 rounded-full transition"
            >
              Admin Panel
            </Link>
          )}

          {/* User Menu Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-3 border border-gray-200 hover:shadow-md transition p-2 rounded-full cursor-pointer bg-white"
            >
              <Menu className="w-4.5 h-4.5 text-gray-600 ml-1" />
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-gray-15"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-gray-500 text-white flex items-center justify-center font-bold text-xs">
                  {user ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2.5 w-60 bg-white rounded-xl shadow-xl border border-gray-100 py-2 text-sm text-gray-700 animate-in fade-in slide-in-from-top-2 duration-150">
                {user ? (
                  <>
                    <div className="px-4 py-2.5 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <Link
                      href="/bookings"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition"
                    >
                      <Compass className="w-4 h-4 text-gray-500" />
                      My Bookings
                    </Link>
                    {user.role === "OWNER" && (
                      <Link
                        href="/owner/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition"
                      >
                        <LayoutDashboard className="w-4 h-4 text-gray-500" />
                        Host Dashboard
                      </Link>
                    )}
                    {user.role === "ADMIN" && (
                      <Link
                        href="/admin/dashboard"
                        onClick={() => setDropdownOpen(false)}
                        className="px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition"
                      >
                        <Settings className="w-4 h-4 text-gray-500" />
                        Admin Panel
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        logout();
                        setDropdownOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition text-red-600 border-t border-gray-100 mt-1"
                    >
                      <LogOut className="w-4 h-4" />
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/auth/signin"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2.5 hover:bg-gray-50 font-semibold text-gray-900 transition"
                    >
                      Log in
                    </Link>
                    <Link
                      href="/auth/signup"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2.5 hover:bg-gray-50 text-gray-600 transition"
                    >
                      Sign up
                    </Link>
                    <hr className="my-1 border-gray-100" />
                    <Link
                      href="/auth/signup?role=OWNER"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-2.5 hover:bg-gray-50 text-gray-600 transition"
                    >
                      Become a Host
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Expanded Search Popout Overlay Panel */}
      {isSearchExpanded && (
        <>
          {/* Backdrop overlay blur background */}
          <div
            onClick={() => setIsSearchExpanded(false)}
            className="fixed inset-0 z-30 bg-black/25 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
          />

          {/* Full Popout Menu container */}
          <div className="absolute top-0 left-0 w-full bg-white z-40 shadow-xl border-b border-gray-200 pb-8 pt-4 animate-in slide-in-from-top duration-250">
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              
              {/* Header row mirroring original logo + categories */}
              <div className="flex justify-between items-center h-20 mb-6">
                <Link href="/" onClick={() => setIsSearchExpanded(false)} className="flex items-center gap-2">
                  <span className="text-2xl font-black text-brand tracking-tight flex items-center gap-1">
                    <span className="bg-brand text-white p-1.5 rounded-lg flex items-center justify-center font-serif text-lg leading-none">S</span>
                    StudySpace
                  </span>
                </Link>

                {/* Subtitle workspace categories */}
                <div className="flex items-center text-sm font-semibold text-gray-800">
                  <span className="border-b-2 border-slate-900 pb-1 cursor-pointer">Study Rooms</span>
                </div>

                {/* Placeholder to balance logo */}
                <div className="w-24" />
              </div>

              {/* 3-Column Airbnb Search Form */}
              <div className="max-w-3xl mx-auto relative">
                <form
                  onSubmit={handleOverlaySearchSubmit}
                  className="bg-gray-100 rounded-full border border-gray-200 p-2 pl-4 flex items-center shadow-lg relative"
                >
                  {/* Where */}
                  <div
                    ref={suggestRef}
                    className="flex-grow flex-1 flex flex-col items-start px-5 cursor-pointer relative"
                    onClick={() => setSuggestOpen(true)}
                  >
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-gray-800 mb-0.5">Where</label>
                    <input
                      type="text"
                      value={cityVal}
                      onChange={(e) => {
                        setCityVal(e.target.value);
                        setSuggestOpen(true);
                      }}
                      placeholder="Search destinations"
                      className="w-full text-xs text-gray-700 bg-transparent outline-none placeholder-gray-400 font-bold"
                    />

                    {/* Suggestions list popup */}
                    {suggestOpen && (
                      <div className="absolute top-14 left-0 w-80 bg-white border border-gray-200 rounded-2xl shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150 text-left">
                        <p className="text-[9px] font-black uppercase text-gray-400 tracking-wider mb-3">Suggested destinations</p>
                        <div className="space-y-1">
                          {suggestions.map((s) => (
                            <button
                              key={s.name}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCityVal(s.name);
                                setSuggestOpen(false);
                              }}
                              className="w-full text-left hover:bg-gray-50 p-2.5 rounded-xl flex items-center gap-3 transition cursor-pointer"
                            >
                              <div className="bg-slate-100 p-2 rounded-lg text-slate-500 shrink-0">
                                <MapPin className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900">{s.name}</p>
                                <p className="text-[10px] text-gray-500">{s.desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* When */}
                  <div className="flex-1 flex flex-col items-start px-6 border-l border-r border-gray-200 cursor-pointer">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-gray-800 mb-0.5">When</label>
                    <input
                      type="date"
                      value={dateVal}
                      onChange={(e) => setDateVal(e.target.value)}
                      className="w-full text-xs text-gray-700 bg-transparent outline-none cursor-pointer font-bold"
                    />
                  </div>

                  {/* Who */}
                  <div className="flex-1 flex flex-col items-start px-6">
                    <label className="text-[9px] font-extrabold uppercase tracking-wider text-gray-800 mb-0.5">Who</label>
                    <input
                      type="number"
                      min="1"
                      value={guestsVal}
                      onChange={(e) => setGuestsVal(Number(e.target.value))}
                      placeholder="Add guests"
                      className="w-full text-xs text-gray-700 bg-transparent outline-none font-bold"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="bg-brand hover:bg-brand-hover text-white px-6 py-3 rounded-full transition flex items-center gap-2 cursor-pointer shadow-md font-bold text-xs shrink-0"
                  >
                    <Search className="w-4 h-4" />
                    Search
                  </button>
                </form>
              </div>

            </div>
          </div>
        </>
      )}

    </header>
  );
}
