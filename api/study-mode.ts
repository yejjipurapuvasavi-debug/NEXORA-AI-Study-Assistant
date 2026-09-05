import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';

try {
  dotenv.config();
} catch {
  // Ignore in environments where dotenv is not required
}

const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

function getGenAI() {
  const rawKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!rawKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please ensure GEMINI_API_KEY is added to your environment variables or Vercel Project Settings.'
    );
  }
  const cleanKey = rawKey.trim().replace(/^["']|["']$/g, '').trim();
  if (!cleanKey) {
    throw new Error(
      'GEMINI_API_KEY is empty after sanitization. Please verify your environment variable value.'
    );
  }
  return new GoogleGenAI({
    apiKey: cleanKey,
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
}

async function generateWithFallback(
  ai: GoogleGenAI,
  options: GenerateOptions
): Promise<{ text: string; modelUsed: string }> {
  let lastError: Error | null = null;

  for (const modelName of CANDIDATE_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const config: Record<string, any> = {
          temperature: options.temperature ?? 0.7,
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

        const response = await ai.models.generateContent({
          model: modelName,
          contents: options.contents,
          config,
        });

        if (response && response.text) {
          return { text: response.text, modelUsed: modelName };
        }
      } catch (err: unknown) {
        const error = err as Error;
        lastError = error;
        const msg = error?.message || String(error);
        const isTransient =
          msg.includes('503') ||
          msg.includes('high demand') ||
          msg.includes('429') ||
          msg.includes('UNAVAILABLE');

        console.warn(`[Gemini] Model "${modelName}" (attempt ${attempt + 1}) encountered error: ${msg}`);

        if (isTransient && attempt === 0) {
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        break;
      }
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to respond.');
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

  const ai = getGenAI();

  const prompt = `Generate an in-depth, beginner-friendly college study guide and quiz for the topic: "${topic}".
Target Audience: ${studentLevel}.
Depth: ${depth}.

Requirements:
1. topic: The canonical topic name (e.g. "Data Structures: Binary Search Trees", "Operating Systems: Virtual Memory & Paging", "DBMS: ACID Properties & Transactions", "Python: Generators and Iterators").
2. explanation: A comprehensive, friendly 3-4 paragraph explanation written in engaging markdown. Explain fundamental intuition, why it exists, and how it solves real problems.
3. importantConcepts: An array of 4 to 6 critical subtopics or concepts. Each has a title and an explanation with practical details.
4. realWorldExample: An authentic real-world engineering analogy or case study (e.g. how Netflix uses caching, how Google Search indexes, how Git handles commits, how an OS handles memory swapping).
5. keyPoints: 4 to 6 concise bullet summary takeaways for quick revision before exams.
6. quiz: Exactly 5 multiple-choice questions (MCQs) testing understanding from foundational to intermediate college level. Each question must have:
   - question: Clear question text
   - options: An array of exactly 4 choices (strings)
   - correctAnswerIndex: Integer 0, 1, 2, or 3 corresponding to the correct choice in options
   - explanation: 2-3 sentences explaining why that option is correct and why other choices are wrong.`;

  const { text: responseText, modelUsed } = await generateWithFallback(ai, {
    contents: prompt,
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
    throw new Error('Empty response from Gemini model');
  }

  let cleanJson = responseText.trim();
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  }

  const data = JSON.parse(cleanJson);

  return {
    topic: data.topic || topic,
    explanation: data.explanation || '',
    importantConcepts: Array.isArray(data.importantConcepts) ? data.importantConcepts : [],
    realWorldExample: data.realWorldExample || '',
    keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
    quiz: Array.isArray(data.quiz)
      ? data.quiz.map((q: any) => ({
          question: q.question || '',
          options: Array.isArray(q.options) ? q.options : [],
          correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
          explanation: q.explanation || '',
        }))
      : [],
    modelUsed,
  };
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
