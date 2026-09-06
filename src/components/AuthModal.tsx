import React, { useState } from 'react';
import {
  X,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Loader2,
  GraduationCap,
  ArrowRight,
  Copy,
  Check,
  ExternalLink,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import firebaseConfig from '../../firebase-applet-config.json';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { user, signInWithGoogle, signInDemoStudent, authError, authErrorCode, detectedDomain, clearError } = useAuth();
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentHost = detectedDomain || (typeof window !== 'undefined' ? window.location.hostname : '');
  const firebaseSettingsUrl = `https://console.firebase.google.com/project/${firebaseConfig.projectId}/authentication/settings`;

  const isUnauthorizedDomain =
    authErrorCode === 'auth/unauthorized-domain' ||
    Boolean(authError && authError.toLowerCase().includes('not authorized'));

  const handleCopyDomain = async () => {
    if (!currentHost) return;
    try {
      await navigator.clipboard.writeText(currentHost);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // If user becomes authenticated (via completed popup or onAuthStateChanged), close modal and reset loading
  React.useEffect(() => {
    if (user && isOpen) {
      setLoadingGoogle(false);
      onSuccess();
      onClose();
    }
  }, [user, isOpen, onSuccess, onClose]);

  // Clean up loading state when modal closes
  React.useEffect(() => {
    if (!isOpen) {
      setLoadingGoogle(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleSignIn = async () => {
    if (loadingGoogle) return;
    setLoadingGoogle(true);
    clearError();
    try {
      await signInWithGoogle();
      onSuccess();
      onClose();
    } catch {
      // Handled in context; finally block resets loadingGoogle
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleDemoSignIn = () => {
    signInDemoStudent('Alex Chen (CS Major)');
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="auth-modal-card"
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-violet-100 overflow-hidden"
      >
        {/* Header decoration */}
        <div className="bg-linear-to-r from-violet-600 via-indigo-600 to-blue-600 p-6 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-xs">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-xs uppercase tracking-wider font-semibold text-violet-200">
              Student Access
            </span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Nexora AI Study Assistant</h2>
          <p className="text-violet-100 text-sm mt-1">
            Sign in to unlock personalized AI study guides, technical Q&A, and synced Firestore quizzes.
          </p>
        </div>

        <div className="p-6 space-y-4">
          {authError && (
            isUnauthorizedDomain ? (
              <div id="unauthorized-domain-guide" className="p-4 rounded-xl bg-amber-50/90 border border-amber-300/80 text-amber-950 text-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <Globe className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Firebase Authorized Domain Required</p>
                    <p className="text-slate-600 mt-0.5 text-xs">
                      Your Firebase project (<span className="font-semibold text-violet-700">{firebaseConfig.projectId}</span>) requires this preview environment domain to be added to its Authorized Domains list.
                    </p>
                  </div>
                </div>

                {/* Domain display and copy */}
                <div className="bg-white p-2.5 rounded-lg border border-amber-200 flex items-center justify-between gap-2 shadow-2xs">
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Preview Domain</span>
                    <code className="text-xs font-mono font-bold text-slate-800 break-all select-all">
                      {currentHost || 'ais-dev-qqzzlgqjaw3ogxd6kjaitd-528837826501.asia-east1.run.app'}
                    </code>
                  </div>
                  <button
                    id="copy-preview-domain-btn"
                    type="button"
                    onClick={handleCopyDomain}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white font-medium text-xs transition-colors shadow-2xs cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>

                {/* Direct link & 3-step action */}
                <div className="space-y-1.5 text-slate-700">
                  <p className="font-semibold text-[11px] text-slate-800">Quick 3-step fix in Firebase Console:</p>
                  <ol className="list-decimal list-inside space-y-1 text-[11px] pl-1 text-slate-600">
                    <li>
                      Open{' '}
                      <a
                        href={firebaseSettingsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-violet-700 hover:underline inline-flex items-center gap-0.5"
                      >
                        Firebase Auth Settings <ExternalLink className="w-3 h-3 inline" />
                      </a>
                    </li>
                    <li>Scroll down to <strong>Authorized domains</strong> and click <strong>Add domain</strong></li>
                    <li>Paste the preview domain and click <strong>Save</strong></li>
                  </ol>
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs leading-relaxed">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Sign-in Notice</p>
                  <p>{authError}</p>
                </div>
              </div>
            )
          )}

          {/* Primary Google Sign-In */}
          <button
            id="google-sign-in-button"
            onClick={handleGoogleSignIn}
            disabled={loadingGoogle}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm shadow-xs transition-all duration-150 hover:shadow-md hover:border-violet-300 group disabled:opacity-60"
          >
            {loadingGoogle ? (
              <Loader2 className="w-5 h-5 animate-spin text-violet-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Continue with Google</span>
          </button>

          <div className="relative flex items-center justify-center my-3">
            <div className="border-t border-slate-200 w-full"></div>
            <span className="bg-white px-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Or instant preview
            </span>
          </div>

          {/* Demo Student Fast Access */}
          <button
            id="demo-student-button"
            onClick={handleDemoSignIn}
            className="w-full flex items-center justify-between py-2.5 px-4 rounded-xl bg-violet-50 hover:bg-violet-100/80 border border-violet-200 text-violet-800 font-medium text-xs transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-violet-600" />
              <span>Explore as Demo Student (Alex Chen)</span>
            </div>
            <ArrowRight className="w-3.5 h-3.5 text-violet-600" />
          </button>

          {/* Privacy and Security badges */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-500">
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Private Firestore Storage</span>
            </div>
            <span>•</span>
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Gemini Flash Intelligence</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
