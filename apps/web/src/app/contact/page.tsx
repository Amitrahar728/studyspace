"use client";

import React, { useState } from "react";
import { Mail, Phone } from "lucide-react";

interface ContactTopic {
  id: string;
  title: string;
  image: string;
  email: string;
  phone: string;
  description: string;
}

const CONTACT_TOPICS: ContactTopic[] = [
  {
    id: "bookings",
    title: "Bookings",
    image: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/useful/Booking+issue.avif",
    email: "amitrahar728@gmail.com",
    phone: "8708397214",
    description: "Questions regarding seat reservations, timing extensions, or booking confirmations.",
  },
  {
    id: "hosting",
    title: "Hosting",
    image: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/useful/hosting.avif",
    email: "raharamit728@gmail.com",
    phone: "9306548435",
    description: "For library owners seeking to partner with Alcove or list their space.",
  },
  {
    id: "any-other",
    title: "Any other",
    image: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/useful/any+other.avif",
    email: "Alcovequery@gmail.com",
    phone: "9483874323",
    description: "General inquiries, partnership opportunities, or feedback for the Alcove team.",
  },
];

export default function ContactPage() {
  const [activeTopicIndex, setActiveTopicIndex] = useState(0);
  const activeTopic = CONTACT_TOPICS[activeTopicIndex];

  return (
    <div className="min-h-screen bg-[#4A0A0D] text-white flex flex-col justify-between selection:bg-white selection:text-[#4A0A0D] select-none">
      
      {/* 1. Hero Poster Section */}
      <section className="py-12 sm:py-16 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto w-full relative overflow-hidden">
        
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -translate-x-1/2 w-96 h-96 bg-[#7C1216]/50 blur-3xl rounded-full pointer-events-none" />

        <div className="flex flex-col md:flex-row items-center justify-between gap-10 md:gap-16 w-full relative z-10">
          
          {/* Left Column: Vintage Phone Poster Image */}
          <div className="w-full md:w-1/2 flex items-center justify-center md:justify-start">
            <div className="relative max-w-sm sm:max-w-md md:max-w-lg transition-transform duration-700 hover:scale-[1.02]">
              <img
                src="https://studyspace-photos.s3.ap-south-1.amazonaws.com/useful/Phone+for+contact+us.png"
                alt="Alcove Contact Phone"
                className="w-full h-auto object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]"
              />
            </div>
          </div>

          {/* Right Column: Poster Headline & Introductory Text */}
          <div className="w-full md:w-1/2 text-left space-y-6 md:pl-6">
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-serif font-bold text-white tracking-wider leading-[1.05] uppercase drop-shadow-md">
              WE HEARD<br />YOU!
            </h1>

            <p className="text-stone-200 text-sm sm:text-base lg:text-lg font-light leading-relaxed max-w-lg tracking-wide">
              You just write us over mail our team is going to check it shortly and will be back to you with the best we can do or call us for any queries.
            </p>
          </div>

        </div>
      </section>

      {/* Decorative Divider */}
      <div className="max-w-7xl mx-auto px-6 w-full my-4">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* 2. Interactive "Let's Get in touch" Hover Section */}
      <section className="py-14 sm:py-20 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto w-full relative z-10">
        
        {/* Tagline Header with Multi-line Headline & Slow Animated Larger Hand Symbol */}
        <div className="flex items-end gap-6 mb-12 sm:mb-16">
          <h2 className="text-4xl sm:text-6xl md:text-7xl font-bold font-serif text-white tracking-tight leading-[1.08]">
            Let&apos;s Get<br />in touch
          </h2>
          <img
            src="https://studyspace-photos.s3.ap-south-1.amazonaws.com/useful/hand+symbol.png"
            alt="Hand Symbol"
            className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 object-contain animate-[bounce_3s_infinite] mb-2"
          />
        </div>

        {/* 2-Column Accordion Layout (Inline Contact Details Directly Under Invoked Item) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
          
          {/* Left Column: Topic List with Inline Expanding Contact Details */}
          <div className="md:col-span-6 flex flex-col justify-center space-y-0 border-l border-white/20 pl-6 relative">
            {CONTACT_TOPICS.map((topic, idx) => {
              const isActive = idx === activeTopicIndex;
              return (
                <div
                  key={topic.id}
                  onMouseEnter={() => setActiveTopicIndex(idx)}
                  className="py-5 sm:py-7 border-b border-white/10 last:border-b-0 cursor-pointer group transition-all duration-300 relative"
                >
                  {/* Left Active Line Bar */}
                  {isActive && (
                    <div className="absolute -left-[25px] top-4 bottom-4 w-1 bg-white rounded-full shadow-lg transition-all duration-300" />
                  )}

                  {/* Topic Title */}
                  <h3
                    className={`text-2xl sm:text-3xl lg:text-4xl font-bold font-sans transition-all duration-300 ${
                      isActive
                        ? "text-white font-extrabold scale-[1.01] translate-x-2"
                        : "text-stone-400 group-hover:text-stone-200 font-medium"
                    }`}
                  >
                    {topic.title}
                  </h3>

                  {/* Inline Expanding Contact Details (Directly Below Invoked Topic) */}
                  {isActive && (
                    <div className="mt-4 space-y-3.5 pl-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <p className="text-xs sm:text-sm text-stone-200 font-light leading-relaxed">
                        {topic.description}
                      </p>

                      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 pt-2">
                        
                        {/* Mail Line */}
                        <a
                          href={`mailto:${topic.email}`}
                          className="inline-flex items-center gap-2.5 text-stone-200 hover:text-white transition group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0 group-hover:bg-white group-hover:text-[#4A0A0D] transition">
                            <Mail className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-stone-300 font-bold">Mail:</span>
                            <span className="font-semibold text-white group-hover:underline underline-offset-4 decoration-white/50 truncate">
                              {topic.email}
                            </span>
                          </div>
                        </a>

                        {/* Call Line */}
                        <a
                          href={`tel:${topic.phone}`}
                          className="inline-flex items-center gap-2.5 text-stone-200 hover:text-white transition group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center text-white shrink-0 group-hover:bg-white group-hover:text-[#4A0A0D] transition">
                            <Phone className="w-4 h-4" />
                          </div>
                          <div className="flex items-center gap-1.5 text-xs sm:text-sm">
                            <span className="font-mono text-[11px] uppercase tracking-wider text-stone-300 font-bold">Call:</span>
                            <span className="font-semibold text-white group-hover:underline underline-offset-4 decoration-white/50">
                              +91 {topic.phone}
                            </span>
                          </div>
                        </a>

                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Right Column: Clean Showcase Image Display */}
          <div className="md:col-span-6 sticky top-24">
            <div className="w-full h-72 sm:h-96 lg:h-[440px] rounded-3xl overflow-hidden border border-white/20 shadow-2xl relative bg-black/40">
              <img
                key={activeTopic.id}
                src={activeTopic.image}
                alt={activeTopic.title}
                className="w-full h-full object-cover transition-all duration-700 animate-in fade-in zoom-in-95"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent p-6 flex items-end">
                <span className="text-xs font-mono font-bold text-white uppercase tracking-widest bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/30">
                  {activeTopic.title}
                </span>
              </div>
            </div>
          </div>

        </div>

      </section>

    </div>
  );
}
