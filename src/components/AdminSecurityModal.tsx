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
      // 1. Verify current admin record
      const { data: currentAdmin, error: fetchErr } = await supabase
        .from("staff_accounts")
        .select("id, identifier, password_hash")
        .eq("role", "admin")
        .single();

      if (fetchErr || !currentAdmin) {
        setStatusMsg({ type: "error", text: "Admin account not found." });
        setLoading(false);
        return;
      }

      if (currentAdmin.password_hash !== currentPassword.trim()) {
        setStatusMsg({ type: "error", text: "Incorrect current security key." });
        setLoading(false);
        return;
      }

      // 2. Prepare payload
      const updates: { identifier?: string; password_hash?: string } = {};
      if (newEmail.trim()) updates.identifier = newEmail.trim();
      if (newPassword.trim()) updates.password_hash = newPassword.trim();

      if (Object.keys(updates).length === 0) {
        setStatusMsg({ type: "error", text: "Please provide an email or new password." });
        setLoading(false);
        return;
      }

      // 3. Update in Supabase
      const { error: updateErr } = await supabase
        .from("staff_accounts")
        .update(updates)
        .eq("id", currentAdmin.id);

      if (updateErr) {
        setStatusMsg({ type: "error", text: updateErr.message });
      } else {
        setStatusMsg({ type: "success", text: "Credentials updated successfully! Use new login next time." });
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPassword("");
        setNewEmail("");
      }
    } catch {
      setStatusMsg({ type: "error", text: "Failed to update credentials." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Owner Security Vault</h2>
            <p className="text-xs text-neutral-400">Update Admin access email & password</p>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`flex items-center gap-2 p-3 mb-4 rounded-xl text-xs ${
              statusMsg.type === "success"
                ? "bg-emerald-950/60 border border-emerald-800 text-emerald-300"
                : "bg-red-950/60 border border-red-800 text-red-300"
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
            <label className="text-xs font-mono text-neutral-400 uppercase">New Admin Email (Optional)</label>
            <div className="relative flex items-center mt-1">
              <Mail className="w-4 h-4 absolute left-3 text-neutral-500" />
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Leave blank to keep existing"
                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-neutral-400 uppercase">Current Password (Required)</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password to verify"
              className="w-full px-3 py-2 mt-1 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-mono text-neutral-400 uppercase">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New key"
                className="w-full px-3 py-2 mt-1 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-neutral-400 uppercase">Confirm</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter key"
                className="w-full px-3 py-2 mt-1 bg-neutral-950 border border-neutral-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500 transition"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-neutral-800 text-neutral-300 hover:bg-neutral-700 text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:brightness-110 text-black font-semibold text-sm flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>{loading ? "Saving..." : "Save Changes"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}