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
        // Sync in background so auth state completion is not blocked by Firestore writes
        syncUserProfile(profile).catch((e) =>
          console.warn('Background Firestore profile sync:', e)
        );
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

    // If already authenticated, update state immediately
    if (auth.currentUser) {
      const existingUser = auth.currentUser;
      const profile: StudentProfile = {
        uid: existingUser.uid,
        email: existingUser.email,
        displayName: existingUser.displayName || 'Student Scholar',
        photoURL: existingUser.photoURL,
        isDemoUser: false,
        lastLoginAt: new Date().toISOString(),
      };
      setUser(profile);
      localStorage.removeItem(DEMO_USER_STORAGE_KEY);
      syncUserProfile(profile).catch((e) =>
        console.warn('Background Firestore profile sync:', e)
      );
      return;
    }

    try {
      // Safety timeout (45s) to guarantee signInWithPopup never hangs indefinitely
      // if popup was closed or cross-origin messaging was blocked
      const popupTimeout = new Promise<never>((_, reject) => {
        const timer = setTimeout(() => {
          const timeoutErr = new Error(
            'Google Sign-In popup timed out. If the popup was closed or blocked by Chrome privacy settings, please try again or use Demo Student.'
          );
          (timeoutErr as unknown as { code: string }).code = 'auth/timeout';
          reject(timeoutErr);
        }, 45000);

        // Cancel timeout if onAuthStateChanged fires before timeout
        const unsub = onAuthStateChanged(auth, (u) => {
          if (u) {
            clearTimeout(timer);
            unsub();
          }
        });
      });

      const result = await Promise.race([
        signInWithPopup(auth, googleProvider),
        popupTimeout,
      ]);

      if (result && result.user) {
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
        // Non-blocking sync to ensure modal and auth completion never stalls
        syncUserProfile(profile).catch((e) =>
          console.warn('Background Firestore profile sync:', e)
        );
      }
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      console.error('Google Sign-In Error:', error);

      if (error?.code === 'auth/popup-blocked') {
        setAuthError('Browser blocked the sign-in pop-up. Please allow popups in Chrome or use "Demo Student" to preview immediately.');
      } else if (error?.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in popup was closed before completing. Please click "Continue with Google" again.');
      } else if (error?.code === 'auth/cancelled-popup-request') {
        setAuthError('Previous sign-in request was refreshed. Please click "Continue with Google" to proceed.');
      } else if (error?.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized in your Firebase Authentication settings.');
      } else if (error?.code === 'auth/timeout') {
        setAuthError(error.message || 'Google Sign-In timed out. Please try again or use Demo Student.');
      } else if (error?.code === 'auth/network-request-failed') {
        setAuthError('Network error connecting to Firebase Authentication. Please check your internet connection.');
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
