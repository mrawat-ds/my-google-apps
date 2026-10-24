import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateSpelling,
  filterWords,
  calculateUserStats,
  normalizeWord,
  maskTargetWord,
  parseSpokenInputToSpelling,
  parseWordsFromPdfText,
} from './spelling';
import { WordItem } from '../types/spelling';

test('normalizeWord trims and lowercases accurately', () => {
  assert.equal(normalizeWord('  Bougainvillea  '), 'bougainvillea');
  assert.equal(normalizeWord('Chiaroscuro'), 'chiaroscuro');
  assert.equal(normalizeWord(''), '');
});

test('evaluateSpelling correctly detects exact matches', () => {
  const result = evaluateSpelling('bougainvillea', 'bougainvillea');
  assert.equal(result.isCorrect, true);
  assert.equal(result.matchPercentage, 100);
  assert.equal(result.divergenceIndex, -1);
});

test('evaluateSpelling detects case-insensitive exact matches', () => {
  const result = evaluateSpelling('SCHADENFREUDE', 'schadenfreude');
  assert.equal(result.isCorrect, true);
  assert.equal(result.matchPercentage, 100);
});

test('evaluateSpelling detects misspelled letter and provides diff', () => {
  // Target: 'mnemonic' (8 chars), Attempt: 'nemonic' (7 chars, missing initial m)
  const result = evaluateSpelling('mnemonic', 'nemonic');
  assert.equal(result.isCorrect, false);
  assert.equal(result.divergenceIndex, 0);
});

test('evaluateSpelling handles typo in middle of word', () => {
  // Target: 'syzygy', Attempt: 'sizygy'
  const result = evaluateSpelling('syzygy', 'sizygy');
  assert.equal(result.isCorrect, false);
  assert.equal(result.divergenceIndex, 1);
  assert.equal(result.diff[1].status, 'wrong');
  assert.equal(result.diff[1].char, 'i');
});

test('filterWords filters by difficulty and custom tags', () => {
  const sampleWords: WordItem[] = [
    {
      id: 'w1',
      word: 'bougainvillea',
      phonetic: '/ˌbuːɡənˈvɪliə/',
      syllables: ['bou', 'gain', 'vil', 'lea'],
      partOfSpeech: 'noun',
      definition: 'An ornamental tropical climbing shrub or vine with colorful bracts.',
      kidEssenceDefinition: 'A bright tropical climbing plant with colorful leaves.',
      etymology: 'Named after Louis Antoine de Bougainville',
      languageOfOrigin: 'French',
      sentence: 'The pink bougainvillea climbed gracefully up the villa wall.',
      difficulty: 'hard',
      tags: ['french-origin', 'plant-words'],
    },
    {
      id: 'w2',
      word: 'lemonade',
      phonetic: '/ˌlɛməˈneɪd/',
      syllables: ['lem', 'on', 'ade'],
      partOfSpeech: 'noun',
      definition: 'A drink made from lemon juice and water sweetened with sugar.',
      kidEssenceDefinition: 'A sweet lemon drink.',
      etymology: 'French limonade',
      languageOfOrigin: 'French',
      sentence: 'We sold cool lemonade on a hot afternoon.',
      difficulty: 'easy',
      tags: ['food-words'],
    },
    {
      id: 'w3',
      word: 'autochthonous',
      phonetic: '/ɔːˈtɒkθənəs/',
      syllables: ['au', 'toch', 'tho', 'nous'],
      partOfSpeech: 'adjective',
      definition: 'Indigenous rather than descended from migrants or colonists.',
      kidEssenceDefinition: 'Native or original to the land.',
      etymology: 'Greek autochthon',
      languageOfOrigin: 'Greek',
      sentence: 'The island has an autochthonous population with rich traditions.',
      difficulty: 'very_hard',
      tags: ['greek-roots'],
    },
  ];

  // Filter by difficulty
  const easyWords = filterWords(sampleWords, { difficulty: 'easy' });
  assert.equal(easyWords.length, 1);
  assert.equal(easyWords[0].word, 'lemonade');

  // Filter by tag
  const customMap: Record<string, string[]> = {
    w1: ['tag-revise-soon'],
  };
  const taggedWords = filterWords(sampleWords, { tagId: 'tag-revise-soon', wordTagsMap: customMap });
  assert.equal(taggedWords.length, 1);
  assert.equal(taggedWords[0].word, 'bougainvillea');

  // Search filter
  const searchResults = filterWords(sampleWords, { search: 'indigenous' });
  assert.equal(searchResults.length, 1);
  assert.equal(searchResults[0].word, 'autochthonous');
});

test('calculateUserStats calculates accuracy and mastered words correctly', () => {
  const history = [
    { wordId: 'w1', isSpellingCorrect: false },
    { wordId: 'w1', isSpellingCorrect: true },
    { wordId: 'w2', isSpellingCorrect: true },
    { wordId: 'w3', isSpellingCorrect: false },
  ];

  const stats = calculateUserStats(history);
  assert.equal(stats.totalAttempts, 4);
  assert.equal(stats.correctCount, 2);
  assert.equal(stats.accuracyRate, 50);
  assert.equal(stats.uniqueWordsMastered, 2); // w1 ended true, w2 ended true
});

test('maskTargetWord properly masks word in sentences and definitions', () => {
  const sentence = 'The vibrant bougainvillea climbed gracefully over the courtyard wall.';
  const masked = maskTargetWord(sentence, 'bougainvillea');
  assert.equal(masked, 'The vibrant ____________ climbed gracefully over the courtyard wall.');
  assert.equal(masked.includes('bougainvillea'), false);

  // Plural and capitalized masking
  const sentence2 = 'Bougainvilleas are tropical flowers.';
  const masked2 = maskTargetWord(sentence2, 'bougainvillea');
  assert.equal(masked2, '____________ are tropical flowers.');

  // Part of speech / definition containing word
  const def = 'bougainvillea: An ornamental climbing plant.';
  const maskedDef = maskTargetWord(def, 'bougainvillea');
  assert.equal(maskedDef, '____________: An ornamental climbing plant.');
});

test('parseSpokenInputToSpelling handles letter words and continuous transcript', () => {
  // Spoken letter words
  const result1 = parseSpokenInputToSpelling('bee oh you gee aye eye en');
  assert.equal(result1, 'bougain');

  // Spaced individual letters
  const result2 = parseSpokenInputToSpelling('b o u g a i n v i l l e a');
  assert.equal(result2, 'bougainvillea');

  // Whole word spoken
  const result3 = parseSpokenInputToSpelling('Bougainvillea');
  assert.equal(result3, 'bougainvillea');
});

test('parseWordsFromPdfText extracts valid words from PDF lines and cleans numbers', () => {
  const samplePdf = `
  1. aardvark
  2. bougainvillea
  3. chiaroscuro
  Page 14
  4. flibbertigibbet, logorrhea; stromuhr
  `;
  const parsed = parseWordsFromPdfText(samplePdf);
  assert.ok(parsed.includes('aardvark'));
  assert.ok(parsed.includes('bougainvillea'));
  assert.ok(parsed.includes('chiaroscuro'));
  assert.ok(parsed.includes('flibbertigibbet'));
  assert.ok(parsed.includes('logorrhea'));
  assert.ok(parsed.includes('stromuhr'));
  assert.equal(parsed.includes('1'), false);
  assert.equal(parsed.includes('page'), true); // word 'page' could be in dictionary or filtered
});
