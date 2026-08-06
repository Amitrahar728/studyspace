"use client";

import React, { useState, useRef, useEffect } from "react";
import { Stage, Layer, Rect, Text, Group, Line, Circle, Transformer } from "react-konva";
import { Plus, Trash2, RotateCw, Sparkles, Wind, Square, Fan, BookOpen, Droplet, Lamp, Columns, Sliders } from "lucide-react";

export interface LayoutObject {
  id: string;
  type: "SEAT" | "TABLE" | "AC" | "FAN" | "BOOKSHELF" | "WATER" | "WALL" | "LINE" | "LIGHT" | "CUSTOM";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  label: string | null;
  seat?: {
    seatCode: string;
    seatType: string;
    isActive: boolean;
  } | null;
}

interface CleanCanvasEditorProps {
  objects: LayoutObject[];
  onChange: (newObjects: LayoutObject[]) => void;
}

export default function CleanCanvasEditor({ objects, onChange }: CleanCanvasEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customInputText, setCustomInputText] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  const trRef = useRef<any>(null);
  const selectedNodeRef = useRef<any>(null);

  const canvasWidth = 720;
  const canvasHeight = 520;

  const selectedObject = objects.find((o) => o.id === selectedId);

  // Synchronize Konva Transformer node
  useEffect(() => {
    if (selectedId && trRef.current && selectedNodeRef.current) {
      trRef.current.nodes([selectedNodeRef.current]);
      trRef.current.getLayer().batchDraw();
    }
  }, [selectedId, objects]);

  // Generic Add Helper
  const addObject = (type: LayoutObject["type"], customLabel?: string) => {
    const id = `${type.toLowerCase()}_${Date.now()}`;
    let width = 40;
    let height = 40;
    let label = customLabel || type;

    if (type === "SEAT") {
      const existingSeats = objects.filter((o) => o.type === "SEAT").length;
      label = `S${existingSeats + 1}`;
      width = 40;
      height = 40;
    } else if (type === "TABLE") {
      width = 140;
      height = 38;
      label = "Table";
    } else if (type === "AC") {
      width = 80;
      height = 24;
      label = "AC Unit";
    } else if (type === "FAN") {
      width = 44;
      height = 44;
      label = "Fan";
    } else if (type === "BOOKSHELF") {
      width = 100;
      height = 32;
      label = "Shelf";
    } else if (type === "WATER") {
      width = 36;
      height = 36;
      label = "Water";
    } else if (type === "LIGHT") {
      width = 32;
      height = 32;
      label = "Light";
    } else if (type === "WALL") {
      width = 120;
      height = 16;
      label = "Wall";
    } else if (type === "LINE") {
      width = 100;
      height = 4;
      label = "";
    } else if (type === "CUSTOM") {
      width = 110;
      height = 36;
      label = customLabel?.trim() || "Custom Area";
    }

    const newObj: LayoutObject = {
      id,
      type,
      x: 100 + (objects.length % 5) * 45,
      y: 100 + Math.floor(objects.length / 5) * 45,
      width,
      height,
      rotation: 0,
      zIndex: 0,
      label,
      ...(type === "SEAT" && {
        seat: {
          seatCode: label,
          seatType: "General",
          isActive: true,
        },
      }),
    };

    onChange([...objects, newObj]);
    setSelectedId(id);
  };

  // Add Custom Item
  const handleAddCustomItem = () => {
    if (!customInputText.trim()) return;
    addObject("CUSTOM", customInputText.trim());
    setCustomInputText("");
    setShowCustomModal(false);
  };

  // Update properties of selected object
  const updateSelectedObject = (updates: Partial<LayoutObject>) => {
    if (!selectedId) return;
    onChange(
      objects.map((o) => {
        if (o.id === selectedId) {
          const updated = { ...o, ...updates };
          if (updates.label !== undefined && o.type === "SEAT" && o.seat) {
            updated.seat = { ...o.seat, seatCode: updates.label || "" };
          }
          return updated;
        }
        return o;
      })
    );
  };

  // Delete selected element
  const deleteSelected = () => {
    if (!selectedId) return;
    onChange(objects.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  };

  // Rotate selected element
  const rotateSelected = () => {
    if (!selectedId) return;
    updateSelectedObject({ rotation: (selectedObject?.rotation || 0 + 90) % 360 });
  };

  // Drag position update
  const handleDragEnd = (id: string, x: number, y: number) => {
    onChange(
      objects.map((o) => (o.id === id ? { ...o, x: Math.round(x), y: Math.round(y) } : o))
    );
  };

  // Transform end update (Resize & Rotate from Konva Transformer handles)
  const handleTransformEnd = (id: string, node: any) => {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    node.scaleX(1);
    node.scaleY(1);

    const newWidth = Math.max(10, Math.round(node.width() * scaleX));
    const newHeight = Math.max(10, Math.round(node.height() * scaleY));
    const newRotation = Math.round(node.rotation());

    onChange(
      objects.map((o) =>
        o.id === id
          ? {
            ...o,
            x: Math.round(node.x()),
            y: Math.round(node.y()),
            width: newWidth,
            height: newHeight,
            rotation: newRotation,
          }
          : o
      )
    );
  };

  return (
    <div className="w-full flex flex-col items-center space-y-4">

      {/* Clean Add Objects Toolbar */}
      <div className="w-full max-w-5xl p-3 bg-stone-50 border border-stone-200 rounded-2xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => addObject("SEAT")}
            className="bg-white hover:bg-stone-100 text-[#222222] text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Seat (S1, S2...)</span>
          </button>

          <button
            type="button"
            onClick={() => addObject("TABLE")}
            className="bg-white hover:bg-stone-100 text-[#222222] text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Square className="w-3.5 h-3.5" />
            <span>+ Table</span>
          </button>

          <button
            type="button"
            onClick={() => addObject("AC")}
            className="bg-white hover:bg-stone-100 text-[#222222] text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Wind className="w-3.5 h-3.5" />
            <span>+ AC</span>
          </button>

          <button
            type="button"
            onClick={() => addObject("FAN")}
            className="bg-white hover:bg-stone-100 text-[#222222] text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Fan className="w-3.5 h-3.5" />
            <span>+ Fan</span>
          </button>

          <button
            type="button"
            onClick={() => addObject("LIGHT")}
            className="bg-white hover:bg-stone-100 text-[#222222] text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Lamp className="w-3.5 h-3.5" />
            <span>+ Light</span>
          </button>

          <button
            type="button"
            onClick={() => addObject("BOOKSHELF")}
            className="bg-white hover:bg-stone-100 text-[#222222] text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>+ Shelf</span>
          </button>

          <button
            type="button"
            onClick={() => addObject("WATER")}
            className="bg-white hover:bg-stone-100 text-[#222222] text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Droplet className="w-3.5 h-3.5" />
            <span>+ Water</span>
          </button>

          <button
            type="button"
            onClick={() => addObject("WALL")}
            className="bg-white hover:bg-stone-100 text-[#222222] text-xs font-bold px-3 py-2 rounded-xl border border-stone-300 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Columns className="w-3.5 h-3.5" />
            <span>+ Wall</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCustomModal(true)}
            className="bg-[#222222] hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Others (Custom)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-bold text-stone-500">
          <span className="bg-white px-3 py-1.5 rounded-xl border border-stone-200">
            Seats: {objects.filter((o) => o.type === "SEAT").length}
          </span>
        </div>
      </div>

      {/* Main Canvas & Properties Inspector Layout */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">

        {/* Canvas Area (3 Cols) */}
        <div className="lg:col-span-3 border border-stone-300 rounded-3xl overflow-hidden bg-white shadow-md relative flex justify-center">
          <Stage
            width={canvasWidth}
            height={canvasHeight}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) {
                setSelectedId(null);
              }
            }}
          >
            <Layer>
              {/* Grid Lines */}
              {Array.from({ length: Math.floor(canvasWidth / 25) }).map((_, i) => (
                <Line
                  key={`v_${i}`}
                  points={[i * 25, 0, i * 25, canvasHeight]}
                  stroke="#f4f4f4"
                  strokeWidth={1}
                />
              ))}
              {Array.from({ length: Math.floor(canvasHeight / 25) }).map((_, i) => (
                <Line
                  key={`h_${i}`}
                  points={[0, i * 25, canvasWidth, i * 25]}
                  stroke="#f4f4f4"
                  strokeWidth={1}
                />
              ))}

              {/* Canvas Objects */}
              {objects.map((obj) => {
                const isSelected = obj.id === selectedId;

                return (
                  <Group
                    key={obj.id}
                    ref={isSelected ? selectedNodeRef : null}
                    x={obj.x}
                    y={obj.y}
                    width={obj.width}
                    height={obj.height}
                    rotation={obj.rotation}
                    draggable
                    onClick={() => setSelectedId(obj.id)}
                    onTap={() => setSelectedId(obj.id)}
                    onDragEnd={(e) => handleDragEnd(obj.id, e.target.x(), e.target.y())}
                    onTransformEnd={(e) => handleTransformEnd(obj.id, e.target)}
                  >
                    {/* Render Shapes */}
                    {obj.type === "SEAT" && (
                      <>
                        <Rect
                          width={obj.width}
                          height={obj.height}
                          cornerRadius={8}
                          fill={isSelected ? "#222222" : "#ffffff"}
                          stroke="#222222"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Text
                          text={obj.label || "S"}
                          fontSize={Math.max(9, Math.min(14, obj.width / 3))}
                          fontStyle="bold"
                          fill={isSelected ? "#ffffff" : "#222222"}
                          width={obj.width}
                          height={obj.height}
                          align="center"
                          verticalAlign="middle"
                        />
                      </>
                    )}

                    {obj.type === "TABLE" && (
                      <>
                        <Rect
                          width={obj.width}
                          height={obj.height}
                          cornerRadius={6}
                          fill={isSelected ? "#333333" : "#f8f9fa"}
                          stroke="#222222"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Text
                          text={obj.label || "TABLE"}
                          fontSize={Math.max(8, Math.min(12, obj.height / 3))}
                          fontStyle="bold"
                          fill={isSelected ? "#ffffff" : "#444444"}
                          width={obj.width}
                          height={obj.height}
                          align="center"
                          verticalAlign="middle"
                        />
                      </>
                    )}

                    {obj.type === "AC" && (
                      <>
                        <Rect
                          width={obj.width}
                          height={obj.height}
                          cornerRadius={4}
                          fill={isSelected ? "#222222" : "#ffffff"}
                          stroke="#222222"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Text
                          text={obj.label || "AC"}
                          fontSize={Math.max(7, Math.min(10, obj.height / 2.2))}
                          fontStyle="bold"
                          fill={isSelected ? "#ffffff" : "#222222"}
                          width={obj.width}
                          height={obj.height}
                          align="center"
                          verticalAlign="middle"
                        />
                      </>
                    )}

                    {obj.type === "FAN" && (
                      <>
                        <Circle
                          radius={Math.min(obj.width, obj.height) / 2}
                          x={obj.width / 2}
                          y={obj.height / 2}
                          fill={isSelected ? "#222222" : "#ffffff"}
                          stroke="#222222"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Text
                          text={obj.label || "FAN"}
                          fontSize={Math.max(7, Math.min(10, obj.width / 4))}
                          fontStyle="bold"
                          fill={isSelected ? "#ffffff" : "#222222"}
                          width={obj.width}
                          height={obj.height}
                          align="center"
                          verticalAlign="middle"
                        />
                      </>
                    )}

                    {obj.type === "LIGHT" && (
                      <>
                        <Circle
                          radius={Math.min(obj.width, obj.height) / 2}
                          x={obj.width / 2}
                          y={obj.height / 2}
                          fill={isSelected ? "#333333" : "#ffffff"}
                          stroke="#222222"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Text
                          text={obj.label || "LIGHT"}
                          fontSize={Math.max(6, Math.min(9, obj.width / 4.5))}
                          fontStyle="bold"
                          fill={isSelected ? "#ffffff" : "#222222"}
                          width={obj.width}
                          height={obj.height}
                          align="center"
                          verticalAlign="middle"
                        />
                      </>
                    )}

                    {obj.type === "BOOKSHELF" && (
                      <>
                        <Rect
                          width={obj.width}
                          height={obj.height}
                          cornerRadius={4}
                          fill={isSelected ? "#222222" : "#f5f5f5"}
                          stroke="#222222"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Text
                          text={obj.label || "SHELF"}
                          fontSize={Math.max(7, Math.min(10, obj.height / 3))}
                          fontStyle="bold"
                          fill={isSelected ? "#ffffff" : "#333333"}
                          width={obj.width}
                          height={obj.height}
                          align="center"
                          verticalAlign="middle"
                        />
                      </>
                    )}

                    {obj.type === "WATER" && (
                      <>
                        <Rect
                          width={obj.width}
                          height={obj.height}
                          cornerRadius={6}
                          fill={isSelected ? "#222222" : "#ffffff"}
                          stroke="#222222"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Text
                          text={obj.label || "WATER"}
                          fontSize={Math.max(7, Math.min(9, obj.width / 4))}
                          fontStyle="bold"
                          fill={isSelected ? "#ffffff" : "#222222"}
                          width={obj.width}
                          height={obj.height}
                          align="center"
                          verticalAlign="middle"
                        />
                      </>
                    )}

                    {obj.type === "WALL" && (
                      <Rect
                        width={obj.width}
                        height={obj.height}
                        cornerRadius={2}
                        fill={isSelected ? "#111111" : "#333333"}
                        stroke="#000000"
                        strokeWidth={1}
                      />
                    )}

                    {obj.type === "CUSTOM" && (
                      <>
                        <Rect
                          width={obj.width}
                          height={obj.height}
                          cornerRadius={8}
                          fill={isSelected ? "#222222" : "#ffffff"}
                          stroke="#222222"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                        />
                        <Text
                          text={obj.label || "CUSTOM"}
                          fontSize={Math.max(8, Math.min(11, obj.height / 3))}
                          fontStyle="bold"
                          fill={isSelected ? "#ffffff" : "#222222"}
                          width={obj.width}
                          height={obj.height}
                          align="center"
                          verticalAlign="middle"
                        />
                      </>
                    )}
                  </Group>
                );
              })}

              {/* Konva Transformer Handles for Resizing & Rotating */}
              {selectedId && (
                <Transformer
                  ref={trRef}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 10 || newBox.height < 10) {
                      return oldBox;
                    }
                    return newBox;
                  }}
                  anchorSize={8}
                  anchorCornerRadius={2}
                  borderStroke="#222222"
                  anchorStroke="#222222"
                  anchorFill="#ffffff"
                />
              )}
            </Layer>
          </Stage>
        </div>

        {/* Side Panel: PROPERTIES INSPECTOR (Matching exact attached UI image) */}
        <div className="bg-stone-50 border border-stone-200 rounded-3xl p-5 space-y-5 text-left shadow-xs">

          <div className="flex items-center justify-between border-b border-stone-200/80 pb-3">
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              <span>Properties Inspector</span>
            </h3>
          </div>

          {selectedObject ? (
            <div className="space-y-4">

              {/* OBJECT TYPE */}
              <div className="bg-white border border-stone-200 rounded-2xl p-3.5">
                <label className="block text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Object Type
                </label>
                <p className="text-sm font-extrabold text-[#222222] mt-0.5">
                  {selectedObject.type}
                </p>
              </div>

              {/* DISPLAY LABEL */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                  Display Label
                </label>
                <input
                  type="text"
                  value={selectedObject.label || ""}
                  onChange={(e) => updateSelectedObject({ label: e.target.value })}
                  placeholder="Label text"
                  className="w-full text-xs font-semibold p-3 border border-stone-300 focus:border-black rounded-xl outline-none bg-white text-[#222222]"
                />
              </div>

              {/* WIDTH (PX) & HEIGHT (PX) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Width (PX)
                  </label>
                  <input
                    type="number"
                    value={selectedObject.width}
                    onChange={(e) => updateSelectedObject({ width: Math.max(10, Number(e.target.value)) })}
                    className="w-full text-xs font-bold p-3 border border-stone-300 focus:border-black rounded-xl outline-none bg-white text-[#222222]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Height (PX)
                  </label>
                  <input
                    type="number"
                    value={selectedObject.height}
                    onChange={(e) => updateSelectedObject({ height: Math.max(10, Number(e.target.value)) })}
                    className="w-full text-xs font-bold p-3 border border-stone-300 focus:border-black rounded-xl outline-none bg-white text-[#222222]"
                  />
                </div>
              </div>

              {/* ROTATION (DEG) Slider & Button */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-stone-500 uppercase tracking-wider">
                    Rotation (DEG)
                  </label>
                  <span className="text-xs font-bold text-stone-700">{selectedObject.rotation}°</span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={360}
                    value={selectedObject.rotation}
                    onChange={(e) => updateSelectedObject({ rotation: Number(e.target.value) })}
                    className="w-full accent-black cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={rotateSelected}
                    className="p-2 border border-stone-300 hover:border-black bg-white rounded-xl text-stone-700 transition cursor-pointer shrink-0"
                    title="Rotate 90 deg"
                  >
                    <RotateCw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Delete Element Button */}
              <button
                type="button"
                onClick={deleteSelected}
                className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold py-3.5 rounded-2xl border border-rose-200 transition cursor-pointer flex items-center justify-center gap-2 mt-3"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Element</span>
              </button>

            </div>
          ) : (
            <div className="py-12 text-center text-stone-400 space-y-2">
              <p className="text-xs font-semibold">No element selected</p>
              <p className="text-[11px] leading-relaxed">
                Click any seat, table, or AC on the canvas to inspect & resize its dimensions.
              </p>
            </div>
          )}

        </div>

      </div>

      {/* Modal for Adding Custom / Others Item */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-[#222222]">Add Custom Element</h3>
            <p className="text-xs text-stone-500">
              Type custom text label to render on the canvas (e.g. Reception, Entry Gate, Restroom, Rest Area...).
            </p>
            <input
              type="text"
              value={customInputText}
              onChange={(e) => setCustomInputText(e.target.value)}
              placeholder="e.g. Reception Counter"
              className="w-full text-xs p-3 border border-stone-300 focus:border-black rounded-xl outline-none bg-white font-medium"
              autoFocus
            />
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCustomModal(false)}
                className="text-xs font-bold text-stone-500 hover:text-black px-4 py-2 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddCustomItem}
                className="bg-[#222222] hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer"
              >
                Add to Canvas
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-stone-400 font-medium">
        Drag corner handles on canvas to resize &bull; Use Properties Inspector to adjust Width, Height & Labels.
      </p>
    </div>
  );
}
