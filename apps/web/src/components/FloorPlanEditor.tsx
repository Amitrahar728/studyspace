"use client";

import React, { useState, useEffect } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";
import { Plus, Trash2, ArrowLeft, RotateCw, Save, Trash, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SeatDetails {
  seatCode: string;
  seatType: string;
  isActive: boolean;
}

interface LayoutObject {
  id: string;
  type: "SEAT" | "TABLE" | "AC" | "FAN" | "BOOKSHELF" | "WATER" | "CUSTOM" | "WALL" | "LINE";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  label: string | null;
  seat?: SeatDetails | null;
}

interface FloorPlanEditorProps {
  libraryId: string;
  token: string;
  initialData?: {
    canvasWidth: number;
    canvasHeight: number;
    objects: LayoutObject[];
  };
}

export default function FloorPlanEditor({ libraryId, token, initialData }: FloorPlanEditorProps) {
  const router = useRouter();

  const [canvasWidth] = useState(800);
  const [canvasHeight] = useState(600);
  const [objects, setObjects] = useState<LayoutObject[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load initial floor plan if it exists
  useEffect(() => {
    if (initialData?.objects) {
      setObjects(initialData.objects);
    }
  }, [initialData]);

  const selectedObject = objects.find((o) => o.id === selectedId);

  // Add layout object
  const addObject = (type: LayoutObject["type"]) => {
    const id = `obj_${Date.now()}`;

    let width = 40;
    let height = 40;
    if (type === "TABLE") {
      width = 200;
      height = 40;
    } else if (type === "AC") {
      width = 80;
      height = 20;
    } else if (type === "WALL") {
      width = 120;
      height = 16;
    } else if (type === "LINE") {
      width = 100;
      height = 4;
    }

    const newObj: LayoutObject = {
      id,
      type,
      x: 150,
      y: 150,
      width,
      height,
      rotation: 0,
      zIndex: 0,
      label: type === "SEAT" ? `S-${objects.filter((o) => o.type === "SEAT").length + 1}` : (type === "WALL" || type === "LINE") ? "" : type,
      ...(type === "SEAT" && {
        seat: {
          seatCode: `S-${objects.filter((o) => o.type === "SEAT").length + 1}`,
          seatType: "General",
          isActive: true,
        },
      }),
    };

    setObjects((prev) => [...prev, newObj]);
    setSelectedId(id);
  };

  // Update object property
  const updateObject = (id: string, updates: Partial<LayoutObject>) => {
    setObjects((prev) =>
      prev.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  // Update seat properties inside object
  const updateSeat = (id: string, seatUpdates: Partial<SeatDetails>) => {
    setObjects((prev) =>
      prev.map((o) => {
        if (o.id === id && o.seat) {
          return {
            ...o,
            seat: { ...o.seat, ...seatUpdates },
          };
        }
        return o;
      })
    );
  };

  // Delete object
  const deleteObject = (id: string) => {
    setObjects((prev) => prev.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  // Save to DB
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveLayout = async () => {
    setSaving(true);
    setSaveError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/libraries/${libraryId}/floorplan`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          canvasWidth,
          canvasHeight,
          objects,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save floor plan");

      router.push("/owner/libraries/create");
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-[85vh] border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-sm">

      {/* Editor toolbar header */}
      <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shrink-0 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/owner/libraries/create")}
            className="p-2 hover:bg-slate-800 rounded-full transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="font-bold text-base leading-tight">Floor Plan Designer</h1>
            <p className="text-[10px] text-slate-400">Drag objects, click to select, configure dimensions and labels.</p>
          </div>
        </div>

        <button
          onClick={handleSaveLayout}
          disabled={saving}
          className="bg-brand hover:bg-brand-hover text-white text-xs font-bold px-5 py-2.5 rounded-lg flex items-center gap-2 transition cursor-pointer disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving design..." : "Save Layout"}
        </button>
      </div>

      {saveError && (
        <div className="bg-red-50 text-red-700 text-xs p-3 font-semibold border-b border-red-100">
          ⚠️ Save error: {saveError}
        </div>
      )}

      {/* Main editor grid */}
      <div className="flex-grow flex items-stretch overflow-hidden">

        {/* Left Elements Tool palette */}
        <aside className="w-56 shrink-0 border-r border-gray-250 border-gray-200 bg-slate-50 p-4 space-y-4 flex flex-col justify-between overflow-y-auto">
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
              Add Layout Objects
            </h3>

            <div className="space-y-2">
              <button
                onClick={() => addObject("SEAT")}
                className="w-full bg-white border border-gray-200 hover:border-brand hover:bg-brand/5 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span className="w-3.5 h-3.5 bg-emerald-500 rounded-md shrink-0" />
                Bookable Seat
              </button>
              <button
                onClick={() => addObject("TABLE")}
                className="w-full bg-white border border-gray-200 hover:border-slate-800 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span className="w-3.5 h-3.5 bg-slate-400 rounded-md shrink-0" />
                Study Table
              </button>
              <button
                onClick={() => addObject("AC")}
                className="w-full bg-white border border-gray-200 hover:border-slate-800 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span className="w-3.5 h-3.5 bg-blue-400 rounded-md shrink-0" />
                Air Conditioner
              </button>
              <button
                onClick={() => addObject("FAN")}
                className="w-full bg-white border border-gray-200 hover:border-slate-800 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span className="w-3.5 h-3.5 bg-green-400 rounded-md shrink-0" />
                Ceiling Fan
              </button>
              <button
                onClick={() => addObject("BOOKSHELF")}
                className="w-full bg-white border border-gray-200 hover:border-slate-800 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span className="w-3.5 h-3.5 bg-amber-600 rounded-md shrink-0" />
                Bookshelf library
              </button>
              <button
                onClick={() => addObject("WATER")}
                className="w-full bg-white border border-gray-200 hover:border-slate-800 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span className="w-3.5 h-3.5 bg-teal-400 rounded-md shrink-0" />
                Water Dispenser
              </button>
              <button
                onClick={() => addObject("WALL")}
                className="w-full bg-white border border-gray-200 hover:border-slate-800 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span className="w-3.5 h-3.5 bg-slate-700 rounded-md shrink-0" />
                Structural Wall
              </button>
              <button
                onClick={() => addObject("LINE")}
                className="w-full bg-white border border-gray-200 hover:border-slate-800 hover:bg-gray-50 text-gray-700 font-semibold py-2.5 px-3 rounded-lg text-xs text-left flex items-center gap-2 transition shadow-sm cursor-pointer"
              >
                <span className="w-3.5 h-3.5 bg-slate-400 rounded-md shrink-0" />
                Layout Divider Line
              </button>
            </div>
          </div>

          {/* Help box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-755 text-blue-800 flex gap-2">
            <HelpCircle className="w-4 h-4 text-blue-550 shrink-0 mt-0.5" />
            <p>Drag elements on canvas. Click an element to configure labels, rotation, seat codes, or delete.</p>
          </div>
        </aside>

        {/* Center Canvas Stage */}
        <main className="flex-grow bg-slate-100 p-6 flex items-center justify-center overflow-auto">
          <Stage
            width={canvasWidth}
            height={canvasHeight}
            className="bg-white border border-gray-250 shadow-inner rounded-xl"
            onClick={(e) => {
              // deselect when clicking canvas background
              if (e.target === e.target.getStage()) {
                setSelectedId(null);
              }
            }}
          >
            <Layer>
              {objects.map((obj) => {
                const isSelected = selectedId === obj.id;

                // Color formatting
                let fillColor = "#E2E8F0";
                let strokeColor = isSelected ? "#FF385C" : "#94A3B8";
                let textColor = "#475569";
                let strokeWidth = isSelected ? 2.5 : 1.5;

                if (obj.type === "SEAT") {
                  fillColor = isSelected ? "#FF385C" : "#FFFFFF";
                  strokeColor = isSelected ? "#FF385C" : "#10B981";
                  textColor = isSelected ? "#FFFFFF" : "#065F46";
                  strokeWidth = isSelected ? 2.5 : 2;
                } else if (obj.type === "AC") {
                  fillColor = "#EFF6FF";
                  strokeColor = isSelected ? "#FF385C" : "#3B82F6";
                  textColor = "#1D4ED8";
                } else if (obj.type === "FAN") {
                  fillColor = "#F0FDF4";
                  strokeColor = isSelected ? "#FF385C" : "#22C55E";
                  textColor = "#15803D";
                } else if (obj.type === "BOOKSHELF") {
                  fillColor = "#FEF3C7";
                  strokeColor = isSelected ? "#FF385C" : "#D97706";
                  textColor = "#78350F";
                } else if (obj.type === "WATER") {
                  fillColor = "#ECFDF5";
                  strokeColor = isSelected ? "#FF385C" : "#059669";
                  textColor = "#047857";
                } else if (obj.type === "WALL") {
                  fillColor = "#475569";
                  strokeColor = isSelected ? "#FF385C" : "#334155";
                  textColor = "#475569";
                } else if (obj.type === "LINE") {
                  fillColor = "#94A3B8";
                  strokeColor = isSelected ? "#FF385C" : "#64748B";
                  textColor = "#94A3B8";
                }

                return (
                  <Group
                    key={obj.id}
                    x={obj.x}
                    y={obj.y}
                    rotation={obj.rotation}
                    draggable
                    onDragEnd={(e) => {
                      updateObject(obj.id, {
                        x: Math.round(e.target.x()),
                        y: Math.round(e.target.y()),
                      });
                    }}
                    onClick={(e) => {
                      e.cancelBubble = true; // prevent parent canvas click deselect
                      setSelectedId(obj.id);
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      setSelectedId(obj.id);
                    }}
                  >
                    <Rect
                      width={obj.width}
                      height={obj.height}
                      fill={fillColor}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      cornerRadius={obj.type === "SEAT" ? 8 : 4}
                    />
                    <Text
                      text={obj.label || obj.type}
                      width={obj.width}
                      height={obj.height}
                      align="center"
                      verticalAlign="middle"
                      fontSize={11}
                      fontStyle="bold"
                      fill={textColor}
                    />
                  </Group>
                );
              })}
            </Layer>
          </Stage>
        </main>

        {/* Right Configuration Inspector Panel */}
        <aside className="w-64 shrink-0 border-l border-gray-250 border-gray-200 bg-slate-50 p-5 space-y-5 overflow-y-auto">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Properties Inspector
          </h3>

          {selectedObject ? (
            <div className="space-y-4">
              <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-1">
                <span className="text-[10px] font-black text-gray-400 uppercase">Object Type</span>
                <p className="text-xs font-bold text-slate-800">{selectedObject.type}</p>
              </div>

              {/* Label configuration */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Display Label
                </label>
                <input
                  type="text"
                  value={selectedObject.label || ""}
                  onChange={(e) => updateObject(selectedObject.id, { label: e.target.value })}
                  className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-2.5 outline-none bg-white text-gray-800 text-xs"
                />
              </div>

              {/* Seat Details if SEAT */}
              {selectedObject.type === "SEAT" && selectedObject.seat && (
                <div className="space-y-3.5 border-t border-gray-200 pt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Seat Code ID
                    </label>
                    <input
                      type="text"
                      value={selectedObject.seat.seatCode}
                      onChange={(e) => {
                        updateSeat(selectedObject.id, { seatCode: e.target.value });
                        updateObject(selectedObject.id, { label: e.target.value });
                      }}
                      className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-2.5 outline-none bg-white text-gray-800 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Seat Category
                    </label>
                    <select
                      value={selectedObject.seat.seatType}
                      onChange={(e) => updateSeat(selectedObject.id, { seatType: e.target.value })}
                      className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-2.5 outline-none bg-white text-gray-800 text-xs"
                    >
                      <option value="General">General</option>
                      <option value="Premium">Premium</option>
                      <option value="Quiet Zone">Quiet Zone</option>
                      <option value="Premium Quiet">Premium Quiet</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Dimensions: Width / Height */}
              <div className="grid grid-cols-2 gap-2.5 border-t border-gray-200 pt-3">
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={selectedObject.width}
                    onChange={(e) => updateObject(selectedObject.id, { width: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-800 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={selectedObject.height}
                    onChange={(e) => updateObject(selectedObject.id, { height: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-800 text-xs outline-none"
                  />
                </div>
              </div>

              {/* Rotation Slider */}
              <div className="border-t border-gray-200 pt-3">
                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider flex justify-between items-center mb-1">
                  <span>Rotation (deg)</span>
                  <span className="font-mono text-brand">{selectedObject.rotation}°</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="360"
                    step="15"
                    value={selectedObject.rotation}
                    onChange={(e) => updateObject(selectedObject.id, { rotation: Number(e.target.value) })}
                    className="w-full accent-brand h-1 cursor-pointer bg-gray-200 rounded-lg"
                  />
                  <button
                    onClick={() => updateObject(selectedObject.id, { rotation: (selectedObject.rotation + 90) % 360 })}
                    className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Action delete */}
              <div className="border-t border-gray-200 pt-4">
                <button
                  type="button"
                  onClick={() => deleteObject(selectedObject.id)}
                  className="w-full bg-red-50 hover:bg-red-150 hover:bg-red-100 text-red-650 text-red-600 text-xs font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 border border-red-100 transition cursor-pointer shadow-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Element
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic">Select an object on the canvas to inspect and configure properties.</p>
          )}
        </aside>

      </div>

    </div>
  );
}
