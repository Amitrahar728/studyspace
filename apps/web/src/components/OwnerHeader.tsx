"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../context/AppContext";
import AlcoveLogo from "./AlcoveLogo";
import {
  Menu,
  User,
  Home,
  Key,
  MessageSquare,
  LogOut,
  HelpCircle,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  CheckCircle,
  Clock,
  Sparkles,
  Image,
  MapPin,
} from "lucide-react";

interface FaqItem {
  id: string;
  category: "General" | "Pricing" | "Photos";
  question: string;
  answer: string;
  icon: React.ReactNode;
}

const faqData: FaqItem[] = [
  // General Tab
  {
    id: "g1",
    category: "General",
    question: "How do I list my study space?",
    answer: "Fill in your address details, drop the coordinate pin, select amenities, specify inventory counts, upload exactly 5 photos, and set your pricing rates. We'll verify it within 24 hours.",
    icon: <HelpCircle className="w-4 h-4 text-stone-700" />,
  },
  {
    id: "g2",
    category: "General",
    question: "Are there listing fees?",
    answer: "Creating a listing is completely free. We only charge a small platform convenience fee of 5% on successful bookings.",
    icon: <Tag className="w-4 h-4 text-stone-700" />,
  },
  {
    id: "g3",
    category: "General",
    question: "What criteria must my space meet?",
    answer: "Spaces must offer a quiet, study-focused environment, comfortable seating, proper lighting, and reliable cooling (fans or AC).",
    icon: <CheckCircle className="w-4 h-4 text-stone-700" />,
  },

  // Pricing Tab
  {
    id: "p1",
    category: "Pricing",
    question: "How does shift slot pricing work?",
    answer: "Students can book morning, afternoon, evening, or full-day shifts. You can set custom rates for each shift to optimize off-peak capacity.",
    icon: <Clock className="w-4 h-4 text-stone-700" />,
  },
  {
    id: "p2",
    category: "Pricing",
    question: "Can I offer discounts for long-term stays?",
    answer: "Yes, our system automatically applies discounts (10% off weekly, 20% off monthly, 25% off quarterly stays).",
    icon: <Sparkles className="w-4 h-4 text-stone-700" />,
  },

  // Photos Tab
  {
    id: "ph1",
    category: "Photos",
    question: "Why do I need exactly 5 photos?",
    answer: "We display a standardized 5-photo grid layout on student search pages to give them a trusted, comprehensive view before booking.",
    icon: <Image className="w-4 h-4 text-stone-700" />,
  },
  {
    id: "ph2",
    category: "Photos",
    question: "How does the map coordinator work?",
    answer: "Click on the map block in Step 1 to drop the location pin. This pin is used by student navigation and geolocation filters.",
    icon: <MapPin className="w-4 h-4 text-stone-700" />,
  },
];

export default function OwnerHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // FAQ Modal Drawer state
  const [faqModalOpen, setFaqModalOpen] = useState(false);
  const [faqCategory, setFaqCategory] = useState<"General" | "Pricing" | "Photos">("General");
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>("g1");

  // Avatar load error fallback
  const [avatarError, setAvatarError] = useState(false);

  const getAvatarSrc = (url: string) => {
    if (url.startsWith("http")) return url;
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
    return `${apiBase}/auth/avatar/${url}`;
  };

  return (
    <>
      <header className="w-full px-6 py-5 flex items-center justify-between border-b border-stone-200/60 bg-white sticky top-0 z-40 select-none">
        {/* Brand Logo */}
        <Link href="/owner/libraries/create" className="flex items-center gap-2 cursor-pointer">
          <AlcoveLogo size="md" />
        </Link>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFaqModalOpen(!faqModalOpen)}
            className={`text-xs font-semibold px-4 py-2 rounded-full border transition cursor-pointer flex items-center gap-1.5 ${faqModalOpen
                ? "bg-black text-white border-black"
                : "text-stone-700 hover:text-black bg-stone-100/80 hover:bg-stone-200/60 border-stone-200"
              }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Questions?
          </button>

          {/* Menu Dropdown Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 bg-white hover:bg-stone-50 border border-stone-300 rounded-full px-3.5 py-1.5 transition cursor-pointer shadow-xs"
            >
              <Menu className="w-4 h-4 text-stone-700" />
              {user?.avatarUrl && !avatarError ? (
                <img
                  src={getAvatarSrc(user.avatarUrl)}
                  alt={user.name || "User"}
                  onError={() => setAvatarError(true)}
                  className="w-7 h-7 rounded-full object-cover border border-stone-200 shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-[#222222] text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.name ? user.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                </div>
              )}
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-200 py-2 text-xs text-[#222222] z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-stone-100 font-bold">
                  <p className="truncate text-sm">{user?.name || "Host"}</p>
                  <p className="text-[11px] font-normal text-stone-500 truncate">{user?.email}</p>
                </div>

                <Link
                  href="/owner/libraries/create"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 font-semibold text-stone-700 hover:text-black transition cursor-pointer"
                >
                  <Home className="w-4 h-4 text-stone-500" />
                  Host Home
                </Link>

                <Link
                  href="/owner/bookings"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 font-semibold text-stone-700 hover:text-black transition cursor-pointer"
                >
                  <Key className="w-4 h-4 text-stone-500" />
                  Reservations
                </Link>

                <Link
                  href="/owner/profile"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 font-semibold text-stone-700 hover:text-black transition cursor-pointer"
                >
                  <User className="w-4 h-4 text-stone-500" />
                  Profile
                </Link>

                <Link
                  href="/owner/messages"
                  onClick={() => setDropdownOpen(false)}
                  className="w-full text-left px-4 py-2.5 hover:bg-stone-50 flex items-center gap-2.5 font-semibold text-stone-700 hover:text-black transition cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-stone-500" />
                  Messages
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    logout();
                    setDropdownOpen(false);
                    router.push("/auth/signup");
                  }}
                  className="w-full text-left px-4 py-2.5 hover:bg-red-50 flex items-center gap-2.5 font-bold text-red-600 border-t border-stone-100 mt-1 transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-500" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Slide-out FAQ Drawer Modal (Matching Image UI: Solid black pill for active category, square left icons) */}
      {faqModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white h-full p-6 flex flex-col space-y-6 shadow-2xl animate-in slide-in-from-right duration-200 overflow-y-auto">

            {/* Header */}
            <div className="flex items-start justify-between border-b border-stone-100 pb-4">
              <div className="space-y-1 pr-2">
                <h3 className="font-extrabold text-[#222222] text-xl tracking-tight">
                  Frequently asked questions
                </h3>
                <p className="text-xs text-stone-500 font-medium leading-relaxed">
                  These are the most commonly asked questions about StudySpace. Can&apos;t find what you&apos;re looking for?{" "}
                  <span className="underline font-bold text-stone-800 cursor-pointer">Chat to our friendly team!</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFaqModalOpen(false)}
                className="p-1 text-stone-400 hover:text-black rounded-full transition cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Category Pills (Matching Image UI: Solid black pill for active category) */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {(["General", "Pricing", "Photos"] as const).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setFaqCategory(cat);
                    const firstMatch = faqData.find((f) => f.category === cat);
                    if (firstMatch) setExpandedFaqId(firstMatch.id);
                  }}
                  className={`px-4 py-1.5 rounded-full text-xs font-extrabold transition cursor-pointer shrink-0 ${faqCategory === cat
                      ? "bg-[#222222] text-white shadow-xs"
                      : "bg-white text-stone-700 border border-stone-300 hover:border-black"
                    }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Accordion Questions List */}
            <div className="space-y-3.5 flex-grow pt-1">
              {faqData
                .filter((f) => f.category === faqCategory)
                .map((item) => {
                  const isExpanded = expandedFaqId === item.id;
                  return (
                    <div
                      key={item.id}
                      className="border-b border-stone-100 pb-3.5 transition"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : item.id)}
                        className="w-full flex items-start justify-between text-left gap-3 py-1 cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-1">
                          <div className="w-8 h-8 rounded-xl border border-stone-200 bg-stone-50 flex items-center justify-center shrink-0">
                            {item.icon}
                          </div>
                          <span className="text-xs sm:text-sm font-bold text-[#222222] group-hover:text-black leading-snug">
                            {item.question}
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-stone-600 shrink-0 mt-2" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-stone-400 shrink-0 mt-2 group-hover:text-black transition" />
                        )}
                      </button>

                      {isExpanded && (
                        <p className="text-xs text-stone-500 font-medium leading-relaxed mt-2.5 pl-11 animate-in fade-in duration-150">
                          {item.answer}
                        </p>
                      )}
                    </div>
                  );
                })}
            </div>

            {/* Footer Support Info */}
            <div className="pt-4 border-t border-stone-100 text-[11px] text-stone-400 font-medium text-center">
              Still have questions? <span className="underline font-bold text-stone-700 cursor-pointer">Contact Partner Support</span>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
