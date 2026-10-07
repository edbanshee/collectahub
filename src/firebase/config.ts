import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

let appInstance;
try {
  appInstance = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
} catch (e) {
  console.warn('Firebase initializeApp fallback:', e);
  appInstance = getApps()[0] || initializeApp(firebaseConfig);
}

export const app = appInstance;
export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Configure Firestore with graceful fallback if IndexedDB is blocked (e.g. private browsing)
let dbInstance: Firestore;
try {
  const customDbId = (firebaseConfig as any).firestoreDatabaseId;
  const dbOptions = {
    ignoreUndefinedProperties: true,
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  };

  if (customDbId && customDbId !== '(default)') {
    dbInstance = initializeFirestore(app, dbOptions, customDbId);
  } else {
    dbInstance = initializeFirestore(app, dbOptions);
  }
} catch (error) {
  console.warn('Firestore persistent cache initialization fallback:', error);
  try {
    const customDbId = (firebaseConfig as any).firestoreDatabaseId;
    if (customDbId && customDbId !== '(default)') {
      dbInstance = getFirestore(app, customDbId);
    } else {
      dbInstance = getFirestore(app);
    }
  } catch (innerError) {
    console.error('Fatal Firestore instance creation:', innerError);
    dbInstance = getFirestore(app);
  }
}

export const db: Firestore = dbInstance;

// Test connection in background without blocking boot
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client offline status:', error.message);
    }
  }
}
setTimeout(() => {
  testFirestoreConnection();
}, 100);
