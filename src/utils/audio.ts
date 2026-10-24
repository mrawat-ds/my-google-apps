/**
 * Human Voice Speech synthesis and Audio Effects for Spelling Bee practice
 */

let synth: SpeechSynthesis | null = null;
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  synth = window.speechSynthesis;
}

let activeAudio: HTMLAudioElement | null = null;
let isMutedState = false;

export function setAudioMuted(muted: boolean) {
  isMutedState = muted;
  if (muted) {
    stopPronunciation();
  }
}

export function isAudioMuted(): boolean {
  return isMutedState;
}

let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

/**
 * Play high-fidelity, warm human pronunciation via Gemini TTS (with fallback to browser synthesis)
 */
export async function playPronunciation(
  text: string,
  options?: {
    slow?: boolean;
    rate?: number;
    pitch?: number;
    lang?: string;
    onEnd?: () => void;
  }
) {
  if (isMutedState) {
    options?.onEnd?.();
    return;
  }

  // Stop any currently playing audio or speech
  stopPronunciation();

  // Try server-side natural human TTS first for single words or short phrases
  const isSingleWord = !text.includes(' ') || text.split(/\s+/).length <= 4;
  if (isSingleWord && typeof fetch !== 'undefined') {
    try {
      const res = await fetch('/api/pronounce-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          slow: options?.slow || (options?.rate && options.rate < 0.8),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const audio = new Audio(`data:audio/wav;base64,${data.audioBase64}`);
          activeAudio = audio;
          if (options?.slow) {
            audio.playbackRate = 0.85;
          }
          audio.onended = () => {
            activeAudio = null;
            options?.onEnd?.();
          };
          audio.onerror = () => {
            activeAudio = null;
            playBrowserSynthesisFallback(text, options);
          };
          await audio.play();
          return;
        }
      }
    } catch {
      // Fall through to browser synthesis
    }
  }

  // Fallback to warm browser synthesis
  playBrowserSynthesisFallback(text, options);
}

function playBrowserSynthesisFallback(
  text: string,
  options?: {
    slow?: boolean;
    rate?: number;
    pitch?: number;
    lang?: string;
    onEnd?: () => void;
  }
) {
  if (!synth || isMutedState) {
    options?.onEnd?.();
    return;
  }

  synth.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  // Warm, measured, human pace
  utterance.rate = options?.slow ? 0.65 : (options?.rate ?? 0.85);
  utterance.pitch = options?.pitch ?? 1.05; // Slightly warmer pitch
  utterance.lang = options?.lang ?? 'en-US';

  // Prioritize premium, human-sounding voices
  const voices = synth.getVoices();
  const humanVoice = voices.find(
    (v) =>
      v.lang.startsWith('en') &&
      (v.name.includes('Natural') ||
        v.name.includes('Google') ||
        v.name.includes('Samantha') ||
        v.name.includes('Ava') ||
        v.name.includes('Daniel') ||
        v.name.includes('Serena'))
  ) || voices.find((v) => v.lang.startsWith('en'));

  if (humanVoice) {
    utterance.voice = humanVoice;
  }

  if (options?.onEnd) {
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = () => options.onEnd?.();
  }

  synth.speak(utterance);
}

/**
 * Stop all ongoing audio immediately (both HTML5 Audio and Web Speech Synthesis)
 */
export function stopPronunciation() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    } catch {
      // ignore
    }
    activeAudio = null;
  }

  if (synth) {
    try {
      synth.cancel();
    } catch {
      // ignore
    }
  }
}

/**
 * Play harmonic competition bell ding (Scripps official bell sound)
 */
export function playBeeBell() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(1174.66, now); // D6 bell tone
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(2349.32, now); // Octave overtone

  gainNode.gain.setValueAtTime(0.25, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 1.2);
  osc2.stop(now + 1.2);
}

/**
 * Play celebration chime for correct spelling
 */
export function playCorrectChime() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, idx) => {
    const now = ctx.currentTime + idx * 0.08;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  });
}

/**
 * Play gentle buzzer for misspelled word (encouraging, not harsh)
 */
export function playBuzzer() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(220, now); // A3
  osc.frequency.setValueAtTime(196, now + 0.15); // G3 dip

  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.5);
}

/**
 * Crisp, gentle tap tone for on-screen letter keypad
 */
export function playKeyTap() {
  if (isMutedState) return;
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.035);
    gain.gain.setValueAtTime(0.06, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.035);
  } catch {
    // ignore
  }
}

/**
 * Speech recognition helper for voice spelling and meaning entry
 */
export function createSpeechRecognizer(
  onResult: (text: string, isFinal: boolean) => void,
  onError: (err: string) => void,
  onStart?: () => void,
  onEnd?: () => void
) {
  if (typeof window === 'undefined') return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 3;
    recognition.lang = 'en-US';

    if (onStart) {
      recognition.onstart = () => {
        onStart();
      };
    }

    if (onEnd) {
      recognition.onend = () => {
        onEnd();
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = '';
      let isFinal = false;
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          isFinal = true;
        }
      }
      onResult(transcript, isFinal);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      onError(event.error || 'Recognition error');
    };

    return recognition;
  } catch (e) {
    console.warn('SpeechRecognition initialization error:', e);
    return null;
  }
}

