"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../../context/AppContext";

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STUDENT" | "OWNER">("STUDENT");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Set default role if passed in query string (e.g. Become a host)
  useEffect(() => {
    const queryRole = searchParams.get("role");
    if (queryRole === "OWNER") {
      setRole("OWNER");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-gray-50">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Create your StudySpace account</h2>

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
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
              placeholder="Minimum 6 characters"
            />
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
              placeholder="9876543210"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Account Type
            </label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setRole("STUDENT")}
                className={`py-2.5 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  role === "STUDENT"
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                I am a Student
              </button>
              <button
                type="button"
                onClick={() => setRole("OWNER")}
                className={`py-2.5 rounded-lg border text-sm font-semibold transition cursor-pointer ${
                  role === "OWNER"
                    ? "border-brand bg-brand/5 text-brand"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                I am a Library Owner
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-3.5 rounded-lg transition disabled:opacity-50 mt-4 cursor-pointer"
          >
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
