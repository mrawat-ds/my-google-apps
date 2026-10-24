export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'very_hard';

export interface WordItem {
  id: string;
  word: string;
  phonetic: string;
  pronunciationGuide?: string;
  syllables: string[];
  partOfSpeech: string;
  definition: string;
  kidEssenceDefinition: string;
  etymology: string;
  languageOfOrigin: string;
  sentence: string;
  alternatePronunciations?: string[];
  difficulty: DifficultyLevel;
  tags: string[]; // default tag names or custom tag IDs
  trickyPatterns?: string[];
  notes?: string;
  isCustom?: boolean;
}

export interface UserTag {
  id: string;
  name: string;
  color: string; // tailwind color or hex
  description?: string;
  isPreset?: boolean;
}

export interface MeaningEvaluationResult {
  isCorrectEssence: boolean;
  scorePercent: number;
  grade: 'EXCELLENT' | 'GOOD' | 'PARTIAL' | 'INCORRECT';
  feedback: string;
  keyConceptsCovered?: string[];
  missedConcepts?: string[];
  simpleKidDefinition?: string;
}

export interface PracticeAttempt {
  id: string;
  wordId: string;
  word: string;
  timestamp: number;
  userSpelling: string;
  isSpellingCorrect: boolean;
  userMeaning?: string;
  meaningEvaluation?: MeaningEvaluationResult;
  hintsRequested: string[];
  timeTakenSeconds: number;
}

export interface UserProfile {
  email: string;
  displayName: string;
  joinedAt: number;
  tags: UserTag[];
  wordTags: Record<string, string[]>; // wordId -> array of tag IDs
  starredWordIds: string[];
  history: PracticeAttempt[];
  streakDays: number;
  lastActiveDay: string;
}

export interface SpellingDiffChar {
  char: string;
  status: 'correct' | 'wrong' | 'missing' | 'extra';
}

export interface SpellingEvaluation {
  isCorrect: boolean;
  target: string;
  attempt: string;
  matchPercentage: number;
  divergenceIndex: number; // First index where attempt deviated
  diff: SpellingDiffChar[];
}
