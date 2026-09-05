import React from 'react';
import {
  Sparkles,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ArrowRight,
  Database,
  Cpu,
  Code2,
  Network,
  Award,
  Layers,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../types';

interface LandingViewProps {
  onStartStudying: () => void;
  onOpenAuth: () => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onStartStudying,
  onOpenAuth,
  setActiveTab,
}) => {
  const { user } = useAuth();

  const curriculumPills = [
    { name: 'Python Programming', icon: Code2, desc: 'OOP, Generators, Memory & Libraries' },
    { name: 'DBMS & SQL', icon: Database, desc: 'ACID, Normalization, Indexing & Transactions' },
    { name: 'Data Structures & Algorithms', icon: Layers, desc: 'Trees, Graphs, DP & Sorting Complexities' },
    { name: 'Operating Systems', icon: Cpu, desc: 'Paging, Deadlocks, Threads & CPU Scheduling' },
    { name: 'Machine Learning', icon: BrainCircuit, desc: 'Neural Nets, Backprop, Loss & Evaluation' },
    { name: 'Computer Networks', icon: Network, desc: 'TCP/IP, OSI Layers, Routing & Handshakes' },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50/50 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-violet-100 bg-linear-to-b from-white via-violet-50/30 to-slate-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100 border border-violet-200/80 text-violet-800 text-xs font-semibold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-violet-600 animate-pulse" />
              <span>Tailored for College CS & Engineering Students</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
              Master Complex Topics with{' '}
              <span className="bg-linear-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                Nexora AI Study Assistant
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
              Transform difficult coursework into crystal-clear explanations, real-world engineering
              analogies, key summary points, and 5-question adaptive quizzes — private to your account.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
              {user ? (
                <button
                  id="hero-go-dashboard-btn"
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02]"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>Open Student Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <>
                  <button
                    id="hero-get-started-btn"
                    onClick={onOpenAuth}
                    className="flex items-center gap-2 px-7 py-3.5 text-base font-semibold text-white bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-lg shadow-violet-500/25 transition-all hover:scale-[1.02]"
                  >
                    <span>Sign In with Google</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    id="hero-try-demo-btn"
                    onClick={onStartStudying}
                    className="flex items-center gap-2 px-6 py-3.5 text-base font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all hover:border-violet-300"
                  >
                    <Sparkles className="w-4 h-4 text-violet-600" />
                    <span>Try Study Mode Now</span>
                  </button>
                </>
              )}
            </div>

            {/* Micro badges */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Google Sign-In</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Cloud Firestore Private Storage</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>Gemini API Intelligence</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Overview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Designed for Exam Success & Deep Technical Intuition
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Nexora breaks down steep learning curves into 5 actionable learning layers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-2xl p-6 border border-violet-100 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Dedicated Study Mode</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Enter any college topic — from Virtual Memory to B+ Trees — and get structured explanations,
              real-world industry examples, and core concepts.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-2xl p-6 border border-violet-100 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">5-Question Adaptive Quizzes</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Every study session automatically constructs 5 collegiate multiple-choice questions with
              immediate feedback and rationale for each option.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-2xl p-6 border border-violet-100 shadow-xs hover:shadow-md transition-shadow">
            <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Technical AI Q&A Chat</h3>
            <p className="text-slate-600 text-sm leading-relaxed">
              Ask tricky homework questions, get debugging advice, and request step-by-step code
              walkthroughs with syntax-highlighted examples.
            </p>
          </div>
        </div>
      </section>

      {/* Curriculum Topics Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-linear-to-br from-violet-900 via-indigo-900 to-slate-900 rounded-3xl p-8 sm:p-12 text-white shadow-xl">
          <div className="max-w-2xl mb-8">
            <span className="text-xs uppercase font-semibold text-violet-300 tracking-wider">
              Popular College Courses
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold mt-1 text-white tracking-tight">
              Ready-to-Study Core Subjects
            </h2>
            <p className="text-violet-200 text-sm mt-2">
              Select any topic below to jump straight into an AI-powered study session:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {curriculumPills.map((curr) => {
              const Icon = curr.icon;
              return (
                <div
                  key={curr.name}
                  onClick={() => {
                    if (user) {
                      setActiveTab('studymode');
                    } else {
                      onOpenAuth();
                    }
                  }}
                  className="bg-white/10 hover:bg-white/15 border border-white/10 rounded-xl p-4 cursor-pointer transition-all duration-150 hover:translate-y-[-2px]"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-violet-500/20 text-violet-300">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="font-semibold text-sm text-white">{curr.name}</span>
                  </div>
                  <p className="text-xs text-violet-200/80">{curr.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-violet-300">
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Plus any custom engineering or science topic of your choice</span>
            </div>
            <button
              onClick={() => (user ? setActiveTab('studymode') : onOpenAuth())}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-white text-violet-900 text-xs font-bold hover:bg-violet-50 transition-colors"
            >
              Start Studying Now
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Security Architecture Footnote */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-200/80 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-violet-600" />
          <span>
            Enterprise Security: Server-side Gemini API calls • Protected by Cloud Firestore Security Rules
          </span>
        </div>
      </section>
    </div>
  );
};
