import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

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

interface ChatParams {
  message: string;
  conversationHistory?: Array<{ sender: string; text: string }>;
  topic?: string;
}

async function generateChatReply({
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
    const { message, conversationHistory = [], topic = 'General Tech & CS' } = body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string is required' });
    }

    const data = await generateChatReply({ message, conversationHistory, topic });
    return res.status(200).json(data);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/chat:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate answer from Gemini API',
    });
  }
}
