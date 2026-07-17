"use client";

import React, { use } from "react";
import dynamic from "next/dynamic";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../../../context/AppContext";
import { ShieldAlert, Compass } from "lucide-react";
import { useRouter } from "next/navigation";

// Dynamically import editor canvas to prevent SSR window reference failures
const FloorPlanEditor = dynamic(() => import("../../../../components/FloorPlanEditor"), {
  ssr: false,
});

export default function FloorPlanDesignerPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const libraryId = resolvedParams.id;
  const { token, user } = useAuth();
  const router = useRouter();

  // Query existing floorplan if any (skip fail so we can init fresh)
  const { data: initialPlan, isLoading } = useQuery({
    queryKey: ["floorplan-editor", libraryId],
    queryFn: async () => {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries/${libraryId}/floorplan`);
      if (res.status === 404) {
        return { canvasWidth: 800, canvasHeight: 600, objects: [] };
      }
      if (!res.ok) throw new Error("Failed to load floorplan metadata");
      return res.json();
    },
    enabled: !!libraryId && !!token,
  });

  if (!token) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <ShieldAlert className="w-12 h-12 text-slate-400 mx-auto mb-4" />
        <h3 className="text-xl font-bold mb-2">Access Restrained</h3>
        <p className="text-sm text-gray-500 mb-6">Please log in to design study space layouts.</p>
        <button
          onClick={() => router.push("/auth/signin")}
          className="bg-brand text-white font-semibold px-6 py-2.5 rounded-lg text-sm"
        >
          Sign In
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-20 text-center text-sm text-gray-500 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-brand border-t-transparent rounded-full animate-spin" />
        <span>Loading canvas assets and layout configurations...</span>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <FloorPlanEditor
        libraryId={libraryId}
        token={token}
        initialData={initialPlan}
      />
    </div>
  );
}
