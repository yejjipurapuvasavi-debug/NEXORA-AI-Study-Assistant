import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { StudySession, SavedChat, StudentProfile } from '../types';

// Fallback local storage keys for offline/demo students
const LOCAL_SESSIONS_PREFIX = 'nexora_sessions_';
const LOCAL_CHATS_PREFIX = 'nexora_chats_';

/**
 * Save or update student profile in Firestore
 */
export async function syncUserProfile(profile: StudentProfile): Promise<void> {
  if (!profile.uid) return;
  try {
    const userRef = doc(db, 'users', profile.uid);
    await setDoc(
      userRef,
      {
        uid: profile.uid,
        email: profile.email || '',
        displayName: profile.displayName || 'Student',
        photoURL: profile.photoURL || '',
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Could not sync user profile to Firestore, continuing locally:', error);
  }
}

/**
 * Save a new study session
 */
export async function saveStudySessionToFirestore(
  userId: string,
  session: StudySession
): Promise<void> {
  if (!userId) return;

  // Always back up locally first
  try {
    const localKey = `${LOCAL_SESSIONS_PREFIX}${userId}`;
    const existing: StudySession[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter((s) => s.id !== session.id);
    localStorage.setItem(localKey, JSON.stringify([session, ...filtered]));
  } catch (e) {
    console.error('Local backup failed', e);
  }

  // Persist to Cloud Firestore under /users/{userId}/sessions/{sessionId}
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', session.id);
    await setDoc(sessionRef, {
      ...session,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Firestore session save notice:', error);
  }
}

/**
 * Get all study sessions for a user
 */
export async function getStudySessionsFromFirestore(userId: string): Promise<StudySession[]> {
  if (!userId) return [];

  let sessions: StudySession[] = [];

  // Try fetching from Cloud Firestore
  try {
    const sessionsCol = collection(db, 'users', userId, 'sessions');
    const snapshot = await getDocs(sessionsCol);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as StudySession;
      sessions.push({
        ...data,
        id: docSnap.id,
      });
    });
  } catch (error) {
    console.warn('Firestore session fetch fallback to local cache:', error);
  }

  // If firestore returned results, update local cache
  const localKey = `${LOCAL_SESSIONS_PREFIX}${userId}`;
  if (sessions.length > 0) {
    try {
      localStorage.setItem(localKey, JSON.stringify(sessions));
    } catch (e) {
      console.warn('Could not update local storage cache:', e);
    }
  } else {
    // Check local fallback
    try {
      const local = localStorage.getItem(localKey);
      if (local) {
        sessions = JSON.parse(local);
      }
    } catch (e) {
      console.warn('Local session parse error:', e);
    }
  }

  // Sort by createdAt descending
  return sessions.sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Update quiz score in a study session
 */
export async function updateQuizScore(
  userId: string,
  sessionId: string,
  score: number,
  userAnswers: number[]
): Promise<void> {
  if (!userId || !sessionId) return;

  // Local update
  try {
    const localKey = `${LOCAL_SESSIONS_PREFIX}${userId}`;
    const existing: StudySession[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const updated = existing.map((s) =>
      s.id === sessionId ? { ...s, quizScore: score, userAnswers, quizCompleted: true } : s
    );
    localStorage.setItem(localKey, JSON.stringify(updated));
  } catch (e) {
    console.warn('Local score update error:', e);
  }

  // Firestore update
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await updateDoc(sessionRef, {
      quizScore: score,
      userAnswers: userAnswers,
      quizCompleted: true,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Firestore score update notice:', error);
  }
}

/**
 * Delete a study session
 */
export async function deleteStudySessionFromFirestore(
  userId: string,
  sessionId: string
): Promise<void> {
  if (!userId || !sessionId) return;

  // Local delete
  try {
    const localKey = `${LOCAL_SESSIONS_PREFIX}${userId}`;
    const existing: StudySession[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter((s) => s.id !== sessionId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Local delete error:', e);
  }

  // Firestore delete
  try {
    const sessionRef = doc(db, 'users', userId, 'sessions', sessionId);
    await deleteDoc(sessionRef);
  } catch (error) {
    console.warn('Firestore delete notice:', error);
  }
}

/**
 * Save chat conversation thread
 */
export async function saveChatToFirestore(userId: string, chat: SavedChat): Promise<void> {
  if (!userId) return;

  // Local backup
  try {
    const localKey = `${LOCAL_CHATS_PREFIX}${userId}`;
    const existing: SavedChat[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter((c) => c.id !== chat.id);
    localStorage.setItem(localKey, JSON.stringify([chat, ...filtered]));
  } catch (e) {
    console.warn('Local chat backup notice:', e);
  }

  // Firestore save
  try {
    const chatRef = doc(db, 'users', userId, 'chats', chat.id);
    await setDoc(chatRef, {
      ...chat,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Firestore chat save notice:', error);
  }
}

/**
 * Get all saved chats for user
 */
export async function getChatsFromFirestore(userId: string): Promise<SavedChat[]> {
  if (!userId) return [];

  let chats: SavedChat[] = [];

  try {
    const chatsCol = collection(db, 'users', userId, 'chats');
    const snapshot = await getDocs(chatsCol);
    snapshot.forEach((docSnap) => {
      const data = docSnap.data() as SavedChat;
      chats.push({
        ...data,
        id: docSnap.id,
      });
    });
  } catch (error) {
    console.warn('Firestore chat fetch notice:', error);
  }

  const localKey = `${LOCAL_CHATS_PREFIX}${userId}`;
  if (chats.length > 0) {
    try {
      localStorage.setItem(localKey, JSON.stringify(chats));
    } catch (e) {
      console.warn('Could not cache chats:', e);
    }
  } else {
    try {
      const local = localStorage.getItem(localKey);
      if (local) {
        chats = JSON.parse(local);
      }
    } catch (e) {
      console.warn('Local chats parse error:', e);
    }
  }

  return chats.sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
}

/**
 * Delete a chat conversation
 */
export async function deleteChatFromFirestore(userId: string, chatId: string): Promise<void> {
  if (!userId || !chatId) return;

  try {
    const localKey = `${LOCAL_CHATS_PREFIX}${userId}`;
    const existing: SavedChat[] = JSON.parse(localStorage.getItem(localKey) || '[]');
    const filtered = existing.filter((c) => c.id !== chatId);
    localStorage.setItem(localKey, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Local chat delete error:', e);
  }

  try {
    const chatRef = doc(db, 'users', userId, 'chats', chatId);
    await deleteDoc(chatRef);
  } catch (error) {
    console.warn('Firestore delete chat error:', error);
  }
}
