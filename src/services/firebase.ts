import { initializeApp } from 'firebase/app';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Firebase configuration for Beat Street
// Replace with your actual Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'beat-street-cjs',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://beat-street-cjs-default-rtdb.firebaseio.com',
};

export const app = initializeApp(firebaseConfig);

// Initialize Firestore with persistent local cache for offline support
// Uses multi-tab manager to allow persistence across multiple browser tabs
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});

export const auth = getAuth(app);

// Initialize Realtime Database for presence tracking
// RTDB is more cost-effective than Firestore for real-time presence:
// - Free tier: 100K simultaneous connections
// - Native onDisconnect() for automatic cleanup
// - Lower latency (~600ms vs 1500ms)
export const rtdb = getDatabase(app);

// Re-export getDatabase for consumers who need direct access
export { getDatabase };
