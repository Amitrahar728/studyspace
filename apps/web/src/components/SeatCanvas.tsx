"use client";

import React, { useEffect, useState } from "react";
import { Stage, Layer, Rect, Text, Group } from "react-konva";

interface LayoutSeat {
  id: string;
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
  label: string | null;
  seat: LayoutSeat | null;
}

interface SeatAvailability {
  seatId: string;
  seatCode: string;
  seatType: string;
  isActive: boolean;
  isBooked: boolean;
  isHeld: boolean;
}

interface SeatCanvasProps {
  canvasWidth: number;
  canvasHeight: number;
  objects: LayoutObject[];
  availability: SeatAvailability[];
  selectedSeatId: string | null;
  onSeatSelect: (seatId: string) => void;
}

export default function SeatCanvas({
  canvasWidth,
  canvasHeight,
  objects,
  availability,
  selectedSeatId,
  onSeatSelect,
}: SeatCanvasProps) {
  // Map of seat status
  const [seatStates, setSeatStates] = useState<Record<string, { isBooked: boolean; isHeld: boolean }>>({});

  useEffect(() => {
    const states: Record<string, { isBooked: boolean; isHeld: boolean }> = {};
    availability.forEach((a) => {
      states[a.seatId] = { isBooked: a.isBooked, isHeld: a.isHeld };
    });
    setSeatStates(states);
  }, [availability]);

  // Render function for generic layout objects
  const renderObject = (obj: LayoutObject) => {
    const isSeat = obj.type === "SEAT" && obj.seat;

    if (isSeat && obj.seat) {
      const seatId = obj.seat.id;
      const seatState = seatStates[seatId] || { isBooked: false, isHeld: false };
      const isSelected = selectedSeatId === seatId;

      // Determine colors based on booking state
      let fill = "#FFFFFF"; // Available
      let stroke = "#10B981"; // Emerald green
      let strokeWidth = 2;
      let textColor = "#222222";

      if (isSeat && !obj.seat?.isActive) {
        fill = "#F3F4F6"; // Inactive
        stroke = "#D1D5DB";
        textColor = "#9CA3AF";
      } else if (isSelected) {
        fill = "#FF385C"; // Brand color
        stroke = "#FF385C";
        textColor = "#FFFFFF";
      } else if (seatState.isBooked) {
        fill = "#E5E7EB"; // Booked
        stroke = "#9CA3AF";
        textColor = "#9CA3AF";
      } else if (seatState.isHeld) {
        fill = "#FEF3C7"; // Held
        stroke = "#F59E0B"; // Amber
        textColor = "#B45309";
      }

      return (
        <Group
          key={obj.id}
          x={obj.x}
          y={obj.y}
          rotation={obj.rotation}
          onClick={() => {
            if (!seatState.isBooked && !seatState.isHeld && obj.seat?.isActive) {
              onSeatSelect(seatId);
            }
          }}
          onTap={() => {
            if (!seatState.isBooked && !seatState.isHeld && obj.seat?.isActive) {
              onSeatSelect(seatId);
            }
          }}
          style={{ cursor: seatState.isBooked || seatState.isHeld ? "not-allowed" : "pointer" }}
        >
          {/* Seat Box */}
          <Rect
            width={obj.width}
            height={obj.height}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            cornerRadius={8}
            shadowColor="#000"
            shadowBlur={isSelected ? 6 : 1}
            shadowOpacity={0.1}
          />
          {/* Label */}
          <Text
            text={obj.label || obj.seat?.seatCode || ""}
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
    }

    // Static layouts: Tables, ACs, Fans, Bookshelves, Custom
    let fillColor = "#E2E8F0"; // Slate-200 default for table
    let strokeColor = "#94A3B8";
    let fontColor = "#475569";
    let iconLabel = obj.label || "";

    if (obj.type === "AC") {
      fillColor = "#EFF6FF"; // blue-50
      strokeColor = "#3B82F6";
      fontColor = "#1D4ED8";
      iconLabel = `AC: ${obj.label || "Voltas"}`;
    } else if (obj.type === "FAN") {
      fillColor = "#F0FDF4"; // green-50
      strokeColor = "#22C55E";
      fontColor = "#15803D";
      iconLabel = `Fan: ${obj.label || "Ceiling"}`;
    } else if (obj.type === "BOOKSHELF") {
      fillColor = "#FEF3C7"; // Amber-100
      strokeColor = "#D97706";
      fontColor = "#78350F";
    } else if (obj.type === "WATER") {
      fillColor = "#ECFDF5"; // Emerald-50
      strokeColor = "#059669";
      fontColor = "#047857";
      iconLabel = "RO Water";
    } else if (obj.type === "WALL") {
      fillColor = "#475569";
      strokeColor = "#334155";
      fontColor = "#475569";
      iconLabel = "";
    } else if (obj.type === "LINE") {
      fillColor = "#94A3B8";
      strokeColor = "#64748B";
      fontColor = "#94A3B8";
      iconLabel = "";
    }

    return (
      <Group key={obj.id} x={obj.x} y={obj.y} rotation={obj.rotation}>
        <Rect
          width={obj.width}
          height={obj.height}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={1.5}
          cornerRadius={4}
        />
        <Text
          text={iconLabel}
          width={obj.width}
          height={obj.height}
          align="center"
          verticalAlign="middle"
          fontSize={10}
          fill={fontColor}
          fontStyle="semibold"
          wrap="char"
        />
      </Group>
    );
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-4 bg-gray-55/15 bg-slate-50 flex justify-center items-center overflow-auto max-h-[65vh]">
      <Stage width={canvasWidth} height={canvasHeight} className="shadow-inner bg-white rounded-lg border border-gray-150">
        <Layer>{objects.map(renderObject)}</Layer>
      </Stage>
    </div>
  );
}
