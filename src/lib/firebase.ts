import { initializeApp, getApps } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// initializeFirestore throws if called twice (HMR in dev).
// The try/catch falls back to getFirestore which returns the already-initialized instance.
function createDb() {
  try {
    return initializeFirestore(app, {
      // Falls back to HTTP long-polling when WebSocket/WebChannel is unstable.
      // Eliminates "WebChannelConnection RPC transport errored" console errors.
      experimentalForceLongPolling: true,
    });
  } catch {
    return getFirestore(app);
  }
}

export const db      = createDb();
export const storage = getStorage(app);
export const auth    = getAuth(app);

export async function ensureAuth() {
  if (!auth.currentUser) {
    await signInAnonymously(auth);
  }
}

export default app;
