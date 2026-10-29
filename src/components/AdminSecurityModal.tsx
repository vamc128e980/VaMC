"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { KeyRound, Mail, Check, X, ShieldAlert, CheckCircle2 } from "lucide-react";

interface AdminSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSecurityModal({ isOpen, onClose }: AdminSecurityModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    if (newPassword && newPassword !== confirmPassword) {
      setStatusMsg({ type: "error", text: "New passwords do not match." });
      return;
    }

    setLoading(true);

    try {
      // 1. Fetch current admin record
      const { data: currentAdmin, error: fetchErr } = await supabase
        .from("staff_accounts")
        .select("id, identifier, password_hash")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (fetchErr || !currentAdmin) {
        setStatusMsg({ type: "error", text: "Master Admin account not found in database." });
        setLoading(false);
        return;
      }

      // 2. Verify current password
      if (currentAdmin.password_hash !== currentPassword.trim()) {
        setStatusMsg({ type: "error", text: "Incorrect current password. Verification failed." });
        setLoading(false);
        return;
      }

      // 3. Prepare payload
      const updates: { identifier?: string; password_hash?: string; updated_at?: string } = {
        updated_at: new Date().toISOString()
      };
      if (newEmail.trim()) updates.identifier = newEmail.trim();
      if (newPassword.trim()) updates.password_hash = newPassword.trim();

      if (!newEmail.trim() && !newPassword.trim()) {
        setStatusMsg({ type: "error", text: "Please enter a new email or new password." });
        setLoading(false);
        return;
      }

      // 4. Update in staff_accounts
      const { error: updateErr } = await supabase
        .from("staff_accounts")
        .update(updates)
        .eq("id", currentAdmin.id);

      if (updateErr) {
        setStatusMsg({ type: "error", text: updateErr.message });
      } else {
        setStatusMsg({ type: "success", text: "Admin credentials updated! Use your new password next time." });
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPassword("");
        setNewEmail("");
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Failed to update admin credentials." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-[#0d0d0f] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-2xl relative font-mono text-xs">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5 border-b border-white/10 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white font-sans uppercase">Owner Security Vault</h2>
            <p className="text-[11px] text-neutral-400 font-mono">Update Master Admin Email & Password</p>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`flex items-center gap-2 p-3 mb-4 rounded-2xl text-xs ${
              statusMsg.type === "success"
                ? "bg-emerald-950/60 border border-emerald-500/50 text-emerald-300"
                : "bg-rose-950/60 border border-rose-500/50 text-rose-300"
            }`}
          >
            {statusMsg.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleUpdateCredentials} className="space-y-3.5">
          <div>
            <label className="text-[10px] text-neutral-400 uppercase block mb-1">New Admin Email / Login ID (Optional)</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 absolute left-3 text-neutral-500" />
              <input
                type="text"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Leave blank to keep existing"
                className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white outline-none focus:border-[#D4AF37] transition"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-amber-300 uppercase block mb-1">Current Password * (Verification)</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current master password"
              className="w-full px-3 py-2 bg-white/[0.03] border border-amber-400/40 rounded-xl text-white outline-none focus:border-[#D4AF37] transition font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New key"
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white outline-none focus:border-[#D4AF37] transition font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1">Confirm New</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat key"
                className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white outline-none focus:border-[#D4AF37] transition font-mono"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-neutral-300 text-xs font-bold transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{loading ? "Verifying..." : "Update Vault"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}