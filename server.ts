import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import {
  generateStudyGuide,
  generateChatReply,
  CANDIDATE_MODELS,
} from './src/server/geminiService.ts';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

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

    const result = await generateChatReply({ message, conversationHistory, topic });
    res.json(result);
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

    const sanitized = await generateStudyGuide({ topic, depth, studentLevel });
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
