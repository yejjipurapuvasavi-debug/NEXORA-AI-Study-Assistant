import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  fbSignOut,
  onAuthStateChanged,
  FirebaseUser,
} from '../lib/firebase';
import { StudentProfile } from '../types';
import { syncUserProfile } from '../services/firestoreService';

interface AuthContextType {
  user: StudentProfile | null;
  loading: boolean;
  authError: string | null;
  signInWithGoogle: () => Promise<void>;
  signInDemoStudent: (customName?: string) => void;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USER_STORAGE_KEY = 'nexora_demo_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check if a demo session was active
    const savedDemo = localStorage.getItem(DEMO_USER_STORAGE_KEY);
    if (savedDemo) {
      try {
        const parsed = JSON.parse(savedDemo);
        setUser(parsed);
        setLoading(false);
      } catch (e) {
        console.error('Error restoring demo session', e);
      }
    }

    // Listen to Firebase Auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const profile: StudentProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || 'College Student',
          photoURL: firebaseUser.photoURL,
          isDemoUser: false,
          lastLoginAt: new Date().toISOString(),
        };
        setUser(profile);
        localStorage.removeItem(DEMO_USER_STORAGE_KEY);
        await syncUserProfile(profile);
      } else {
        // If not a demo user, clear user
        const activeDemo = localStorage.getItem(DEMO_USER_STORAGE_KEY);
        if (!activeDemo) {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        const profile: StudentProfile = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName || 'Student Scholar',
          photoURL: result.user.photoURL,
          isDemoUser: false,
          lastLoginAt: new Date().toISOString(),
        };
        setUser(profile);
        localStorage.removeItem(DEMO_USER_STORAGE_KEY);
        await syncUserProfile(profile);
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Google Sign-In Error:', error);
      if (error?.code === 'auth/popup-blocked') {
        setAuthError('Browser popup was blocked. Please allow popups or use "Demo Student" to preview immediately.');
      } else if (error?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in window was closed. Please try again.');
      } else if (error?.code === 'auth/cancelled-popup-request') {
        // user clicked again
      } else {
        setAuthError(error?.message || 'Failed to sign in with Google. You can also sign in with Demo Student.');
      }
      throw err;
    }
  };

  const signInDemoStudent = (customName = 'Alex Mercer (CS Undergrad)') => {
    const demoProfile: StudentProfile = {
      uid: 'student_demo_user_nexora',
      email: 'alex.mercer@university.edu',
      displayName: customName,
      photoURL: null,
      isDemoUser: true,
      lastLoginAt: new Date().toISOString(),
    };
    setUser(demoProfile);
    localStorage.setItem(DEMO_USER_STORAGE_KEY, JSON.stringify(demoProfile));
    setAuthError(null);
  };

  const logout = async () => {
    try {
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      await fbSignOut(auth);
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
      setUser(null);
    }
  };

  const clearError = () => setAuthError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authError,
        signInWithGoogle,
        signInDemoStudent,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
