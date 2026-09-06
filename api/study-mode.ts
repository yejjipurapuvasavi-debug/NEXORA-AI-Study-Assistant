import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

try {
  dotenv.config();
} catch {
  // Ignore in environments where dotenv is not required
}

const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const studyGuideCache = new Map<string, CacheEntry<any>>();
const inFlightStudyGuides = new Map<string, Promise<any>>();

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

function getGenAI() {
  const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!rawKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please ensure GEMINI_API_KEY is added to your environment variables or Vercel Project Settings.'
    );
  }
  const cleanKey = rawKey.replace(/[\r\n\t ]/g, '').replace(/^["']|["']$/g, '').trim();
  if (!cleanKey) {
    throw new Error(
      'GEMINI_API_KEY is empty after sanitization. Please verify your environment variable value.'
    );
  }
  return new GoogleGenAI({
    apiKey: cleanKey,
    vertexai: false,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

interface GenerateOptions {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: any;
  timeoutMs?: number;
}

async function generateWithFallback(
  ai: GoogleGenAI,
  options: GenerateOptions
): Promise<{ text: string; modelUsed: string }> {
  let lastError: Error | null = null;
  const hardTimeoutMs = options.timeoutMs ?? 30000;
  const deadline = Date.now() + hardTimeoutMs;

  for (const modelName of CANDIDATE_MODELS) {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 1500) {
      break;
    }
    const attemptTimeout = Math.min(remainingMs, 25000);

    try {
      const config: Record<string, any> = {
        temperature: options.temperature ?? 0.4,
      };
      if (options.systemInstruction) {
        config.systemInstruction = options.systemInstruction;
      }
      if (options.responseMimeType) {
        config.responseMimeType = options.responseMimeType;
      }
      if (options.responseSchema) {
        config.responseSchema = options.responseSchema;
      }

      const generatePromise = ai.models.generateContent({
        model: modelName,
        contents: options.contents,
        config,
      });

      const response = await withTimeout(
        generatePromise,
        attemptTimeout,
        `Gemini model "${modelName}" timed out after ${Math.round(attemptTimeout / 1000)} seconds.`
      );

      if (response && response.text) {
        return { text: response.text, modelUsed: modelName };
      }
    } catch (err: unknown) {
      const error = err as Error;
      lastError = error;
      const msg = error?.message || String(error);

      console.warn(`[Gemini] Model "${modelName}" failed: ${msg}`);
      continue;
    }
  }

  throw (
    lastError ||
    new Error('Gemini API request timed out after 30 seconds. Please try again.')
  );
}

interface StudyModeParams {
  topic: string;
  depth?: string;
  studentLevel?: string;
}

async function generateStudyGuide({
  topic,
  depth = 'Comprehensive Core',
  studentLevel = 'College Undergraduate',
}: StudyModeParams) {
  if (!topic || typeof topic !== 'string') {
    throw new Error('Topic string is required');
  }

  const normalizedTopic = topic.trim();
  const cacheKey = `${normalizedTopic.toLowerCase()}::${depth.toLowerCase()}::${studentLevel.toLowerCase()}`;

  // 1. Check in-memory cache
  const cached = studyGuideCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  // 2. In-flight request deduplication
  if (inFlightStudyGuides.has(cacheKey)) {
    return await inFlightStudyGuides.get(cacheKey)!;
  }

  // 3. Initiate single structured generation request
  const executionPromise = (async () => {
    const ai = getGenAI();

    const prompt = `Create a high-yield, engaging college study guide and 5-question multiple choice quiz for: "${normalizedTopic}".
Target Audience: ${studentLevel}.
Depth: ${depth}.

Requirements:
1. topic: Canonical subject title.
2. explanation: 2-3 focused paragraphs in markdown explaining intuition, core mechanics, and practical significance.
3. importantConcepts: Array of exactly 4 critical subtopics. Each with a title and clear 2-sentence description.
4. realWorldExample: 1 concrete practical engineering analogy or industry case study.
5. keyPoints: 4 high-yield bullet takeaways for exam preparation.
6. quiz: Exactly 5 multiple-choice questions testing understanding of ${normalizedTopic}. Each question must have:
   - question: Clear question text
   - options: Array of exactly 4 string choices
   - correctAnswerIndex: Integer 0, 1, 2, or 3 corresponding to the correct choice in options
   - explanation: 1-2 sentences explaining why the correct answer is right.`;

    const { text: responseText, modelUsed } = await generateWithFallback(ai, {
      contents: prompt,
      systemInstruction:
        'You are an expert university CS and STEM professor. Provide an accurate, high-yield study guide and 5 multiple-choice questions formatted strictly according to the requested JSON schema.',
      temperature: 0.4,
      timeoutMs: 30000,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          explanation: { type: Type.STRING },
          importantConcepts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
              },
              required: ['title', 'description'],
            },
          },
          realWorldExample: { type: Type.STRING },
          keyPoints: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          quiz: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question: { type: Type.STRING },
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                },
                correctAnswerIndex: { type: Type.INTEGER },
                explanation: { type: Type.STRING },
              },
              required: ['question', 'options', 'correctAnswerIndex', 'explanation'],
            },
          },
        },
        required: ['topic', 'explanation', 'importantConcepts', 'realWorldExample', 'keyPoints', 'quiz'],
      },
    });

    if (!responseText) {
      throw new Error('Empty response received from Gemini model.');
    }

    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
    }

    const data = JSON.parse(cleanJson);

    const result = {
      topic: data.topic || normalizedTopic,
      explanation: data.explanation || '',
      importantConcepts: Array.isArray(data.importantConcepts) ? data.importantConcepts.slice(0, 5) : [],
      realWorldExample: data.realWorldExample || '',
      keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints.slice(0, 6) : [],
      quiz: Array.isArray(data.quiz)
        ? data.quiz.slice(0, 5).map((q: any) => ({
            question: q.question || '',
            options: Array.isArray(q.options) ? q.options.slice(0, 4) : [],
            correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
            explanation: q.explanation || '',
          }))
        : [],
      modelUsed,
    };

    // Cache the result for 30 minutes
    if (studyGuideCache.size > 100) {
      studyGuideCache.clear();
    }
    studyGuideCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + 30 * 60 * 1000,
    });

    return result;
  })();

  inFlightStudyGuides.set(cacheKey, executionPromise);

  try {
    return await executionPromise;
  } finally {
    inFlightStudyGuides.delete(cacheKey);
  }
}

function setCors(res: any) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

async function parseBody(req: any): Promise<any> {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk: any) => {
      raw += chunk;
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

export default async function handler(req: any, res: any) {
  setCors(res);
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body = await parseBody(req);
    const { topic, depth = 'Comprehensive Core', studentLevel = 'College Undergraduate' } = body || {};

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic string is required' });
    }

    const data = await generateStudyGuide({ topic, depth, studentLevel });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/study-mode:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate study guide from Gemini API',
    });
  }
}
