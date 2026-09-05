import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingView } from './components/LandingView';
import { DashboardView } from './components/DashboardView';
import { StudyModeView } from './components/StudyModeView';
import { AIChatView } from './components/AIChatView';
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { AuthModal } from './components/AuthModal';
import { StudySessionDetailModal } from './components/StudySessionDetailModal';
import { ActiveTab, StudySession } from './types';
import { Sparkles, GraduationCap, ShieldCheck } from 'lucide-react';

function AppContent() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('landing');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [studyModeInitialTopic, setStudyModeInitialTopic] = useState<string>('');
  const [modalSession, setModalSession] = useState<StudySession | null>(null);

  // If user signs in and is on landing page, seamlessly navigate to dashboard
  React.useEffect(() => {
    if (user && activeTab === 'landing') {
      setActiveTab('dashboard');
    }
  }, [user]);

  const handleLaunchTopic = (topic: string) => {
    setStudyModeInitialTopic(topic);
    setActiveTab('studymode');
  };

  const handleOpenSessionModal = (session: StudySession) => {
    setModalSession(session);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans selection:bg-violet-100 selection:text-violet-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenAuth={() => setAuthModalOpen(true)}
      />

      <main className="flex-1">
        {activeTab === 'landing' && (
          <LandingView
            onStartStudying={() => {
              if (user) {
                setActiveTab('studymode');
              } else {
                setAuthModalOpen(true);
              }
            }}
            onOpenAuth={() => setAuthModalOpen(true)}
            setActiveTab={setActiveTab}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardView
            setActiveTab={setActiveTab}
            onLaunchTopic={handleLaunchTopic}
            onOpenSession={handleOpenSessionModal}
          />
        )}

        {activeTab === 'studymode' && (
          <StudyModeView
            initialTopic={studyModeInitialTopic}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'chat' && (
          <AIChatView onOpenAuth={() => setAuthModalOpen(true)} />
        )}

        {activeTab === 'history' && (
          <HistoryView
            setActiveTab={setActiveTab}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}

        {activeTab === 'profile' && (
          <ProfileView
            setActiveTab={setActiveTab}
            onOpenAuth={() => setAuthModalOpen(true)}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-8 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-linear-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-800">Nexora AI Study Assistant</span>
            <span>• College CS & Engineering Platform</span>
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1 text-slate-600">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Private Cloud Firestore Storage
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-600">
              <Sparkles className="w-3.5 h-3.5 text-violet-600" />
              Gemini Flash Intelligence
            </span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={() => setActiveTab('dashboard')}
      />

      <StudySessionDetailModal
        session={modalSession}
        onClose={() => setModalSession(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
