"use client";

import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-sm text-gray-500">© 2026 StudySpace, Inc. All rights reserved.</p>
        <div className="flex gap-6 text-sm text-gray-500">
          <Link href="#" className="hover:underline">Privacy</Link>
          <Link href="#" className="hover:underline">Terms</Link>
          <Link href="#" className="hover:underline">Sitemap</Link>
          <Link href="#" className="hover:underline">About</Link>
        </div>
      </div>
    </footer>
  );
}
