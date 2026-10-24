import React, { useState } from 'react';
import { Search, Plus, Volume2, Star, Tag, Eye, Play, Sparkles, BookOpen, Layers } from 'lucide-react';
import { WordItem, UserTag, DifficultyLevel } from '../types/spelling';
import { playPronunciation } from '../utils/audio';

interface WordBankViewProps {
  words: WordItem[];
  userTags: UserTag[];
  wordTagsMap: Record<string, string[]>;
  onOpenWordCard: (word: WordItem) => void;
  onOpenAddModal: () => void;
  onOpenImportModal: () => void;
  isStarred: (wordId: string) => boolean;
  onToggleStar: (wordId: string) => void;
  onSelectWordForPractice: (word: WordItem) => void;
}

export const WordBankView: React.FC<WordBankViewProps> = ({
  words,
  userTags,
  wordTagsMap,
  onOpenWordCard,
  onOpenAddModal,
  onOpenImportModal,
  isStarred,
  onToggleStar,
  onSelectWordForPractice,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [selectedTagId, setSelectedTagId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isFlashcardMode, setIsFlashcardMode] = useState(false);
  const [flippedWordIds, setFlippedWordIds] = useState<Record<string, boolean>>({});

  const filtered = words.filter((w) => {
    if (selectedDifficulty !== 'all' && w.difficulty !== selectedDifficulty) return false;
    if (selectedTagId !== 'all') {
      const assigned = wordTagsMap[w.id] || [];
      const hasDef = w.tags.includes(selectedTagId);
      if (!assigned.includes(selectedTagId) && !hasDef) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchWord = w.word.toLowerCase().includes(q);
      const matchDef = w.definition.toLowerCase().includes(q);
      const matchOrigin = w.languageOfOrigin.toLowerCase().includes(q);
      if (!matchWord && !matchDef && !matchOrigin) return false;
    }
    return true;
  });

  const toggleFlip = (id: string) => {
    setFlippedWordIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const difficultyColors = {
    easy: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    medium: 'bg-blue-100 text-blue-800 border-blue-200',
    hard: 'bg-amber-100 text-amber-800 border-amber-200',
    very_hard: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Championship Word Bank
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Explore authentic Scripps National Spelling Bee competition words categorized by difficulty and origins.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Extend / Import from PDF button */}
          <button
            onClick={onOpenImportModal}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold text-xs shadow-md shadow-amber-600/20 flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Extend from PDF (Champions)</span>
          </button>

          <button
            onClick={() => setIsFlashcardMode(!isFlashcardMode)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isFlashcardMode
                ? 'bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-600" />
            <span>{isFlashcardMode ? 'Grid View' : 'Flashcard Mode'}</span>
          </button>

          <button
            onClick={onOpenAddModal}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Single Word</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search words, meanings, or origin (e.g. French, Greek, climbing, shadow)..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400"
            />
          </div>

          {/* Tag Filter Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedTagId}
              onChange={(e) => setSelectedTagId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-400"
            >
              <option value="all">All Labels & Buckets</option>
              {userTags.map((t) => (
                <option key={t.id} value={t.id}>
                  🏷️ {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Difficulty Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {(['all', 'easy', 'medium', 'hard', 'very_hard'] as const).map((lvl) => {
            const isSel = selectedDifficulty === lvl;
            const labels = {
              all: `All Words (${words.length})`,
              easy: `Easy (${words.filter((w) => w.difficulty === 'easy').length})`,
              medium: `Medium (${words.filter((w) => w.difficulty === 'medium').length})`,
              hard: `Hard (${words.filter((w) => w.difficulty === 'hard').length})`,
              very_hard: `Very Hard (${words.filter((w) => w.difficulty === 'very_hard').length})`,
            };
            return (
              <button
                key={lvl}
                onClick={() => setSelectedDifficulty(lvl)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isSel
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {labels[lvl]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Words Grid or Flashcards */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-slate-200">
          <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <h3 className="text-base font-bold text-slate-800">No matching words found</h3>
          <p className="text-xs text-slate-500 mt-1">Try modifying your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((word) => {
            const isFlipped = flippedWordIds[word.id];
            const assignedTagIds = wordTagsMap[word.id] || [];
            const tags = userTags.filter((t) => assignedTagIds.includes(t.id) || word.tags.includes(t.id));

            if (isFlashcardMode) {
              return (
                <div
                  key={word.id}
                  onClick={() => toggleFlip(word.id)}
                  className="h-64 p-5 rounded-3xl bg-white border-2 border-amber-200 shadow-sm hover:shadow-md cursor-pointer transition-all flex flex-col justify-between select-none relative group"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                        difficultyColors[word.difficulty]
                      }`}
                    >
                      {word.difficulty.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md">
                      {isFlipped ? 'Back (Details)' : 'Front (Tap to flip)'}
                    </span>
                  </div>

                  <div className="text-center my-auto">
                    {!isFlipped ? (
                      <>
                        <h2 className="text-2xl font-black text-slate-900">{word.word}</h2>
                        <p className="font-mono text-xs text-amber-800 mt-1">{word.phonetic}</p>
                        <p className="text-xs text-slate-500 mt-2 italic">{word.partOfSpeech}</p>
                      </>
                    ) : (
                      <div className="space-y-2 text-left">
                        <p className="text-xs text-slate-800 leading-relaxed font-medium">
                          <span className="font-bold text-blue-700">Definition: </span>
                          {word.definition}
                        </p>
                        <p className="text-[11px] text-indigo-700 font-semibold">
                          <span className="font-bold">Origin: </span>
                          {word.languageOfOrigin}
                        </p>
                        {word.kidEssenceDefinition && (
                          <p className="text-[11px] text-emerald-800 bg-emerald-50 p-1.5 rounded-lg">
                            <span className="font-bold">Essence: </span>
                            {word.kidEssenceDefinition}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        playPronunciation(word.word);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                      title="Pronounce"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectWordForPractice(word);
                      }}
                      className="px-3 py-1 rounded-lg bg-amber-500 text-white font-bold text-[11px]"
                    >
                      Practice &rarr;
                    </button>
                  </div>
                </div>
              );
            }

            // Standard Grid Card
            return (
              <div
                key={word.id}
                className="p-5 rounded-3xl bg-white border border-slate-200/90 hover:border-amber-300 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md border ${
                        difficultyColors[word.difficulty]
                      }`}
                    >
                      {word.difficulty.replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleStar(word.id)}
                        className={`p-1 rounded-md text-xs transition-colors ${
                          isStarred(word.id) ? 'text-amber-500' : 'text-slate-300 hover:text-amber-400'
                        }`}
                        title="Star"
                        aria-label="Star word"
                      >
                        <Star className={`w-3.5 h-3.5 ${isStarred(word.id) ? 'fill-amber-400' : ''}`} />
                      </button>
                      <button
                        onClick={() => playPronunciation(word.word)}
                        className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        title="Listen to pronunciation"
                        aria-label="Listen"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-900 group-hover:text-amber-600 transition-colors">
                    {word.word}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-sans text-xs text-amber-800 font-semibold">{word.pronunciationGuide || word.phonetic}</span>
                    <span className="text-[11px] text-slate-400">&bull;</span>
                    <span className="text-[11px] text-slate-500 italic">{word.partOfSpeech}</span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2.5 line-clamp-2 leading-relaxed">
                    {word.definition}
                  </p>

                  {/* Origin */}
                  <div className="mt-2 text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                    <span>Origin:</span>
                    <span className="font-normal text-slate-600 truncate">{word.languageOfOrigin}</span>
                  </div>

                  {/* Tag Badges */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {tags.slice(0, 3).map((t) => (
                        <span
                          key={t.id}
                          className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                          style={{
                            borderColor: `${t.color}50`,
                            backgroundColor: `${t.color}15`,
                            color: t.color,
                          }}
                        >
                          {t.name}
                        </span>
                      ))}
                      {tags.length > 3 && (
                        <span className="text-[10px] text-slate-400 font-semibold">+{tags.length - 3}</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => onOpenWordCard(word)}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-400" />
                    <span>Card Details</span>
                  </button>

                  <button
                    onClick={() => onSelectWordForPractice(word)}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-2xs flex items-center gap-1 transition-all"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>Practice</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
