"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "./Navbar";
import Footer from "./Footer";

export default function NavigationWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isOwnerRoute = pathname?.startsWith("/owner");

  return (
    <>
      {!isOwnerRoute && <Navbar />}
      <main className="flex-grow">{children}</main>
      {!isOwnerRoute && <Footer />}
    </>
  );
}
