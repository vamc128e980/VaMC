// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { 
  UserCheck, 
  X, 
  Trash2, 
  Plus, 
  Eye, 
  EyeOff, 
  ShieldAlert, 
  Lock, 
  User, 
  KeyRound,
  Check
} from 'lucide-react';

const iosSpring = {
  type: 'spring',
  stiffness: 380,
  damping: 28,
  mass: 0.6
};

interface WaiterSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WaiterSecurityModal({ isOpen, onClose }: WaiterSecurityModalProps) {
  const [waiters, setWaiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPassMap, setShowPassMap] = useState<Record<number, boolean>>({});

  // New Waiter Form States
  const [newWaiterName, setNewWaiterName] = useState('');
  const [newWaiterIdentifier, setNewWaiterIdentifier] = useState('');
  const [newWaiterPassword, setNewWaiterPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchWaiters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .eq('role', 'waiter')
        .order('id', { ascending: true });

      if (error) throw error;
      if (data) setWaiters(data);
    } catch (err: any) {
      console.error('Fetch waiters error:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWaiters();
      setFormError('');
    }
  }, [isOpen]);

  const handleAddWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const cleanName = newWaiterName.trim();
    const cleanId = newWaiterIdentifier.trim().toLowerCase();
    const cleanPass = newWaiterPassword.trim();

    if (!cleanName || !cleanId || !cleanPass) {
      setFormError('All fields (Name, Login ID, Password) are mandatory.');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_accounts')
        .insert({
          name: cleanName,
          identifier: cleanId,
          password_hash: cleanPass,
          role: 'waiter'
        })
        .select();

      if (error) throw error;

      setNewWaiterName('');
      setNewWaiterIdentifier('');
      setNewWaiterPassword('');
      await fetchWaiters();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add waiter.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWaiter = async (waiterId: number, name: string) => {
    if (!confirm(`Are you sure you want to delete account for "${name}"?`)) return;
    try {
      setLoading(true);
      const { error } = await supabase
        .from('staff_accounts')
        .delete()
        .eq('id', waiterId);

      if (error) throw error;
      await fetchWaiters();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleShowPass = (id: number) => {
    setShowPassMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.92, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.92, opacity: 0 }}
          transition={iosSpring}
          className="w-full max-w-xl bg-[#0c0c0e] border border-[#D4AF37]/40 rounded-3xl p-6 shadow-[0_20px_60px_rgba(0,0,0,0.9)] relative space-y-5 max-h-[88vh] overflow-y-auto no-scrollbar font-mono text-xs select-none"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/35 flex items-center justify-center text-[#D4AF37]">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-white text-base uppercase tracking-wider">Waiter Security Suite</h3>
                <p className="text-[10px] text-neutral-400">Manage floor crew access credentials</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl border border-white/10 text-neutral-400 hover:text-white hover:border-[#D4AF37]/50 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form to Add New Waiter */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
            <span className="text-[11px] font-bold text-[#FCF6BA] uppercase flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-[#D4AF37]" /> Create Waiter Login
            </span>

            {formError && (
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-[11px]">
                {formError}
              </div>
            )}

            <form onSubmit={handleAddWaiter} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Staff Name</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Ramesh"
                      value={newWaiterName}
                      onChange={(e) => setNewWaiterName(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Login ID / Username</label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. waiter1"
                      value={newWaiterIdentifier}
                      onChange={(e) => setNewWaiterIdentifier(e.target.value)}
                      className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-neutral-400 block mb-1">Terminal Password</label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={newWaiterPassword}
                    onChange={(e) => setNewWaiterPassword(e.target.value)}
                    className="w-full bg-black/60 border border-white/10 rounded-xl pl-9 pr-10 py-2 text-white outline-none focus:border-[#D4AF37]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
                  >
                    {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#FCF6BA] via-[#D4AF37] to-[#C59B27] text-black font-black uppercase tracking-wider text-xs shadow-md cursor-pointer hover:brightness-110 transition disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Waiter Staff'}
              </button>
            </form>
          </div>

          {/* Existing Waiters List */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-neutral-400 uppercase block">
              Active Crew Accounts ({waiters.length}):
            </span>

            {waiters.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 text-center text-neutral-500">
                No waiter accounts configured yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar pr-1">
                {waiters.map((w) => {
                  const isPassVisible = !!showPassMap[w.id];

                  return (
                    <div
                      key={w.id}
                      className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <div className="space-y-0.5">
                        <span className="text-white font-bold block">{w.name || 'Unnamed Staff'}</span>
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                          <span>ID: <strong className="text-[#FCF6BA]">{w.identifier}</strong></span>
                          <span>•</span>
                          <span>Pass: <strong className="text-white">{isPassVisible ? w.password_hash : '••••••'}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleShowPass(w.id)}
                          className="p-1.5 rounded-lg border border-white/10 bg-black/40 text-neutral-300 hover:text-white cursor-pointer"
                          title={isPassVisible ? 'Hide Password' : 'Show Password'}
                        >
                          {isPassVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5 text-[#D4AF37]" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteWaiter(w.id, w.name || w.identifier)}
                          className="p-1.5 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/50 cursor-pointer"
                          title="Delete Waiter Account"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-white/10 text-right">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-white/[0.05] border border-white/10 hover:border-[#D4AF37]/50 text-white font-bold uppercase tracking-wider text-xs transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}