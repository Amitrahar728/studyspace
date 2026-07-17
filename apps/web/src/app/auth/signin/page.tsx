"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AppContext";

export default function SigninPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to log in");
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
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-6">Welcome back to StudySpace</h2>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3.5 rounded-lg mb-5 border border-red-100 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand hover:bg-brand-hover text-white text-sm font-semibold py-3.5 rounded-lg transition disabled:opacity-50 mt-2 cursor-pointer"
          >
            {submitting ? "Signing in..." : "Log in"}
          </button>
        </form>

        <p className="text-sm text-gray-500 text-center mt-6">
          New to StudySpace?{" "}
          <Link href="/auth/signup" className="text-brand hover:underline font-semibold">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
