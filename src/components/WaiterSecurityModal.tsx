'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';
import {
  UserCheck,
  KeyRound,
  Trash2,
  Plus,
  Check,
  X,
  Sparkles,
  Edit2,
  ShieldAlert,
  CheckCircle2,
} from 'lucide-react';

const butterSpring: Transition = {
  type: 'spring',
  stiffness: 420,
  damping: 30,
  mass: 0.6,
};

interface WaiterAccount {
  id: number;
  identifier: string;
  name: string;
  role: 'waiter';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface WaiterSecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WaiterSecurityModal({
  isOpen,
  onClose,
}: WaiterSecurityModalProps) {
  const [waiters, setWaiters] = useState<WaiterAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [newName, setNewName] = useState('');
  const [newIdentifier, setNewIdentifier] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editMode, setEditMode] = useState<'name' | 'identifier' | 'password' | null>(
    null,
  );
  const [tempValue, setTempValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditMode(null);
    setTempValue('');
  }, []);

  const fetchWaiters = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/staff', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load staff directory.');
      }
      setWaiters(Array.isArray(result.waiters) ? result.waiters : []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to load waiter list.';
      setFeedback({ type: 'error', text: message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFeedback(null);
      setConfirmDeleteId(null);
      setShowAddForm(false);
      cancelEdit();
      void fetchWaiters();
    }
  }, [isOpen, fetchWaiters, cancelEdit]);

  if (!isOpen) return null;

  const handleAddWaiter = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const cleanName = newName.trim();
    const cleanId = newIdentifier.trim().toLowerCase();
    const cleanPass = newPassword.trim();

    if (!cleanName || !cleanId || !cleanPass) {
      setFeedback({
        type: 'error',
        text: 'Name, Login ID, and PIN/Password are all required.',
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName,
          identifier: cleanId,
          password: cleanPass,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Failed to create waiter account.');
      }

      setNewName('');
      setNewIdentifier('');
      setNewPassword('');
      setShowAddForm(false);
      setFeedback({
        type: 'success',
        text: `Waiter "${cleanName}" created with encrypted PIN.`,
      });
      await fetchWaiters();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unable to add waiter.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveField = async (
    waiterId: number,
    field: 'name' | 'identifier' | 'password',
  ) => {
    setFeedback(null);
    const value =
      field === 'identifier' ? tempValue.trim().toLowerCase() : tempValue.trim();
    if (!value) {
      setFeedback({ type: 'error', text: 'Value cannot be empty.' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/staff', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: 'waiter',
          id: waiterId,
          [field]: value,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Update failed.');
      }

      cancelEdit();
      setFeedback({
        type: 'success',
        text:
          field === 'password'
            ? 'Waiter PIN reset and encrypted.'
            : 'Waiter details updated.',
      });
      await fetchWaiters();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Update failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWaiter = async (waiterId: number, name: string) => {
    setFeedback(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/staff?id=${waiterId}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || 'Delete failed.');
      }

      if (editingId === waiterId) cancelEdit();
      setConfirmDeleteId(null);
      setFeedback({
        type: 'success',
        text: `Waiter "${name}" removed.`,
      });
      await fetchWaiters();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Delete failed.',
      });
    } finally {
      setLoading(false);
    }
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
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-lg">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-white text-base font-sans uppercase">
                Waiters & Staff Directory
              </h3>
              <p className="text-[11px] text-neutral-400">
                Manage Waiter Logins, Encrypted PINs & Access
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close waiter directory"
            className="p-2 rounded-xl hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {feedback && (
          <div
            role="alert"
            className={`flex items-center gap-2 p-3 rounded-2xl text-xs ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-500/50 text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <ShieldAlert className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="flex justify-between items-center pt-1">
          <span className="text-xs text-neutral-400 uppercase font-bold">
            Active: <strong className="text-white">{waiters.length} Waiters</strong>
          </span>
          <motion.button
            type="button"
            whileTap={{ scale: 0.94 }}
            onClick={() => {
              setShowAddForm((prev) => !prev);
              setFeedback(null);
            }}
            className="px-3.5 py-2.5 rounded-xl bg-[#D4AF37] text-black font-black text-xs uppercase flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>{showAddForm ? 'Close Form' : '+ Add Waiter'}</span>
          </motion.button>
        </div>

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
                    className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2.5 text-white text-base outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">
                    Login ID (Phone/User) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 9876543210"
                    value={newIdentifier}
                    onChange={(e) => setNewIdentifier(e.target.value)}
                    className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2.5 text-white text-base font-mono outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-neutral-400 block mb-1">
                    PIN / Password *
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 4 chars"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#161619] border border-white/10 rounded-xl px-3 py-2.5 text-white text-base font-mono outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#D4AF37] text-black font-black uppercase text-xs shadow-md mt-1 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Save Waiter Account'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-2.5">
          {waiters.length === 0 ? (
            <div className="p-8 text-center text-neutral-500 rounded-2xl bg-white/[0.02] border border-white/5">
              {loading
                ? 'Loading waiter accounts...'
                : 'No waiter accounts yet. Add one above!'}
            </div>
          ) : (
            waiters.map((w) => {
              const isEditingThis = editingId === w.id;

              return (
                <div
                  key={w.id}
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    {isEditingThis && editMode === 'name' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          className="bg-[#161619] border border-[#D4AF37] rounded-lg px-2.5 py-1.5 text-white text-base outline-none font-bold"
                          placeholder="New Name"
                        />
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleSaveField(w.id, 'name')}
                          className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-2 rounded-lg bg-white/10 text-neutral-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-sm">{w.name}</span>
                        <button
                          type="button"
                          aria-label={`Edit ${w.name} name`}
                          onClick={() => {
                            setEditingId(w.id);
                            setEditMode('name');
                            setTempValue(w.name);
                          }}
                          className="p-1.5 rounded hover:bg-white/10 text-neutral-400 hover:text-white cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3 text-[#D4AF37]" />
                        </button>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span>Login ID:</span>
                      {isEditingThis && editMode === 'identifier' ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={tempValue}
                            onChange={(e) => setTempValue(e.target.value)}
                            className="bg-[#161619] border border-[#D4AF37] rounded-lg px-2 py-1 text-white text-base outline-none font-mono"
                          />
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleSaveField(w.id, 'identifier')}
                            className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3 h-3 stroke-[3]" />
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="p-1.5 rounded bg-white/10 text-neutral-400 cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#FCF6BA] font-bold bg-white/[0.04] px-2 py-0.5 rounded flex items-center gap-1">
                          {w.identifier}
                          <button
                            type="button"
                            aria-label={`Edit ${w.name} login ID`}
                            onClick={() => {
                              setEditingId(w.id);
                              setEditMode('identifier');
                              setTempValue(w.identifier);
                            }}
                            className="text-neutral-500 hover:text-white p-0.5 cursor-pointer"
                          >
                            <Edit2 className="w-2.5 h-2.5 ml-1" />
                          </button>
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isEditingThis && editMode === 'password' ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="password"
                          placeholder="New PIN"
                          value={tempValue}
                          onChange={(e) => setTempValue(e.target.value)}
                          className="w-28 bg-[#161619] border border-[#D4AF37] rounded-lg px-2.5 py-1.5 text-white font-mono text-base outline-none"
                        />
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleSaveField(w.id, 'password')}
                          className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 disabled:opacity-50 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="p-2 rounded-lg bg-white/10 text-neutral-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 font-mono text-xs text-neutral-300">
                          <KeyRound className="w-3 h-3 text-[#D4AF37]" />
                          <span>••••••••</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(w.id);
                            setEditMode('password');
                            setTempValue('');
                          }}
                          className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:border-[#D4AF37]/50 text-[#FCF6BA] text-[11px] font-bold cursor-pointer"
                        >
                          Reset PIN
                        </button>

                        {confirmDeleteId === w.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={loading}
                              onClick={() => handleDeleteWaiter(w.id, w.name)}
                              className="px-2.5 py-2 rounded-xl bg-rose-600 text-white font-bold text-[11px] cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-2 rounded-xl bg-white/10 text-neutral-300 text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => setConfirmDeleteId(w.id)}
                            className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 cursor-pointer disabled:opacity-50"
                            aria-label={`Delete ${w.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
