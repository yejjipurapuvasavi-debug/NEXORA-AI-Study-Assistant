import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Helper to get GoogleGenAI client lazily
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in the environment. Please check your Secret Manager or environment variables.');
  }
  return new GoogleGenAI({ apiKey });
}

// Candidate models in order of priority.
// 'gemini-3.1-flash-lite' is active, fast, and not subject to high demand 503 outages.
// 'gemini-flash-latest' and 'gemini-3.8-flash' act as graceful fallbacks.
const CANDIDATE_MODELS = ['gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];

interface GenerateOptions {
  contents: any;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  responseSchema?: any;
}

// Resilient helper to call Gemini models with retry and multi-model fallback on 503/429
async function generateWithFallback(ai: GoogleGenAI, options: GenerateOptions): Promise<{ text: string; modelUsed: string }> {
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
        const isTransient = msg.includes('503') || msg.includes('high demand') || msg.includes('429') || msg.includes('UNAVAILABLE');

        console.warn(`[Gemini] Model "${modelName}" (attempt ${attempt + 1}) encountered error: ${msg}`);

        if (isTransient && attempt === 0) {
          // Pause briefly (600ms) before 1 retry on the same model
          await new Promise((resolve) => setTimeout(resolve, 600));
          continue;
        }
        // Try next candidate model
        break;
      }
    }
  }

  throw lastError || new Error('All candidate Gemini models failed to respond.');
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    appName: 'Nexora AI Study Assistant',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    primaryModel: CANDIDATE_MODELS[0],
    timestamp: new Date().toISOString(),
  });
});

// AI Chat endpoint for technical Q&A
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationHistory = [], topic = 'General Tech & CS' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message string is required' });
    }

    const ai = getGenAI();

    // Format chat history
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    // Add recent history (up to last 10 messages)
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

    // Add current user message
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

    res.json({ reply: reply || 'I could not generate a response at this time.', modelUsed });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate answer from Gemini API',
    });
  }
});

// Study Mode endpoint: Generates complete structured lesson + 5 quiz questions
app.post('/api/study-mode', async (req, res) => {
  try {
    const { topic, depth = 'Comprehensive Core', studentLevel = 'College Undergraduate' } = req.body;

    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ error: 'Topic string is required' });
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

    // Sanitize response to guarantee robust structure
    const sanitized = {
      topic: data.topic || topic,
      explanation: data.explanation || '',
      importantConcepts: Array.isArray(data.importantConcepts) ? data.importantConcepts : [],
      realWorldExample: data.realWorldExample || '',
      keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
      quiz: Array.isArray(data.quiz) ? data.quiz.map((q: any) => ({
        question: q.question || '',
        options: Array.isArray(q.options) ? q.options : [],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
        explanation: q.explanation || '',
      })) : [],
      modelUsed,
    };

    res.json(sanitized);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Error in /api/study-mode:', error);
    res.status(500).json({
      error: error?.message || 'Failed to generate study guide from Gemini API',
    });
  }
});

async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Nexora server running on http://0.0.0.0:${PORT}`);
  });
}

start();
