import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

// Candidate models in order of priority.
// 'gemini-3.1-flash-lite' is fast, responsive, and resilient under load.
// 'gemini-flash-latest' and 'gemini-3.8-flash' act as graceful fallbacks.
export const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

// In-memory cache for study guides (30-minute TTL)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const studyGuideCache = new Map<string, CacheEntry<any>>();
const inFlightStudyGuides = new Map<string, Promise<any>>();

// Helper to race a promise with a timeout
function withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}

export function getGenAI() {
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

export interface GenerateOptions {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: any;
  timeoutMs?: number;
}

export async function generateWithFallback(
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

export interface StudyModeParams {
  topic: string;
  depth?: string;
  studentLevel?: string;
}

export async function generateStudyGuide({
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

  // 2. Check if identical request is already generating in-flight (avoids repeated API calls)
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

export interface ChatParams {
  message: string;
  conversationHistory?: Array<{ sender: string; text: string }>;
  topic?: string;
}

export async function generateChatReply({
  message,
  conversationHistory = [],
  topic = 'General Tech & CS',
}: ChatParams) {
  if (!message || typeof message !== 'string') {
    throw new Error('Message string is required');
  }

  const ai = getGenAI();

  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  if (Array.isArray(conversationHistory)) {
    const recent = conversationHistory.slice(-10);
    for (const msg of recent) {
      if (msg && typeof msg.text === 'string' && (msg.sender === 'user' || msg.sender === 'ai')) {
        contents.push({
          role: msg.sender === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text }],
        });
      }
    }
  }

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  });

  const systemInstruction = `You are Nexora, an elite, patient, and knowledgeable AI Study Assistant designed for college students in computer science, software engineering, and technical disciplines.
Context/Focus: ${topic}
Guidelines:
1. Explain technical concepts in a beginner-friendly, crystal-clear manner using relatable real-world analogies.
2. Structure your answers with clean Markdown headings, bullet points, and code blocks (with syntax highlighting languages like python, javascript, sql, cpp, etc.).
3. If an algorithmic or data structure question is asked (e.g., QuickSort, HashMaps, B-Trees), explain time/space complexity (Big-O) intuitively.
4. If an OS or Database question is asked (e.g., Virtual Memory, ACID, Normalization), explain the "Why" and "How" before the nitty-gritty syntax.
5. Provide concise examples and best practices.
6. Keep the tone friendly, academic, encouraging, and clear. Avoid dry fluff.`;

  const { text: reply, modelUsed } = await generateWithFallback(ai, {
    contents,
    systemInstruction,
    temperature: 0.7,
  });

  return {
    reply: reply || 'I could not generate a response at this time.',
    modelUsed,
  };
}
