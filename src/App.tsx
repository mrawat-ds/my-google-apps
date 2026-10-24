import React, { useState, useEffect } from 'react';
import { WordItem, UserTag, MeaningEvaluationResult, PracticeAttempt } from './types/spelling';
import {
  getActiveUserEmail,
  setActiveUserEmail,
  getStoredEmails,
  loadUserProfile,
  saveUserProfile,
  getAllWords,
  saveCustomWord,
  saveBatchCustomWords,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { ChampionshipArena } from './components/ChampionshipArena';
import { TagRevisionView } from './components/TagRevisionView';
import { WordBankView } from './components/WordBankView';
import { TrophyRoomView } from './components/TrophyRoomView';
import { AuthModal } from './components/AuthModal';
import { WordCardModal } from './components/WordCardModal';
import { AddWordModal } from './components/AddWordModal';
import { ImportWordsModal } from './components/ImportWordsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<'practice' | 'tags' | 'bank' | 'stats'>('practice');
  const [activeEmail, setActiveEmailState] = useState<string>(() => getActiveUserEmail());
  const [savedEmails, setSavedEmails] = useState<string[]>(() => getStoredEmails());
  const [profile, setProfile] = useState(() => loadUserProfile(activeEmail));
  const [allWords, setAllWords] = useState<WordItem[]>(() => getAllWords());

  // Filter or targeted word for practice arena
  const [selectedTagForPractice, setSelectedTagForPractice] = useState<string | null>(null);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [inspectingWord, setInspectingWord] = useState<WordItem | null>(null);
  const [lastAttemptFeedback, setLastAttemptFeedback] = useState<{
    isSpellingCorrect: boolean;
    userSpelling: string;
    userMeaning?: string;
    meaningFeedback?: string;
  } | undefined>(undefined);

  // When active email changes, reload profile
  const handleSelectEmail = (newEmail: string) => {
    setActiveUserEmail(newEmail);
    setActiveEmailState(newEmail);
    setSavedEmails(getStoredEmails());
    const loaded = loadUserProfile(newEmail);
    setProfile(loaded);
  };

  // Sync profile changes to localStorage
  useEffect(() => {
    saveUserProfile(profile);
  }, [profile]);

  // Toggle word custom tag
  const handleToggleWordTag = (wordId: string, tagId: string) => {
    setProfile((prev) => {
      const currentTags = prev.wordTags[wordId] || [];
      const updated = currentTags.includes(tagId)
        ? currentTags.filter((id) => id !== tagId)
        : [...currentTags, tagId];

      return {
        ...prev,
        wordTags: {
          ...prev.wordTags,
          [wordId]: updated,
        },
      };
    });
  };

  // Create a new custom tag
  const handleCreateTag = (name: string, color: string, description?: string) => {
    const newTag: UserTag = {
      id: `custom-tag-${Date.now()}`,
      name,
      color,
      description,
      isPreset: false,
    };
    setProfile((prev) => ({
      ...prev,
      tags: [...prev.tags, newTag],
    }));
  };

  // Delete a custom tag
  const handleDeleteTag = (tagId: string) => {
    setProfile((prev) => {
      const updatedWordTags: Record<string, string[]> = {};
      for (const [wId, tags] of Object.entries(prev.wordTags)) {
        updatedWordTags[wId] = tags.filter((t) => t !== tagId);
      }
      return {
        ...prev,
        tags: prev.tags.filter((t) => t.id !== tagId),
        wordTags: updatedWordTags,
      };
    });
    if (selectedTagForPractice === tagId) {
      setSelectedTagForPractice(null);
    }
  };

  // Star / Bookmark word
  const handleToggleStar = (wordId: string) => {
    setProfile((prev) => {
      const isStarred = prev.starredWordIds.includes(wordId);
      return {
        ...prev,
        starredWordIds: isStarred
          ? prev.starredWordIds.filter((id) => id !== wordId)
          : [...prev.starredWordIds, wordId],
      };
    });
  };

  const isWordStarred = (wordId: string) => profile.starredWordIds.includes(wordId);

  // Add custom word
  const handleAddCustomWord = (newWord: WordItem) => {
    saveCustomWord(newWord);
    setAllWords(getAllWords());
  };

  const handleBatchImportWords = (newWords: WordItem[]) => {
    saveBatchCustomWords(newWords);
    setAllWords(getAllWords());
  };

  // Record an attempt
  const handleRecordAttempt = (
    wordId: string,
    wordText: string,
    userSpelling: string,
    isCorrect: boolean,
    hints: string[],
    userMeaning?: string,
    meaningEval?: MeaningEvaluationResult
  ) => {
    const attempt: PracticeAttempt = {
      id: `att-${Date.now()}`,
      wordId,
      word: wordText,
      timestamp: Date.now(),
      userSpelling,
      isSpellingCorrect: isCorrect,
      userMeaning,
      meaningEvaluation: meaningEval,
      hintsRequested: hints,
      timeTakenSeconds: 15,
    };

    setLastAttemptFeedback({
      isSpellingCorrect: isCorrect,
      userSpelling,
      userMeaning,
      meaningFeedback: meaningEval?.feedback,
    });

    setProfile((prev) => {
      const today = new Date().toISOString().slice(0, 10);
      const isNewDay = prev.lastActiveDay !== today;
      const streak = isNewDay ? prev.streakDays + 1 : prev.streakDays;

      return {
        ...prev,
        history: [attempt, ...prev.history],
        streakDays: streak,
        lastActiveDay: today,
      };
    });
  };

  // Open Word Card modal
  const handleOpenWordCard = (
    word: WordItem,
    attemptFeedback?: {
      isSpellingCorrect: boolean;
      userSpelling: string;
      userMeaning?: string;
      meaningFeedback?: string;
    }
  ) => {
    setInspectingWord(word);
    setLastAttemptFeedback(attemptFeedback);
  };

  // Switch to Arena with a specific tag bucket
  const handleStartBucketPractice = (tagId: string) => {
    setSelectedTagForPractice(tagId);
    setActiveTab('practice');
  };

  // Select a single word for practice
  const handleSelectWordForPractice = (word: WordItem) => {
    // Bring word to front of list by filtering or simply switching to arena
    setSelectedTagForPractice(null);
    setActiveTab('practice');
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your practice history?')) {
      setProfile((prev) => ({
        ...prev,
        history: [],
      }));
    }
  };

  // Compute total mastered count
  const wordStatusMap = new Map<string, boolean>();
  for (const h of profile.history) {
    wordStatusMap.set(h.wordId, h.isSpellingCorrect);
  }
  let masteredCount = 0;
  for (const [, isCorrect] of wordStatusMap.entries()) {
    if (isCorrect) masteredCount++;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-amber-200">
      {/* Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        userEmail={profile.email}
        onOpenAuth={() => setIsAuthOpen(true)}
        streakDays={profile.streakDays}
        masteredCount={masteredCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {activeTab === 'practice' && (
          <ChampionshipArena
            words={allWords}
            userTags={profile.tags}
            wordTagsMap={profile.wordTags}
            onToggleWordTag={handleToggleWordTag}
            onCreateTag={handleCreateTag}
            onRecordAttempt={handleRecordAttempt}
            onOpenWordCard={handleOpenWordCard}
            isStarred={isWordStarred}
            onToggleStar={handleToggleStar}
            selectedTagId={selectedTagForPractice}
            onSelectTagFilter={(tagId) => setSelectedTagForPractice(tagId)}
            onClearTagFilter={() => setSelectedTagForPractice(null)}
          />
        )}

        {activeTab === 'tags' && (
          <TagRevisionView
            words={allWords}
            userTags={profile.tags}
            wordTagsMap={profile.wordTags}
            onToggleWordTag={handleToggleWordTag}
            onCreateTag={handleCreateTag}
            onDeleteTag={handleDeleteTag}
            onOpenWordCard={handleOpenWordCard}
            onStartBucketPractice={handleStartBucketPractice}
          />
        )}

        {activeTab === 'bank' && (
          <WordBankView
            words={allWords}
            userTags={profile.tags}
            wordTagsMap={profile.wordTags}
            onOpenWordCard={handleOpenWordCard}
            onOpenAddModal={() => setIsAddWordOpen(true)}
            onOpenImportModal={() => setIsImportModalOpen(true)}
            isStarred={isWordStarred}
            onToggleStar={handleToggleStar}
            onSelectWordForPractice={handleSelectWordForPractice}
          />
        )}

        {activeTab === 'stats' && (
          <TrophyRoomView
            history={profile.history}
            streakDays={profile.streakDays}
            userEmail={profile.email}
            allWords={allWords}
            onPracticeWord={handleSelectWordForPractice}
            onClearHistory={handleClearHistory}
          />
        )}
      </main>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentEmail={profile.email}
        savedEmails={savedEmails}
        onSelectEmail={handleSelectEmail}
      />

      <WordCardModal
        word={inspectingWord}
        isOpen={!!inspectingWord}
        onClose={() => setInspectingWord(null)}
        userTags={profile.tags}
        wordTagIds={inspectingWord ? profile.wordTags[inspectingWord.id] || [] : []}
        onToggleTag={handleToggleWordTag}
        onCreateTag={handleCreateTag}
        isStarred={inspectingWord ? isWordStarred(inspectingWord.id) : false}
        onToggleStar={handleToggleStar}
        lastAttemptResult={lastAttemptFeedback}
      />

      <AddWordModal
        isOpen={isAddWordOpen}
        onClose={() => setIsAddWordOpen(false)}
        onAddWord={handleAddCustomWord}
        userTags={profile.tags}
      />

      <ImportWordsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportWords={handleBatchImportWords}
        userTags={profile.tags}
        allCurrentWords={allWords}
      />
    </div>
  );
}
