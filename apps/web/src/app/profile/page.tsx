"use client";

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AppContext";
import { useToast } from "../../context/ToastContext";
import { User, Camera, Loader2, Save, Briefcase, Target, BookOpen, Heart, Building, Award } from "lucide-react";

export default function ProfilePage() {
  const { user, token, updateUser } = useAuth();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [bio, setBio] = useState("");
  const [occupation, setOccupation] = useState("");
  const [hobbies, setHobbies] = useState("");
  const [currentlyDoing, setCurrentlyDoing] = useState("");
  const [targetGoal, setTargetGoal] = useState("");
  const [businessInfo, setBusinessInfo] = useState("");
  const [experience, setExperience] = useState("");
  const [description, setDescription] = useState("");

  // Fetch complete user profile data
  useEffect(() => {
    if (!token) return;

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
          setPhone(data.phone || "");
          setAvatarUrl(data.avatarUrl || null);
          setBio(data.bio || "");
          setOccupation(data.occupation || "");
          setHobbies(data.hobbies || "");
          setCurrentlyDoing(data.currentlyDoing || "");
          setTargetGoal(data.targetGoal || "");
          setBusinessInfo(data.businessInfo || "");
          setExperience(data.experience || "");
          setDescription(data.description || "");
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // Handle Avatar S3 Upload via Presigned PUT URL
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !token) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast("Avatar image must be smaller than 5MB", "error");
      return;
    }

    setUploadingAvatar(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1";
      
      // 1. Request presigned PUT upload URL
      const urlRes = await fetch(`${apiBase}/auth/avatar/upload-url`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName: file.name, fileType: file.type }),
      });

      if (!urlRes.ok) throw new Error("Failed to generate avatar upload URL");
      const { uploadUrl, key } = await urlRes.json();

      // 2. Direct S3 Upload via Presigned PUT URL
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Failed to upload avatar image to S3");

      // 3. Update User profile with object key
      const updateRes = await fetch(`${apiBase}/users/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ avatarUrl: key }),
      });

      if (!updateRes.ok) throw new Error("Failed to update user profile photo");
      const updatedData = await updateRes.json();

      setAvatarUrl(updatedData.avatarUrl);
      if (user) {
        updateUser({ ...user, avatarUrl: updatedData.avatarUrl });
      }
      showToast("Profile picture updated successfully!", "success");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      showToast(err.message || "Failed to upload avatar", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save profile changes
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
        body: JSON.stringify({
          name,
          phone,
          bio,
          occupation,
          hobbies,
          currentlyDoing,
          targetGoal,
          businessInfo,
          experience,
          description,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to update profile");
      }

      const updatedUser = await res.json();
      updateUser(updatedUser);
      showToast("Profile updated successfully!", "success");
    } catch (err: any) {
      console.error("Save profile error:", err);
      showToast(err.message || "Failed to update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center text-sm text-gray-500">
        <Loader2 className="w-5 h-5 animate-spin mr-2 text-brand" /> Loading profile...
      </div>
    );
  }

  const isOwner = user?.role === "OWNER";

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Profile Card Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative group">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-2 border-gray-100 shadow-md"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-slate-900 text-white flex items-center justify-center text-3xl font-bold border-2 border-gray-100 shadow-md">
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-brand text-white p-2 rounded-full shadow-md hover:bg-brand-hover transition cursor-pointer disabled:opacity-50"
              title="Change Profile Photo"
            >
              {uploadingAvatar ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>

          <div className="text-center sm:text-left space-y-1">
            <h1 className="text-2xl font-black text-gray-900">{name}</h1>
            <p className="text-sm font-medium text-gray-500">{user?.email}</p>
            <div className="inline-flex items-center gap-2 mt-2">
              <span className="text-xs font-extrabold tracking-wider uppercase bg-brand/10 text-brand px-3 py-1 rounded-full border border-brand/20">
                {isOwner ? "Library Owner" : "Student"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold text-gray-900 border-b border-gray-100 pb-4">
            Edit Personal Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full border border-gray-200 bg-gray-50 rounded-lg p-3 text-gray-500 text-sm outline-none cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                Current Occupation
              </label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={isOwner ? "e.g. Business Owner / Administrator" : "e.g. UPSC Aspirant / Software Engineer"}
                className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
              Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us a little bit about yourself..."
              className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
            />
          </div>

          {/* Role-Specific Profile Fields */}
          {!isOwner ? (
            /* Student Fields */
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Student Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-brand" /> Hobbies & Interests
                  </label>
                  <input
                    type="text"
                    value={hobbies}
                    onChange={(e) => setHobbies(e.target.value)}
                    placeholder="e.g. Reading, Chess, Coding"
                    className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-brand" /> Currently Preparation / Focus
                  </label>
                  <input
                    type="text"
                    value={currentlyDoing}
                    onChange={(e) => setCurrentlyDoing(e.target.value)}
                    placeholder="e.g. Preparing for GATE 2027"
                    className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-brand" /> Target Goal
                </label>
                <input
                  type="text"
                  value={targetGoal}
                  onChange={(e) => setTargetGoal(e.target.value)}
                  placeholder="e.g. Secure AIR under 100"
                  className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
                />
              </div>
            </div>
          ) : (
            /* Owner Fields */
            <div className="space-y-6 pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Business & Host Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-brand" /> Business Information / Company Name
                  </label>
                  <input
                    type="text"
                    value={businessInfo}
                    onChange={(e) => setBusinessInfo(e.target.value)}
                    placeholder="e.g. Apex Learning Hubs Pvt Ltd"
                    className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-brand" /> Hosting Experience
                  </label>
                  <input
                    type="text"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    placeholder="e.g. 5+ years managing library space"
                    className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Business Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide an overview of your library amenities, study environment, and operational guidelines..."
                  className="w-full border border-gray-300 focus:border-brand focus:ring-1 focus:ring-brand rounded-lg p-3 outline-none text-gray-800 text-sm transition"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={saving}
              className="bg-brand hover:bg-brand-hover text-white text-sm font-semibold px-6 py-3 rounded-lg transition shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Saving Changes..." : "Save Profile"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
