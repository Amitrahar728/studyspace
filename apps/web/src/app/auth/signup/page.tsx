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

        {/* Decorative Concentric Rings & Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] h-[420px] border border-white/5 rounded-full pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[580px] border border-white/5 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Right Column - Clean White Box with Rounded Left Edge Separation */}
      <div className="w-full lg:w-1/2 bg-white rounded-t-[40px] lg:rounded-t-none lg:rounded-tl-[50px] lg:rounded-bl-[50px] p-8 sm:p-12 lg:p-16 flex flex-col justify-between shadow-2xl relative z-20 min-h-screen">
        
        {/* Top Header - Sign In Action */}
        <div className="flex justify-end items-center">
          <Link
            href="/auth/signin"
            className="text-xs font-bold text-gray-700 hover:text-gray-900 border border-gray-200 hover:border-gray-300 px-4 py-2 rounded-full transition flex items-center gap-1.5 shadow-sm"
          >
            <LogIn className="w-3.5 h-3.5 text-gray-500" />
            <span>Sign In</span>
          </Link>
        </div>

        {/* Center Signup Box */}
        <div className="max-w-md w-full mx-auto my-auto space-y-6 py-6">
          
          {/* Logo & Brand Header */}
          <div className="space-y-3">
            <AlcoveLogo size="lg" />
            
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">
              Create Account
            </h2>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-xs p-3.5 rounded-xl border border-red-100 font-semibold animate-shake">
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
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm p-3.5 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400"
                placeholder="Full Name"
              />
            </div>

            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`w-full border rounded-full text-sm p-3.5 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 ${
                  emailAvailable === false
                    ? "border-red-400 focus:border-red-500"
                    : emailAvailable === true
                    ? "border-emerald-400 focus:border-emerald-500"
                    : "border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand"
                }`}
                placeholder="Email Address"
              />
              {checkingEmail && <p className="text-[10px] text-gray-400 mt-1 px-4">Checking availability...</p>}
              {!checkingEmail && emailAvailable === true && <p className="text-[10px] text-emerald-600 font-semibold mt-1 px-4">Email available</p>}
              {!checkingEmail && emailAvailable === false && <p className="text-[10px] text-red-600 font-semibold mt-1 px-4">Email already registered</p>}
            </div>

            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full border rounded-full text-sm p-3.5 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400 ${
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
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm p-3.5 px-6 outline-none text-gray-800 transition shadow-sm placeholder:text-gray-400"
                placeholder="Phone Number (optional)"
              />
            </div>

            <div>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as "STUDENT" | "OWNER")}
                className="w-full border border-gray-200 focus:border-brand focus:ring-1 focus:ring-brand rounded-full text-sm p-3.5 px-6 outline-none text-gray-800 bg-white font-medium transition cursor-pointer shadow-sm"
              >
                <option value="STUDENT">I want to book study space (Student)</option>
                <option value="OWNER">I own a library / study space (Host)</option>
              </select>
            </div>

            {/* Gradient Sign-Up Button */}
            <button
              type="submit"
              disabled={submitting || emailAvailable === false}
              className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-brand hover:opacity-95 text-white text-sm font-semibold py-3.5 px-6 rounded-full transition shadow-md disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Create Account</span>
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

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-sm text-gray-500">Loading...</div>}>
      <SignupContent />
    </Suspense>
  );
}
