import { SpellingEvaluation, SpellingDiffChar, WordItem, DifficultyLevel } from '../types/spelling';

/**
 * Normalizes input word string by trimming, lowercasing, and normalizing inner spaces/hyphens
 */
export function normalizeWord(word: string): string {
  if (!word) return '';
  return word.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Evaluates a user's spelling against the target word.
 * Provides granular character-level diff and accuracy percentage.
 */
export function evaluateSpelling(target: string, attempt: string): SpellingEvaluation {
  const normTarget = normalizeWord(target);
  const normAttempt = normalizeWord(attempt);

  const isCorrect = normTarget === normAttempt;

  let divergenceIndex = -1;
  const maxLen = Math.max(normTarget.length, normAttempt.length);
  const diff: SpellingDiffChar[] = [];

  let correctCount = 0;

  for (let i = 0; i < maxLen; i++) {
    const targetChar = normTarget[i];
    const attemptChar = normAttempt[i];

    if (targetChar !== undefined && attemptChar !== undefined) {
      if (targetChar === attemptChar) {
        correctCount++;
        diff.push({ char: attemptChar, status: 'correct' });
      } else {
        if (divergenceIndex === -1) divergenceIndex = i;
        diff.push({ char: attemptChar, status: 'wrong' });
      }
    } else if (attemptChar !== undefined && targetChar === undefined) {
      if (divergenceIndex === -1) divergenceIndex = i;
      diff.push({ char: attemptChar, status: 'extra' });
    } else if (targetChar !== undefined && attemptChar === undefined) {
      if (divergenceIndex === -1) divergenceIndex = i;
      diff.push({ char: targetChar, status: 'missing' });
    }
  }

  const matchPercentage = normTarget.length > 0 
    ? Math.max(0, Math.round((correctCount / normTarget.length) * 100))
    : 0;

  return {
    isCorrect,
    target: normTarget,
    attempt: normAttempt,
    matchPercentage,
    divergenceIndex: divergenceIndex === -1 && !isCorrect ? normAttempt.length : divergenceIndex,
    diff,
  };
}

/**
 * Filter words by difficulty, selected tags, search query, and revision status
 */
export function filterWords(
  words: WordItem[],
  options: {
    difficulty?: DifficultyLevel | 'all';
    tagId?: string | 'all';
    search?: string;
    wordTagsMap?: Record<string, string[]>;
    onlyStarred?: boolean;
    starredWordIds?: string[];
  }
): WordItem[] {
  const {
    difficulty = 'all',
    tagId = 'all',
    search = '',
    wordTagsMap = {},
    onlyStarred = false,
    starredWordIds = [],
  } = options;

  const cleanSearch = search.trim().toLowerCase();

  return words.filter((w) => {
    // Difficulty match
    if (difficulty !== 'all' && w.difficulty !== difficulty) {
      return false;
    }

    // Starred filter
    if (onlyStarred && !starredWordIds.includes(w.id)) {
      return false;
    }

    // Tag match: check custom user wordTagsMap or default word tags
    if (tagId !== 'all') {
      const userTags = wordTagsMap[w.id] || [];
      const hasCustomTag = userTags.includes(tagId);
      const hasDefaultTag = w.tags.includes(tagId);
      if (!hasCustomTag && !hasDefaultTag) {
        return false;
      }
    }

    // Search query match (word, definition, origin, or language)
    if (cleanSearch) {
      const matchWord = w.word.toLowerCase().includes(cleanSearch);
      const matchDef = w.definition.toLowerCase().includes(cleanSearch);
      const matchOrigin = w.languageOfOrigin.toLowerCase().includes(cleanSearch);
      const matchEtym = w.etymology.toLowerCase().includes(cleanSearch);
      if (!matchWord && !matchDef && !matchOrigin && !matchEtym) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculate user stats from history
 */
export function calculateUserStats(history: Array<{ isSpellingCorrect: boolean; wordId: string }>) {
  const totalAttempts = history.length;
  if (totalAttempts === 0) {
    return {
      totalAttempts: 0,
      correctCount: 0,
      accuracyRate: 0,
      uniqueWordsMastered: 0,
    };
  }

  const correctCount = history.filter((h) => h.isSpellingCorrect).length;
  const accuracyRate = Math.round((correctCount / totalAttempts) * 100);

  // Set of words where the latest attempt was correct
  const wordStatusMap = new Map<string, boolean>();
  for (const h of history) {
    wordStatusMap.set(h.wordId, h.isSpellingCorrect);
  }

  let uniqueWordsMastered = 0;
  for (const [, isCorrect] of wordStatusMap.entries()) {
    if (isCorrect) uniqueWordsMastered++;
  }

  return {
    totalAttempts,
    correctCount,
    accuracyRate,
    uniqueWordsMastered,
  };
}

/**
 * Masks target word (and plurals/suffixes) in clues, sentences, or definitions
 * so the spelling is never revealed to the kid before they spell it!
 */
export function maskTargetWord(text: string, targetWord: string, mask: string = '____________'): string {
  if (!text || !targetWord) return text || '';

  const cleanTarget = targetWord.trim();
  if (cleanTarget.length === 0) return text;

  // Escape special regex characters in the target word
  const escaped = cleanTarget.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Match target word, plural forms, and possessives: e.g. word, words, word's, word-like
  const regex = new RegExp(`\\b${escaped}(s|es|'s|’s|d|ed|ing)?\\b`, 'gi');

  return text.replace(regex, mask);
}

/**
 * Letter phonetics dictionary for converting spoken letter names to characters
 */
const SPOKEN_LETTER_MAP: Record<string, string> = {
  a: 'a', aye: 'a', ey: 'a',
  b: 'b', bee: 'b', be: 'b',
  c: 'c', see: 'c', sea: 'c',
  d: 'd', dee: 'd',
  e: 'e', ee: 'e',
  f: 'f', ef: 'f', eff: 'f',
  g: 'g', gee: 'g',
  h: 'h', aitch: 'h', hatch: 'h',
  i: 'i', eye: 'i',
  j: 'j', jay: 'j',
  k: 'k', kay: 'k',
  l: 'l', ell: 'l', el: 'l',
  m: 'm', em: 'm',
  n: 'n', en: 'n',
  o: 'o', oh: 'o',
  p: 'p', pee: 'p', pea: 'p',
  q: 'q', cue: 'q', queue: 'q',
  r: 'r', are: 'r', ar: 'r',
  s: 's', ess: 's', es: 's',
  t: 't', tea: 't', tee: 't',
  u: 'u', you: 'u',
  v: 'v', vee: 'v',
  w: 'w', 'double-u': 'w', 'double u': 'w',
  x: 'x', ex: 'x',
  y: 'y', why: 'y',
  z: 'z', zee: 'z', zed: 'z',
};

/**
 * Parses spoken voice recognition output into clean spelling string.
 * Handles both letter-by-letter spoken words ("bee oh you...") and full words ("bougainvillea").
 */
export function parseSpokenInputToSpelling(transcript: string): string {
  if (!transcript) return '';

  const clean = transcript.trim().toLowerCase();

  // If transcript is spaced letter tokens (e.g. "b o u g a i n" or "bee oh you")
  const tokens = clean.split(/[\s-]+/).filter(Boolean);

  // If every token maps to a single letter sound
  const mappedLetters: string[] = [];
  let allMapped = true;

  for (const token of tokens) {
    if (SPOKEN_LETTER_MAP[token]) {
      mappedLetters.push(SPOKEN_LETTER_MAP[token]);
    } else if (/^[a-z]$/.test(token)) {
      mappedLetters.push(token);
    } else {
      allMapped = false;
      break;
    }
  }

  if (allMapped && mappedLetters.length > 0) {
    return mappedLetters.join('');
  }

  // Fallback: extract letters directly
  return clean.replace(/[^a-z]/g, '');
}

/**
 * Extracts and cleans words from pasted PDF text (e.g. from Words of the Champions PDF)
 */
export function parseWordsFromPdfText(rawText: string): string[] {
  if (!rawText) return [];

  const lines = rawText.split(/[\r\n,;]+/);
  const wordsSet = new Set<string>();

  for (const line of lines) {
    // Remove numbers (e.g. page numbers or item counts like 1., 2.)
    const cleaned = line
      .replace(/^\d+[\s.)-]*/, '')
      .replace(/[0-9]/g, '')
      .trim();

    // Split words on whitespace if multiple words per line
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      // Only keep alphabetic words with optional hyphens (length 3 to 30)
      const sanitized = token.toLowerCase().replace(/[^a-z-]/g, '');
      if (sanitized.length >= 3 && sanitized.length <= 30 && !sanitized.startsWith('-') && !sanitized.endsWith('-')) {
        wordsSet.add(sanitized);
      }
    }
  }

  return Array.from(wordsSet);
}

