import React from 'react';
import Markdown from 'react-markdown';
import {
  X,
  BookOpen,
  Lightbulb,
  Globe2,
  CheckSquare,
  HelpCircle,
  Award,
  CheckCircle2,
  XCircle,
  Calendar,
  BookmarkCheck,
} from 'lucide-react';
import { StudySession } from '../types';

interface StudySessionDetailModalProps {
  session: StudySession | null;
  onClose: () => void;
}

export const StudySessionDetailModal: React.FC<StudySessionDetailModalProps> = ({
  session,
  onClose,
}) => {
  if (!session) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-2xl border border-violet-100 flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-6 bg-linear-to-r from-violet-700 via-indigo-700 to-blue-700 text-white flex items-start justify-between gap-4 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white">
                Archived Session
              </span>
              <span className="text-xs text-violet-200 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {new Date(session.createdAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">{session.topic}</h2>
          </div>

          <div className="flex items-center gap-3">
            {typeof session.quizScore === 'number' && (
              <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-300/40 rounded-xl text-xs font-bold text-emerald-100 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-emerald-300" />
                Score: {session.quizScore}/5 ({session.quizScore * 20}%)
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-800">
          {/* Explanation */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-violet-700 font-bold text-sm">
              <BookOpen className="w-4 h-4" />
              <span>Explanation</span>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-sm leading-relaxed">
              <Markdown>{session.explanation}</Markdown>
            </div>
          </div>

          {/* Concepts */}
          {session.importantConcepts && session.importantConcepts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm">
                <Lightbulb className="w-4 h-4" />
                <span>Important Concepts</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {session.importantConcepts.map((concept, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <h4 className="font-bold text-xs text-slate-900 mb-1">{concept.title}</h4>
                    <div className="text-xs text-slate-600">
                      <Markdown>{concept.description}</Markdown>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Real World Example */}
          {session.realWorldExample && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                <Globe2 className="w-4 h-4" />
                <span>Real-World Example</span>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs sm:text-sm text-slate-700">
                <Markdown>{session.realWorldExample}</Markdown>
              </div>
            </div>
          )}

          {/* Key points */}
          {session.keyPoints && session.keyPoints.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                <CheckSquare className="w-4 h-4" />
                <span>Key Points</span>
              </div>
              <ul className="space-y-2">
                {session.keyPoints.map((pt, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-700"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quiz questions review */}
          {session.quiz && session.quiz.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-violet-700 font-bold text-sm">
                <HelpCircle className="w-4 h-4" />
                <span>Quiz Review & Solutions (5 Questions)</span>
              </div>
              <div className="space-y-4">
                {session.quiz.map((q, qIndex) => {
                  const userAnswer = session.userAnswers ? session.userAnswers[qIndex] : undefined;
                  const isCorrect = userAnswer === q.correctAnswerIndex;

                  return (
                    <div key={qIndex} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                      <p className="text-xs sm:text-sm font-semibold text-slate-900">
                        Q{qIndex + 1}: {q.question}
                      </p>
                      <div className="grid grid-cols-1 gap-1.5 pt-1">
                        {q.options.map((opt, optIndex) => {
                          const isAnswerKey = optIndex === q.correctAnswerIndex;
                          const wasChosen = userAnswer === optIndex;

                          let style = 'bg-white text-slate-600 border-slate-200';
                          if (isAnswerKey) {
                            style = 'bg-emerald-50 text-emerald-900 border-emerald-300 font-semibold';
                          } else if (wasChosen && !isCorrect) {
                            style = 'bg-rose-50 text-rose-900 border-rose-300 line-through';
                          }

                          return (
                            <div
                              key={optIndex}
                              className={`px-3 py-2 rounded-lg border text-xs flex items-center justify-between ${style}`}
                            >
                              <span>
                                {String.fromCharCode(65 + optIndex)}. {opt}
                              </span>
                              {isAnswerKey && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                              {wasChosen && !isCorrect && <XCircle className="w-3.5 h-3.5 text-rose-600" />}
                            </div>
                          );
                        })}
                      </div>
                      <div className="text-[11px] text-slate-500 pt-1">
                        <span className="font-bold text-slate-700">Explanation:</span> {q.explanation}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Close Session
          </button>
        </div>
      </div>
    </div>
  );
};
