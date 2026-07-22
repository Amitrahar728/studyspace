"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LayoutDashboard, LogOut, User, Menu, X, Compass, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AppContext";

export default function OwnerNavbar() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-150 border-gray-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand Logo */}
          <div className="flex items-center gap-6">
            <Link href="/owner/dashboard" className="flex items-center gap-2">
              <span className="text-xl font-black text-brand tracking-tight flex items-center gap-1.5">
                <span className="bg-brand text-white p-1 rounded flex items-center justify-center font-serif text-sm leading-none">H</span>
                StudySpace <span className="text-xs font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-full uppercase tracking-wider ml-1">Host</span>
              </span>
            </Link>
          </div>

          {/* Desktop Right items */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/owner/dashboard"
              className="text-sm font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-2"
            >
              <LayoutDashboard className="w-4 h-4 text-brand" />
              Manage Listings
            </Link>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 border border-gray-200 rounded-full p-2 pl-3 hover:shadow-md transition bg-white cursor-pointer"
              >
                <span className="text-xs font-bold text-gray-700 max-w-24 truncate">{user?.name}</span>
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-7 h-7 rounded-full object-cover border border-gray-100"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    {user ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                  </div>
                )}
                <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 text-sm text-gray-700 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="font-semibold text-gray-950 truncate">{user?.name}</p>
                    <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                  </div>
                  <Link
                    href="/owner/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 transition"
                  >
                    <LayoutDashboard className="w-4 h-4 text-gray-400" />
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                      router.push("/");
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-2.5 transition text-red-600 border-t border-gray-100 mt-1 font-semibold"
                  >
                    <LogOut className="w-4 h-4" />
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden items-center gap-4">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-700"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3 animate-in fade-in duration-150">
          <Link
            href="/owner/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-semibold text-gray-700"
          >
            <LayoutDashboard className="w-4 h-4 text-brand" />
            Manage Listings
          </Link>
          <hr className="border-gray-100" />
          <button
            onClick={() => {
              logout();
              setMobileMenuOpen(false);
              router.push("/");
            }}
            className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-bold text-red-600"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      )}
    </header>
  );
}
