import { WordItem, DifficultyLevel } from '../types/spelling';
import scrippsWordsData from './scripps_words.json';

export interface ScrippsLevelInfo {
  difficulty: DifficultyLevel;
  name: string;
  count: number;
  words: string[];
}

export interface ScrippsDataStructure {
  source: string;
  totalCount: number;
  levels: {
    oneBee: ScrippsLevelInfo;
    twoBee: ScrippsLevelInfo;
    threeBee: ScrippsLevelInfo;
  };
}

export const SCRIPPS_DATA: ScrippsDataStructure = scrippsWordsData as ScrippsDataStructure;

/**
 * Intelligent linguistic origin detector based on spelling patterns
 */
export function estimateLanguageOfOrigin(word: string): { origin: string; etymology: string } {
  const w = word.toLowerCase();

  // Greek patterns
  if (
    /ph|chth|rh|th|ps|pn|xyl|xanth|hier|poly|micro|macro|syn|sym|tele|pseudo|photo|auto|bio|geo|chrono|hyper|hypo/.test(
      w
    ) ||
    /logy$|glyph$|opsis$|onym$|pathy$|phobia$|graphy$|cracy$/.test(w)
  ) {
    return {
      origin: 'Greek',
      etymology: `Derived from classical Greek root elements (${w.length > 6 ? w.slice(0, 4) + '...' : w}).`,
    };
  }

  // French loanwords
  if (
    /eau$|oir$|ette$|age$|eaux$|ique$|que$|gn$|ç|é|è|ou|oir|ence$|ance$/.test(w) ||
    /^(bou|cha|che|croi|de|des|en|fra|par|sou)/.test(w)
  ) {
    return {
      origin: 'French',
      etymology: 'Borrowed into English through Anglo-French or Middle French.',
    };
  }

  // Italian loanwords
  if (/ini$|etti$|elli$|one$|ola$|etto$|issimo$|ata$|ito$/.test(w) || /^(spagh|pizz|bisc|oper|cant|alleg)/.test(w)) {
    return {
      origin: 'Italian',
      etymology: 'Originating from Italian culinary, artistic, or musical traditions.',
    };
  }

  // German patterns
  if (/sch|shtr|uhr|strom|zeit|stein|berg$|burg$|wald$/.test(w)) {
    return {
      origin: 'German',
      etymology: 'From Germanic compounds and High German vocabulary.',
    };
  }

  // Spanish patterns
  if (/illo$|illa$|ador$|ero$|era$|ñ|chaparral|fiesta|rodeo|plaza/.test(w)) {
    return {
      origin: 'Spanish',
      etymology: 'Derived from Spanish roots or New World geographical terminology.',
    };
  }

  // Latin stems
  if (
    /tion$|sion$|able$|ible$|ious$|eous$|ment$|ant$|ent$|or$|tor$|ary$|ory$/.test(w) ||
    /^(ad|ab|con|de|dis|ex|in|inter|per|post|pre|pro|re|sub|trans)/.test(w)
  ) {
    return {
      origin: 'Latin',
      etymology: 'Formed from classical Latin roots and prefixes.',
    };
  }

  // Old / Middle English
  if (/^wh|^kn|^wr|ough|ight|th$|ful$|ness$|less$|ly$/.test(w)) {
    return {
      origin: 'Old English',
      etymology: 'From ancient Anglo-Saxon and early Germanic dialects of Britain.',
    };
  }

  return {
    origin: 'Latin & Greek roots',
    etymology: 'Selected from Merriam-Webster Unabridged for the Scripps National Spelling Bee.',
  };
}

/**
 * Splits word into syllables using vowel clusters and common syllable breakpoints
 */
export function estimateSyllables(word: string): string[] {
  const w = word.trim().toLowerCase();
  if (w.length <= 3) return [w];

  // Common prefixes & suffixes
  const vowels = 'aeiouy';
  const syllables: string[] = [];
  let current = '';

  for (let i = 0; i < w.length; i++) {
    current += w[i];
    const isVowel = vowels.includes(w[i]);
    const nextIsVowel = i + 1 < w.length && vowels.includes(w[i + 1]);
    const nextNextIsVowel = i + 2 < w.length && vowels.includes(w[i + 2]);

    if (isVowel && !nextIsVowel && i < w.length - 2) {
      // Split between consonants or after vowel
      if (nextNextIsVowel) {
        syllables.push(current);
        current = '';
      } else if (i + 3 < w.length) {
        current += w[i + 1];
        i++;
        syllables.push(current);
        current = '';
      }
    }
  }

  if (current) {
    if (syllables.length > 0 && current.length <= 1) {
      syllables[syllables.length - 1] += current;
    } else {
      syllables.push(current);
    }
  }

  return syllables.length > 0 ? syllables : [word];
}

/**
 * Creates a clean WordItem from a raw word in Scripps Words of the Champions
 */
export function createWordItemFromScripps(
  word: string,
  difficulty: DifficultyLevel,
  tags: string[] = []
): WordItem {
  const clean = word.trim();
  const syllables = estimateSyllables(clean);
  const { origin, etymology } = estimateLanguageOfOrigin(clean);

  // Capitalize stressed syllable for pronunciation guide
  const guide = syllables.map((s, idx) => (idx === 0 || idx === 1 ? s.toUpperCase() : s)).join('-');

  // Identify tricky letter combinations
  const trickyPatterns: string[] = [];
  if (/(.)\1/.test(clean)) trickyPatterns.push('Double consonants (e.g. -ll-, -rr-, -cc-)');
  if (/ph|ps|pn|gn|kn|wr/.test(clean)) trickyPatterns.push('Unusual consonant clusters or silent letters');
  if (/eau|eaux|que|oir|ette/.test(clean)) trickyPatterns.push('French spelling pattern');
  if (/ch|th|rh|xyl|xanth/.test(clean)) trickyPatterns.push('Greek consonant or root');

  return {
    id: `scripps-${clean.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    word: clean,
    phonetic: `/${clean}/`,
    pronunciationGuide: guide,
    syllables,
    partOfSpeech: 'noun, adjective, or verb',
    definition: `Official spelling bee word from the Scripps Words of the Champions booklet.`,
    kidEssenceDefinition: `A competition word featured in the national spelling bee curriculum.`,
    languageOfOrigin: origin,
    etymology,
    sentence: `“The speller requested the definition and language of origin for the word.”`,
    difficulty,
    tags,
    trickyPatterns: trickyPatterns.length > 0 ? trickyPatterns : undefined,
    isCustom: true,
  };
}

/**
 * Batch generates WordItem records for words
 */
export function batchCreateScrippsWords(
  words: string[],
  difficulty: DifficultyLevel,
  tags: string[] = []
): WordItem[] {
  return words.map((w) => createWordItemFromScripps(w, difficulty, tags));
}
