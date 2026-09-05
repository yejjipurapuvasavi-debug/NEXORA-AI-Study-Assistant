import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  BookOpen,
  MessageSquareCode,
  ArrowRight,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Code2,
  Database,
  Cpu,
  BrainCircuit,
  Layers,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StudySession, SavedChat, ActiveTab } from '../types';
import {
  getStudySessionsFromFirestore,
  getChatsFromFirestore,
} from '../services/firestoreService';

interface DashboardViewProps {
  setActiveTab: (tab: ActiveTab) => void;
  onLaunchTopic: (topic: string) => void;
  onOpenSession: (session: StudySession) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  setActiveTab,
  onLaunchTopic,
  onOpenSession,
}) => {
  const { user } = useAuth();
  const [recentSessions, setRecentSessions] = useState<StudySession[]>([]);
  const [recentChats, setRecentChats] = useState<SavedChat[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!user) return;

    let isMounted = true;
    const loadUserData = async () => {
      setLoadingData(true);
      try {
        const [sessions, chats] = await Promise.all([
          getStudySessionsFromFirestore(user.uid),
          getChatsFromFirestore(user.uid),
        ]);
        if (isMounted) {
          setRecentSessions(sessions);
          setRecentChats(chats);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (isMounted) setLoadingData(false);
      }
    };

    loadUserData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Compute student stats
  const totalSessions = recentSessions.length;
  const quizzesCompleted = recentSessions.filter((s) => s.quizCompleted).length;
  const scoredSessions = recentSessions.filter((s) => typeof s.quizScore === 'number');
  const avgScore =
    scoredSessions.length > 0
      ? Math.round(
          (scoredSessions.reduce((acc, curr) => acc + (curr.quizScore || 0), 0) /
            scoredSessions.length) *
            20 // 5 questions -> percentage
        )
      : 0;

  const quickTopics = [
    { title: 'Python', desc: 'Decorators, GIL, Memory Model', icon: Code2, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { title: 'DBMS', desc: 'B+ Trees, ACID, Normalization', icon: Database, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { title: 'DSA', desc: 'Graph Traversals, Dynamic Prog', icon: Layers, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { title: 'Operating Systems', desc: 'Virtual Memory, Semaphores', icon: Cpu, color: 'text-violet-600 bg-violet-50 border-violet-200' },
    { title: 'Machine Learning', desc: 'Gradient Descent, CNNs, Attention', icon: BrainCircuit, color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Student Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-violet-700 via-indigo-700 to-blue-700 p-6 sm:p-8 text-white shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-violet-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Private Student Workspace</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, {user?.displayName || 'Student'}!
            </h1>
            <p className="text-violet-100 text-sm max-w-xl">
              Ready to master your coursework? Choose a topic to launch an instant AI study guide with
              real-world examples and a 5-question exam quiz.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="dashboard-start-study-btn"
              onClick={() => setActiveTab('studymode')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-violet-900 font-bold text-sm shadow-md hover:bg-violet-50 transition-all hover:scale-[1.02]"
            >
              <BookOpen className="w-4 h-4 text-violet-700" />
              <span>Launch Study Mode</span>
            </button>
            <button
              id="dashboard-ask-chat-btn"
              onClick={() => setActiveTab('chat')}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-sm border border-white/20 transition-colors"
            >
              <MessageSquareCode className="w-4 h-4" />
              <span>Ask AI Chat</span>
            </button>
          </div>
        </div>
      </div>

      {/* Student Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Study Sessions
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{totalSessions}</span>
              <span className="text-xs text-violet-600 font-medium">Recorded</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Quizzes Completed
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">{quizzesCompleted}</span>
              <span className="text-xs text-indigo-600 font-medium">Assessed</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Average Quiz Score
            </p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900">
                {scoredSessions.length > 0 ? `${avgScore}%` : 'N/A'}
              </span>
              <span className="text-xs text-emerald-600 font-medium">Mastery</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Topic Launchers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              One-Click Topic Study Mode
            </h2>
            <p className="text-xs text-slate-500">
              Select a core collegiate topic to immediately generate structured notes and quizzes:
            </p>
          </div>
          <button
            onClick={() => setActiveTab('studymode')}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900 flex items-center gap-1"
          >
            Explore all topics
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {quickTopics.map((topic) => {
            const Icon = topic.icon;
            return (
              <button
                key={topic.title}
                id={`quick-topic-${topic.title.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => onLaunchTopic(topic.title)}
                className="flex flex-col text-left p-4 rounded-2xl bg-white hover:bg-violet-50/50 border border-slate-200/80 hover:border-violet-300 shadow-xs transition-all duration-150 hover:-translate-y-0.5 group"
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 border ${topic.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="font-bold text-slate-900 text-sm group-hover:text-violet-700 transition-colors">
                  {topic.title}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">{topic.desc}</span>
                <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold text-violet-600">
                  <span>Start Guide</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two columns: Recent Study Sessions & Recent Q&A Chats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Study Sessions */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-violet-100 text-violet-700">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Recent Study Sessions</h3>
            </div>
            <button
              onClick={() => setActiveTab('history')}
              className="text-xs font-semibold text-violet-600 hover:text-violet-800"
            >
              View All
            </button>
          </div>

          {loadingData ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
              <span className="text-xs">Loading sessions from Firestore...</span>
            </div>
          ) : recentSessions.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 mx-auto flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-700">No study sessions saved yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Generate your first study guide on Python, DBMS, or DSA to see it saved here.
              </p>
              <button
                onClick={() => setActiveTab('studymode')}
                className="px-4 py-2 text-xs font-semibold text-white bg-violet-600 rounded-lg shadow-xs hover:bg-violet-700"
              >
                Create Study Session
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentSessions.slice(0, 4).map((session) => (
                <div
                  key={session.id}
                  onClick={() => onOpenSession(session)}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-violet-200 hover:bg-violet-50/40 cursor-pointer transition-colors"
                >
                  <div className="space-y-1 max-w-[75%]">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 truncate">
                        {session.topic}
                      </span>
                      {session.quizCompleted && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Quiz: {session.quizScore}/5
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {session.realWorldExample || session.explanation}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[11px] text-slate-400 hidden sm:block">
                      {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-violet-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent AI Chat Threads */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <MessageSquareCode className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">Recent AI Technical Chats</h3>
            </div>
            <button
              onClick={() => setActiveTab('chat')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
            >
              Open Chat
            </button>
          </div>

          {loadingData ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-xs">Loading conversations from Firestore...</span>
            </div>
          ) : recentChats.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-xl p-6 space-y-3">
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                <MessageSquareCode className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-700">No saved Q&A chats yet</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Ask Nexora any technical question to get beginner-friendly explanations with code snippets.
              </p>
              <button
                onClick={() => setActiveTab('chat')}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-lg shadow-xs hover:bg-indigo-700"
              >
                Ask a Question
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentChats.slice(0, 4).map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setActiveTab('chat')}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/40 cursor-pointer transition-colors"
                >
                  <div className="space-y-1 max-w-[75%]">
                    <span className="font-semibold text-sm text-slate-900 truncate block">
                      {chat.title || 'Technical Discussion'}
                    </span>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {chat.messages?.[chat.messages.length - 1]?.text || 'Conversation log'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <span className="text-[11px] text-slate-400 hidden sm:block">
                      {new Date(chat.updatedAt || chat.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="w-4 h-4 text-indigo-600" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
