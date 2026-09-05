import React, { useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  MessageSquareCode,
  History,
  User,
  LogOut,
  Menu,
  X,
  LogIn,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ActiveTab } from '../types';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenAuth }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: Layers },
    { id: 'studymode' as ActiveTab, label: 'Study Mode', icon: BookOpen },
    { id: 'chat' as ActiveTab, label: 'AI Q&A Chat', icon: MessageSquareCode },
    { id: 'history' as ActiveTab, label: 'History', icon: History },
    { id: 'profile' as ActiveTab, label: 'Profile', icon: User },
  ];

  const handleNavClick = (tab: ActiveTab) => {
    setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/90 border-b border-violet-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div
          id="nexora-brand-logo"
          onClick={() => setActiveTab(user ? 'dashboard' : 'landing')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-linear-to-br from-violet-600 via-indigo-600 to-blue-600 flex items-center justify-center text-white shadow-md shadow-violet-500/20 group-hover:scale-105 transition-transform duration-200">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg text-slate-900 tracking-tight">Nexora</span>
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold bg-violet-100 text-violet-700 rounded-full border border-violet-200/60">
                <Sparkles className="w-2.5 h-2.5 text-violet-600" />
                AI
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500 -mt-1 hidden sm:block">Study Assistant</span>
          </div>
        </div>

        {/* Desktop Navigation */}
        {user ? (
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/70">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-link-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-sm font-medium rounded-lg transition-all duration-150 ${
                    isActive
                      ? 'bg-white text-violet-700 shadow-xs border border-violet-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        ) : (
          <nav className="hidden md:flex items-center gap-6">
            <button
              onClick={() => setActiveTab('landing')}
              className={`text-sm font-medium transition-colors ${
                activeTab === 'landing' ? 'text-violet-700 font-semibold' : 'text-slate-600 hover:text-violet-600'
              }`}
            >
              Overview
            </button>
            <button
              onClick={onOpenAuth}
              className="text-sm font-medium text-slate-600 hover:text-violet-600 transition-colors"
            >
              Curriculum Topics
            </button>
          </nav>
        )}

        {/* Right actions (User state / Sign in button) */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <button
                id="header-profile-btn"
                onClick={() => setActiveTab('profile')}
                className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-violet-50 transition-colors border border-transparent hover:border-violet-100"
              >
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Avatar'}
                    className="w-8 h-8 rounded-lg object-cover ring-2 ring-violet-200"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-linear-to-br from-violet-500 to-indigo-600 text-white font-semibold text-xs flex items-center justify-center shadow-xs">
                    {(user.displayName || user.email || 'S')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:flex flex-col text-left">
                  <span className="text-xs font-semibold text-slate-800 leading-tight max-w-[120px] truncate">
                    {user.displayName || 'Student'}
                  </span>
                  <span className="text-[10px] text-violet-600 font-medium">
                    {user.isDemoUser ? 'Demo Student' : 'Google Scholar'}
                  </span>
                </div>
              </button>

              <button
                id="header-logout-btn"
                onClick={() => logout()}
                title="Sign out"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              id="header-login-btn"
              onClick={onOpenAuth}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-linear-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl shadow-sm shadow-violet-500/25 transition-all duration-150 hover:shadow-md hover:scale-[1.02]"
            >
              <LogIn className="w-4 h-4" />
              <span>Student Sign In</span>
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            id="mobile-menu-toggle"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-4 border-t border-slate-200/80 bg-white shadow-lg space-y-1 animate-in fade-in slide-in-from-top-2">
          {user ? (
            <>
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-violet-50 text-violet-700 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isActive ? 'text-violet-600' : 'text-slate-400'}`} />
                    {item.label}
                  </button>
                );
              })}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50 rounded-lg"
                >
                  <LogOut className="w-5 h-5 text-rose-500" />
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setActiveTab('landing');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg"
              >
                Overview
              </button>
              <button
                onClick={() => {
                  onOpenAuth();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-violet-600 text-white rounded-lg font-medium text-sm shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                Student Sign In
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
