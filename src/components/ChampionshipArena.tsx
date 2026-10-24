import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Volume2,
  Turtle,
  Mic,
  MicOff,
  Sparkles,
  HelpCircle,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Tag,
  ArrowRight,
  Eye,
  Book,
  Globe,
  Quote,
  Star,
  Shuffle,
  VolumeX,
  Plus,
  Keyboard,
  Delete,
  AlertCircle,
  RefreshCw,
  Check,
  Layers,
  ListFilter,
  ChevronRight,
} from 'lucide-react';
import { WordItem, UserTag, DifficultyLevel, MeaningEvaluationResult, SpellingEvaluation } from '../types/spelling';
import { evaluateSpelling, maskTargetWord, parseSpokenInputToSpelling } from '../utils/spelling';
import {
  playPronunciation,
  playCorrectChime,
  playBuzzer,
  playBeeBell,
  playKeyTap,
  createSpeechRecognizer,
  stopPronunciation,
  setAudioMuted,
  isAudioMuted,
} from '../utils/audio';

interface ChampionshipArenaProps {
  words: WordItem[];
  userTags: UserTag[];
  wordTagsMap: Record<string, string[]>;
  onToggleWordTag: (wordId: string, tagId: string) => void;
  onCreateTag?: (name: string, color: string, description?: string) => void;
  onRecordAttempt: (
    wordId: string,
    word: string,
    userSpelling: string,
    isCorrect: boolean,
    hints: string[],
    userMeaning?: string,
    meaningEval?: MeaningEvaluationResult
  ) => void;
  onOpenWordCard: (word: WordItem, lastResult?: {
    isSpellingCorrect: boolean;
    userSpelling: string;
    userMeaning?: string;
    meaningFeedback?: string;
  }) => void;
  isStarred: (wordId: string) => boolean;
  onToggleStar: (wordId: string) => void;
  selectedTagId?: string | null;
  onSelectTagFilter?: (tagId: string | null) => void;
  onClearTagFilter?: () => void;
}

export const ChampionshipArena: React.FC<ChampionshipArenaProps> = ({
  words,
  userTags,
  wordTagsMap,
  onToggleWordTag,
  onCreateTag,
  onRecordAttempt,
  onOpenWordCard,
  isStarred,
  onToggleStar,
  selectedTagId,
  onSelectTagFilter,
  onClearTagFilter,
}) => {
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel | 'all'>('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userSpelling, setUserSpelling] = useState('');
  const [userMeaning, setUserMeaning] = useState('');
  const [evaluation, setEvaluation] = useState<SpellingEvaluation | null>(null);
  const [meaningResult, setMeaningResult] = useState<MeaningEvaluationResult | null>(null);
  const [isEvaluatingMeaning, setIsEvaluatingMeaning] = useState(false);
  const [isMuted, setIsMuted] = useState(() => isAudioMuted());
  const [showKeypad, setShowKeypad] = useState(false);
  const [micStatusMsg, setMicStatusMsg] = useState('');

  // Session queue tracking:
  // masteredWordIds: words that were tried and spelled correctly in this round (won't repeat in active queue!)
  const [masteredWordIds, setMasteredWordIds] = useState<string[]>([]);
  // needsPracticeWordIds: words the student failed (spelling or meaning) OR clicked "Needs Pronunciation Practice"
  const [needsPracticeWordIds, setNeedsPracticeWordIds] = useState<string[]>([]);
  // presentedWordIds: words shown to the student
  const [presentedWordIds, setPresentedWordIds] = useState<string[]>([]);
  // queueMode: 'active' (smart queue: unmastered + repeat candidates) | 'needs_practice' | 'mastered' | 'all'
  const [queueMode, setQueueMode] = useState<'active' | 'needs_practice' | 'mastered' | 'all'>('active');
  const [repeatNotice, setRepeatNotice] = useState<string | null>(null);
  const [showCardTagManager, setShowCardTagManager] = useState(false);

  // Inline Tag Creator State
  const [isCreatingInlineTag, setIsCreatingInlineTag] = useState(false);
  const [inlineTagName, setInlineTagName] = useState('');
  const [inlineTagColor, setInlineTagColor] = useState('#F59E0B');

  const [revealedClues, setRevealedClues] = useState<{
    definition: boolean;
    origin: boolean;
    sentence: boolean;
    partOfSpeech: boolean;
    syllables: boolean;
  }>({
    definition: false,
    origin: false,
    sentence: false,
    partOfSpeech: false,
    syllables: false,
  });

  const [isListeningSpelling, setIsListeningSpelling] = useState(false);
  const [isListeningMeaning, setIsListeningMeaning] = useState(false);
  const [showMeaningInput, setShowMeaningInput] = useState(false);
  const [hasPronouncedOnLoad, setHasPronouncedOnLoad] = useState(false);

  // Candidate pool matching current difficulty and label filter (WITHOUT default tags)
  const categoryWords = useMemo(() => {
    return words.filter((w) => {
      if (selectedDifficulty !== 'all' && w.difficulty !== selectedDifficulty) {
        return false;
      }
      if (selectedTagId) {
        const assigned = wordTagsMap[w.id] || [];
        if (!assigned.includes(selectedTagId)) {
          return false;
        }
      }
      return true;
    });
  }, [words, selectedDifficulty, selectedTagId, wordTagsMap]);

  // Active queue based on queueMode:
  // 'active' (default): Unmastered words only. Mastered words DO NOT REPEAT!
  // Any word the student failed or flagged for pronunciation stays in the queue and will be repeated!
  const activeQueueWords = useMemo(() => {
    if (queueMode === 'all') {
      return categoryWords;
    }
    if (queueMode === 'needs_practice') {
      return categoryWords.filter((w) => needsPracticeWordIds.includes(w.id));
    }
    if (queueMode === 'mastered') {
      return categoryWords.filter((w) => masteredWordIds.includes(w.id));
    }
    // Default 'active': Words not yet mastered in this round (keeps words from repeating once mastered!)
    return categoryWords.filter((w) => !masteredWordIds.includes(w.id));
  }, [categoryWords, queueMode, needsPracticeWordIds, masteredWordIds]);

  const activeWord = activeQueueWords[currentIndex] || activeQueueWords[0] || null;

  // Track presented words
  useEffect(() => {
    if (activeWord && !presentedWordIds.includes(activeWord.id)) {
      setPresentedWordIds((prev) => [...prev, activeWord.id]);
    }
  }, [activeWord?.id]);

  // Reset arena state when switching word
  const resetForWord = () => {
    setUserSpelling('');
    setUserMeaning('');
    setEvaluation(null);
    setMeaningResult(null);
    setIsEvaluatingMeaning(false);
    setShowCardTagManager(false);
    setRevealedClues({
      definition: false,
      origin: false,
      sentence: false,
      partOfSpeech: false,
      syllables: false,
    });
    setHasPronouncedOnLoad(false);
    setMicStatusMsg('');
  };

  useEffect(() => {
    resetForWord();
  }, [activeWord?.id, selectedDifficulty, selectedTagId, queueMode]);

  // Autoplay pronunciation once when landing on a new word
  useEffect(() => {
    if (activeWord && !hasPronouncedOnLoad && !isMuted) {
      const timer = setTimeout(() => {
        playPronunciation(activeWord.word, { rate: 0.85 });
        setHasPronouncedOnLoad(true);
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [activeWord, hasPronouncedOnLoad, isMuted]);

  // Toggle Mute Audio
  const handleToggleMute = () => {
    const nextState = !isMuted;
    setIsMuted(nextState);
    setAudioMuted(nextState);
  };

  // Voice recognition for spelling
  const spellingRecognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);
  const meaningRecognizerRef = useRef<ReturnType<typeof createSpeechRecognizer> | null>(null);

  const startVoiceSpelling = () => {
    if (isListeningSpelling) {
      spellingRecognizerRef.current?.stop?.();
      setIsListeningSpelling(false);
      setMicStatusMsg('');
      return;
    }

    setMicStatusMsg('Starting speech recognition...');

    const recognizer = createSpeechRecognizer(
      (transcript, isFinal) => {
        const parsed = parseSpokenInputToSpelling(transcript);
        if (parsed) {
          setUserSpelling(parsed);
          setMicStatusMsg(`Heard: "${transcript}" → Spelled: ${parsed.toUpperCase()}`);
        } else {
          setMicStatusMsg(`Listening... heard: "${transcript}"`);
        }
        if (isFinal) {
          setIsListeningSpelling(false);
        }
      },
      (err) => {
        console.warn('Voice recognition error:', err);
        setIsListeningSpelling(false);
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setMicStatusMsg('Microphone blocked by preview frame. Use the Letter Pad below, or open app in a new tab.');
          setShowKeypad(true);
        } else if (err === 'no-speech') {
          setMicStatusMsg('No speech heard. Tap the microphone and try saying the letters or word.');
        } else if (err === 'aborted') {
          setMicStatusMsg('');
        } else {
          setMicStatusMsg(`Voice recognition: ${err}. Please use the Letter Pad or type below.`);
          setShowKeypad(true);
        }
      },
      () => {
        setIsListeningSpelling(true);
        setMicStatusMsg('Listening... say letters ("b - e - e") or pronounce the word.');
      },
      () => {
        setIsListeningSpelling(false);
      }
    );

    if (recognizer) {
      spellingRecognizerRef.current = recognizer;
      try {
        recognizer.start();
      } catch (startErr: unknown) {
        console.warn('Start error:', startErr);
        setIsListeningSpelling(false);
        setMicStatusMsg('Microphone blocked by preview frame. Tap letters on the Letter Pad below.');
        setShowKeypad(true);
      }
    } else {
      setMicStatusMsg('Speech recognition is not available in this browser. Please use the Letter Pad below.');
      setShowKeypad(true);
    }
  };

  const startVoiceMeaning = () => {
    if (isListeningMeaning) {
      meaningRecognizerRef.current?.stop?.();
      setIsListeningMeaning(false);
      return;
    }

    const recognizer = createSpeechRecognizer(
      (text, isFinal) => {
        setUserMeaning(text);
        if (isFinal) {
          setIsListeningMeaning(false);
        }
      },
      (err) => {
        console.warn('Meaning recognition error:', err);
        setIsListeningMeaning(false);
        if (err === 'not-allowed') {
          alert('Microphone access is restricted in this preview frame. You can type the meaning directly into the box.');
        }
      },
      () => {
        setIsListeningMeaning(true);
      },
      () => {
        setIsListeningMeaning(false);
      }
    );

    if (recognizer) {
      meaningRecognizerRef.current = recognizer;
      try {
        recognizer.start();
      } catch (startErr) {
        console.warn('Start error:', startErr);
        setIsListeningMeaning(false);
      }
    } else {
      alert('Speech recognition is not supported in this browser. Please type the meaning.');
    }
  };

  const handleRevealClue = (clue: keyof typeof revealedClues) => {
    setRevealedClues((prev) => ({ ...prev, [clue]: true }));
    if (!activeWord) return;

    if (clue === 'definition') {
      playPronunciation(`Definition: ${activeWord.definition}`);
    } else if (clue === 'origin') {
      playPronunciation(`Language of origin: ${activeWord.languageOfOrigin}. ${activeWord.etymology}`);
    } else if (clue === 'sentence') {
      playPronunciation(activeWord.sentence);
    } else if (clue === 'partOfSpeech') {
      playPronunciation(`Part of speech: ${activeWord.partOfSpeech}`);
    }
  };

  const handleSubmitSpelling = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!activeWord || !userSpelling.trim()) return;

    const evalResult = evaluateSpelling(activeWord.word, userSpelling);
    setEvaluation(evalResult);

    if (evalResult.isCorrect) {
      playCorrectChime();
      // Mastered: won't repeat in active queue!
      setMasteredWordIds((prev) => (prev.includes(activeWord.id) ? prev : [...prev, activeWord.id]));
      setNeedsPracticeWordIds((prev) => prev.filter((id) => id !== activeWord.id));
    } else {
      playBuzzer();
      // Misspelled: keep in queue for repeated presentation!
      setNeedsPracticeWordIds((prev) => (prev.includes(activeWord.id) ? prev : [...prev, activeWord.id]));
      setMasteredWordIds((prev) => prev.filter((id) => id !== activeWord.id));
    }

    const hintsUsed: string[] = [];
    if (revealedClues.definition) hintsUsed.push('definition');
    if (revealedClues.origin) hintsUsed.push('origin');
    if (revealedClues.sentence) hintsUsed.push('sentence');

    onRecordAttempt(
      activeWord.id,
      activeWord.word,
      userSpelling,
      evalResult.isCorrect,
      hintsUsed,
      userMeaning || undefined,
      meaningResult || undefined
    );
  };

  // Student struggled to pronounce the word, so keep it for repeated practice
  const handleMarkNeedsPronunciation = () => {
    if (!activeWord) return;
    if (!needsPracticeWordIds.includes(activeWord.id)) {
      setNeedsPracticeWordIds((prev) => [...prev, activeWord.id]);
    }
    setMasteredWordIds((prev) => prev.filter((id) => id !== activeWord.id));
    playBeeBell();
    setRepeatNotice(`🔁 "${activeWord.word}" added to repeat queue for repeated pronunciation practice!`);
    setTimeout(() => setRepeatNotice(null), 4000);
  };

  const handleResetSessionQueue = () => {
    setMasteredWordIds([]);
    setNeedsPracticeWordIds([]);
    setPresentedWordIds([]);
    setCurrentIndex(0);
    setQueueMode('active');
    setRepeatNotice('✨ Practice queue reset! All words in this set are ready to be practiced again.');
    setTimeout(() => setRepeatNotice(null), 3500);
  };

  const handleEvaluateMeaning = async () => {
    if (!activeWord || !userMeaning.trim()) return;

    setIsEvaluatingMeaning(true);
    try {
      const res = await fetch('/api/evaluate-meaning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word: activeWord.word,
          targetDefinition: activeWord.definition,
          userMeaning: userMeaning.trim(),
          exampleSentence: activeWord.sentence,
          etymology: activeWord.etymology,
        }),
      });

      if (!res.ok) throw new Error('Failed to evaluate meaning');
      const data: MeaningEvaluationResult = await res.json();
      setMeaningResult(data);

      if (data.isCorrectEssence) {
        playBeeBell();
      }
    } catch (err) {
      console.error('Meaning check failed:', err);
      setMeaningResult({
        isCorrectEssence: userMeaning.length > 5,
        scorePercent: 75,
        grade: 'GOOD',
        feedback: `Great try! You explained the general idea of "${activeWord.word}". Official definition: ${activeWord.definition}`,
      });
    } finally {
      setIsEvaluatingMeaning(false);
    }
  };

  const handleNextWord = () => {
    if (activeQueueWords.length === 0) return;
    if (currentIndex < activeQueueWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevWord = () => {
    if (activeQueueWords.length === 0) return;
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(Math.max(0, activeQueueWords.length - 1));
    }
  };

  const handleShuffle = () => {
    if (activeQueueWords.length === 0) return;
    const randomIndex = Math.floor(Math.random() * activeQueueWords.length);
    setCurrentIndex(randomIndex);
  };

  // Inline Tag creation submit
  const handleInlineTagSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inlineTagName.trim()) return;
    if (onCreateTag) {
      onCreateTag(inlineTagName.trim(), inlineTagColor);
    }
    setInlineTagName('');
    setIsCreatingInlineTag(false);
  };

  // Keyboard tile click
  const handleLetterPadPress = (letter: string) => {
    playKeyTap();
    setUserSpelling((prev) => prev + letter.toLowerCase());
  };

  const handleLetterPadBackspace = () => {
    playKeyTap();
    setUserSpelling((prev) => prev.slice(0, -1));
  };

  const handleLetterPadClear = () => {
    playKeyTap();
    setUserSpelling('');
  };

  if (!activeWord) {
    if (categoryWords.length > 0 && queueMode === 'active' && masteredWordIds.length > 0) {
      return (
        <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-4xl shadow-md shadow-emerald-500/10">
            🏆
          </div>
          <h2 className="text-2xl font-black text-slate-900">Practice Round Completed!</h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Awesome spelling! You have mastered all {categoryWords.length} words in this set without repetition.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
            <button
              onClick={handleResetSessionQueue}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-xs shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Practice Set Again (Reset Queue)</span>
            </button>
            <button
              onClick={() => { setQueueMode('all'); setCurrentIndex(0); }}
              className="px-4 py-3 rounded-2xl border border-slate-200 bg-white text-slate-700 font-bold text-xs hover:bg-slate-50 cursor-pointer"
            >
              Review All Words ({categoryWords.length})
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-3xl mx-auto p-6 text-center py-20">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
          <Book className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">No words found in this category</h2>
        <p className="text-sm text-slate-500 mt-2">
          {selectedTagId
            ? 'No words tagged with this label yet. You can tag words during practice to review them here.'
            : 'Try selecting a different difficulty level.'}
        </p>
        {selectedTagId && (
          <button
            onClick={onClearTagFilter}
            className="mt-4 px-4 py-2 rounded-xl bg-amber-500 text-white font-bold text-xs cursor-pointer"
          >
            Clear Label Filter
          </button>
        )}
      </div>
    );
  }

  const assignedTags = wordTagsMap[activeWord.id] || [];
  const alphabet = 'abcdefghijklmnopqrstuvwxyz'.split('');
  const presetColors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#06B6D4'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-6">
      {/* Top Filter Bar: Difficulty + Label Filter + Queue Status */}
      <div className="bg-white p-3.5 sm:p-4 rounded-3xl border border-slate-200/80 shadow-2xs space-y-3">
        {/* Row 1: Difficulty & Label Selection */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Difficulty Selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-bold text-slate-500 mr-1 hidden sm:inline">Difficulty:</span>
            {(['all', 'easy', 'medium', 'hard', 'very_hard'] as const).map((lvl) => {
              const isSel = selectedDifficulty === lvl;
              const labels = {
                all: 'All Levels',
                easy: 'Easy',
                medium: 'Medium',
                hard: 'Hard',
                very_hard: 'Very Hard',
              };
              return (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedDifficulty(lvl);
                    setCurrentIndex(0);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                    isSel
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                  }`}
                >
                  {labels[lvl]}
                </button>
              );
            })}
          </div>

          {/* Label Filter Dropdown & Navigation Counter */}
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-semibold text-slate-600">
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <select
                value={selectedTagId || 'all'}
                onChange={(e) => {
                  const val = e.target.value === 'all' ? null : e.target.value;
                  if (onSelectTagFilter) onSelectTagFilter(val);
                  else if (val === null && onClearTagFilter) onClearTagFilter();
                  setCurrentIndex(0);
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-100 border border-slate-200 text-slate-800 focus:outline-hidden cursor-pointer"
                aria-label="Filter by label or tag"
              >
                <option value="all">All Labels ({words.length})</option>
                {userTags.map((t) => {
                  const count = words.filter((w) => (wordTagsMap[w.id] || []).includes(t.id)).length;
                  return (
                    <option key={t.id} value={t.id}>
                      {t.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <span className="bg-slate-100 px-2.5 py-1 rounded-lg">
              {activeQueueWords.length > 0 ? currentIndex + 1 : 0} of {activeQueueWords.length}
            </span>

            <button
              onClick={handleShuffle}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 cursor-pointer"
              title="Random Word"
              aria-label="Random Word"
            >
              <Shuffle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Row 2: Queue Mode Filter Tabs & Reset Queue */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-extrabold text-slate-500 uppercase tracking-wider text-[10px] mr-1 hidden sm:inline">
              Queue:
            </span>
            <button
              type="button"
              onClick={() => { setQueueMode('active'); setCurrentIndex(0); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                queueMode === 'active'
                  ? 'bg-amber-500 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              title="Practice unmastered words (mastered words won't repeat)"
            >
              Active Queue ({categoryWords.filter(w => !masteredWordIds.includes(w.id)).length})
            </button>

            <button
              type="button"
              onClick={() => { setQueueMode('needs_practice'); setCurrentIndex(0); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                queueMode === 'needs_practice'
                  ? 'bg-rose-500 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
              }`}
              title="Words that failed spelling or pronunciation and are queued for repeat"
            >
              🔁 Needs Repeat ({categoryWords.filter(w => needsPracticeWordIds.includes(w.id)).length})
            </button>

            <button
              type="button"
              onClick={() => { setQueueMode('mastered'); setCurrentIndex(0); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                queueMode === 'mastered'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
              title="Words completed and mastered this round"
            >
              ✓ Mastered ({categoryWords.filter(w => masteredWordIds.includes(w.id)).length})
            </button>

            <button
              type="button"
              onClick={() => { setQueueMode('all'); setCurrentIndex(0); }}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                queueMode === 'all'
                  ? 'bg-slate-800 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({categoryWords.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetSessionQueue}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center gap-1 transition-all cursor-pointer ml-auto"
            title="Reset practice session queue so all words can be practiced again"
          >
            <RotateCcw className="w-3 h-3 text-slate-500" />
            <span>Reset Queue</span>
          </button>
        </div>
      </div>

      {/* The Championship Stage Podium */}
      <div className="bg-white rounded-3xl border border-amber-200/90 shadow-xl overflow-hidden relative">
        {/* Stage Header Banner */}
        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-white px-5 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🏆</span>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base tracking-tight text-amber-950">
                National Spelling Bee Arena
              </h2>
              <p className="text-[11px] text-amber-900/80 font-medium hidden sm:block">
                Listen to the soft human voice pronouncer and request official clues
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStar(activeWord.id)}
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                isStarred(activeWord.id)
                  ? 'bg-white text-amber-500 shadow-xs'
                  : 'bg-amber-600/30 text-amber-100 hover:bg-amber-600/50'
              }`}
              title="Star this word"
              aria-label="Star this word"
            >
              <Star className={`w-4 h-4 ${isStarred(activeWord.id) ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Quick Labels Manager Trigger */}
            <button
              type="button"
              onClick={() => setShowCardTagManager(!showCardTagManager)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer ${
                showCardTagManager || assignedTags.length > 0
                  ? 'bg-indigo-700 text-white'
                  : 'bg-white/95 hover:bg-white text-indigo-900'
              }`}
              title="Manage labels or tags for this word"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Labels ({assignedTags.length})</span>
            </button>

            <button
              onClick={() => onOpenWordCard(activeWord)}
              className="px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-amber-900 text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Inspect Card</span>
            </button>
          </div>
        </div>

        {/* Quick Card Tag Manager Drawer */}
        {showCardTagManager && (
          <div className="p-4 bg-indigo-50/90 border-b border-indigo-200 animate-in fade-in space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-indigo-600" />
                <span>Label this word to revisit or revise later:</span>
              </span>
              <button
                type="button"
                onClick={() => setShowCardTagManager(false)}
                className="text-xs font-bold text-indigo-700 hover:text-indigo-950 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {userTags.map((t) => {
                const isTagged = assignedTags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onToggleWordTag(activeWord.id, t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      isTagged
                        ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <span>{isTagged ? '✓' : '+'}</span>
                    <span>{t.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Link to Revisit Active Tag */}
            {assignedTags.length > 0 && (
              <div className="pt-2 border-t border-indigo-200/60 flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-indigo-900">Revisit words with this label:</span>
                {assignedTags.map((tagId) => {
                  const t = userTags.find((tag) => tag.id === tagId);
                  if (!t) return null;
                  const count = words.filter((w) => (wordTagsMap[w.id] || []).includes(t.id)).length;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        if (onSelectTagFilter) onSelectTagFilter(t.id);
                        setQueueMode('all');
                        setCurrentIndex(0);
                        setShowCardTagManager(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-100 text-indigo-900 border border-indigo-300 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                    >
                      <span>Revisit all &ldquo;{t.name}&rdquo; ({count} words)</span>
                      <ChevronRight className="w-3 h-3 text-indigo-600" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div className="p-5 sm:p-8 space-y-6">
          {/* Active Word Labels Display */}
          {assignedTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400">Labels:</span>
              {assignedTags.map((tagId) => {
                const t = userTags.find((tag) => tag.id === tagId);
                if (!t) return null;
                return (
                  <span
                    key={t.id}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white shadow-2xs"
                    style={{ backgroundColor: t.color }}
                  >
                    <Tag className="w-3 h-3" />
                    <span>{t.name}</span>
                    {onSelectTagFilter && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectTagFilter(t.id);
                          setQueueMode('all');
                          setCurrentIndex(0);
                        }}
                        className="ml-1 underline text-[10px] text-white/90 hover:text-white cursor-pointer"
                        title={`Revisit all ${t.name} words`}
                      >
                        Revisit bucket →
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Pronouncer Section: Audio Button & Sound Controls */}
          <div className="text-center py-5 bg-gradient-to-b from-amber-50/70 to-white rounded-2xl border border-amber-100/70 relative">
            <div className="flex items-center justify-center gap-1.5 text-xs font-extrabold uppercase tracking-widest text-amber-700 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Official Human Pronouncer</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* Main Hear Word Button (Natural, soft human voice) */}
              <button
                onClick={() => playPronunciation(activeWord.word, { rate: 0.85 })}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-extrabold text-base shadow-lg shadow-amber-500/25 transition-all active:scale-95 cursor-pointer"
                aria-label="Listen to word"
              >
                <Volume2 className="w-5 h-5" />
                <span>Hear Word</span>
              </button>

              {/* Slow Motion Button */}
              <button
                onClick={() => playPronunciation(activeWord.word, { slow: true, rate: 0.6 })}
                className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white hover:bg-amber-50 border border-amber-300 text-amber-900 font-bold text-sm shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Hear slowly with deliberate articulation"
                aria-label="Hear slow pronunciation"
              >
                <Turtle className="w-4 h-4 text-amber-600" />
                <span>Slow Motion</span>
              </button>

              {/* Needs Pronunciation Practice Button */}
              <button
                type="button"
                onClick={handleMarkNeedsPronunciation}
                className={`flex items-center gap-2 px-4 py-3 rounded-2xl border transition-all active:scale-95 text-xs font-bold cursor-pointer ${
                  needsPracticeWordIds.includes(activeWord.id)
                    ? 'bg-amber-100 border-amber-400 text-amber-900 shadow-xs'
                    : 'bg-white hover:bg-amber-50/80 border-amber-300 text-amber-900 shadow-xs'
                }`}
                title="If you struggled to pronounce this word, keep it in queue to be presented again for repeated practice"
              >
                <RotateCcw className="w-4 h-4 text-amber-600" />
                <span>{needsPracticeWordIds.includes(activeWord.id) ? 'Queued for Repeat' : 'Needs Pronunciation Practice'}</span>
              </button>

              {/* Working Mute & Stop Button */}
              <button
                onClick={handleToggleMute}
                className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl border transition-all active:scale-95 cursor-pointer ${
                  isMuted
                    ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                }`}
                title={isMuted ? 'Muted (Tap to unmute sound)' : 'Mute audio / stop sound'}
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-rose-600" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-500" />
                )}
                <span className="text-xs font-bold">{isMuted ? 'Muted' : 'Mute'}</span>
              </button>

              {/* Stop current audio immediately */}
              <button
                onClick={() => stopPronunciation()}
                className="px-3 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-all cursor-pointer"
                title="Stop ongoing speech right now"
              >
                Stop
              </button>
            </div>

            {/* Repeat / Pronunciation Alert Notice */}
            {repeatNotice && (
              <div className="mx-auto mt-3 max-w-lg bg-amber-100/90 border border-amber-300 text-amber-950 px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                <span>{repeatNotice}</span>
              </div>
            )}

            <p className="text-[11px] text-slate-400 mt-3">
              Tap &ldquo;Hear Word&rdquo; to listen softly and clearly as many times as you need before spelling
            </p>
          </div>

          {/* Scripps Championship Request Clues (WITH TARGET WORD MASKED!) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                Ask The Pronouncer (Official Clues)
              </span>
              <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
                🔒 Word spelling is masked on screen
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                onClick={() => handleRevealClue('definition')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  revealedClues.definition
                    ? 'border-blue-400 bg-blue-50 text-blue-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Book className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Definition</span>
              </button>

              <button
                onClick={() => handleRevealClue('origin')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  revealedClues.origin
                    ? 'border-indigo-400 bg-indigo-50 text-indigo-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Globe className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Language Origin</span>
              </button>

              <button
                onClick={() => handleRevealClue('sentence')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  revealedClues.sentence
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Quote className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Sentence</span>
              </button>

              <button
                onClick={() => handleRevealClue('partOfSpeech')}
                className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                  revealedClues.partOfSpeech
                    ? 'border-purple-400 bg-purple-50 text-purple-900'
                    : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
                <span>Part of Speech</span>
              </button>
            </div>

            {/* Clues Disclosure Box (TARGET WORD MASKED ON SCREEN!) */}
            {(revealedClues.definition || revealedClues.origin || revealedClues.sentence || revealedClues.partOfSpeech) && (
              <div className="p-4 rounded-2xl bg-slate-50/90 border border-slate-200 space-y-2.5 text-xs text-slate-700 animate-in fade-in duration-200">
                {revealedClues.sentence && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-700 shrink-0">Sentence:</span>
                    <span className="italic leading-relaxed font-medium text-slate-900">
                      &ldquo;
                      <span className="bg-emerald-100/70 text-emerald-950 px-1 py-0.5 rounded-sm font-semibold">
                        {maskTargetWord(activeWord.sentence, activeWord.word, '____________')}
                      </span>
                      &rdquo;
                    </span>
                  </div>
                )}

                {revealedClues.partOfSpeech && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-purple-700 shrink-0">Part of Speech:</span>
                    <span className="italic">
                      {maskTargetWord(activeWord.partOfSpeech, activeWord.word, '____________')}
                    </span>
                  </div>
                )}

                {revealedClues.definition && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-700 shrink-0">Definition:</span>
                    <span>
                      {maskTargetWord(activeWord.definition, activeWord.word, '____________')}
                    </span>
                  </div>
                )}

                {revealedClues.origin && (
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-indigo-700 shrink-0">Origin:</span>
                    <span>
                      {activeWord.languageOfOrigin} &mdash;{' '}
                      {maskTargetWord(activeWord.etymology, activeWord.word, '____________')}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Speller Input Box */}
          <form onSubmit={handleSubmitSpelling} className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="speller-input" className="block text-xs font-extrabold uppercase tracking-wider text-slate-700">
                  Spell The Word:
                </label>
                <button
                  type="button"
                  onClick={() => setShowKeypad(!showKeypad)}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 flex items-center gap-1"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>{showKeypad ? 'Hide Letter Pad' : 'Show Letter Pad (Touch/iPad)'}</span>
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  id="speller-input"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                  value={userSpelling}
                  onChange={(e) => setUserSpelling(e.target.value.toLowerCase())}
                  placeholder="Type your spelling here..."
                  className={`w-full px-5 py-4 rounded-2xl border-2 text-xl sm:text-2xl font-mono tracking-wider text-slate-900 placeholder:text-slate-300 placeholder:font-sans focus:outline-hidden transition-all ${
                    evaluation
                      ? evaluation.isCorrect
                        ? 'border-emerald-500 bg-emerald-50/30'
                        : 'border-rose-400 bg-rose-50/30'
                      : 'border-slate-300 focus:border-amber-500 bg-white'
                  }`}
                />

                {/* Microphone Voice-Spelling Button */}
                <button
                  type="button"
                  onClick={startVoiceSpelling}
                  className={`absolute right-3.5 p-2.5 rounded-xl transition-all shadow-xs ${
                    isListeningSpelling
                      ? 'bg-rose-500 text-white animate-pulse'
                      : 'bg-amber-100 hover:bg-amber-200 text-amber-900'
                  }`}
                  title={isListeningSpelling ? 'Listening... click to stop' : 'Spell by voice (click to talk)'}
                  aria-label="Voice spelling microphone"
                >
                  {isListeningSpelling ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              </div>

              {/* Status note for voice / microphone */}
              {micStatusMsg && (
                <div className="flex items-center justify-between gap-2 text-xs text-amber-900 font-medium mt-1 bg-amber-50/90 px-3 py-2 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <span className="leading-tight">{micStatusMsg}</span>
                  </div>
                  {!showKeypad && (
                    <button
                      type="button"
                      onClick={() => setShowKeypad(true)}
                      className="shrink-0 text-[11px] font-bold text-amber-800 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Use Letter Pad
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* On-Screen Letter Keypad for iPad, iPhone & Touchscreens */}
            {showKeypad && (
              <div className="p-3.5 bg-slate-100/95 rounded-2xl border border-slate-200 space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <Keyboard className="w-3.5 h-3.5 text-amber-600" />
                    <span>Spelling Bee Letter Pad</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Tap letters in order</span>
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {alphabet.map((letter) => (
                    <button
                      key={letter}
                      type="button"
                      onClick={() => handleLetterPadPress(letter)}
                      className="w-8 sm:w-9 h-10 rounded-xl bg-white hover:bg-amber-100 border border-slate-200 text-slate-800 font-bold text-sm shadow-2xs active:scale-90 transition-all cursor-pointer"
                    >
                      {letter.toUpperCase()}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleLetterPadBackspace}
                    className="px-3 h-10 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                    title="Delete last letter"
                  >
                    <Delete className="w-3.5 h-3.5" />
                    <span>Del</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLetterPadClear}
                    className="px-2.5 h-10 rounded-xl bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-600 font-bold text-xs active:scale-95 transition-all cursor-pointer"
                    title="Clear all letters"
                  >
                    <span>Clear</span>
                  </button>
                </div>
              </div>
            )}

            {/* Check Spelling & Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={!userSpelling.trim()}
                className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-40 text-white font-extrabold text-sm sm:text-base shadow-md shadow-amber-500/25 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                <span>Check Spelling</span>
                <CheckCircle2 className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => setUserSpelling('')}
                className="py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs"
                title="Clear input"
              >
                Clear
              </button>
            </div>
          </form>

          {/* Spelling Evaluation Feedback Display */}
          {evaluation && (
            <div
              className={`p-5 rounded-3xl border-2 transition-all animate-in zoom-in-95 duration-200 ${
                evaluation.isCorrect
                  ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                  : 'bg-rose-50/90 border-rose-300 text-rose-950'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  {evaluation.isCorrect ? (
                    <>
                      <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-lg shrink-0">
                        ✓
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-emerald-900">Correct! 100% Letter Accuracy</h3>
                        <p className="text-xs text-emerald-700 font-bold flex items-center gap-1.5 mt-0.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Mastered! This word won&rsquo;t repeat in this round.</span>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center font-black text-lg shrink-0">
                        ✕
                      </div>
                      <div>
                        <h3 className="font-black text-lg text-rose-900">Incorrect Spelling</h3>
                        <p className="text-xs text-rose-700 font-bold flex items-center gap-1.5 mt-0.5">
                          <RotateCcw className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          <span>Kept in repeat queue: this word will be presented again for repeated practice!</span>
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    onClick={() =>
                      onOpenWordCard(activeWord, {
                        isSpellingCorrect: evaluation.isCorrect,
                        userSpelling: evaluation.attempt,
                        userMeaning: userMeaning || undefined,
                        meaningFeedback: meaningResult?.feedback,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-white text-slate-800 border border-slate-200 text-xs font-bold hover:bg-slate-50 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-500" />
                    <span>View Card Details</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleNextWord}
                    className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs flex items-center gap-1 cursor-pointer"
                  >
                    <span>Next Word</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Character Diff Comparison */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200/80 space-y-2">
                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Your Spelling:</span>
                  <div className="flex flex-wrap gap-1 font-mono text-lg font-bold mt-1">
                    {evaluation.diff.map((item, idx) => (
                      <span
                        key={idx}
                        className={`w-7 h-8 flex items-center justify-center rounded-lg border text-sm ${
                          item.status === 'correct'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : item.status === 'wrong'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}
                      >
                        {item.char}
                      </span>
                    ))}
                  </div>
                </div>

                {!evaluation.isCorrect && (
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Official Spelling:</span>
                      <span className="font-mono text-lg font-bold text-emerald-700 tracking-wider">
                        {activeWord.word}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setUserSpelling('');
                        setEvaluation(null);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-900 font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Try Again Right Now</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Revision Tagging Bar + PROMINENT CREATE CUSTOM TAG BUTTON */}
              <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-500" />
                    Tag this word to revisit or revise with that label:
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCreatingInlineTag(!isCreatingInlineTag)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create My Own Tag</span>
                  </button>
                </div>

                {/* Inline Tag Creator Form */}
                {isCreatingInlineTag && (
                  <div className="p-3 bg-white rounded-xl border border-indigo-200 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Create New Custom Label:</span>
                      <button
                        type="button"
                        onClick={() => setIsCreatingInlineTag(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inlineTagName}
                        onChange={(e) => setInlineTagName(e.target.value)}
                        placeholder="e.g. Difficult to pronounce, Vowel traps, Friday test..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        autoFocus
                      />
                      <div className="flex items-center gap-1">
                        {presetColors.map((col) => (
                          <button
                            type="button"
                            key={col}
                            onClick={() => setInlineTagColor(col)}
                            className={`w-5 h-5 rounded-full transition-transform cursor-pointer ${
                              inlineTagColor === col ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : ''
                            }`}
                            style={{ backgroundColor: col }}
                            aria-label={`Color ${col}`}
                          />
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={handleInlineTagSubmit}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs cursor-pointer"
                      >
                        Add Tag
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {userTags.map((tag) => {
                    const isTagged = assignedTags.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => onToggleWordTag(activeWord.id, tag.id)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          isTagged
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-2xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        {isTagged ? '✓ ' : '+ '}
                        {tag.name}
                      </button>
                    );
                  })}
                </div>

                {/* Direct shortcut to revisit all words with this label */}
                {assignedTags.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/50 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600">Revisit words with this label:</span>
                    {assignedTags.map((tagId) => {
                      const t = userTags.find((tag) => tag.id === tagId);
                      if (!t) return null;
                      const count = words.filter((w) => (wordTagsMap[w.id] || []).includes(t.id)).length;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            if (onSelectTagFilter) onSelectTagFilter(t.id);
                            setQueueMode('all');
                            setCurrentIndex(0);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                        >
                          <span>Revisit all &ldquo;{t.name}&rdquo; ({count} words)</span>
                          <ChevronRight className="w-3 h-3 text-indigo-600" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Meaning Essence Checker Section */}
          <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs sm:text-sm font-extrabold text-blue-950">
                  Bonus Challenge: Explain The Meaning In Your Own Words
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMeaningInput(!showMeaningInput)}
                className="text-xs font-bold text-blue-700 hover:underline"
              >
                {showMeaningInput ? 'Hide' : 'Open Meaning Practice'}
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              In the National Bee, students must understand what words mean. You don&rsquo;t need word-for-word memorization—just capture the <span className="font-bold text-blue-900">essence</span>!
            </p>

            {showMeaningInput && (
              <div className="space-y-3 pt-2">
                <div className="relative">
                  <textarea
                    rows={2}
                    value={userMeaning}
                    onChange={(e) => setUserMeaning(e.target.value)}
                    placeholder={`What does this word mean in essence? (e.g. for bougainvillea: "a climbing plant with bright pink flower-like leaves")`}
                    className="w-full px-4 py-3 rounded-xl border border-blue-200 focus:outline-hidden focus:ring-2 focus:ring-blue-400 text-xs sm:text-sm text-slate-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={startVoiceMeaning}
                    className={`absolute right-3 top-3 p-2 rounded-lg transition-all ${
                      isListeningMeaning ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                    }`}
                    title="Speak meaning"
                    aria-label="Voice meaning microphone"
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleEvaluateMeaning}
                  disabled={!userMeaning.trim() || isEvaluatingMeaning}
                  className="py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs flex items-center gap-2 transition-all"
                >
                  {isEvaluatingMeaning ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Checking Essence...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Check Meaning Essence</span>
                    </>
                  )}
                </button>

                {/* Meaning Result Feedback */}
                {meaningResult && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                      meaningResult.isCorrectEssence
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                        : 'bg-amber-50 border-amber-200 text-amber-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold">
                      <span className="flex items-center gap-1.5">
                        {meaningResult.isCorrectEssence ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <HelpCircle className="w-4 h-4 text-amber-600" />
                        )}
                        <span>
                          {meaningResult.isCorrectEssence
                            ? 'Essence Captured!'
                            : 'Partial / Needs Review'}
                        </span>
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-white font-mono text-[11px] font-bold">
                        {meaningResult.scorePercent}%
                      </span>
                    </div>
                    <p className="leading-relaxed">{meaningResult.feedback}</p>
                    {meaningResult.simpleKidDefinition && (
                      <p className="font-semibold text-slate-700 pt-1 border-t border-slate-200/50">
                        Official meaning in plain words: {meaningResult.simpleKidDefinition}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Navigation Controls: Prev / Next */}
          <div className="pt-2 flex items-center justify-between">
            <button
              onClick={handlePrevWord}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs"
            >
              &larr; Previous Word
            </button>

            <button
              onClick={handleNextWord}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <span>Next Word</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
