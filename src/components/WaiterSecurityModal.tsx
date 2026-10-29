// @ts-nocheck
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserCheck, 
  KeyRound, 
  Trash2, 
  Plus, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Sparkles,
  Edit2
} from 'lucide-react';

const butterSpring = { type: 'spring', stiffness: 420, damping: 30, mass: 0.6 };

export default function WaiterSecurityModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [waiters, setWaiters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // New Waiter Details
  const [newName, setNewName] = useState('');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Editing States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'name' | 'identifier' | 'password' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const [showPassMap, setShowPassMap] = useState<Record<number, boolean>>({});

  const fetchWaiters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .eq('role', 'waiter')
        .order('id', { ascending: true });
      if (data) setWaiters(data);
    } catch (err) {
      console.error('Waiters fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWaiters();
      setShowAddForm(false);
      cancelEdit();
    }
  }, [isOpen]);

  const cancelEdit = () => {
    setEditingId(null);
    setEditMode(null);
    setTempValue('');
  };

  if (!isOpen) return null;

  // 1. Add Waiter with explicit Phone/Username Identifier
  const handleAddWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const cleanId = newIdentifier.trim().toLowerCase();
    const cleanPass = newPassword.trim();

    if (!cleanName) return alert('Waiter Name enter cheyandi.');
    if (!cleanId) return alert('Mobile number or Username enter cheyandi.');
    if (!cleanPass) return alert('Password/PIN enter cheyandi.');

    setLoading(true);
    try {
      const { error } = await supabase.from('staff_accounts').insert({
        name: cleanName,
        role: 'waiter',
        identifier: cleanId,
        password_hash: cleanPass,
        is_active: true
      });

      if (error) {
        if (error.message.includes('unique') || error.code === '23505') {
          throw new Error(`"${cleanId}" ID tho already account undi. Vere phone/username ivvandi!`);
        }
        throw error;
      }

      setNewName('');
      setNewIdentifier('');
      setNewPassword('');
      setShowAddForm(false);
      await fetchWaiters();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Change Name
  const handleSaveName = async (waiterId: number) => {
    const cleanName = tempValue.trim();
    if (!cleanName) return alert('Name empty ga undakudadhu.');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('staff_accounts')
        .update({ 
          name: cleanName,
          updated_at: new Date().toISOString()
        })
        .eq('id', waiterId);

      if (error) throw error;
      cancelEdit();
      await fetchWaiters();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Change Login ID (Phone / Username)
  const handleSaveIdentifier = async (waiterId: number) => {
    const cleanId = tempValue.trim().toLowerCase();
    if (!cleanId) return alert('Identifier empty ga undakudadhu.');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('staff_accounts')
        .update({ 
          identifier: cleanId,
          updated_at: new Date().toISOString()
        })
        .eq('id', waiterId);

      if (error) throw error;
      cancelEdit();
      await fetchWaiters();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4. Change Password / PIN
  const handleSavePassword = async (waiterId: number) => {
    const cleanPass = tempValue.trim();
    if (!cleanPass) return alert('Password empty ga undakudadhu.');

    setLoading(true);
    try {
      const { error } = await supabase
        .from('staff_accounts')
        .update({ 
          password_hash: cleanPass,
          updated_at: new Date().toISOString()
        })
        .eq('id', waiterId);

      if (error) throw error;
      cancelEdit();
      await fetchWaiters();
    } catch (err: any) {
      alert('Password update error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 5. Delete Waiter
  const handleDeleteWaiter = async (waiterId: number, name: string) => {
    if (!confirm(`Are you sure? "${name}" waiter account delete aipothundi.`)) return;
    try {
      await supabase.from('staff_accounts').delete().eq('id', waiterId);
      await fetchWaiters();
    } catch (err: any) {
      alert('Delete failed: ' + err.message);
    }
  };

  const toggleShowPass = (id: number) => {
    setShowPassMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={butterSpring}
        className="w-full max-w-xl bg-[#0c0c0e] border border-[#D4AF37]/50 rounded-[32px] p-6 shadow-2xl relative space-y-4 max-h-[85vh] overflow-y-auto custom-gold-scrollbar font-mono text-xs"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base font-sans uppercase">Waiters & Staff Directory</h3>
              <p className="text-[11px] text-neutral-400">Manage Waiter Logins, PINs & Access</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex justify-between items-center pt-1">
          <span className="text-xs text-neutral-400 uppercase font-bold">
            Active: <strong className="text-white">{waiters.length} Waiters</strong>
          </span>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3.5 py-2 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{showAddForm ? 'Close Form' : '+ Add Waiter'}</span>
          </motion.button>
        </div>

        {/* Add Waiter Form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={butterSpring}
              onSubmit={handleAddWaiter}
              className="p-4 rounded-2xl bg-white/[0.02] border border-[#D4AF37]/40 space-y-3 overflow-hidden shadow-lg"
            >
              <div className="font-bold text-[#FCF6BA] flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Create Waiter Account
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-neutral-400 block mb-1">Staff Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">Login ID (Phone/User) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210"
                    value={newIdentifier}
                    onChange={(e) => setNewIdentifier(e.target.value)}
                    className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">4-Digit PIN / Password *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 1234"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md mt-1 cursor-pointer"
              >
                {loading ? 'Creating Account...' : 'Save Waiter Account'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Waiters Directory */}
        <div className="space-y-2.5">
          {waiters.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 rounded-2xl bg-white/[0.02] border border-white/5">
              No waiter accounts yet. Add one above!
            </div>
          ) : (
            waiters.map((w) => {
              const isEditingThis = editingId === w.id;
              const isPassVisible = showPassMap[w.id];

              return (
                <div
                  key={w.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  {/* Staff Name & ID */}
                  <div className="space-y-1">
                    {/* Name Edit */}
                    {isEditingThis && editMode === 'name' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          className="bg-[#161619] border border-[#D4AF37] rounded-lg px-2.5 py-1 text-white text-xs outline-none font-bold"
                          placeholder="New Name"
                        />
                        <button
                          onClick={() => handleSaveName(w.id)}
                          className="p-1 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button onClick={cancelEdit} className="p-1 rounded-lg bg-white/10 text-neutral-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{w.name}</span>
                        <button
                          onClick={() => {
                            setEditingId(w.id);
                            setEditMode('name');
                            setTempValue(w.name);
                          }}
                          className="p-1 rounded hover:bg-white/10 text-neutral-400 hover:text-white"
                        >
                          <Edit2 className="w-3 h-3 text-[#D4AF37]" />
                        </button>
                      </div>
                    )}

                    {/* Login ID Edit */}
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span>Login ID:</span>
                      {isEditingThis && editMode === 'identifier' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="bg-[#161619] border border-[#D4AF37] rounded-lg px-2 py-0.5 text-white text-xs outline-none font-mono"
                          />
                          <button
                            onClick={() => handleSaveIdentifier(w.id)}
                            className="p-1 rounded bg-emerald-500/20 text-emerald-300"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                          <button onClick={cancelEdit} className="p-1 rounded bg-white/10 text-neutral-400">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#FCF6BA] font-bold bg-white/[0.04] px-2 py-0.5 rounded flex items-center gap-1">
                          {w.identifier}
                          <button
                            onClick={() => {
                              setEditingId(w.id);
                              setEditMode('identifier');
                              setTempValue(w.identifier);
                            }}
                            className="text-neutral-500 hover:text-white"
                          >
                            <Edit2 className="w-2.5 h-2.5 ml-1" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Password / PIN Section */}
                  <div className="flex items-center gap-2">
                    {isEditingThis && editMode === 'password' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="New PIN"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          className="w-24 bg-[#161619] border border-[#D4AF37] rounded-lg px-2.5 py-1 text-white font-mono text-xs outline-none"
                        />
                        <button
                          onClick={() => handleSavePassword(w.id)}
                          className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button onClick={cancelEdit} className="p-1.5 rounded-lg bg-white/10 text-neutral-400">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white/[0.03] border border-white/10 font-mono text-xs text-neutral-300">
                          <KeyRound className="w-3 h-3 text-[#D4AF37]" />
                          <span>{isPassVisible ? w.password_hash : '••••'}</span>
                          <button
                            onClick={() => toggleShowPass(w.id)}
                            className="text-neutral-400 hover:text-white ml-1 cursor-pointer"
                          >
                            {isPassVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>

                        <button
                          onClick={() => {
                            setEditingId(w.id);
                            setEditMode('password');
                            setTempValue(w.password_hash);
                          }}
                          className="px-2.5 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] hover:border-[#D4AF37]/50 text-[#FCF6BA] text-[11px] font-bold cursor-pointer"
                        >
                          Change PIN
                        </button>

                        <button
                          onClick={() => handleDeleteWaiter(w.id, w.name)}
                          className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 cursor-pointer"
                          title="Delete Waiter"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
}