import React, { useState, useEffect, useRef } from 'react';
import Markdown from 'react-markdown';
import {
  MessageSquareCode,
  Send,
  Sparkles,
  Loader2,
  Trash2,
  BookmarkCheck,
  Code2,
  Cpu,
  Database,
  Layers,
  ArrowDown,
  User,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ChatMessage, SavedChat } from '../types';
import { saveChatToFirestore } from '../services/firestoreService';

interface AIChatViewProps {
  onOpenAuth: () => void;
}

export const AIChatView: React.FC<AIChatViewProps> = ({ onOpenAuth }) => {
  const { user } = useAuth();
  const [topic, setTopic] = useState('Computer Science & Tech');
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_welcome',
      sender: 'ai',
      text: "👋 Hi! I'm **Nexora**, your collegiate AI study assistant. Ask me any technical questions from Python, DBMS, DSA, Operating Systems, Machine Learning, or System Design. I specialize in beginner-friendly breakdowns, code snippets, and intuitive analogies!",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [chatId, setChatId] = useState<string>(() => 'chat_' + Date.now());
  const [isSaved, setIsSaved] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestedQuestions = [
    { text: 'Explain B-Trees vs B+ Trees in simple terms with storage examples', icon: Database },
    { text: 'How does Operating System Paging and TLB work intuitively?', icon: Cpu },
    { text: 'What is ACID in DBMS and why do banks require it?', icon: Database },
    { text: 'Explain QuickSort worst case O(n^2) vs average case O(n log n)', icon: Layers },
    { text: 'How do Python Generators save memory compared to Lists?', icon: Code2 },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (msgText?: string) => {
    const textToSend = msgText || inputMessage.trim();
    if (!textToSend || loading) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    const userMessage: ChatMessage = {
      id: 'msg_' + Date.now() + '_user',
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage('');
    setLoading(true);
    setIsSaved(false);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          conversationHistory: updatedMessages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          topic,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      const aiReply: ChatMessage = {
        id: 'msg_' + Date.now() + '_ai',
        sender: 'ai',
        text: data.reply || 'I received your question but could not formulate an answer.',
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, aiReply];
      setMessages(finalMessages);

      // Auto-save to Firestore
      const savedChatDoc: SavedChat = {
        id: chatId,
        userId: user.uid,
        title: textToSend.slice(0, 45) + (textToSend.length > 45 ? '...' : ''),
        topic,
        messages: finalMessages,
        createdAt: finalMessages[0].timestamp,
        updatedAt: new Date().toISOString(),
      };

      await saveChatToFirestore(user.uid, savedChatDoc);
      setIsSaved(true);
    } catch (err: unknown) {
      const error = err as Error;
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: 'msg_' + Date.now() + '_err',
        sender: 'ai',
        text: `⚠️ **Error generating response:** ${error.message || 'Please check your connection and try again.'}`,
        timestamp: new Date().toISOString(),
      };
      setMessages([...updatedMessages, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'msg_welcome_' + Date.now(),
        sender: 'ai',
        text: "New session started! What technical subject or concept would you like to explore?",
        timestamp: new Date().toISOString(),
      },
    ]);
    setChatId('chat_' + Date.now());
    setIsSaved(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-5.5rem)] flex flex-col">
      {/* Top Bar */}
      <div className="bg-white rounded-t-3xl border border-slate-200/80 p-4 sm:px-6 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <MessageSquareCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-base">Nexora Technical AI Chat</h2>
              {isSaved && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <BookmarkCheck className="w-3 h-3" />
                  Synced
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">Ask coding, theory, or architectural questions</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-hidden focus:ring-1 focus:ring-violet-500"
          >
            <option value="Computer Science & Tech">General CS & Tech</option>
            <option value="Python Programming">Python Focus</option>
            <option value="DBMS & SQL">DBMS & SQL</option>
            <option value="Data Structures & Algorithms">DSA & Algorithms</option>
            <option value="Operating Systems">Operating Systems</option>
            <option value="Machine Learning">Machine Learning</option>
          </select>

          <button
            onClick={handleClearChat}
            title="Reset Chat"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Container */}
      <div className="flex-1 bg-slate-50/60 border-x border-slate-200/80 p-4 sm:p-6 overflow-y-auto space-y-4">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              {isUser ? (
                <div className="w-8 h-8 rounded-lg bg-violet-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
              ) : (
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                  isUser
                    ? 'bg-violet-600 text-white shadow-xs rounded-tr-xs'
                    : 'bg-white border border-slate-200/80 text-slate-800 shadow-xs rounded-tl-xs'
                }`}
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap font-medium">{msg.text}</p>
                ) : (
                  <div className="prose prose-slate max-w-none text-slate-800 text-xs sm:text-sm">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                )}
                <div
                  className={`text-[10px] mt-2 text-right ${
                    isUser ? 'text-violet-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-linear-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-xs flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-violet-600" />
              <span className="text-xs text-slate-500 font-medium">
                Nexora is thinking and generating beginner-friendly explanation...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      {messages.length <= 2 && (
        <div className="bg-white border-x border-slate-200/80 px-4 py-2 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
          <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-500" />
            Try asking:
          </span>
          {suggestedQuestions.map((s, idx) => {
            const Icon = s.icon;
            return (
              <button
                key={idx}
                onClick={() => handleSendMessage(s.text)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 hover:bg-violet-50 hover:border-violet-300 text-slate-600 hover:text-violet-700 whitespace-nowrap transition-colors"
              >
                <Icon className="w-3 h-3 text-slate-400" />
                <span className="truncate max-w-[200px]">{s.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input Bottom Bar */}
      <div className="bg-white rounded-b-3xl border border-slate-200/80 p-4 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            id="ai-chat-input"
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder={`Ask a question about ${topic}...`}
            disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm placeholder:text-slate-400 font-medium disabled:opacity-60"
          />
          <button
            id="ai-chat-send-btn"
            type="submit"
            disabled={!inputMessage.trim() || loading}
            className="flex items-center justify-center w-11 h-11 rounded-xl bg-linear-to-r from-violet-600 to-indigo-600 text-white shadow-xs hover:from-violet-700 hover:to-indigo-700 transition-colors disabled:opacity-40 disabled:pointer-events-none"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <p className="text-[11px] text-slate-400 text-center mt-2">
          Responses powered by Gemini Flash AI • All Q&A conversations securely stored in Cloud Firestore
        </p>
      </div>
    </div>
  );
};
