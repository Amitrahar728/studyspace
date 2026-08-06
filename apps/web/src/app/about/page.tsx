"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";

interface StoryStepItem {
  id: string;
  title: string;
  context: string;
  images: string[];
}

const STORY_STEPS: StoryStepItem[] = [
  {
    id: "step-1",
    title: "The Endless Desk Hunt",
    context:
      "Suppose you are on vacation to your hometown for upcoming semester exams. As a part of a joint family, studying at home was impossible. You want a quiet, comfortable place to focus.",
    images: [
      "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/story/backto+home.avif",
      "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/story/joint+family.avif",
    ],
  },
  {
    id: "step-2",
    title: "Searching For Libraries",
    context:
      "I started searching for libraries nearby. But finding a space with AC comfort, glare-free lighting, and confirmed desk availability took two full days of wandering.",
    images: [
      "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/story/library.jpg",
      "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/ac+comfot.avif",
    ],
  },
  {
    id: "step-3",
    title: "The Owner's Dilemma",
    context:
      "From the owner's end, library businesses require constant manual intervention to verify who is authenticated to sit and who has completed their slot booking.",
    images: [
      "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/story/owner+check.avif",
    ],
  },
  {
    id: "step-4",
    title: "Smart Digital Reservation",
    context:
      "This inspired our smart digital booking system. Users preview real-time seat floorplans, claim a desk, and get an instant digital pass for seamless entry.",
    images: [
      "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/Studying.avif",
      "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/chairs.avif",
    ],
  },
  {
    id: "step-5",
    title: "Stories Upcoming & Growing Daily",
    context:
      "Every day, more students find their quiet study desk, and more library owners streamline their operations with Alcove. Our journey grows with every story shared.",
    images: [
      "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/story/to+be+continues.avif",
    ],
  },
];

interface CarouselCard {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  imageUrl: string;
}

const CAROUSEL_CARDS: CarouselCard[] = [
  {
    id: "card-1",
    title: "AC Comfort",
    subtitle: "Climate-controlled peaceful ambiance",
    tag: "COMFORT",
    imageUrl: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/ac+comfot.avif",
  },
  {
    id: "card-2",
    title: "Ergonomic Seating",
    subtitle: "Cushioned chairs designed for 8+ hour study sessions",
    tag: "SEATING",
    imageUrl: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/chairs.avif",
  },
  {
    id: "card-3",
    title: "Focus Lights",
    subtitle: "Glare-free task lighting for readers",
    tag: "LIGHTING",
    imageUrl: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/lights.avif",
  },
  {
    id: "card-4",
    title: "Personal Lockers",
    subtitle: "Secure storage for books & tech",
    tag: "SECURITY",
    imageUrl: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/lockers.avif",
  },
  {
    id: "card-5",
    title: "Zero Distractions",
    subtitle: "Absolute quiet zone for concentration",
    tag: "SILENCE",
    imageUrl: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/silence.avif",
  },
  {
    id: "card-6",
    title: "Deep Study Flow",
    subtitle: "Purpose-built space to reach flow state",
    tag: "FOCUS",
    imageUrl: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/Studying.avif",
  },
  {
    id: "card-7",
    title: "Filtered Water",
    subtitle: "Hydration points on every floor",
    tag: "HYDRATION",
    imageUrl: "https://studyspace-photos.s3.ap-south-1.amazonaws.com/About-us-page/water.avif",
  },
];

export default function AboutPage() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [activeCardIndex, setActiveCardIndex] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  // Automatic 3D fan carousel transition (every 2.4s for smooth lively movement)
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setActiveCardIndex((prev) => (prev + 1) % CAROUSEL_CARDS.length);
    }, 2400);
    return () => clearInterval(timer);
  }, [isPaused]);

  return (
    <div className="min-h-screen bg-[#4A0A0D] text-white selection:bg-white selection:text-[#4A0A0D] select-none py-12">
      
      {/* 1. Interactive 2-Column Story Section */}
      <section className="py-12 px-6 sm:px-12 md:px-20 max-w-7xl mx-auto w-full relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 items-start">
          
          {/* Left Column: Section Title & Intro Text */}
          <div className="md:col-span-5 space-y-6 md:sticky md:top-28">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-stone-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/20 inline-flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-white" />
              THE FOUNDER&apos;S STORY
            </span>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-bold font-serif text-white tracking-tight leading-[1.08]">
              Our Journey<br />to Alcove
            </h1>

            <p className="text-stone-200 text-sm sm:text-base font-light leading-relaxed max-w-md">
              Students spend millions of hours looking for a quiet study space. Here is how we turned exam frustration into a seamless digital platform.
            </p>
          </div>

          {/* Right Column: 5 Interactive Steps List with Red Vertical Accent Line */}
          <div className="md:col-span-7 border-l-2 border-red-600/80 pl-6 sm:pl-8 space-y-6 relative">
            {STORY_STEPS.map((step, idx) => {
              const isActive = idx === activeStepIndex;
              return (
                <div
                  key={step.id}
                  onMouseEnter={() => setActiveStepIndex(idx)}
                  className="py-4 cursor-pointer group transition-all duration-300 relative"
                >
                  {/* Active Red Indicator Line */}
                  <div
                    className={`absolute -left-[33px] sm:-left-[41px] top-3 bottom-3 w-1.5 bg-red-500 rounded-full shadow-lg shadow-red-500/50 transition-all duration-500 ease-in-out ${
                      isActive ? "opacity-100 scale-y-100" : "opacity-0 scale-y-0"
                    }`}
                  />

                  {/* Step Title */}
                  <h3
                    className={`text-2xl sm:text-3xl font-bold font-serif transition-all duration-500 ${
                      isActive
                        ? "text-white font-extrabold scale-[1.01] translate-x-1"
                        : "text-stone-400 group-hover:text-stone-200 font-medium"
                    }`}
                  >
                    {step.title}
                  </h3>

                  {/* Ultra-Smooth CSS Grid Accordion Expansion */}
                  <div
                    className={`grid transition-all duration-500 ease-in-out overflow-hidden ${
                      isActive
                        ? "grid-rows-[1fr] opacity-100 mt-4"
                        : "grid-rows-[0fr] opacity-0 mt-0 pointer-events-none"
                    }`}
                  >
                    <div className="min-h-0 space-y-4 pt-1 pb-2">
                      <p className="text-xs sm:text-sm text-stone-200 font-light leading-relaxed">
                        {step.context}
                      </p>

                      {/* Small Attached Showcase Images */}
                      {step.images.length > 0 && (
                        <div className="flex items-center gap-3.5 pt-1 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                          {step.images.map((imgUrl, imgIdx) => (
                            <div
                              key={`${imgUrl}-${imgIdx}`}
                              className="h-32 sm:h-40 rounded-2xl overflow-hidden border border-white/20 shadow-xl shrink-0 bg-black/40 relative group/img transition-transform duration-500 hover:scale-105"
                            >
                              <img
                                src={imgUrl}
                                alt={`${step.title} image ${imgIdx + 1}`}
                                className="h-full w-auto object-cover transition-all duration-500"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}

            {/* "PROVIDE US YOUR STORY" Action Button */}
            <div className="pt-6 border-t border-white/10">
              <a
                href="mailto:support@alcove.com?subject=My%20Study%20Story"
                className="inline-flex items-center gap-2.5 bg-red-700 hover:bg-red-600 text-white font-extrabold text-xs uppercase tracking-wider px-6 py-3.5 rounded-xl shadow-lg transition duration-300 cursor-pointer"
              >
                <BookOpen className="w-4 h-4" />
                <span>Provide us your story</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

          </div>

        </div>
      </section>

      {/* Decorative Line Divider */}
      <div className="max-w-7xl mx-auto px-6 w-full my-8">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>

      {/* 2. "That's what we want to provide you" 3D Fan Image Showcase */}
      <section
        className="py-14 overflow-hidden relative my-6 select-none"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >

        {/* Section Header */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8 text-center space-y-2">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-stone-300 bg-white/10 px-3.5 py-1.5 rounded-full border border-white/20">
            THE ALCOVE PROMISE
          </span>
          <h2 className="text-3xl sm:text-5xl font-bold font-serif text-white pt-2">
            That&apos;s what we want to provide you
          </h2>
          <p className="text-xs sm:text-sm text-stone-200 font-light max-w-md mx-auto pt-1">
            Explore our curated amenities built for uninterrupted concentration.
          </p>
        </div>

        {/* 3D Perspective Arc / Fan Display Stage */}
        <div className="relative w-full py-8 flex flex-col items-center justify-center min-h-[420px] sm:min-h-[500px] [perspective:1200px]">
          
          <div className="flex items-center justify-center relative w-full h-[360px] sm:h-[450px] overflow-hidden [transform-style:preserve-3d]">
            {CAROUSEL_CARDS.map((card, idx) => {
              const offset = idx - activeCardIndex;
              const absOffset = Math.abs(offset);
              const isCenter = idx === activeCardIndex;

              // 3D Perspective transform calculation with increased card spacing
              let translateX = offset * 165;
              if (offset > 0) translateX += 35;
              if (offset < 0) translateX -= 35;

              const translateY = Math.pow(absOffset, 1.8) * 14;
              const translateZ = (2 - absOffset) * 45;
              const rotateY = -offset * 16;
              const rotateZ = offset * 5;
              const scale = isCenter ? 1.08 : Math.max(0.75, 0.94 - absOffset * 0.1);
              const zIndex = 50 - absOffset * 10;
              const opacity = absOffset > 2 ? 0.3 : 1 - absOffset * 0.15;

              return (
                <div
                  key={card.id}
                  onClick={() => setActiveCardIndex(idx)}
                  style={{
                    transform: `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`,
                    zIndex,
                    opacity,
                  }}
                  className={`absolute w-52 h-80 sm:w-64 sm:h-[420px] rounded-3xl overflow-hidden shadow-2xl border transition-all duration-700 ease-out cursor-pointer group shrink-0 ${
                    isCenter
                      ? "border-white ring-4 ring-white/30 shadow-2xl"
                      : "border-white/40 hover:border-white"
                  } bg-black/40`}
                >
                  {/* Clean Showcase Image */}
                  <img
                    src={card.imageUrl}
                    alt={card.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-700"
                  />

                  {/* Minimalist Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent opacity-90 group-hover:opacity-100 transition p-6 flex flex-col justify-end text-white">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#4A0A0D] bg-white/95 backdrop-blur-md px-2.5 py-0.5 rounded-full w-max mb-1.5 shadow-xs">
                      {card.tag}
                    </span>
                    <h3 className="text-base sm:text-xl font-bold font-serif text-white leading-snug">
                      {card.title}
                    </h3>
                    <p className="text-[11px] text-stone-200 font-medium leading-normal mt-0.5">
                      {card.subtitle}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Navigation Dots */}
          <div className="flex items-center gap-2 mt-6 z-30">
            {CAROUSEL_CARDS.map((card, idx) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActiveCardIndex(idx)}
                className={`transition-all duration-300 cursor-pointer ${
                  idx === activeCardIndex
                    ? "w-8 h-2 rounded-full bg-white"
                    : "w-2 h-2 rounded-full bg-white/30 hover:bg-white/60"
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </div>

      </section>

    </div>
  );
}
