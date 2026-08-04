"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AppContext";
import { useToast } from "../../../context/ToastContext";
import { Loader2, User, Eye, EyeOff, ArrowRight } from "lucide-react";

import AlcoveLogo from "../../../components/AlcoveLogo";

export default function SigninPage() {
  const router = useRouter();
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiBase}/auth/signin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to log in");
      }

      login(data.accessToken, data.user);
      showToast(`Welcome back, ${data.user.name}!`, "success");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
      showToast(err.message || "Failed to log in", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#191615] flex flex-col lg:flex-row justify-between select-none overflow-hidden">
      
      {/* Left Column - Dark Slate Visual Banner */}
      <div className="w-full lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between text-white relative">
        
        {/* Top Header Statement */}
        <p className="text-xs text-gray-400 font-medium tracking-wide text-left self-start max-w-sm">
          Global study spaces made simple – online seat booking solutions for you.
        </p>

        {/* Center Headline & Seamless Graphic Illustration */}
        <div className="my-auto py-8 text-center max-w-lg mx-auto z-10">
          <h1 className="text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight mb-8">
            Let's create the future together
          </h1>

          <div className="relative mx-auto w-full max-w-md flex justify-center">
            <img
              src="https://studyspace-photos.s3.ap-south-1.amazonaws.com/useful/Login-page-image.png"
              alt="StudySpace Mobile App"
              className="w-full h-auto max-h-[380px] object-contain drop-shadow-2xl hover:scale-105 transition duration-500 rounded-2xl"
            />
          </div>
        </div>

        {/* Decorative Concentric Rings & Subtle Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] border border-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] border border-white/5 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Right Column - Clean White Box with Rounded Left Edge Separation */}
      <div className="w-full lg:w-1/2 bg-white rounded-t-[40px] lg:rounded-t-none lg:rounded-tl-[50px] lg:rounded-bl-[50px] p-8 sm:p-12 lg:p-16 flex flex-col justify-between shadow-2xl relative z-20 min-h-screen">
        
        {/* Top Right Header - Sign Up Button */}
        <div className="flex justify-end items-center">
          <Link
            href="/auth/signup"
            className="text-xs font-bold text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-full transition flex items-center gap-1.5 shadow-sm"
          >
            <User className="w-3.5 h-3.5 text-gray-500" />
            <span>Sign Up</span>
          </Link>
        </div>

        {/* Center Login Box */}
        <div className="max-w-md w-full mx-auto my-auto space-y-8 py-6">
          
          {/* Brand Header */}
          <div className="space-y-4">
            <AlcoveLogo size="lg" />
            
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Sign In
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl border border-red-100 font-semibold animate-shake">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm p-4 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400"
                placeholder="Email or Username"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm p-4 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 pr-12"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-4 text-gray-400 hover:text-gray-600 focus:outline-none transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex justify-start px-2">
              <Link href="#" className="text-xs font-semibold text-orange-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Gradient Sign-In Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-brand hover:opacity-95 text-white text-sm font-semibold py-3.5 px-6 rounded-full transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Clean Spacer Footer */}
        <div className="h-4" />
      </div>
    </div>
  );
}
