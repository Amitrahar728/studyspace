"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/AppContext";
import { useToast } from "../../../context/ToastContext";
import { Check, X, Loader2, LogIn, ArrowRight } from "lucide-react";
import AlcoveLogo from "../../../components/AlcoveLogo";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const { showToast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "OWNER">("STUDENT");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Email availability check states
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // Set default role if passed in query string (e.g. Become a host)
  useEffect(() => {
    const queryRole = searchParams.get("role");
    if (queryRole === "OWNER") {
      setRole("OWNER");
    }
  }, [searchParams]);

  // Debounced email availability checking
  useEffect(() => {
    if (!email || !email.includes("@")) {
      setEmailAvailable(null);
      setCheckingEmail(false);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingEmail(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
        const res = await fetch(`${apiBase}/auth/check-email?email=${encodeURIComponent(email.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setEmailAvailable(data.available);
        } else {
          setEmailAvailable(null);
        }
      } catch (err) {
        setEmailAvailable(null);
      } finally {
        setCheckingEmail(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [email]);

  // Password rules evaluation
  const passMinLength = password.length >= 8;
  const passUppercase = /[A-Z]/.test(password);
  const passLowercase = /[a-z]/.test(password);
  const passNumber = /[0-9]/.test(password);
  const passSpecial = /[^A-Za-z0-9]/.test(password);

  const isPasswordValid = passMinLength && passUppercase && passLowercase && passNumber && passSpecial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (emailAvailable === false) {
      setError("Email already registered. Please sign in or use another email.");
      return;
    }

    if (!isPasswordValid) {
      setError("Password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 number & 1 special character.");
      return;
    }

    setSubmitting(true);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${apiBase}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          phone: phone || null,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create account");
      }

      login(data.accessToken, data.user);
      showToast("Account created successfully!", "success");
      router.push("/");
    } catch (err: any) {
      setError(err.message);
      showToast(err.message || "Failed to create account", "error");
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

      {/* Floating Centered Glassmorphic Create Account Card */}
      <div className="relative z-10 min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 pointer-events-none">
        
        <div className="max-w-xl sm:max-w-[540px] w-full bg-white/95 backdrop-blur-xl border border-white/40 rounded-3xl p-8 sm:p-12 shadow-2xl space-y-6 pointer-events-auto my-auto">
          
          {/* Header Row - Logo & Sign In Button */}
          <div className="flex items-center justify-between">
            <AlcoveLogo size="lg" />

            <Link
              href="/auth/signin"
              className="text-xs sm:text-sm font-bold text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 bg-white/80 px-5 py-2.5 rounded-full transition flex items-center gap-1.5 shadow-sm"
            >
              <LogIn className="w-4 h-4 text-gray-500" />
              <span>Sign In</span>
            </Link>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              Create Account
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Join StudySpace to find your quiet study spot
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs sm:text-sm p-4 rounded-xl border border-red-100 font-semibold animate-shake">
              {error}
            </div>
          )}

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm sm:text-base p-4 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 bg-white"
                placeholder="Full Name"
              />
            </div>

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full border rounded-full text-sm sm:text-base p-4 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 bg-white ${
                  emailAvailable === false
                    ? "border-red-400 focus:border-red-500"
                    : emailAvailable === true
                    ? "border-emerald-400 focus:border-emerald-500"
                    : "border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand"
                }`}
                placeholder="Email Address"
              />
              {checkingEmail && <p className="text-xs text-gray-400 mt-1 px-4">Checking availability...</p>}
              {!checkingEmail && emailAvailable === true && <p className="text-xs text-emerald-600 font-semibold mt-1 px-4">Email available</p>}
              {!checkingEmail && emailAvailable === false && <p className="text-xs text-red-600 font-semibold mt-1 px-4">Email already registered</p>}
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full border rounded-full text-sm sm:text-base p-4 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 bg-white ${
                  isPasswordValid
                    ? "border-emerald-400 focus:border-emerald-500"
                    : "border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand"
                }`}
                placeholder="Password (min 8 chars, A-Z, a-z, 0-9, symbol)"
              />
            </div>

            <div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm sm:text-base p-4 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 bg-white"
                placeholder="Phone Number (optional)"
              />
            </div>

            <div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "STUDENT" | "OWNER")}
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm sm:text-base p-4 px-6 outline-none text-gray-800 bg-white font-medium transition cursor-pointer shadow-sm"
              >
                <option value="STUDENT">I want to book study space (Student)</option>
                <option value="OWNER">I own a library / study space (Host)</option>
              </select>
            </div>

            {/* Gradient Sign-Up Button */}
            <button
              type="submit"
              disabled={submitting || emailAvailable === false}
              className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-brand hover:opacity-95 text-white text-base font-bold py-4 px-8 rounded-full transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
