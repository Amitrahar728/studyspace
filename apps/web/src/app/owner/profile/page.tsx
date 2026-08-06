"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AppContext";
import { useToast } from "../../../context/ToastContext";
import OwnerHeader from "../../../components/OwnerHeader";
import {
  Camera,
  Loader2,
  X,
  ChevronRight,
  User,
  Mail,
  Phone,
  Building2,
  Headphones,
  ShieldCheck,
  Clock,
} from "lucide-react";

interface ProfileField {
  id: string;
  icon: React.ReactNode;
  label: string;
  title: string;
  description: string;
  placeholder: string;
  value: string;
  maxLength?: number;
  readOnly?: boolean;
}

export default function OwnerProfilePage() {
  const router = useRouter();
  const { user, token, updateUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // DB-backed owner profile states
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [supportContact, setSupportContact] = useState("");
  const [taxId, setTaxId] = useState("");

  // Modal edit state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeField, setActiveField] = useState<ProfileField | null>(null);
  const [modalInputValue, setModalInputValue] = useState("");

  // Bio inline editor modal state
  const [bioModalOpen, setBioModalOpen] = useState(false);

  // Fetch owner profile
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
        const res = await fetch(`${apiBase}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setName(data.name || "");
          setEmail(data.email || user?.email || "");
          setPhone(data.phone || "");
          setAvatarUrl(data.avatarUrl || null);
          setBio(data.bio || "");
          setBusinessName(data.occupation || "");
          setSupportContact(data.currentlyDoing || "");
          setTaxId(data.targetGoal || "");
        }
      } catch (err) {
        console.error("Failed to fetch owner profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, user]);

  // Photo Upload to owner_profile in S3
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Avatar photo must be smaller than 5MB", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64Data = reader.result as string;
          const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";

          const res = await fetch(`${apiBase}/auth/avatar/upload`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              image: base64Data,
              fileName: file.name,
              fileType: file.type,
            }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.message || "Failed to upload photo to S3");
          }

          const data = await res.json();
          setAvatarUrl(data.avatarUrl);

          if (user) {
            updateUser({ ...user, avatarUrl: data.avatarUrl });
          }

          showToast("Profile photo uploaded to owner_profile in S3!", "success");
        } catch (err: any) {
          console.error("Avatar upload error:", err);
          showToast(err.message || "Failed to upload photo to S3", "error");
        } finally {
          setUploadingAvatar(false);
        }
      };

      reader.onerror = () => {
        showToast("Error reading selected image file", "error");
        setUploadingAvatar(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      showToast(err.message || "Upload error", "error");
      setUploadingAvatar(false);
    }
  };

  // Open Edit Modal for a given field
  const openModal = (field: ProfileField) => {
    if (field.readOnly) return;
    setActiveField(field);
    setModalInputValue(field.value);
    setModalOpen(true);
  };

  // Save Modal Field to DB
  const handleSaveModal = async () => {
    if (!activeField) return;

    const val = modalInputValue.trim();
    const fieldId = activeField.id;

    if (fieldId === "name") setName(val);
    else if (fieldId === "phone") setPhone(val);
    else if (fieldId === "businessName") setBusinessName(val);
    else if (fieldId === "supportContact") setSupportContact(val);
    else if (fieldId === "taxId") setTaxId(val);

    setModalOpen(false);

    if (token) {
      setSaving(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
        const updateBody: any = {};
        if (fieldId === "name") updateBody.name = val;
        if (fieldId === "phone") updateBody.phone = val;
        if (fieldId === "businessName") updateBody.occupation = val;
        if (fieldId === "supportContact") updateBody.currentlyDoing = val;
        if (fieldId === "taxId") updateBody.targetGoal = val;

        if (Object.keys(updateBody).length > 0) {
          const res = await fetch(`${apiBase}/users/me`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(updateBody),
          });
          if (res.ok) {
            const updatedUser = await res.json();
            updateUser(updatedUser);
            showToast("Saved to profile!", "success");
          } else {
            showToast("Failed to save changes", "error");
          }
        }
      } catch (err) {
        console.error("Save error:", err);
        showToast("Error updating profile", "error");
      } finally {
        setSaving(false);
      }
    }
  };

  // Save Bio Intro to DB
  const handleSaveBio = async () => {
    setBioModalOpen(false);
    if (!token) return;

    setSaving(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      const res = await fetch(`${apiBase}/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ bio }),
      });
      if (res.ok) {
        const updatedUser = await res.json();
        updateUser(updatedUser);
        showToast("Host intro saved successfully!", "success");
      } else {
        showToast("Failed to save host intro", "error");
      }
    } catch (err) {
      console.error("Save bio error:", err);
      showToast("Error saving host intro", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-stone-800" /> Loading host profile...
      </div>
    );
  }

  // Profile Fields Left Column
  const leftFields: ProfileField[] = [
    {
      id: "name",
      icon: <User className="w-4 h-4 text-stone-700" />,
      label: "Full Name",
      title: "Full Name",
      description: "Enter your full legal or display name.",
      placeholder: "e.g. Amit Rahar",
      value: name,
      maxLength: 50,
    },
    {
      id: "phone",
      icon: <Phone className="w-4 h-4 text-stone-700" />,
      label: "Phone Number",
      title: "Phone Number",
      description: "Primary phone number for library operations.",
      placeholder: "+91 98765 43210",
      value: phone,
      maxLength: 20,
    },
    {
      id: "supportContact",
      icon: <Headphones className="w-4 h-4 text-stone-700" />,
      label: "Support Helpline",
      title: "Support Helpline Number",
      description: "Helpline contact for library members.",
      placeholder: "+91 99887 76655",
      value: supportContact,
      maxLength: 20,
    },
  ];

  // Profile Fields Right Column
  const rightFields: ProfileField[] = [
    {
      id: "email",
      icon: <Mail className="w-4 h-4 text-stone-700" />,
      label: "Email Address",
      title: "Email Address",
      description: "Primary account email address.",
      placeholder: "amitrahar728@gmail.com",
      value: email,
      readOnly: true,
    },
    {
      id: "businessName",
      icon: <Building2 className="w-4 h-4 text-stone-700" />,
      label: "Business / Organization Name",
      title: "Business or Organization Name",
      description: "Your registered company or brand name.",
      placeholder: "e.g. StudySpace Fatehabad",
      value: businessName,
      maxLength: 60,
    },
    {
      id: "taxId",
      icon: <ShieldCheck className="w-4 h-4 text-stone-700" />,
      label: "GSTIN / Tax ID",
      title: "GSTIN or Tax Identification",
      description: "Optional GSTIN / business registration ID.",
      placeholder: "e.g. 06AAAAA0000A1Z5",
      value: taxId,
      maxLength: 30,
    },
  ];

  return (
    <main className="min-h-screen bg-white text-[#222222] font-sans pb-24">
      <OwnerHeader />

      <div className="max-w-5xl mx-auto px-6 pt-12 md:pt-16">

        {/* Top Header Layout: Photo Left, Info Right */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">

          {/* Left Column: Large Circular Profile Photo with Add Pill */}
          <div className="md:col-span-4 flex flex-col items-center md:items-start">
            <div className="relative">
              <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full overflow-hidden bg-stone-100 border-2 border-stone-200 shadow-sm flex items-center justify-center">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name || "Owner"} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#222222] text-white flex items-center justify-center font-bold text-5xl">
                    {name ? name.charAt(0).toUpperCase() : "A"}
                  </div>
                )}
              </div>

              {/* Add Pill Button at Bottom Center of Photo */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-white border border-stone-300 rounded-full text-xs font-bold text-[#222222] shadow-md hover:bg-stone-50 transition cursor-pointer flex items-center gap-1.5"
              >
                {uploadingAvatar ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Camera className="w-3.5 h-3.5 text-stone-700" />
                )}
                <span>{avatarUrl ? "Edit" : "Add"}</span>
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>

          {/* Right Column: Title, Subtitle, 2-Column Fields Grid */}
          <div className="md:col-span-8 space-y-6">

            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#222222] tracking-tight">
                My profile
              </h1>
              <p className="text-xs text-stone-500 font-medium mt-1.5 leading-relaxed max-w-xl">
                Hosts and guests can see your profile and it may appear across StudySpace to help us build trust in our community.{" "}
                <span className="underline font-bold text-stone-800 cursor-pointer">Learn more</span>
              </p>
            </div>

            {/* 2-Column Grid matching reference image pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">

              {/* Left Column Fields */}
              <div className="space-y-3.5">
                {leftFields.map((field) => (
                  <div
                    key={field.id}
                    onClick={() => openModal(field)}
                    className="p-3.5 border border-stone-200/80 rounded-2xl flex items-center justify-between hover:border-stone-800 transition cursor-pointer bg-white shadow-xs group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {field.icon}
                      <p className="text-xs font-medium text-[#222222] truncate">
                        <span className="font-bold">{field.label}:</span>{" "}
                        {field.value ? (
                          <span>{field.value}</span>
                        ) : (
                          <span className="text-stone-400 font-normal">(click to add)</span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-black shrink-0 transition" />
                  </div>
                ))}
              </div>

              {/* Right Column Fields */}
              <div className="space-y-3.5">
                {rightFields.map((field) => (
                  <div
                    key={field.id}
                    onClick={() => !field.readOnly && openModal(field)}
                    className={`p-3.5 border border-stone-200/80 rounded-2xl flex items-center justify-between transition bg-white shadow-xs ${field.readOnly ? "cursor-default" : "hover:border-stone-800 cursor-pointer group"
                      }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      {field.icon}
                      <p className="text-xs font-medium text-[#222222] truncate">
                        <span className="font-bold">{field.label}:</span>{" "}
                        {field.value ? (
                          <span>{field.value}</span>
                        ) : (
                          <span className="text-stone-400 font-normal">(click to add)</span>
                        )}
                      </p>
                    </div>
                    {!field.readOnly && (
                      <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-black shrink-0 transition" />
                    )}
                  </div>
                ))}
              </div>

            </div>

          </div>

        </div>

        {/* Section 2: About Me (Dashed Box Intro) */}
        <div className="mt-14 space-y-4">
          <h2 className="text-2xl font-bold text-[#222222]">About me</h2>

          <div className="border-2 border-dashed border-stone-300 rounded-3xl p-8 bg-stone-50/50 space-y-3 max-w-2xl">
            {bio ? (
              <p className="text-sm font-medium text-[#222222] leading-relaxed">
                {bio}
              </p>
            ) : (
              <p className="text-sm text-stone-500 font-medium">
                Write something fun and punchy.
              </p>
            )}

            <button
              type="button"
              onClick={() => setBioModalOpen(true)}
              className="font-extrabold text-sm text-[#222222] underline cursor-pointer hover:text-black block pt-1"
            >
              {bio ? "Edit intro" : "Add intro"}
            </button>
          </div>
        </div>

        {/* Bottom Right Floating Done Button */}
        <div className="mt-16 flex items-center justify-end">
          <button
            type="button"
            onClick={() => router.push("/owner/libraries/create")}
            className="bg-[#222222] hover:bg-black text-white font-bold text-sm px-8 py-3.5 rounded-2xl shadow-md transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>

      {/* Field Edit Modal */}
      {modalOpen && activeField && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-md w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-[#222222] flex items-center gap-2">
                {activeField.icon}
                <span>{activeField.title}</span>
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 text-stone-400 hover:text-black rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 font-medium">
              {activeField.description}
            </p>

            <input
              type="text"
              value={modalInputValue}
              onChange={(e) => setModalInputValue(e.target.value)}
              placeholder={activeField.placeholder}
              maxLength={activeField.maxLength || 50}
              className="w-full text-xs font-medium p-3.5 border border-stone-300 focus:border-black rounded-2xl outline-none bg-white text-[#222222]"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-xs font-bold text-stone-500 hover:text-black px-4 py-2.5 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveModal}
                disabled={saving}
                className="bg-[#222222] hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bio Intro Modal */}
      {bioModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-stone-200 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-[#222222]">Edit Host Intro</h3>
              <button
                type="button"
                onClick={() => setBioModalOpen(false)}
                className="p-1 text-stone-400 hover:text-black rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-stone-500 font-medium">
              Write a short introduction for your library members and students.
            </p>

            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Welcome to StudySpace! We offer quiet climate-controlled study rooms with high speed Wi-Fi."
              rows={4}
              maxLength={300}
              className="w-full text-xs font-medium p-3.5 border border-stone-300 focus:border-black rounded-2xl outline-none bg-white text-[#222222] resize-none"
              autoFocus
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBioModalOpen(false)}
                className="text-xs font-bold text-stone-500 hover:text-black px-4 py-2.5 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveBio}
                disabled={saving}
                className="bg-[#222222] hover:bg-black text-white text-xs font-bold px-5 py-2.5 rounded-xl transition cursor-pointer flex items-center gap-2"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Save Intro</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
