"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/AppContext";
import { useToast } from "../../../context/ToastContext";
import { Check, X, Loader2 } from "lucide-react";

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
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Create your account</h2>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3.5 rounded-lg mb-5 border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Full name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
              placeholder="Enter Name"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Email address
              </label>
              {checkingEmail && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking...
                </span>
              )}
              {!checkingEmail && emailAvailable === true && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Email available
                </span>
              )}
              {!checkingEmail && emailAvailable === false && (
                <span className="text-xs font-semibold text-red-600 flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Email already registered
                </span>
              )}
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={`w-full border rounded-lg p-3 outline-none text-gray-800 text-sm transition ${
                emailAvailable === false
                  ? "border-red-400 focus:border-red-500"
                  : emailAvailable === true
                  ? "border-emerald-400 focus:border-emerald-500"
                  : "border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand"
              }`}
              placeholder="Enter Email"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Password
              </label>
              {isPasswordValid && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Strong password
                </span>
              )}
            </div>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`w-full border rounded-lg p-3 pr-10 outline-none text-gray-800 text-sm transition ${
                  isPasswordValid
                    ? "border-emerald-400 focus:border-emerald-500"
                    : "border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand"
                }`}
                placeholder="Enter Password"
              />
              {isPasswordValid && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 pointer-events-none">
                  <Check className="w-4 h-4" />
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Phone number (optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
              placeholder="Enter Phone Number"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Account Type
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "STUDENT" | "OWNER")}
              className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm bg-white font-medium transition cursor-pointer"
            >
              <option value="STUDENT">Student</option>
              <option value="OWNER">Library Owner</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={submitting || emailAvailable === false}
            className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-3.5 rounded-lg transition disabled:opacity-50 mt-4 cursor-pointer flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {submitting ? "Creating account..." : "Sign up"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          Already have an account?{" "}
          <Link href="/auth/signin" className="text-brand hover:underline font-semibold">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-[75vh] flex items-center justify-center text-sm text-gray-500">Loading signup assets...</div>}>
      <SignupContent />
    </Suspense>
  );
}
