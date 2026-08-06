"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import AlcoveLogo from "./AlcoveLogo";
import { ArrowUp, Mail, Instagram, Linkedin, Youtube, Twitter } from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  if (pathname?.startsWith("/auth") || pathname?.startsWith("/owner")) {
    return null;
  }

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="bg-[#1C1715] text-[#E8E2D5] border-t border-[#332A26] select-none">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Top Header & Tagline Row */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-[#332A26]">
          <div className="space-y-1 max-w-md">
            <Link href="/" className="inline-block">
              <AlcoveLogo variant="light" size="md" />
            </Link>
            <p className="text-xs text-[#A0938A]">
              Global study spaces made simple — online seat booking solutions for quiet, focused learning.
            </p>
          </div>

          {/* Top Clickable Action */}
          <Link
            href="#contact"
            className="inline-flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white font-bold text-xs px-4 py-2 rounded-full transition shadow-md shadow-brand/20 cursor-pointer shrink-0"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Contact Us</span>
          </Link>
        </div>

        {/* Navigation Links Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          
          {/* 1. About Us Column */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white tracking-wider uppercase">About Us</h4>
            <ul className="space-y-1.5 text-xs text-[#A0938A]">
              <li>
                <Link href="/about" className="hover:text-brand transition">Our Mission</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-brand transition">Study Spaces</Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-brand transition">Interactive Seat Booking</Link>
              </li>
            </ul>
          </div>

          {/* 2. Support Column */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white tracking-wider uppercase">Support</h4>
            <ul className="space-y-1.5 text-xs text-[#A0938A]">
              <li>
                <Link href="#contact" className="hover:text-brand transition">Contact Customer Support</Link>
              </li>
              <li>
                <Link href="#contact" className="hover:text-brand transition">Host & Partner Onboarding</Link>
              </li>
              <li>
                <a href="mailto:support@alcove.com" className="hover:text-brand transition">support@alcove.com</a>
              </li>
            </ul>
          </div>

          {/* 3. Social Handles Column */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-white tracking-wider uppercase">Social</h4>
            <ul className="space-y-1.5 text-xs text-[#A0938A]">
              <li>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-brand transition flex items-center gap-1.5">
                  <Instagram className="w-3.5 h-3.5 text-brand" />
                  <span>Instagram</span>
                </a>
              </li>
              <li>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-brand transition flex items-center gap-1.5">
                  <Linkedin className="w-3.5 h-3.5 text-brand" />
                  <span>LinkedIn</span>
                </a>
              </li>
              <li>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" className="hover:text-brand transition flex items-center gap-1.5">
                  <Youtube className="w-3.5 h-3.5 text-brand" />
                  <span>YouTube</span>
                </a>
              </li>
              <li>
                <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-brand transition flex items-center gap-1.5">
                  <Twitter className="w-3.5 h-3.5 text-brand" />
                  <span>X / Twitter</span>
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-5 border-t border-[#332A26] flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#A0938A]">
          <div className="flex gap-4">
            <Link href="#" className="hover:text-brand transition">Terms of Service</Link>
            <Link href="#" className="hover:text-brand transition">Privacy Policy</Link>
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1.5 bg-[#2B2320] hover:bg-[#382E2A] text-white font-semibold px-3 py-1.5 rounded-md border border-[#332A26] transition cursor-pointer text-xs"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3 h-3 text-brand" />
          </button>
        </div>

      </div>
    </footer>
  );
}
