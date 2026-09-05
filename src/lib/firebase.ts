import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDocFromServer,
  Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Firestore with specific databaseId if provided
export const db: Firestore =
  firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== '(default)'
    ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
    : getFirestore(app);

// Connection test helper recommended by Firebase skill
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (err: unknown) {
    const error = err as Error;
    // Client offline or permission error
    if (error?.message?.includes('client is offline')) {
      console.warn('Firestore is running in offline mode or network is unreachable.');
      return false;
    }
    // Document does not exist or normal permission response is still a successful connection
    return true;
  }
}

// Initial connection check
testFirestoreConnection().catch((err) => {
  console.info('Initial Firestore connection check notice:', err?.message || err);
});

export { fbSignOut, signInWithPopup, onAuthStateChanged };
export type { FirebaseUser };
