import React, { useState } from 'react';
import { X, Volume2, Turtle, Star, Tag, Plus, Check, Globe, Book, Sparkles, AlertCircle } from 'lucide-react';
import { WordItem, UserTag } from '../types/spelling';
import { playPronunciation } from '../utils/audio';

interface WordCardModalProps {
  word: WordItem | null;
  isOpen: boolean;
  onClose: () => void;
  userTags: UserTag[];
  wordTagIds: string[];
  onToggleTag: (wordId: string, tagId: string) => void;
  onCreateTag: (name: string, color: string) => void;
  isStarred: boolean;
  onToggleStar: (wordId: string) => void;
  lastAttemptResult?: {
    isSpellingCorrect: boolean;
    userSpelling: string;
    userMeaning?: string;
    meaningFeedback?: string;
  };
}

export const WordCardModal: React.FC<WordCardModalProps> = ({
  word,
  isOpen,
  onClose,
  userTags,
  wordTagIds,
  onToggleTag,
  onCreateTag,
  isStarred,
  onToggleStar,
  lastAttemptResult,
}) => {
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#F59E0B');

  if (!isOpen || !word) return null;

  const handleCreateTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTagName.trim()) {
      onCreateTag(newTagName.trim(), newTagColor);
      setNewTagName('');
      setIsCreatingTag(false);
    }
  };

  const difficultyColors = {
    easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    hard: 'bg-amber-100 text-amber-800 border-amber-200',
    very_hard: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  const difficultyLabels = {
    easy: 'Easy (Classroom)',
    medium: 'Medium (School Bee)',
    hard: 'Hard (Regional Bee)',
    very_hard: 'Very Hard (National Finals)',
  };

  const presetColors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-amber-100 relative">
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-xs border-b border-slate-100 px-5 sm:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span
              className={`text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                difficultyColors[word.difficulty]
              }`}
            >
              {difficultyLabels[word.difficulty]}
            </span>
            <button
              onClick={() => onToggleStar(word.id)}
              className={`p-1.5 rounded-lg border transition-all ${
                isStarred
                  ? 'bg-amber-50 border-amber-300 text-amber-500'
                  : 'border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-slate-50'
              }`}
              title={isStarred ? 'Starred word' : 'Star word'}
              aria-label="Star word"
            >
              <Star className={`w-4 h-4 ${isStarred ? 'fill-amber-400' : ''}`} />
            </button>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {/* Recent Practice Feedback Banner if coming from an attempt */}
          {lastAttemptResult && (
            <div
              className={`p-4 rounded-2xl border ${
                lastAttemptResult.isSpellingCorrect
                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50/80 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2 font-bold text-sm">
                {lastAttemptResult.isSpellingCorrect ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>You spelled this correctly! 🎉</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>Your spelling: &ldquo;{lastAttemptResult.userSpelling}&rdquo; &bull; Correct: &ldquo;{word.word}&rdquo;</span>
                  </>
                )}
              </div>
              {lastAttemptResult.meaningFeedback && (
                <p className="text-xs mt-1.5 opacity-90">
                  <span className="font-semibold">Meaning essence check:</span> {lastAttemptResult.meaningFeedback}
                </p>
              )}
            </div>
          )}

          {/* Word & Pronunciation Hero */}
          <div className="bg-gradient-to-br from-amber-50/60 to-orange-50/40 p-5 rounded-2xl border border-amber-100/80">
            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">{word.word}</h1>
                <div className="flex items-center gap-2 text-slate-600 text-sm font-medium mt-1">
                  <span className="font-sans text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded-md text-xs font-semibold">
                    {word.pronunciationGuide || word.phonetic}
                  </span>
                  <span>&bull;</span>
                  <span className="italic text-xs text-slate-500">{word.partOfSpeech}</span>
                </div>
              </div>

              {/* Audio Pronunciation Controls */}
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <button
                  onClick={() => playPronunciation(word.word, { rate: 0.85 })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-all active:scale-95"
                  title="Pronounce word clearly"
                  aria-label="Pronounce word"
                >
                  <Volume2 className="w-4 h-4" />
                  <span>Pronounce</span>
                </button>
                <button
                  onClick={() => playPronunciation(word.word, { rate: 0.6 })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-800 font-bold text-xs shadow-2xs transition-all active:scale-95"
                  title="Pronounce slowly for phonemes"
                  aria-label="Slow pronunciation"
                >
                  <Turtle className="w-4 h-4 text-amber-600" />
                  <span>Slow</span>
                </button>
              </div>
            </div>

            {/* Syllable Breakdown */}
            <div className="mt-4 pt-3 border-t border-amber-200/50 flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Syllables:</span>
              <div className="flex items-center gap-1 flex-wrap">
                {word.syllables.map((syl, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-0.5 rounded-md bg-white border border-amber-200 text-slate-800 font-mono text-xs font-semibold"
                  >
                    {syl}
                    {i < word.syllables.length - 1 && <span className="text-amber-400 ml-1">&bull;</span>}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Official Clues Grid (Definitions, Origin, Sentence) */}
          <div className="grid grid-cols-1 gap-4">
            {/* Definition & Kid Essence */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                <Book className="w-4 h-4 text-blue-600" />
                <span>Definition</span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{word.definition}</p>

              {word.kidEssenceDefinition && (
                <div className="mt-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 flex items-start gap-2">
                  <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">In Essence (Kid-friendly):</span> {word.kidEssenceDefinition}
                  </div>
                </div>
              )}
            </div>

            {/* Language of Origin & Etymology */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  <span>Language of Origin & Etymology</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold border border-indigo-200">
                  {word.languageOfOrigin}
                </span>
              </div>
              <p className="text-sm text-slate-700 leading-relaxed">{word.etymology}</p>
            </div>

            {/* Competition Sentence */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Official Competition Sentence</span>
              <p className="text-sm text-slate-800 italic leading-relaxed">&ldquo;{word.sentence}&rdquo;</p>
            </div>

            {/* Tricky Patterns / Spelling Traps */}
            {word.trickyPatterns && word.trickyPatterns.length > 0 && (
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                  Watch Out For These Spelling Traps
                </span>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700">
                  {word.trickyPatterns.map((pat, idx) => (
                    <li key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                      <span>{pat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Revision Tags & Labels Manager */}
          <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-bold text-slate-900">Revision Labels & Buckets</span>
              </div>
              <button
                onClick={() => setIsCreatingTag(!isCreatingTag)}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create New Label</span>
              </button>
            </div>
            <p className="text-xs text-slate-500">
              Tap any label below to add or remove this word from your revision buckets.
            </p>

            {/* Tag Badges Grid */}
            <div className="flex flex-wrap gap-2 pt-1">
              {userTags.map((t) => {
                const isAssigned = wordTagIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => onToggleTag(word.id, t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isAssigned
                        ? 'border-indigo-400 bg-white text-indigo-900 shadow-2xs ring-2 ring-indigo-300'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:border-slate-300 hover:bg-white'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span>{t.name}</span>
                    {isAssigned && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                  </button>
                );
              })}
            </div>

            {/* In-place new tag creator */}
            {isCreatingTag && (
              <form onSubmit={handleCreateTagSubmit} className="mt-3 p-3 bg-white rounded-xl border border-indigo-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">New Label Name:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="e.g. Tricky French Vowels, Finals Revision..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                  />
                  <div className="flex items-center gap-1">
                    {presetColors.map((col) => (
                      <button
                        type="button"
                        key={col}
                        onClick={() => setNewTagColor(col)}
                        className={`w-5 h-5 rounded-full transition-transform ${
                          newTagColor === col ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : ''
                        }`}
                        style={{ backgroundColor: col }}
                        aria-label={`Color ${col}`}
                      />
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
