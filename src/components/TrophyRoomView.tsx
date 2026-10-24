import React from 'react';
import { Trophy, Flame, CheckCircle2, XCircle, Sparkles, RotateCcw, Target, Award, ArrowUpRight } from 'lucide-react';
import { PracticeAttempt, WordItem } from '../types/spelling';
import { calculateUserStats } from '../utils/spelling';

interface TrophyRoomViewProps {
  history: PracticeAttempt[];
  streakDays: number;
  userEmail: string;
  allWords: WordItem[];
  onPracticeWord: (word: WordItem) => void;
  onClearHistory: () => void;
}

export const TrophyRoomView: React.FC<TrophyRoomViewProps> = ({
  history,
  streakDays,
  userEmail,
  allWords,
  onPracticeWord,
  onClearHistory,
}) => {
  const stats = calculateUserStats(history);

  const getWordById = (id: string) => allWords.find((w) => w.id === id);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-extrabold uppercase tracking-widest mb-2">
            <Trophy className="w-4 h-4" />
            <span>Spelling Bee Championship Record</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {userEmail.split('@')[0]}&rsquo;s Trophy Room
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-lg">
            Track your spelling accuracy, words mastered, and practice streaks toward National Championship level.
          </p>
        </div>

        {/* Big Trophy Graphic */}
        <div className="absolute right-4 -bottom-6 opacity-20 pointer-events-none">
          <span className="text-9xl">🏆</span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* Accuracy Rate */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Accuracy</span>
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{stats.accuracyRate}%</div>
          <p className="text-[11px] text-slate-400 mt-1">
            {stats.correctCount} of {stats.totalAttempts} correct
          </p>
        </div>

        {/* Mastered Words */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mastered</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{stats.uniqueWordsMastered}</div>
          <p className="text-[11px] text-slate-400 mt-1">Unique championship words</p>
        </div>

        {/* Practice Streak */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Streak</span>
            <Flame className="w-4 h-4 text-orange-500 fill-orange-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-orange-600">{streakDays} Days</div>
          <p className="text-[11px] text-slate-400 mt-1">Daily consistency</p>
        </div>

        {/* Total Attempts */}
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total Drills</span>
            <Award className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600">{stats.totalAttempts}</div>
          <p className="text-[11px] text-slate-400 mt-1">Practice rounds completed</p>
        </div>
      </div>

      {/* Recent Attempts History Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Recent Practice History</h2>
            <p className="text-xs text-slate-500">Review your past attempts and retry tricky words</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={onClearHistory}
              className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors"
            >
              Reset History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <RotateCcw className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">No practice attempts recorded yet.</p>
            <p className="mt-0.5">Head over to the Practice Arena to test your spelling skills!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                  <th className="py-3 px-3">Word</th>
                  <th className="py-3 px-3">Your Spelling</th>
                  <th className="py-3 px-3">Spelling Result</th>
                  <th className="py-3 px-3">Meaning Check</th>
                  <th className="py-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {history.slice(0, 15).map((attempt) => {
                  const targetWord = getWordById(attempt.wordId);
                  return (
                    <tr key={attempt.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">{attempt.word}</td>
                      <td className="py-3 px-3 font-mono text-slate-700">{attempt.userSpelling}</td>
                      <td className="py-3 px-3">
                        {attempt.isSpellingCorrect ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[11px] border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Correct
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] border border-rose-200">
                            <XCircle className="w-3.5 h-3.5" />
                            Incorrect
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {attempt.meaningEvaluation ? (
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              attempt.meaningEvaluation.isCorrectEssence
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {attempt.meaningEvaluation.scorePercent}% Essence
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">&mdash;</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {targetWord && (
                          <button
                            onClick={() => onPracticeWord(targetWord)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-amber-600 hover:text-amber-800"
                          >
                            <span>Retry</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
