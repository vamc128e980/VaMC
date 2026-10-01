"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Edit3, Check, X } from "lucide-react";

export default function AdminHeader() {
  const [shopName, setShopName] = useState("VaMC Luxury Dining");
  const [tagline, setTagline] = useState("Fine-Dine Operations");
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempTagline, setTempTagline] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      const { data } = await supabase
        .from("restaurant_settings")
        .select("*")
        .eq("id", 1)
        .single();
      if (data) {
        setShopName(data.restaurant_name);
        setTagline(data.tagline);
      }
    }
    fetchSettings();
  }, []);

  const handleEditOpen = () => {
    setTempName(shopName);
    setTempTagline(tagline);
    setIsEditing(true);
  };

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from("restaurant_settings")
      .upsert({ id: 1, restaurant_name: tempName, tagline: tempTagline, updated_at: new Date().toISOString() });

    if (!error) {
      setShopName(tempName);
      setTagline(tempTagline);
      setIsEditing(false);
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center gap-4 py-2">
      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
        <ShieldCheck className="w-6 h-6" />
      </div>

      {!isEditing ? (
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md">
                Admin Console
              </span>
              <h1 className="text-xl md:text-2xl font-black tracking-wide text-white uppercase">
                {shopName}
              </h1>
            </div>
            <p className="text-xs text-neutral-400 font-mono tracking-wider">
              {tagline}
            </p>
          </div>
          <button
            onClick={handleEditOpen}
            className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 transition"
            title="Edit Shop Name"
          >
            <Edit3 className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="space-y-1">
            <input
              type="text"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              placeholder="Shop Name"
              className="bg-neutral-900 border border-amber-500/50 rounded-lg px-2.5 py-1 text-sm text-white focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              value={tempTagline}
              onChange={(e) => setTempTagline(e.target.value)}
              placeholder="Tagline / Subtitle"
              className="bg-neutral-900 border border-neutral-700 rounded-lg px-2.5 py-1 text-xs text-neutral-300 focus:outline-none focus:border-neutral-500 block w-full"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={loading}
            className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-400 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}