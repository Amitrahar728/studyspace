"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../../context/AppContext";
import { 
  ArrowLeft, 
  ArrowRight, 
  MapPin, 
  Check, 
  Plus, 
  Minus, 
  Upload, 
  Trash2, 
  Star, 
  Wifi, 
  Wind, 
  Zap, 
  VolumeX, 
  Lock, 
  Coffee,
  AlertCircle
} from "lucide-react";

interface PhotoItem {
  file: File;
  previewUrl: string;
  isCover: boolean;
}

export default function CreateLibraryWizard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { token, user } = useAuth();

  const [step, setStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // STEP 1: Location States
  const [name, setName] = useState("");
  const [streetAddress, setStreetAddress] = useState("");
  const [city, setCity] = useState("");
  const [stateName, setStateName] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // STEP 2: Amenities States
  const [amenities, setAmenities] = useState<string[]>([]);

  // STEP 3: Space Basics (Inventory)
  const [chairs, setChairs] = useState(0);
  const [tables, setTables] = useState(0);
  const [acs, setAcs] = useState(0);
  const [fans, setFans] = useState(0);

  // STEP 4: Photos States
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // STEP 5: Pricing States
  const [priceMorning, setPriceMorning] = useState(150);
  const [priceAfternoon, setPriceAfternoon] = useState(150);
  const [priceEvening, setPriceEvening] = useState(180);
  const [priceFullDay, setPriceFullDay] = useState(400);

  const amenitiesList = [
    { id: "WiFi", name: "High-speed Wi-Fi", icon: Wifi },
    { id: "AC", name: "Air Conditioning", icon: Wind },
    { id: "Power Outlets", name: "Power Outlets", icon: Zap },
    { id: "Silent Zone", name: "Silent Zone", icon: VolumeX },
    { id: "Locker", name: "Locker", icon: Lock },
    { id: "Cafeteria", name: "Cafeteria", icon: Coffee }
  ];

  const handleAmenityToggle = (id: string) => {
    setAmenities((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  // Step 4 File handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    addPhotos(files);
  };

  const addPhotos = (files: File[]) => {
    setFormError(null);
    const newPhotos: PhotoItem[] = [];

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError(`File ${file.name} exceeds the 5MB size limit.`);
        return;
      }

      newPhotos.push({
        file,
        previewUrl: URL.createObjectURL(file),
        isCover: false
      });
    }

    setPhotos((prev) => {
      const combined = [...prev, ...newPhotos];
      // Auto-set the first uploaded image as cover if none exists
      if (combined.length > 0 && !combined.some(p => p.isCover)) {
        combined[0].isCover = true;
      }
      return combined;
    });
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const removed = prev.filter((_, i) => i !== index);
      // Auto-reassign cover if cover photo was removed
      if (removed.length > 0 && !removed.some(p => p.isCover)) {
        removed[0].isCover = true;
      }
      return removed;
    });
  };

  const setCoverPhoto = (index: number) => {
    setPhotos((prev) =>
      prev.map((p, i) => ({
        ...p,
        isCover: i === index
      }))
    );
  };

  // Mock Map Coordinate Selector
  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Simulate coordinates based on click percentages
    const simulatedLat = Number((28.4595 + (y / rect.height - 0.5) * 0.1).toFixed(6));
    const simulatedLng = Number((77.0266 + (x / rect.width - 0.5) * 0.1).toFixed(6));

    setLatitude(simulatedLat);
    setLongitude(simulatedLng);
  };

  // Submit Listing Handler
  const handleSubmitListing = async () => {
    if (photos.length !== 5) {
      setFormError("You must upload exactly 5 images to proceed.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const fullAddress = `${streetAddress}${landmark ? `, Near ${landmark}` : ""}, ${stateName} - ${pinCode}`;

      // 1. Create Library
      const response = await fetch(`${apiBase}/libraries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          city,
          address: fullAddress,
          amenities,
          latitude,
          longitude,
          chairs,
          tables,
          acs,
          fans,
          slotTypes: [
            { name: "Morning Slot", startTime: "08:00", endTime: "13:00", price: Number(priceMorning) },
            { name: "Afternoon Slot", startTime: "13:00", endTime: "18:00", price: Number(priceAfternoon) },
            { name: "Evening Slot", startTime: "18:00", endTime: "23:00", price: Number(priceEvening) },
            { name: "Full Day Slot", startTime: "08:00", endTime: "23:00", price: Number(priceFullDay) }
          ]
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create library listing.");
      }

      const libraryId = data.id;

      // 2. Upload all 5 photos to S3
      // We will upload the files sequentially.
      // Reorder photos array so the Cover photo is uploaded FIRST (becomes the first photo item in S3 array)
      const sortedPhotos = [...photos].sort((a, b) => (b.isCover ? 1 : 0) - (a.isCover ? 1 : 0));

      for (const p of sortedPhotos) {
        await fetch(`${apiBase}/libraries/${libraryId}/photos/upload-direct`, {
          method: "POST",
          headers: {
            "Content-Type": p.file.type,
            Authorization: `Bearer ${token}`
          },
          body: p.file
        });
      }

      queryClient.invalidateQueries({ queryKey: ["owner-libraries", user?.id] });
      router.push("/owner/dashboard");
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred during submission.");
      setIsSubmitting(false);
    }
  };

  const handleNextStep = () => {
    setFormError(null);
    if (step === 1) {
      if (!name || !streetAddress || !city || !stateName || !pinCode) {
        setFormError("Please fill out all location address fields.");
        return;
      }
      if (latitude === null || longitude === null) {
        setFormError("Please click on the map to drop a pin and verify your coordinates.");
        return;
      }
    }
    if (step === 4) {
      if (photos.length !== 5) {
        setFormError("You must upload exactly 5 images to proceed.");
        return;
      }
    }
    setStep(step + 1);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Navbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="bg-brand text-white p-1.5 rounded-lg text-sm font-black font-serif leading-none">H</span>
          <span className="font-extrabold text-gray-800 text-sm">Add New Listing Wizard</span>
        </div>
        <button
          onClick={() => router.push("/owner/dashboard")}
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 border border-gray-200 hover:border-gray-400 bg-white px-4 py-2 rounded-xl transition"
        >
          Exit Wizard
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-grow flex items-center justify-center p-6 md:p-12">
        <div className="max-w-3xl w-full bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden min-h-[500px] flex flex-col justify-between">
          <div className="p-8 md:p-12 space-y-6">
            
            {/* Header step tracker */}
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest">
              <span>Step {step} of 5</span>
              <span>•</span>
              <span className="text-brand">
                {step === 1 && "Location & Map"}
                {step === 2 && "Amenities"}
                {step === 3 && "Basics Inventory"}
                {step === 4 && "Photos Gallery"}
                {step === 5 && "Pricing & Scale"}
              </span>
            </div>

            {formError && (
              <div className="bg-red-50 text-red-700 text-xs p-4 rounded-xl border border-red-100 flex items-start gap-2.5 font-bold animate-shake">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: LOCATION FORM */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Set up your listing address</h2>
                  <p className="text-sm text-gray-500 mt-1">Please insert the physical address details and pinpoint the marker coordinate position.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Library Name</label>
                      <input 
                        type="text" 
                        placeholder="e.g. Brainyard Premium Reading Room"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Street address</label>
                      <input 
                        type="text" 
                        placeholder="e.g. 102 First Floor, Galleria Market"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">City</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Gurugram"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">State</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Haryana"
                          value={stateName}
                          onChange={(e) => setStateName(e.target.value)}
                          className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">PIN Code</label>
                        <input 
                          type="text" 
                          placeholder="e.g. 122002"
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value)}
                          className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-gray-500 mb-1">Landmark (Optional)</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Near Metro Station"
                          value={landmark}
                          onChange={(e) => setLandmark(e.target.value)}
                          className="w-full text-sm p-3 border border-gray-200 rounded-xl focus:ring-1 focus:ring-brand focus:border-brand outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Mock Map pin dropper */}
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-gray-500">Droppin pin locator (Verify Coordinates)</label>
                    <div 
                      onClick={handleMapClick}
                      className="relative h-64 border border-gray-200 rounded-2xl overflow-hidden cursor-crosshair bg-emerald-50 hover:bg-emerald-100/70 transition flex items-center justify-center select-none"
                    >
                      {/* Grid background simulation */}
                      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:14px_24px]" />
                      
                      {/* Visual road graphic lines */}
                      <div className="absolute w-full h-4 bg-white/40 top-1/3 -rotate-3" />
                      <div className="absolute h-full w-6 bg-white/40 left-1/3 rotate-12" />

                      {latitude !== null && longitude !== null ? (
                        <div className="absolute flex flex-col items-center animate-bounce z-10" style={{ top: "45%", left: "48%" }}>
                          <MapPin className="w-8 h-8 text-brand fill-white" />
                          <span className="bg-slate-900/90 text-white text-[9px] font-black px-2 py-0.5 rounded shadow-lg mt-1 border border-slate-700">Pin Placed</span>
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 font-bold text-center px-6 z-10">Click anywhere inside this box to drop your coordinate marker pin</p>
                      )}
                    </div>
                    <div className="flex gap-4 text-xs font-bold text-gray-600 bg-slate-50 p-2.5 rounded-lg border border-gray-150 justify-around">
                      <div>Lat: <span className="font-mono text-slate-800">{latitude || "Pending"}</span></div>
                      <div>Lng: <span className="font-mono text-slate-800">{longitude || "Pending"}</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: AMENITIES */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">What does your study room offer?</h2>
                  <p className="text-sm text-gray-500 mt-1">Select the amenities that library guests will have access to. Only choose workspace features.</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {amenitiesList.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = amenities.includes(item.id);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleAmenityToggle(item.id)}
                        className={`p-6 border rounded-2xl flex flex-col items-start gap-4 transition cursor-pointer text-left ${
                          isSelected 
                            ? "border-brand bg-brand/5 shadow-md scale-[1.02]" 
                            : "border-gray-200 hover:border-gray-400 bg-white hover:bg-gray-50"
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl ${isSelected ? "bg-brand text-white" : "bg-slate-100 text-gray-500"}`}>
                          <IconComp className="w-5 h-5" />
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <span className="text-sm font-bold text-gray-800">{item.name}</span>
                          {isSelected && <Check className="w-4 h-4 text-brand" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: BASICS INVENTORY */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Share some basics about your place</h2>
                  <p className="text-sm text-gray-500 mt-1">Provide the initial count of physical equipment available for inventory verification.</p>
                </div>

                <div className="space-y-6 max-w-md mx-auto pt-6">
                  {/* Chairs */}
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <div>
                      <p className="font-extrabold text-gray-800 text-sm">Chairs</p>
                      <p className="text-[10px] text-gray-400">Total individual reading chairs</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => setChairs(Math.max(0, chairs - 1))}
                        className="p-2 border border-gray-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center text-sm font-black font-mono text-gray-800">{chairs}</span>
                      <button 
                        type="button"
                        onClick={() => setChairs(chairs + 1)}
                        className="p-2 border border-gray-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Tables */}
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <div>
                      <p className="font-extrabold text-gray-800 text-sm">Tables</p>
                      <p className="text-[10px] text-gray-400">Physical study desks or dividers</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => setTables(Math.max(0, tables - 1))}
                        className="p-2 border border-gray-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center text-sm font-black font-mono text-gray-800">{tables}</span>
                      <button 
                        type="button"
                        onClick={() => setTables(tables + 1)}
                        className="p-2 border border-gray-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* ACs */}
                  <div className="flex justify-between items-center py-4 border-b border-gray-100">
                    <div>
                      <p className="font-extrabold text-gray-800 text-sm">ACs</p>
                      <p className="text-[10px] text-gray-400">Air conditioning split/tower units</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => setAcs(Math.max(0, acs - 1))}
                        className="p-2 border border-gray-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center text-sm font-black font-mono text-gray-800">{acs}</span>
                      <button 
                        type="button"
                        onClick={() => setAcs(acs + 1)}
                        className="p-2 border border-gray-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>

                  {/* Fans */}
                  <div className="flex justify-between items-center py-4">
                    <div>
                      <p className="font-extrabold text-gray-800 text-sm">Fans</p>
                      <p className="text-[10px] text-gray-400">Ceiling or wall-mounted fans</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        type="button"
                        onClick={() => setFans(Math.max(0, fans - 1))}
                        className="p-2 border border-gray-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Minus className="w-4 h-4 text-gray-600" />
                      </button>
                      <span className="w-8 text-center text-sm font-black font-mono text-gray-800">{fans}</span>
                      <button 
                        type="button"
                        onClick={() => setFans(fans + 1)}
                        className="p-2 border border-gray-200 rounded-full bg-white hover:bg-slate-50 cursor-pointer transition"
                      >
                        <Plus className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 4: PHOTOS */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Add some photos of your place</h2>
                  <p className="text-sm text-gray-500 mt-1">You must upload **exactly 5 images** to build your listing portfolio. Max size 5MB.</p>
                </div>

                {/* Upload drag drop panel */}
                {photos.length < 5 && (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-3xl p-10 text-center hover:border-brand bg-slate-50 hover:bg-brand/[0.02] transition cursor-pointer select-none"
                  >
                    <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm font-bold text-gray-700">Drag files here or click to browse</p>
                    <p className="text-[10px] text-gray-400 mt-1">Accepts JPG, PNG up to 5MB. ({photos.length} of 5 uploaded)</p>
                    <input 
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      multiple
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                )}

                {/* Thumbnail display grid */}
                {photos.length > 0 && (
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {photos.map((item, index) => (
                      <div 
                        key={index} 
                        className={`relative rounded-xl overflow-hidden border bg-white aspect-square group shadow-sm flex flex-col justify-between ${
                          item.isCover ? "border-brand ring-2 ring-brand/20 scale-[1.02]" : "border-gray-200"
                        }`}
                      >
                        <img src={item.previewUrl} alt="Preview" className="w-full h-full object-cover absolute inset-0" />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition flex flex-col justify-between p-2 z-10">
                          {/* Trash button */}
                          <button
                            type="button"
                            onClick={() => removePhoto(index)}
                            className="bg-red-650 hover:bg-red-750 text-white p-1 rounded bg-red-600 hover:bg-red-700 self-end transition shadow cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Cover badge select */}
                          <button
                            type="button"
                            onClick={() => setCoverPhoto(index)}
                            className={`w-full text-[9px] font-bold py-1 rounded text-center transition cursor-pointer shadow-sm ${
                              item.isCover 
                                ? "bg-brand text-white font-extrabold" 
                                : "bg-white/90 text-gray-800 hover:bg-white"
                            }`}
                          >
                            {item.isCover ? "Cover Photo" : "Set Cover"}
                          </button>
                        </div>
                        
                        {item.isCover && (
                          <span className="absolute top-2 left-2 bg-brand text-white text-[9px] font-extrabold py-0.5 px-2 rounded-full shadow border border-brand/20 z-10">
                            Cover
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {photos.length === 5 && (
                  <p className="text-xs font-black text-emerald-600 text-center">✅ Exactly 5 photos uploaded! Ready to proceed.</p>
                )}
              </div>
            )}

            {/* STEP 5: PRICING DEFINITION */}
            {step === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">Define pricing slot matrices</h2>
                  <p className="text-sm text-gray-500 mt-1">Specify reservation prices for each shift slot. Our multi-day accounting automatically computes weekly/monthly stays.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  {/* Slots pricing forms */}
                  <div className="space-y-4 bg-slate-50 p-6 rounded-2xl border border-gray-150">
                    <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Slot Shift Rates</h3>
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between gap-4">
                        <label className="text-xs font-bold text-gray-700">Morning Shift (08:00 - 13:00)</label>
                        <div className="relative w-32">
                          <span className="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold">₹</span>
                          <input 
                            type="number" 
                            value={priceMorning}
                            onChange={(e) => setPriceMorning(Number(e.target.value))}
                            className="w-full text-xs p-2.5 pl-7 border border-gray-250 rounded-lg outline-none font-bold text-right"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <label className="text-xs font-bold text-gray-700">Afternoon Shift (13:00 - 18:00)</label>
                        <div className="relative w-32">
                          <span className="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold">₹</span>
                          <input 
                            type="number" 
                            value={priceAfternoon}
                            onChange={(e) => setPriceAfternoon(Number(e.target.value))}
                            className="w-full text-xs p-2.5 pl-7 border border-gray-250 rounded-lg outline-none font-bold text-right"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <label className="text-xs font-bold text-gray-700">Evening Shift (18:00 - 23:00)</label>
                        <div className="relative w-32">
                          <span className="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold">₹</span>
                          <input 
                            type="number" 
                            value={priceEvening}
                            onChange={(e) => setPriceEvening(Number(e.target.value))}
                            className="w-full text-xs p-2.5 pl-7 border border-gray-250 rounded-lg outline-none font-bold text-right"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-2.5 border-t border-gray-200">
                        <label className="text-xs font-black text-gray-800">Full Day Shift (08:00 - 23:00)</label>
                        <div className="relative w-32">
                          <span className="absolute left-3.5 top-2.5 text-xs text-gray-400 font-bold">₹</span>
                          <input 
                            type="number" 
                            value={priceFullDay}
                            onChange={(e) => setPriceFullDay(Number(e.target.value))}
                            className="w-full text-xs p-2.5 pl-7 border border-brand rounded-lg outline-none font-black text-right text-brand bg-brand/5"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Multi-day scale visual cards */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-gray-400 tracking-wider">Extended Stays Scale Rate</h3>
                    <div className="space-y-3">
                      {/* Weekly Card */}
                      <div className="p-4 border border-gray-200 rounded-xl bg-white flex justify-between items-center shadow-sm">
                        <div>
                          <p className="text-xs font-extrabold text-gray-850">Weekly Stay (7 Days)</p>
                          <p className="text-[10px] text-gray-400">Continuous daily slot bookings</p>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-emerald-500 text-white py-1 px-2.5 rounded-full">
                          10% discount applied
                        </span>
                      </div>

                      {/* Monthly Card */}
                      <div className="p-4 border border-gray-200 rounded-xl bg-white flex justify-between items-center shadow-sm">
                        <div>
                          <p className="text-xs font-extrabold text-gray-850">Monthly Stay (30 Days)</p>
                          <p className="text-[10px] text-gray-400">Flexible seat availability reserves</p>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-emerald-500 text-white py-1 px-2.5 rounded-full">
                          20% discount applied
                        </span>
                      </div>

                      {/* Yearly/Quarterly Card */}
                      <div className="p-4 border border-gray-200 rounded-xl bg-white flex justify-between items-center shadow-sm">
                        <div>
                          <p className="text-xs font-extrabold text-gray-850">Quarterly stay (60 Days)</p>
                          <p className="text-[10px] text-gray-400">Long-term academic packages</p>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-emerald-500 text-white py-1 px-2.5 rounded-full">
                          25% discount applied
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* Bottom Control Bar */}
          <div className="bg-slate-50 border-t border-gray-150 p-6 flex justify-between items-center">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="text-xs font-bold text-gray-650 hover:text-gray-900 flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-slate-50 px-5 py-2.5 rounded-xl cursor-pointer transition shadow-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-md"
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmitListing}
                disabled={isSubmitting}
                className="bg-brand hover:bg-brand-hover text-white text-xs font-bold px-6 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-md"
              >
                {isSubmitting ? "Submitting Listing..." : "Complete & Submit"}
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
