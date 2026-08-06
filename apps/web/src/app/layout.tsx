import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "../context/AppContext";
import { ToastProvider } from "../context/ToastContext";
import NavigationWrapper from "../components/NavigationWrapper";

export const metadata: Metadata = {
  title: "Alcove | Find & Reserve Study Seats",
  description: "Alcove connects students with premium self-study reading rooms. Choose your seat map layout and reserve physical desks in real-time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex flex-col min-h-screen text-[#221C19] antialiased">
        <AppProvider>
          <ToastProvider>
            <div className="bg-[url('https://studyspace-photos.s3.ap-south-1.amazonaws.com/useful/image-removebg-preview+(2).png')] bg-cover bg-center bg-no-repeat bg-fixed min-h-screen relative flex flex-col flex-grow">
              {/* Soft subtle eggshell overlay to keep background image nicely visible while maintaining readability */}
              <div className="absolute inset-0 bg-[#F8F5EE]/50 pointer-events-none z-0" />
              
              {/* Content wrapper */}
              <div className="relative z-10 flex flex-col min-h-screen flex-grow">
                <NavigationWrapper>{children}</NavigationWrapper>
              </div>
            </div>
          </ToastProvider>
        </AppProvider>
      </body>
    </html>
  );
}
