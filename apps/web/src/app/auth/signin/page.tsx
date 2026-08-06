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
    <div className="min-h-screen w-full relative select-none overflow-hidden bg-[#191615]">
      
      {/* 3D Background Model */}
      <div className="fixed inset-0 w-full h-full z-0 overflow-hidden">
        <iframe
          title="3D_ Library_01"
          className="w-full h-full border-0"
          allow="autoplay; fullscreen; xr-spatial-tracking"
          src="https://sketchfab.com/models/2ad7f048f73c48fba9624bf62fb2d3bd/embed?autostart=1&ui_controls=1&ui_infos=0&ui_inspector=0&ui_stop=0&ui_watermark=0&ui_watermark_link=0"
        />
      </div>

      {/* Floating Centered Glassmorphic Sign In Card */}
      <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 pointer-events-none">
        
        <div className="max-w-xl sm:max-w-[540px] w-full bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-7 pointer-events-auto my-auto">
          
          {/* Header Row - Logo & Sign Up Button */}
          <div className="flex items-center justify-between">
            <AlcoveLogo size="lg" />

            <Link
              href="/auth/signup"
              className="text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white/80 px-5 py-2.5 rounded-full transition flex items-center gap-1.5 shadow-sm"
            >
              <User className="w-4 h-4 text-gray-500" />
              <span>Sign Up</span>
            </Link>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Welcome back to your study space
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs sm:text-sm p-4 rounded-xl border border-red-100 font-semibold animate-shake">
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
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm sm:text-base p-4 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 bg-white"
                placeholder="Email or Username"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm sm:text-base p-4 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 pr-14 bg-white"
                placeholder="Password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-6 top-4 text-gray-400 hover:text-gray-600 focus:outline-none transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            <div className="flex justify-start px-2">
              <Link href="#" className="text-xs sm:text-sm font-semibold text-orange-600 hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Gradient Sign-In Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-brand hover:opacity-95 text-white text-base font-bold py-4 px-8 rounded-full transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
