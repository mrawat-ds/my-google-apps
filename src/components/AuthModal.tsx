import React, { useState } from 'react';
import { X, Mail, CheckCircle2, UserPlus, LogIn, Sparkles } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentEmail: string;
  savedEmails: string[];
  onSelectEmail: (email: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentEmail,
  savedEmails,
  onSelectEmail,
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = emailInput.trim().toLowerCase();
    if (!clean || !clean.includes('@') || !clean.includes('.')) {
      setError('Please enter a valid email address (e.g. kid@example.com)');
      return;
    }
    setError('');
    onSelectEmail(clean);
    setEmailInput('');
    onClose();
  };

  const handleSelectExisting = (email: string) => {
    onSelectEmail(email);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-amber-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Student Profile & Sign In</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
            Sign in with your email ID to save your revision tags, custom word buckets, and practice progress.
          </p>
        </div>

        {/* Current Active Account */}
        <div className="mb-5 p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Currently Active</span>
            <p className="font-bold text-slate-900 text-sm truncate max-w-[220px]">{currentEmail}</p>
          </div>
          <span className="px-2 py-1 rounded-lg bg-amber-200/60 text-amber-900 text-[11px] font-bold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-700" />
            Active
          </span>
        </div>

        {/* Saved Profiles Switcher (great for iPad & family phone) */}
        {savedEmails.length > 0 && (
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-700 mb-2">
              Switch Speller Profile on this Device:
            </label>
            <div className="space-y-2">
              {savedEmails.map((email) => {
                const isSelected = email.toLowerCase() === currentEmail.toLowerCase();
                return (
                  <button
                    key={email}
                    onClick={() => handleSelectExisting(email)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs font-semibold transition-all ${
                      isSelected
                        ? 'border-amber-400 bg-amber-50/70 text-amber-900'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-xs uppercase">
                        {email[0]}
                      </div>
                      <span className="truncate">{email}</span>
                    </div>
                    {isSelected ? (
                      <span className="text-[11px] text-amber-700 font-bold">Selected</span>
                    ) : (
                      <span className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
                        <LogIn className="w-3 h-3" /> Switch
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Sign in with New Email Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 pt-2 border-t border-slate-100">
          <div>
            <label htmlFor="student-email" className="block text-xs font-bold text-slate-700 mb-1">
              Add New Student Email ID
            </label>
            <div className="relative">
              <input
                id="student-email"
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setError('');
                }}
                placeholder="e.g. speller.champ@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-amber-400 text-sm text-slate-900 placeholder:text-slate-400"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
            </div>
            {error && <p className="text-red-500 text-xs mt-1 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Sign In / Add Profile</span>
          </button>
        </form>

        <div className="mt-4 text-center">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500" />
            Each profile keeps its own custom tags, word buckets & practice streaks.
          </p>
        </div>
      </div>
    </div>
  );
};
