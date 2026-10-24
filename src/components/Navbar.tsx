import React from 'react';
import { Trophy, Tag, BookOpen, BarChart3, User, Flame, Sparkles } from 'lucide-react';

interface NavbarProps {
  activeTab: 'practice' | 'tags' | 'bank' | 'stats';
  setActiveTab: (tab: 'practice' | 'tags' | 'bank' | 'stats') => void;
  userEmail: string;
  onOpenAuth: () => void;
  streakDays: number;
  masteredCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  userEmail,
  onOpenAuth,
  streakDays,
  masteredCount,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-amber-100 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20">
              <span className="text-xl font-black">🐝</span>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight">SpellBee</span>
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  Champ
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">National Championship Bee Trainer</p>
            </div>
          </div>

          {/* Desktop & Tablet Navigation */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setActiveTab('practice')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'practice'
                  ? 'bg-white text-amber-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>Practice Arena</span>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'tags'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Tag className="w-4 h-4 text-indigo-500" />
              <span>Revision Tags</span>
            </button>
            <button
              onClick={() => setActiveTab('bank')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'bank'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BookOpen className="w-4 h-4 text-emerald-500" />
              <span>Word Bank</span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                activeTab === 'stats'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-blue-500" />
              <span>Progress</span>
            </button>
          </nav>

          {/* User Profile & Badges */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Streak Counter */}
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-700 text-xs font-bold"
              title={`${streakDays} Day Practice Streak`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>{streakDays}d</span>
            </div>

            {/* Mastered Counter */}
            <div
              className="hidden sm:flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold"
              title={`${masteredCount} Words Mastered`}
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
              <span>{masteredCount} mastered</span>
            </div>

            {/* Account Profile Button */}
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/50 transition-all text-xs font-medium text-slate-700"
              aria-label="Account Settings"
            >
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs uppercase">
                {userEmail ? userEmail[0] : 'U'}
              </div>
              <span className="hidden lg:inline max-w-[120px] truncate font-semibold text-slate-800">
                {userEmail.split('@')[0]}
              </span>
              <User className="w-3.5 h-3.5 text-slate-400 lg:hidden" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom-bar is standard, but also keep clean mobile tabs */}
      <div className="md:hidden flex border-t border-slate-100 bg-white px-2 py-1.5 justify-around">
        <button
          onClick={() => setActiveTab('practice')}
          className={`flex flex-col items-center py-1 px-2 text-xs font-bold ${
            activeTab === 'practice' ? 'text-amber-600' : 'text-slate-500'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Practice</span>
        </button>
        <button
          onClick={() => setActiveTab('tags')}
          className={`flex flex-col items-center py-1 px-2 text-xs font-bold ${
            activeTab === 'tags' ? 'text-indigo-600' : 'text-slate-500'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Tags</span>
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`flex flex-col items-center py-1 px-2 text-xs font-bold ${
            activeTab === 'bank' ? 'text-emerald-600' : 'text-slate-500'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Words</span>
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex flex-col items-center py-1 px-2 text-xs font-bold ${
            activeTab === 'stats' ? 'text-blue-600' : 'text-slate-500'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span className="text-[10px] mt-0.5">Stats</span>
        </button>
      </div>
    </header>
  );
};
