import React, { useState } from 'react';
import { X, Plus, Sparkles, BookPlus } from 'lucide-react';
import { WordItem, DifficultyLevel, UserTag } from '../types/spelling';

interface AddWordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddWord: (word: WordItem) => void;
  userTags: UserTag[];
}

export const AddWordModal: React.FC<AddWordModalProps> = ({
  isOpen,
  onClose,
  onAddWord,
  userTags,
}) => {
  const [word, setWord] = useState('');
  const [phonetic, setPhonetic] = useState('');
  const [partOfSpeech, setPartOfSpeech] = useState('noun');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [definition, setDefinition] = useState('');
  const [kidEssence, setKidEssence] = useState('');
  const [languageOfOrigin, setLanguageOfOrigin] = useState('');
  const [etymology, setEtymology] = useState('');
  const [sentence, setSentence] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !definition.trim()) return;

    const syllables = word
      .trim()
      .split(/[-·\s]/)
      .filter(Boolean);

    const newWord: WordItem = {
      id: `custom-${Date.now()}`,
      word: word.trim().toLowerCase(),
      phonetic: phonetic.trim() || `/${word.trim().toLowerCase()}/`,
      syllables: syllables.length > 0 ? syllables : [word.trim().toLowerCase()],
      partOfSpeech,
      definition: definition.trim(),
      kidEssenceDefinition: kidEssence.trim() || definition.trim(),
      languageOfOrigin: languageOfOrigin.trim() || 'English',
      etymology: etymology.trim() || `Originating from ${languageOfOrigin || 'English'}.`,
      sentence: sentence.trim() || `The speller spelled "${word.trim()}" correctly.`,
      difficulty,
      tags: selectedTags,
      isCustom: true,
    };

    onAddWord(newWord);
    onClose();
  };

  const toggleTag = (id: string) => {
    setSelectedTags((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-amber-100 relative">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center">
            <BookPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add Word to Championship Bank</h2>
            <p className="text-xs text-slate-500">Add words from your school list or study guide</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Word *</label>
              <input
                type="text"
                required
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="e.g. autochthonous"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-400"
              >
                <option value="easy">Easy (Classroom)</option>
                <option value="medium">Medium (School Bee)</option>
                <option value="hard">Hard (Regional)</option>
                <option value="very_hard">Very Hard (Finals)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Phonetic / Syllables</label>
              <input
                type="text"
                value={phonetic}
                onChange={(e) => setPhonetic(e.target.value)}
                placeholder="e.g. /ˌbʊl.ə.vɑːrd/"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Part of Speech</label>
              <input
                type="text"
                value={partOfSpeech}
                onChange={(e) => setPartOfSpeech(e.target.value)}
                placeholder="noun, verb, adjective..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Dictionary Definition *</label>
            <textarea
              required
              rows={2}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              placeholder="Official definition..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">Kid Essence Meaning (Gist)</label>
            <input
              type="text"
              value={kidEssence}
              onChange={(e) => setKidEssence(e.target.value)}
              placeholder="Simple explanation in plain language..."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-400"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Language of Origin</label>
              <input
                type="text"
                value={languageOfOrigin}
                onChange={(e) => setLanguageOfOrigin(e.target.value)}
                placeholder="e.g. Greek, French, Latin"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Sample Sentence</label>
              <input
                type="text"
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                placeholder="Used in a sentence..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1.5">Assign Revision Tags:</label>
            <div className="flex flex-wrap gap-1.5">
              {userTags.map((t) => {
                const isSelected = selectedTags.includes(t.id);
                return (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => toggleTag(t.id)}
                    className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-md shadow-amber-500/20"
            >
              Add Word
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
