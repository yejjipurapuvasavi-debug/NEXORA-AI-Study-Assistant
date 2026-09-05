import React, { useState } from 'react';
import Markdown from 'react-markdown';
import {
  BookOpen,
  Sparkles,
  Lightbulb,
  Globe2,
  CheckSquare,
  HelpCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  Award,
  RefreshCw,
  Search,
  BookmarkCheck,
  ChevronRight,
  Code2,
  Database,
  Cpu,
  BrainCircuit,
  Layers,
  Zap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { StudySession, QuizQuestion } from '../types';
import {
  saveStudySessionToFirestore,
  updateQuizScore,
} from '../services/firestoreService';

interface StudyModeViewProps {
  initialTopic?: string;
  onOpenAuth: () => void;
}

export const StudyModeView: React.FC<StudyModeViewProps> = ({
  initialTopic = '',
  onOpenAuth,
}) => {
  const { user } = useAuth();
  const [topicInput, setTopicInput] = useState(initialTopic);
  const [depth, setDepth] = useState('Comprehensive Core');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentSession, setCurrentSession] = useState<StudySession | null>(null);

  // Quiz state
  const [selectedAnswers, setSelectedAnswers] = useState<{ [qIndex: number]: number }>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [isSavingScore, setIsSavingScore] = useState(false);

  const presetTopics = [
    { label: 'Python', icon: Code2, desc: 'Object-Oriented, Iterators, GIL' },
    { label: 'DBMS', icon: Database, desc: 'ACID, B+ Trees, 3NF' },
    { label: 'DSA', icon: Layers, desc: 'Binary Trees, Graphs, Sorting' },
    { label: 'Operating Systems', icon: Cpu, desc: 'Paging, Deadlocks, Scheduling' },
    { label: 'Machine Learning', icon: BrainCircuit, desc: 'Backprop, Overfitting, Loss' },
  ];

  const handleGenerate = async (topicToFetch?: string) => {
    const targetTopic = topicToFetch || topicInput.trim();
    if (!targetTopic) {
      setError('Please enter a topic to study');
      return;
    }

    if (!user) {
      onOpenAuth();
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setScore(null);

    try {
      const response = await fetch('/api/study-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: targetTopic,
          depth,
          studentLevel: 'College Undergraduate',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      const newSession: StudySession = {
        id: 'session_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        userId: user.uid,
        topic: data.topic || targetTopic,
        explanation: data.explanation || '',
        importantConcepts: data.importantConcepts || [],
        realWorldExample: data.realWorldExample || '',
        keyPoints: data.keyPoints || [],
        quiz: data.quiz || [],
        createdAt: new Date().toISOString(),
      };

      setCurrentSession(newSession);

      // Automatically persist session to Cloud Firestore
      await saveStudySessionToFirestore(user.uid, newSession);
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Study guide error:', e);
      setError(e.message || 'Failed to generate study guide. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerSelect = (questionIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!currentSession || !user) return;

    let correctCount = 0;
    currentSession.quiz.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswerIndex) {
        correctCount += 1;
      }
    });

    setScore(correctCount);
    setQuizSubmitted(true);
    setIsSavingScore(true);

    const answersArray = currentSession.quiz.map((_, idx) => selectedAnswers[idx] ?? -1);

    try {
      await updateQuizScore(user.uid, currentSession.id, correctCount, answersArray);
      setCurrentSession((prev) =>
        prev
          ? {
              ...prev,
              quizScore: correctCount,
              userAnswers: answersArray,
              quizCompleted: true,
            }
          : null
      );
    } catch (err) {
      console.error('Failed to sync quiz score to Firestore:', err);
    } finally {
      setIsSavingScore(false);
    }
  };

  const handleResetQuiz = () => {
    setSelectedAnswers({});
    setQuizSubmitted(false);
    setScore(null);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Topic Generator Box */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-violet-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Study Mode
              </h1>
              <p className="text-xs sm:text-sm text-slate-500">
                Generate simple explanations, key concepts, practical analogies & 5 MCQs.
              </p>
            </div>
          </div>

          {/* Depth selection */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold text-slate-600">
            {['Fundamentals', 'Comprehensive Core', 'Exam Cram'].map((lvl) => (
              <button
                key={lvl}
                onClick={() => setDepth(lvl)}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  depth === lvl
                    ? 'bg-white text-violet-700 shadow-xs'
                    : 'hover:text-slate-900'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        {/* Input and preset topics */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                id="study-mode-topic-input"
                type="text"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                placeholder="Enter a topic (e.g., Python, DBMS, DSA, Operating Systems, Machine Learning)..."
                className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 text-sm placeholder:text-slate-400 font-medium"
              />
            </div>
            <button
              id="study-mode-generate-btn"
              onClick={() => handleGenerate()}
              disabled={loading}
              className="flex items-center justify-center gap-2 px-6 py-3.5 bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-semibold text-sm rounded-xl shadow-md shadow-violet-500/25 transition-all hover:scale-[1.01] disabled:opacity-60 disabled:pointer-events-none"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Study Guide</span>
                </>
              )}
            </button>
          </div>

          {/* Quick preset chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              Quick Topics:
            </span>
            {presetTopics.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={() => {
                    setTopicInput(item.label);
                    handleGenerate(item.label);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-violet-50 hover:border-violet-300 text-xs font-medium text-slate-700 hover:text-violet-700 transition-colors"
                >
                  <Icon className="w-3.5 h-3.5 text-slate-500" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={() => setError(null)}
                className="text-rose-600 hover:underline font-semibold"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Loading state animation */}
      {loading && (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center space-y-4">
          <div className="relative w-16 h-16 mx-auto">
            <div className="absolute inset-0 rounded-2xl bg-violet-600/20 animate-ping"></div>
            <div className="relative w-16 h-16 rounded-2xl bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/30">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-slate-900">
              Crafting Your AI Study Guide & Quiz
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Analyzing core principles, writing beginner-friendly explanations, formulating
              real-world examples, and calibrating 5 college-level quiz questions...
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-50 text-violet-700 text-xs font-medium rounded-full">
            <Sparkles className="w-3 h-3 text-violet-600" />
            <span>Powered by Gemini Flash AI</span>
          </div>
        </div>
      )}

      {/* Render Study Session Content */}
      {currentSession && !loading && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Top Session Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 bg-linear-to-r from-violet-50 via-indigo-50 to-white p-5 rounded-2xl border border-violet-100">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-violet-200/70 text-violet-800">
                  Study Guide
                </span>
                <span className="text-xs text-slate-500">
                  {new Date(currentSession.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
                {currentSession.topic}
              </h2>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200/70 shadow-2xs">
              <BookmarkCheck className="w-4 h-4 text-emerald-600" />
              <span>Saved in Cloud Firestore</span>
            </div>
          </div>

          {/* Section 1: Simple Explanation */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 text-violet-700">
              <BookOpen className="w-5 h-5" />
              <h3 className="text-lg font-bold tracking-tight text-slate-900">
                1. Simple Explanation
              </h3>
            </div>
            <div className="prose prose-slate max-w-none text-slate-700 text-sm sm:text-base leading-relaxed">
              <Markdown>{currentSession.explanation}</Markdown>
            </div>
          </div>

          {/* Section 2: Important Concepts */}
          {currentSession.importantConcepts && currentSession.importantConcepts.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-5">
              <div className="flex items-center gap-2.5 text-indigo-700">
                <Lightbulb className="w-5 h-5" />
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  2. Important Concepts
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentSession.importantConcepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 hover:border-violet-200 hover:bg-violet-50/20 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{concept.title}</h4>
                    </div>
                    <div className="text-xs sm:text-sm text-slate-600 leading-relaxed pl-8">
                      <Markdown>{concept.description}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Real-World Example */}
          {currentSession.realWorldExample && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-blue-700">
                <Globe2 className="w-5 h-5" />
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  3. Real-World Engineering Example
                </h3>
              </div>
              <div className="p-5 rounded-2xl bg-linear-to-r from-blue-50/80 to-indigo-50/50 border border-blue-100 text-slate-700 text-sm sm:text-base leading-relaxed">
                <Markdown>{currentSession.realWorldExample}</Markdown>
              </div>
            </div>
          )}

          {/* Section 4: Key Points */}
          {currentSession.keyPoints && currentSession.keyPoints.length > 0 && (
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-4">
              <div className="flex items-center gap-2.5 text-emerald-700">
                <CheckSquare className="w-5 h-5" />
                <h3 className="text-lg font-bold tracking-tight text-slate-900">
                  4. Key Points & Exam Takeaways
                </h3>
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {currentSession.keyPoints.map((pt, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 text-xs sm:text-sm text-slate-700"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Section 5: 5 Multiple-Choice Quiz Questions */}
          {currentSession.quiz && currentSession.quiz.length > 0 && (
            <div
              id="interactive-quiz-section"
              className="bg-white rounded-3xl p-6 sm:p-8 border-2 border-violet-200 shadow-md space-y-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-tight text-slate-900">
                      5. 5-Question Topic Mastery Quiz
                    </h3>
                    <p className="text-xs text-slate-500">
                      Test your understanding with instant feedback and score synchronization.
                    </p>
                  </div>
                </div>

                {quizSubmitted && score !== null && (
                  <div className="flex items-center gap-3 bg-violet-50 px-4 py-2 rounded-xl border border-violet-200">
                    <Award className="w-5 h-5 text-violet-600" />
                    <div>
                      <span className="text-xs font-semibold text-slate-500 block">Final Score</span>
                      <span className="text-sm font-bold text-violet-900">
                        {score} / 5 ({score * 20}%)
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Questions list */}
              <div className="space-y-6">
                {currentSession.quiz.map((q: QuizQuestion, qIndex: number) => {
                  const selected = selectedAnswers[qIndex];
                  const isCorrect = selected === q.correctAnswerIndex;

                  return (
                    <div
                      key={qIndex}
                      className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className="w-6 h-6 rounded-lg bg-violet-100 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          Q{qIndex + 1}
                        </span>
                        <p className="text-sm sm:text-base font-semibold text-slate-900">
                          {q.question}
                        </p>
                      </div>

                      {/* 4 Choices */}
                      <div className="grid grid-cols-1 gap-2 pt-1">
                        {q.options.map((opt, optIndex) => {
                          const isOptionSelected = selected === optIndex;
                          const isThisCorrect = optIndex === q.correctAnswerIndex;

                          let optionStyle =
                            'bg-white border-slate-200 text-slate-700 hover:border-violet-300 hover:bg-violet-50/30';

                          if (quizSubmitted) {
                            if (isThisCorrect) {
                              optionStyle = 'bg-emerald-50 border-emerald-400 text-emerald-900 font-medium';
                            } else if (isOptionSelected && !isCorrect) {
                              optionStyle = 'bg-rose-50 border-rose-300 text-rose-900 line-through';
                            } else {
                              optionStyle = 'bg-white/50 border-slate-200 text-slate-400 opacity-60';
                            }
                          } else if (isOptionSelected) {
                            optionStyle = 'bg-violet-50 border-violet-500 text-violet-900 font-semibold ring-1 ring-violet-500';
                          }

                          return (
                            <button
                              key={optIndex}
                              onClick={() => handleAnswerSelect(qIndex, optIndex)}
                              disabled={quizSubmitted}
                              className={`w-full flex items-center justify-between p-3 rounded-xl border text-left text-xs sm:text-sm transition-all ${optionStyle}`}
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px] font-bold shrink-0">
                                  {String.fromCharCode(65 + optIndex)}
                                </span>
                                <span>{opt}</span>
                              </div>

                              {quizSubmitted && (
                                <div>
                                  {isThisCorrect && (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  )}
                                  {isOptionSelected && !isCorrect && (
                                    <XCircle className="w-4 h-4 text-rose-600" />
                                  )}
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* Explanation box after submission */}
                      {quizSubmitted && (
                        <div className="mt-3 p-3.5 rounded-xl bg-white border border-slate-200/90 text-xs text-slate-600 leading-relaxed space-y-1 animate-in fade-in">
                          <span className="font-bold text-slate-800 block">
                            💡 Rationale:
                          </span>
                          <p>{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Quiz Footer & Action buttons */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div className="text-xs text-slate-500">
                  {Object.keys(selectedAnswers).length} of {currentSession.quiz.length} answered
                </div>

                <div className="flex items-center gap-3">
                  {!quizSubmitted ? (
                    <button
                      id="submit-quiz-button"
                      onClick={handleSubmitQuiz}
                      disabled={Object.keys(selectedAnswers).length < currentSession.quiz.length}
                      className="flex items-center gap-2 px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm rounded-xl shadow-xs transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit Answers & See Score</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleResetQuiz}
                      className="flex items-center gap-2 px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl transition-colors"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                      <span>Retake Quiz</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
