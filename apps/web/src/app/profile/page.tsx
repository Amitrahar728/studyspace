"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import {
  Camera,
  Loader2,
  X,
  ChevronRight,
  Briefcase,
  User,
  Mail,
  Phone,
  Heart,
  BookOpen,
  Target,
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
}

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // DB-backed user profile state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [currentlyDoing, setCurrentlyDoing] = useState("");
  const [targetGoal, setTargetGoal] = useState("");

  // Modal active state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeField, setActiveField] = useState<ProfileField | null>(null);
  const [modalInputValue, setModalInputValue] = useState("");

  // Fetch complete profile from backend DB
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
          setOccupation(data.occupation || "");
          setHobbies(data.hobbies || "");
          setCurrentlyDoing(data.currentlyDoing || "");
          setTargetGoal(data.targetGoal || "");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, user]);

  // Avatar Upload to S3
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Avatar image must be smaller than 5MB", "error");
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

          showToast("Profile photo uploaded to S3 successfully!", "success");
        } catch (err: any) {
          console.error("Avatar upload error:", err);
          showToast(err.message || "Failed to upload photo to S3", "error");
        } finally {
          setUploadingAvatar(false);
        }
      };

      reader.onerror = () => {
        showToast("Error reading selected photo file", "error");
        setUploadingAvatar(false);
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      showToast(err.message || "Failed to upload photo to S3", "error");
      setUploadingAvatar(false);
    }
  };

  // Open Edit Modal for a given field
  const openModal = (field: ProfileField) => {
    setActiveField(field);
    setModalInputValue(field.value);
    setModalOpen(true);
  };

  // Save Modal Field to DB
  const handleSaveModal = async () => {
    if (!activeField) return;

    const val = modalInputValue.trim();
    const fieldId = activeField.id;

    // Update local state
    if (fieldId === "name") setName(val);
    else if (fieldId === "phone") setPhone(val);
    else if (fieldId === "bio") setBio(val);
    else if (fieldId === "occupation") setOccupation(val);
    else if (fieldId === "hobbies") setHobbies(val);
    else if (fieldId === "currentlyDoing") setCurrentlyDoing(val);
    else if (fieldId === "targetGoal") setTargetGoal(val);

    setModalOpen(false);

    // Save directly to DB via API
    if (token) {
      setSaving(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
        const updateBody: any = {};
        if (fieldId === "name") updateBody.name = val;
        if (fieldId === "phone") updateBody.phone = val;
        if (fieldId === "bio") updateBody.bio = val;
        if (fieldId === "occupation") updateBody.occupation = val;
        if (fieldId === "hobbies") updateBody.hobbies = val;
        if (fieldId === "currentlyDoing") updateBody.currentlyDoing = val;
        if (fieldId === "targetGoal") updateBody.targetGoal = val;

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
            showToast("Profile saved to database!", "success");
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

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-indigo-600" /> Loading profile...
      </div>
    );
  }

  // Strictly DB-backed Profile Fields
  const profileFields: ProfileField[] = [
    {
      id: "name",
      icon: <User className="w-4 h-4 text-gray-700" />,
      label: "Full Name",
      title: "What is your name?",
      description: "Enter your full name for your profile.",
      placeholder: "Enter your name",
      value: name,
      maxLength: 50,
    },
    {
      id: "email",
      icon: <Mail className="w-4 h-4 text-gray-700" />,
      label: "Email Address",
      title: "Your email address",
      description: "Your primary account email address.",
      placeholder: "enter mail",
      value: email,
      maxLength: 60,
    },
    {
      id: "phone",
      icon: <Phone className="w-4 h-4 text-gray-700" />,
      label: "Phone Number",
      title: "What is your phone number?",
      description: "Enter your phone number so hosts or students can connect with you.",
      placeholder: "enter phone number",
      value: phone,
      maxLength: 20,
    },
    {
      id: "occupation",
      icon: <Briefcase className="w-4 h-4 text-gray-700" />,
      label: "Current Occupation / Work",
      title: "What is your occupation?",
      description: "Tell others about your work or field of study.",
      placeholder: "e.g. Software Engineer / Student",
      value: occupation,
      maxLength: 50,
    },
    {
      id: "hobbies",
      icon: <Heart className="w-4 h-4 text-gray-700" />,
      label: "Hobbies & Interests",
      title: "What are your hobbies & interests?",
      description: "Share what you love doing in your free time.",
      placeholder: "e.g. Reading, Coding, Cricket",
      value: hobbies,
      maxLength: 60,
    },
    {
      id: "currentlyDoing",
      icon: <BookOpen className="w-4 h-4 text-gray-700" />,
      label: "Currently Preparing / Focus",
      title: "What are you currently preparing for?",
      description: "Share your current exam or project focus.",
      placeholder: "e.g. UPSC Exam / Semester Finals",
      value: currentlyDoing,
      maxLength: 60,
    },
    {
      id: "targetGoal",
      icon: <Target className="w-4 h-4 text-gray-700" />,
      label: "Target Goal",
      title: "What is your target goal?",
      description: "Set a clear goal for your study milestones.",
      placeholder: "e.g. Clear GATE with Top Rank",
      value: targetGoal,
      maxLength: 60,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 py-10 px-4 sm:px-8 lg:px-16 selection:bg-indigo-100 font-sans">
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-12 lg:gap-16">

        {/* Left Column - Large Avatar Ring */}
        <div className="flex flex-col items-center md:items-start shrink-0">
          <div className="relative group">
            <div className="w-44 h-44 sm:w-52 sm:h-52 rounded-full bg-[#ECE6FE] text-[#582BE8] flex items-center justify-center text-6xl sm:text-7xl font-bold shadow-sm overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || "User Avatar"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{(name || "U").charAt(0).toUpperCase()}</span>
              )}
            </div>

            {/* Small Floating Camera Add Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-white text-gray-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-md border border-gray-200 hover:bg-gray-50 transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {uploadingAvatar ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5 text-gray-700" />
              )}
              <span>Add</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
        </div>

        {/* Right Main Content */}
        <div className="flex-1 space-y-10">

          {/* Header Title & Subtitle */}
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
              My profile
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl leading-relaxed">
              Hosts and guests can see your profile and it may appear across StudySpace to help us build trust in our community.{" "}
              <a href="#" className="underline font-semibold text-gray-800">Learn more</a>
            </p>
          </div>

          {/* DB-Backed Profile Details Fact Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {profileFields.map((field) => (
              <div
                key={field.id}
                onClick={() => {
                  if (field.id !== "email") openModal(field);
                }}
                className={`flex items-center justify-between py-3.5 border-b border-gray-200/80 rounded-lg px-2 transition ${field.id !== "email" ? "hover:bg-gray-50/80 cursor-pointer group" : "cursor-default opacity-85"
                  }`}
              >
                <div className="flex items-center gap-3 pr-2 min-w-0">
                  <span className="shrink-0">{field.icon}</span>
                  <span className="text-sm font-medium text-gray-800 truncate">
                    {field.label}
                    {field.value ? (
                      <span className="text-gray-900 font-semibold">: {field.value}</span>
                    ) : (
                      <span className="text-gray-400 font-normal"> (click to add)</span>
                    )}
                  </span>
                </div>
                {field.id !== "email" && (
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-700 shrink-0 transition" />
                )}
              </div>
            ))}
          </div>

          {/* About Me Section */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900">About me</h2>

            <div
              onClick={() =>
                openModal({
                  id: "bio",
                  icon: <User className="w-4 h-4 text-gray-700" />,
                  label: "About me",
                  title: "Write your intro",
                  description: "Tell the StudySpace community about your learning habits, goals, or background.",
                  placeholder: "Write something fun and punchy.",
                  value: bio,
                  maxLength: 200,
                })
              }
              className="border border-dashed border-gray-400/80 rounded-2xl p-6 sm:p-8 hover:border-gray-600 transition cursor-pointer space-y-2 bg-gray-50/40"
            >
              <p className="text-sm text-gray-500 font-medium">
                {bio || "Write something fun and punchy."}
              </p>
              <button className="text-sm font-bold text-gray-900 underline hover:text-black">
                {bio ? "Edit intro" : "Add intro"}
              </button>
            </div>
          </div>

          {/* Bottom Action - Done Button */}
          <div className="pt-6 flex justify-end border-t border-gray-100">
            <button
              onClick={() => showToast("Profile saved!", "success")}
              className="bg-[#222222] hover:bg-black text-white text-sm font-bold px-8 py-3 rounded-xl shadow-md transition cursor-pointer"
            >
              Done
            </button>
          </div>

        </div>
      </div>

      {/* Interactive Profile Edit Modal Component */}
      {modalOpen && activeField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6 relative border border-gray-100">

            {/* Top Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="text-gray-500 hover:text-gray-900 transition p-1 rounded-full hover:bg-gray-100 focus:outline-none cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Title & Description */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
                {activeField.title}
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed font-normal">
                {activeField.description}
              </p>
            </div>

            {/* Input Box */}
            <div className="space-y-1.5">
              <div className="relative">
                {activeField.id === "bio" ? (
                  <textarea
                    rows={4}
                    value={modalInputValue}
                    onChange={(e) =>
                      setModalInputValue(e.target.value.slice(0, activeField.maxLength || 200))
                    }
                    placeholder={activeField.placeholder}
                    className="w-full border border-gray-400 focus:border-gray-900 rounded-2xl p-4 text-sm outline-none text-gray-800 transition font-medium placeholder:text-gray-400"
                  />
                ) : (
                  <input
                    type="text"
                    value={modalInputValue}
                    onChange={(e) =>
                      setModalInputValue(e.target.value.slice(0, activeField.maxLength || 60))
                    }
                    placeholder={activeField.placeholder}
                    className="w-full border border-gray-400 focus:border-gray-900 rounded-2xl p-4 text-sm outline-none text-gray-800 transition font-medium placeholder:text-gray-400"
                  />
                )}
              </div>

              {/* Character Counter */}
              <div className="flex justify-end pr-2">
                <span className="text-[11px] font-bold text-gray-400">
                  {activeField.maxLength
                    ? `${activeField.maxLength - modalInputValue.length} characters available`
                    : "40 characters available"}
                </span>
              </div>
            </div>

            {/* Bottom Modal Actions */}
            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveModal}
                disabled={saving}
                className="bg-[#222222] hover:bg-black text-white text-sm font-bold px-7 py-3 rounded-xl transition shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                <span>{saving ? "Saving..." : "Save"}</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
