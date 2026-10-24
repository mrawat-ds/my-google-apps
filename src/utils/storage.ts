import { UserProfile, UserTag, WordItem, PracticeAttempt } from '../types/spelling';
import { PRESET_TAGS, INITIAL_WORDS } from '../data/words';

const STORAGE_KEY_PREFIX = 'spellbee_profile_';
const ACTIVE_EMAIL_KEY = 'spellbee_active_email';
const ALL_EMAILS_KEY = 'spellbee_all_emails';

export function getStoredEmails(): string[] {
  try {
    const raw = localStorage.getItem(ALL_EMAILS_KEY);
    if (!raw) return ['mkr252@gmail.com'];
    const list = JSON.parse(raw);
    return Array.isArray(list) && list.length > 0 ? list : ['mkr252@gmail.com'];
  } catch {
    return ['mkr252@gmail.com'];
  }
}

export function saveStoredEmails(emails: string[]) {
  try {
    localStorage.setItem(ALL_EMAILS_KEY, JSON.stringify(emails));
  } catch (e) {
    console.error('Failed to save email list', e);
  }
}

export function getActiveUserEmail(): string {
  try {
    const email = localStorage.getItem(ACTIVE_EMAIL_KEY);
    return email || 'mkr252@gmail.com';
  } catch {
    return 'mkr252@gmail.com';
  }
}

export function setActiveUserEmail(email: string) {
  try {
    localStorage.setItem(ACTIVE_EMAIL_KEY, email);
    const emails = getStoredEmails();
    if (!emails.includes(email)) {
      emails.push(email);
      saveStoredEmails(emails);
    }
  } catch (e) {
    console.error('Failed to set active email', e);
  }
}

export function loadUserProfile(email: string): UserProfile {
  const normalizedEmail = email.trim().toLowerCase();
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${normalizedEmail}`);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfile;
      // Ensure preset tags exist
      const existingTagIds = new Set(parsed.tags.map((t) => t.id));
      const mergedTags = [...parsed.tags];
      for (const preset of PRESET_TAGS) {
        if (!existingTagIds.has(preset.id)) {
          mergedTags.push(preset);
        }
      }
      return {
        ...parsed,
        tags: mergedTags,
        wordTags: parsed.wordTags || {},
        history: parsed.history || [],
        starredWordIds: parsed.starredWordIds || [],
      };
    }
  } catch (e) {
    console.error('Failed to load profile for', normalizedEmail, e);
  }

  // Create default fresh profile
  const defaultProfile: UserProfile = {
    email: normalizedEmail,
    displayName: normalizedEmail.split('@')[0] || 'Champion Speller',
    joinedAt: Date.now(),
    tags: [...PRESET_TAGS],
    wordTags: {},
    starredWordIds: [],
    history: [],
    streakDays: 1,
    lastActiveDay: new Date().toISOString().slice(0, 10),
  };

  saveUserProfile(defaultProfile);
  return defaultProfile;
}

export function saveUserProfile(profile: UserProfile) {
  try {
    const key = `${STORAGE_KEY_PREFIX}${profile.email.trim().toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(profile));
  } catch (e) {
    console.error('Failed to save profile', e);
  }
}

export function getCustomWords(): WordItem[] {
  try {
    const raw = localStorage.getItem('spellbee_custom_words');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveCustomWord(word: WordItem): WordItem[] {
  return saveBatchCustomWords([word]);
}

export function saveBatchCustomWords(newWords: WordItem[]): WordItem[] {
  const current = getCustomWords();
  const existingMap = new Map<string, number>();
  current.forEach((w, idx) => existingMap.set(w.id, idx));

  const updated = [...current];
  const toPrepend: WordItem[] = [];

  for (const word of newWords) {
    if (existingMap.has(word.id)) {
      const idx = existingMap.get(word.id)!;
      updated[idx] = word;
    } else {
      toPrepend.push(word);
      existingMap.set(word.id, updated.length + toPrepend.length);
    }
  }

  const finalResult = [...toPrepend, ...updated];
  try {
    localStorage.setItem('spellbee_custom_words', JSON.stringify(finalResult));
  } catch (e) {
    console.error('Failed to save batch custom words', e);
  }
  return finalResult;
}

export function getAllWords(): WordItem[] {
  const custom = getCustomWords();
  return [...INITIAL_WORDS, ...custom];
}
