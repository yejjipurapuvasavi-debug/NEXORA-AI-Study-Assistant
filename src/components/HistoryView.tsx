import React, { useEffect, useState } from 'react';
import {
  History as HistoryIcon,
  BookOpen,
  MessageSquareCode,
  Search,
  Trash2,
  Calendar,
  Award,
  Loader2,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StudySession, SavedChat, ActiveTab } from '../types';
import {
  getStudySessionsFromFirestore,
  deleteStudySessionFromFirestore,
  getChatsFromFirestore,
  deleteChatFromFirestore,
} from '../services/firestoreService';
import { StudySessionDetailModal } from './StudySessionDetailModal';

interface HistoryViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ setActiveTab, onOpenAuth }) => {
  const { user } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'sessions' | 'chats'>('sessions');
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [chats, setChats] = useState<SavedChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadHistory();
  }, [user]);

  const loadHistory = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [fetchedSessions, fetchedChats] = await Promise.all([
        getStudySessionsFromFirestore(user.uid),
        getChatsFromFirestore(user.uid),
      ]);
      setSessions(fetchedSessions);
      setChats(fetchedChats);
    } catch (err) {
      console.error('Error loading history from Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this study session?')) return;

    setDeletingId(sessionId);
    try {
      await deleteStudySessionFromFirestore(user.uid, sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Error deleting study session:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    if (!user) return;
    if (!window.confirm('Are you sure you want to delete this conversation log?')) return;

    setDeletingId(chatId);
    try {
      await deleteChatFromFirestore(user.uid, chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
    } catch (err) {
      console.error('Error deleting chat from Firestore:', err);
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center mx-auto shadow-xs">
          <HistoryIcon className="w-7 h-7" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Student Sign In Required</h2>
        <p className="text-slate-600 text-sm max-w-md mx-auto">
          Please sign in to view and manage your private Firestore study sessions and AI chat history.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl shadow-xs"
        >
          Sign In
        </button>
      </div>
    );
  }

  const filteredSessions = sessions.filter(
    (s) =>
      s.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.explanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.realWorldExample && s.realWorldExample.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredChats = chats.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.messages.some((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Study History</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Access previous study guides, review quiz answers, and examine AI technical chats.
            </p>
          </div>
        </div>

        {/* Sub tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveSubTab('sessions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'sessions'
                ? 'bg-white text-violet-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Study Sessions ({sessions.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('chats')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg transition-colors ${
              activeSubTab === 'chats'
                ? 'bg-white text-violet-700 shadow-xs'
                : 'hover:text-slate-900'
            }`}
          >
            <MessageSquareCode className="w-3.5 h-3.5" />
            <span>Chat Logs ({chats.length})</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search ${activeSubTab === 'sessions' ? 'study topics, concepts...' : 'chat titles or questions...'}`}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 bg-white text-sm focus:outline-hidden focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500"
        />
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-2">
          <Loader2 className="w-7 h-7 animate-spin text-violet-600" />
          <span className="text-xs">Fetching records from Cloud Firestore...</span>
        </div>
      ) : activeSubTab === 'sessions' ? (
        filteredSessions.length === 0 ? (
          <div className="py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-center p-8 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 mx-auto flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              {searchQuery ? 'No matching study sessions found' : 'No study sessions recorded yet'}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Use Study Mode to generate structured lessons on Python, DBMS, or DSA. They will be
              automatically cataloged here.
            </p>
            <button
              onClick={() => setActiveTab('studymode')}
              className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs rounded-xl shadow-xs"
            >
              Launch Study Mode
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-violet-300 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-violet-100 text-violet-800">
                      {session.topic}
                    </span>
                    <button
                      onClick={(e) => handleDeleteSession(e, session.id)}
                      disabled={deletingId === session.id}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Session"
                    >
                      {deletingId === session.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                    {session.explanation}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    {typeof session.quizScore === 'number' ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px]">
                        <Award className="w-3.5 h-3.5 text-emerald-600" />
                        Score: {session.quizScore}/5
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">Quiz unsubmitted</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-violet-600 font-semibold group-hover:translate-x-0.5 transition-transform">
                    <span>View Notes</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filteredChats.length === 0 ? (
        <div className="py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-center p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
            <MessageSquareCode className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {searchQuery ? 'No matching chat logs found' : 'No chat conversations saved yet'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Questions you ask Nexora in the AI Q&A chat will be preserved here in Cloud Firestore.
          </p>
          <button
            onClick={() => setActiveTab('chat')}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-xs"
          >
            Ask a Question
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredChats.map((chat) => (
            <div
              key={chat.id}
              onClick={() => setActiveTab('chat')}
              className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-indigo-300 hover:bg-indigo-50/20 transition-all cursor-pointer flex items-center justify-between gap-4"
            >
              <div className="space-y-1 max-w-[80%]">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-900 truncate">
                    {chat.title || 'Technical Q&A'}
                  </span>
                  <span className="text-[10px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {chat.topic}
                  </span>
                </div>
                <p className="text-xs text-slate-500 line-clamp-1">
                  {chat.messages?.[chat.messages.length - 1]?.text || 'View conversation'}
                </p>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                  <span>{chat.messages.length} messages</span>
                  <span>•</span>
                  <span>{new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleDeleteChat(e, chat.id)}
                  disabled={deletingId === chat.id}
                  className="text-slate-300 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Delete Chat Log"
                >
                  {deletingId === chat.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                </button>
                <ChevronRight className="w-4 h-4 text-indigo-600" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <StudySessionDetailModal
        session={selectedSession}
        onClose={() => setSelectedSession(null)}
      />
    </div>
  );
};
