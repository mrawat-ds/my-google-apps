import React, { useState } from 'react';
import { Tag, Plus, Play, Trash2, Volume2, Sparkles, BookOpen, Check } from 'lucide-react';
import { WordItem, UserTag } from '../types/spelling';
import { playPronunciation } from '../utils/audio';

interface TagRevisionViewProps {
  words: WordItem[];
  userTags: UserTag[];
  wordTagsMap: Record<string, string[]>;
  onToggleWordTag: (wordId: string, tagId: string) => void;
  onCreateTag: (name: string, color: string, description?: string) => void;
  onDeleteTag: (tagId: string) => void;
  onOpenWordCard: (word: WordItem) => void;
  onStartBucketPractice: (tagId: string) => void;
}

export const TagRevisionView: React.FC<TagRevisionViewProps> = ({
  words,
  userTags,
  wordTagsMap,
  onToggleWordTag,
  onCreateTag,
  onDeleteTag,
  onOpenWordCard,
  onStartBucketPractice,
}) => {
  const [selectedTagId, setSelectedTagId] = useState<string>(userTags[0]?.id || 'tag-difficult-pronounce');
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagDescription, setNewTagDescription] = useState('');
  const [newTagColor, setNewTagColor] = useState('#F59E0B');

  const presetColors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4', '#64748B'];

  // Count words in each tag
  const tagCounts: Record<string, number> = {};
  for (const tag of userTags) {
    let count = 0;
    for (const w of words) {
      const assigned = wordTagsMap[w.id] || [];
      if (assigned.includes(tag.id) || w.tags.includes(tag.id)) {
        count++;
      }
    }
    tagCounts[tag.id] = count;
  }

  const activeTag = userTags.find((t) => t.id === selectedTagId) || userTags[0];

  // Filter words belonging to the active tag
  const wordsInBucket = words.filter((w) => {
    if (!activeTag) return false;
    const assigned = wordTagsMap[w.id] || [];
    return assigned.includes(activeTag.id) || w.tags.includes(activeTag.id);
  });

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    onCreateTag(newTagName.trim(), newTagColor, newTagDescription.trim() || undefined);
    setNewTagName('');
    setNewTagDescription('');
    setIsCreatingTag(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 to-indigo-950 text-white p-6 rounded-3xl shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Tag className="w-4 h-4" />
            <span>Spelling Bee Custom Revision Buckets</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Revision Tags & Labels</h1>
          <p className="text-xs sm:text-sm text-indigo-200 mt-1 max-w-xl">
            Label difficult words, tricky pronunciations, or Greek/Latin roots into dedicated revision buckets to master before competition day.
          </p>
        </div>

        <button
          onClick={() => setIsCreatingTag(true)}
          className="px-4 py-2.5 rounded-2xl bg-white hover:bg-indigo-50 text-indigo-950 font-bold text-xs shadow-md flex items-center justify-center gap-2 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-indigo-600" />
          <span>New Revision Label</span>
        </button>
      </div>

      {/* Tag Badges Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {userTags.map((tag) => {
          const isSelected = tag.id === selectedTagId;
          const count = tagCounts[tag.id] || 0;
          return (
            <button
              key={tag.id}
              onClick={() => setSelectedTagId(tag.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold whitespace-nowrap border transition-all ${
                isSelected
                  ? 'bg-white text-slate-900 border-indigo-500 shadow-md ring-2 ring-indigo-200'
                  : 'bg-white/80 text-slate-600 border-slate-200 hover:bg-white hover:border-slate-300'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
              <span>{tag.name}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] ${
                  isSelected ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Create New Tag Modal / Drawer */}
      {isCreatingTag && (
        <form
          onSubmit={handleCreateSubmit}
          className="p-5 rounded-3xl bg-white border border-indigo-200 shadow-lg space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Create Custom Revision Tag
            </h3>
            <button
              type="button"
              onClick={() => setIsCreatingTag(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Tag Name:</label>
              <input
                type="text"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="e.g. Tricky French Vowels, Finals Round Revise..."
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional):</label>
              <input
                type="text"
                value={newTagDescription}
                onChange={(e) => setNewTagDescription(e.target.value)}
                placeholder="e.g. Words with silent p or unusual vowel diphthongs"
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Choose Badge Color:</span>
              <div className="flex items-center gap-1.5">
                {presetColors.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform ${
                      newTagColor === c ? 'scale-125 ring-2 ring-indigo-500 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs"
            >
              Save Tag
            </button>
          </div>
        </form>
      )}

      {/* Selected Bucket View */}
      {activeTag && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm space-y-6">
          {/* Bucket Header Info */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-xs"
                style={{ backgroundColor: activeTag.color }}
              >
                <Tag className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-slate-900">{activeTag.name}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                    {wordsInBucket.length} {wordsInBucket.length === 1 ? 'word' : 'words'}
                  </span>
                </div>
                {activeTag.description && (
                  <p className="text-xs text-slate-500 mt-0.5">{activeTag.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {wordsInBucket.length > 0 && (
                <button
                  onClick={() => onStartBucketPractice(activeTag.id)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Practice This Bucket</span>
                </button>
              )}

              {!activeTag.isPreset && (
                <button
                  onClick={() => onDeleteTag(activeTag.id)}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 hover:bg-red-50"
                  title="Delete this tag"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Words In This Bucket */}
          {wordsInBucket.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-700">No words tagged with &ldquo;{activeTag.name}&rdquo; yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                While practicing in the Arena or browsing the Word Bank, tap this label to add words here for quick revision!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {wordsInBucket.map((word) => (
                <div
                  key={word.id}
                  className="p-4 rounded-2xl border border-slate-200/90 hover:border-indigo-300 bg-white hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {word.difficulty.replace('_', ' ')}
                      </span>
                      <button
                        onClick={() => playPronunciation(word.word)}
                        className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                        title="Listen to pronunciation"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {word.word}
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">{word.pronunciationGuide || word.phonetic}</p>
                    <p className="text-xs text-slate-600 mt-2 line-clamp-2">{word.definition}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-[11px] text-indigo-700 font-semibold">{word.languageOfOrigin}</span>
                    <button
                      onClick={() => onOpenWordCard(word)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                    >
                      View Card &rarr;
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
