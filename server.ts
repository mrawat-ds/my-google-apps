import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

// Initialize Gemini Client
const ai = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Local semantic fallback evaluator for when AI key is missing or offline
function evaluateMeaningLocally(word: string, targetDefinition: string, userMeaning: string) {
  const cleanTarget = targetDefinition.toLowerCase();
  const cleanUser = userMeaning.toLowerCase().trim();

  if (!cleanUser || cleanUser.length < 3) {
    return {
      isCorrectEssence: false,
      scorePercent: 10,
      grade: 'INCORRECT',
      feedback: `You didn't say much! Try describing what "${word}" means or what it does.`,
      keyConceptsCovered: [],
      missedConcepts: ['Core definition'],
      simpleKidDefinition: targetDefinition,
    };
  }

  // Common stop words to filter
  const stopWords = new Set([
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'it', 'its', 'of', 'in', 'on', 'at', 'to', 'for',
    'with', 'and', 'or', 'that', 'this', 'by', 'from', 'something', 'someone', 'thing', 'kind', 'type'
  ]);

  const targetTokens = cleanTarget
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));

  const userTokens = new Set(
    cleanUser
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2 && !stopWords.has(t))
  );

  let matchCount = 0;
  const matchedTokens: string[] = [];
  const missingTokens: string[] = [];

  for (const token of targetTokens) {
    let matched = false;
    for (const uToken of userTokens) {
      if (token === uToken || token.startsWith(uToken) || uToken.startsWith(token) || (token.length > 4 && uToken.includes(token.slice(0, 4)))) {
        matched = true;
        break;
      }
    }
    if (matched) {
      matchCount++;
      if (!matchedTokens.includes(token)) matchedTokens.push(token);
    } else {
      if (!missingTokens.includes(token) && missingTokens.length < 3) missingTokens.push(token);
    }
  }

  const ratio = targetTokens.length > 0 ? matchCount / targetTokens.length : 0;
  const hasSubstantialAnswer = userTokens.size >= 3;

  let isCorrectEssence = false;
  let scorePercent = 0;
  let grade = 'INCORRECT';
  let feedback = '';

  if (ratio >= 0.4 || (ratio >= 0.25 && hasSubstantialAnswer)) {
    isCorrectEssence = true;
    scorePercent = Math.min(100, Math.round(75 + ratio * 25));
    grade = ratio >= 0.5 ? 'EXCELLENT' : 'GOOD';
    feedback = `Spot on! You captured the true essence of "${word}". Great job!`;
  } else if (ratio >= 0.15 || userTokens.size >= 4) {
    isCorrectEssence = true; // partial essence accepted for kids
    scorePercent = 60;
    grade = 'PARTIAL';
    feedback = `Close! You have the general vibe of the word, but remember: ${targetDefinition}`;
  } else {
    isCorrectEssence = false;
    scorePercent = 30;
    grade = 'INCORRECT';
    feedback = `Not quite the essence of "${word}". It actually means: ${targetDefinition}`;
  }

  return {
    isCorrectEssence,
    scorePercent,
    grade,
    feedback,
    keyConceptsCovered: matchedTokens.slice(0, 3),
    missedConcepts: missingTokens.slice(0, 2),
    simpleKidDefinition: targetDefinition,
  };
}

// API endpoint to evaluate meaning essence
app.post('/api/evaluate-meaning', async (req, res) => {
  try {
    const { word, targetDefinition, userMeaning, exampleSentence, etymology } = req.body;

    if (!word || !targetDefinition || !userMeaning) {
      return res.status(400).json({ error: 'Missing word, targetDefinition, or userMeaning' });
    }

    if (!ai) {
      // Local fallback
      const result = evaluateMeaningLocally(word, targetDefinition, userMeaning);
      return res.json(result);
    }

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: `You are a warm, encouraging judge and coach for the National Spelling Bee Championship for kids.
A student was asked to explain the meaning of the word "${word}".
The official dictionary definition is: "${targetDefinition}".
${exampleSentence ? `Example sentence: "${exampleSentence}"` : ''}
${etymology ? `Origin/Etymology: "${etymology}"` : ''}

The student said / typed their understanding of the meaning:
"${userMeaning}"

CRITICAL INSTRUCTION:
Check if the student understood the ESSENCE or CORE IDEA of the word. They do NOT need to recite the dictionary definition verbatim.
If a kid grasps the central concept, function, feeling, or gist (e.g. for 'bougainvillea' saying 'a pretty climbing flower' or 'a vine with pink leaves', for 'mnemonic' saying 'a trick or phrase to remember things', for 'silhouette' saying 'a dark outline or shadow of a person', for 'schadenfreude' saying 'feeling happy when someone else messes up'), mark it as CORRECT in essence.

Respond with strict JSON adhering to this schema:
{
  "isCorrectEssence": boolean,
  "scorePercent": number (0 to 100),
  "grade": "EXCELLENT" | "GOOD" | "PARTIAL" | "INCORRECT",
  "feedback": "string (1-2 friendly, upbeat sentences explaining why their explanation works or what nuance was missed)",
  "keyConceptsCovered": ["string"],
  "missedConcepts": ["string"],
  "simpleKidDefinition": "string (a clear 1-sentence kid-friendly definition of this word)"
}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isCorrectEssence: { type: Type.BOOLEAN },
              scorePercent: { type: Type.NUMBER },
              grade: { type: Type.STRING },
              feedback: { type: Type.STRING },
              keyConceptsCovered: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              missedConcepts: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              simpleKidDefinition: { type: Type.STRING },
            },
            required: ['isCorrectEssence', 'scorePercent', 'grade', 'feedback', 'simpleKidDefinition'],
          },
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      return res.json(parsed);
    } catch (aiErr) {
      console.warn('Gemini call error, falling back to local evaluator:', aiErr);
      const fallbackResult = evaluateMeaningLocally(word, targetDefinition, userMeaning);
      return res.json(fallbackResult);
    }
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error evaluating meaning' });
  }
});

// Audio in-memory cache for fast, warm human pronunciation
const ttsCache = new Map<string, string>();

app.post('/api/pronounce-tts', async (req, res) => {
  try {
    const { text, slow } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text required' });
    }

    const clean = text.trim();
    const cacheKey = `v2_${clean.toLowerCase()}_${slow ? 'slow' : 'normal'}`;
    if (ttsCache.has(cacheKey)) {
      return res.json({ audioBase64: ttsCache.get(cacheKey), format: 'audio/wav', cached: true });
    }

    if (!ai) {
      return res.status(503).json({ error: 'Gemini API not configured, using browser synthesis' });
    }

    const speechStyle = slow
      ? 'Slow, deliberate, crystal-clear spelling bee pronouncer articulation, gentle tone'
      : 'Natural, warm, human spelling bee pronouncer, clear diction, soft friendly tone';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: clean,
              speechMetadata: {
                style: speechStyle,
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      ttsCache.set(cacheKey, base64Audio);
      return res.json({ audioBase64: base64Audio, format: 'audio/wav' });
    }

    return res.status(500).json({ error: 'Audio data missing from model response' });
  } catch (err) {
    console.warn('TTS error, falling back:', err);
    return res.status(500).json({ error: 'TTS generation failed' });
  }
});

// Endpoint to enrich words imported from PDF (Words of the Champions)
app.post('/api/enrich-word-list', async (req, res) => {
  try {
    const { words, levelHint } = req.body;
    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'Array of words required' });
    }

    const wordsToProcess = words.slice(0, 15); // process in reasonable batches

    if (!ai) {
      // Local fallback enrichment
      const localEnriched = wordsToProcess.map((w: string, idx: number) => {
        const clean = w.trim().toLowerCase();
        return {
          id: `champ-${Date.now()}-${idx}`,
          word: clean,
          phonetic: `/${clean}/`,
          pronunciationGuide: clean.toUpperCase(),
          syllables: [clean],
          partOfSpeech: 'noun',
          definition: `Official spelling bee word from Scripps Words of the Champions.`,
          kidEssenceDefinition: `An authentic competition word.`,
          etymology: 'Classical origin documented in Scripps Words of the Champions.',
          languageOfOrigin: 'Latin or Greek',
          sentence: `The speller asked for the definition of the word.`,
          difficulty: levelHint || 'hard',
          tags: ['tag-champions', 'tag-revise-soon'],
          isCustom: true,
        };
      });
      return res.json({ words: localEnriched });
    }

    const prompt = `You are an expert lexicographer for the Scripps National Spelling Bee.
Enrich the following list of competition words from the official "Words of the Champions":
${JSON.stringify(wordsToProcess)}

For each word, return a JSON object with:
- word: string (lowercase)
- phonetic: string (standard IPA, e.g. /ˌbuːɡənˈvɪliə/)
- pronunciationGuide: string (kid-friendly phonetic respelling, e.g. boo-gan-VIL-ee-uh)
- syllables: string[] (e.g. ["bou", "gain", "vil", "lea"])
- partOfSpeech: string (e.g. "noun", "verb", "adjective")
- definition: string (official collegiate dictionary definition)
- kidEssenceDefinition: string (simple 1-sentence explanation of what it means in plain language for kids)
- languageOfOrigin: string (e.g. "French from New Latin", "Greek", "German")
- etymology: string (origin and root history)
- sentence: string (competition sentence where the target word is used naturally)
- difficulty: "easy" | "medium" | "hard" | "very_hard"
- trickyPatterns: string[] (1-3 tricky spelling patterns to look out for)

Respond with strict JSON array.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              word: { type: Type.STRING },
              phonetic: { type: Type.STRING },
              pronunciationGuide: { type: Type.STRING },
              syllables: { type: Type.ARRAY, items: { type: Type.STRING } },
              partOfSpeech: { type: Type.STRING },
              definition: { type: Type.STRING },
              kidEssenceDefinition: { type: Type.STRING },
              languageOfOrigin: { type: Type.STRING },
              etymology: { type: Type.STRING },
              sentence: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              trickyPatterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ['word', 'definition', 'languageOfOrigin', 'sentence', 'difficulty'],
          },
        },
      },
    });

    const parsed = JSON.parse(response.text || '[]');
    const enrichedWithIds = parsed.map((item: any, i: number) => ({
      ...item,
      id: `champ-${Date.now()}-${i}`,
      tags: ['tag-champions', 'tag-revise-soon'],
      isCustom: true,
    }));

    return res.json({ words: enrichedWithIds });
  } catch (error) {
    console.error('Word enrichment error:', error);
    return res.status(500).json({ error: 'Failed to enrich words' });
  }
});


// Full-stack Vite integration
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`SpellBee Champ server running at http://0.0.0.0:${port}`);
  });
}

startServer();
