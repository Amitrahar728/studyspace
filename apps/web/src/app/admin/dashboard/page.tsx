"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../context/AppContext";
import { ShieldCheck, ShieldAlert, Award, Trash2, CheckCircle2, Lock, ArrowLeft, Clock } from "lucide-react";

interface AdminLibrary {
  id: string;
  name: string;
  address: string;
  city: string;
  isActive: boolean;
  createdAt: string;
  owner: {
    name: string;
    email: string;
  };
  photos: { url: string }[];
}

export default function AdminDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch all libraries via admin API
  const { data: libraries, isLoading, error } = useQuery<AdminLibrary[]>({
    queryKey: ["admin-libraries"],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/admin/libraries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load admin libraries list");
      return res.json();
    },
    enabled: !!token && user?.role === "ADMIN",
  });

  // Approve Listing Mutation
  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/admin/libraries/${id}/approve`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Approval transaction failed");
      return data;
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message || "Library approved successfully.");
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  // Reject / Delete Listing Mutation
  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/admin/libraries/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Rejection transaction failed");
      return data;
    },
    onSuccess: (data) => {
      setSuccessMsg(data.message || "Listing deleted/rejected.");
      queryClient.invalidateQueries({ queryKey: ["admin-libraries"] });
    },
    onError: (err: any) => {
      setErrorMsg(err.message);
    },
  });

  if (user?.role !== "ADMIN") {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <Lock className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Unauthorized Panel</h3>
        <p className="text-sm text-gray-500">Only platform administrators are authorized to access approval queues.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-5">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-8 h-8 text-brand" />
            Platform Admin moderation
          </h1>
          <p className="text-sm text-gray-500 mt-1">Approve registered self-study workspaces to set them active for search discovery.</p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-800 text-sm p-4 rounded-xl border border-emerald-200 mb-6 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl border border-red-200 mb-6 font-semibold flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-red-500" />
          {errorMsg}
        </div>
      )}

      {isLoading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white border border-gray-150 rounded-2xl h-24 w-full" />
          ))}
        </div>
      )}

      {!isLoading && !error && libraries?.length === 0 && (
        <p className="text-sm text-gray-500 italic text-center py-20 bg-gray-50 rounded-2xl">No libraries currently listed in the system.</p>
      )}

      {/* Moderation Queue List */}
      {!isLoading && !error && libraries && libraries.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-left text-sm text-gray-650">
            <thead className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4">Workspace & Location</th>
                <th className="px-6 py-4">Host Owner</th>
                <th className="px-6 py-4">Approval Status</th>
                <th className="px-6 py-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150 divide-gray-100">
              {libraries.map((lib) => (
                <tr key={lib.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4.5 flex items-center gap-4">
                    {lib.photos[0]?.url ? (
                      <img src={lib.photos[0].url} alt={lib.name} className="w-14 h-14 rounded-lg object-cover border border-gray-100 shrink-0" />
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center font-bold text-slate-400 shrink-0">SS</div>
                    )}
                    <div>
                      <p className="font-bold text-gray-900">{lib.name}</p>
                      <p className="text-xs text-gray-500">{lib.address}, {lib.city}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4.5">
                    <p className="font-semibold text-gray-800">{lib.owner.name}</p>
                    <p className="text-xs text-gray-400">{lib.owner.email}</p>
                  </td>
                  <td className="px-6 py-4.5">
                    {lib.isActive ? (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Active Discovery
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-100 animate-pulse">
                        <Clock className="w-3.5 h-3.5" />
                        Under review
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4.5 text-right space-x-2">
                    {!lib.isActive && (
                      <button
                        onClick={() => approveMutation.mutate(lib.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-4 rounded-lg transition cursor-pointer shadow-sm"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to delete/reject this library listing? This action is permanent.")) {
                          rejectMutation.mutate(lib.id);
                        }
                      }}
                      className="bg-red-50 hover:bg-red-100 text-red-650 text-red-600 font-bold text-xs py-2 px-4 rounded-lg border border-red-100 transition cursor-pointer shadow-sm"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

    </div>
  );
}
