import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const env = import.meta.env;
const isProd = env.VITE_APP_ENV === "production";

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? (isProd ? "" : "AIzaSyDFzCwXvNYImS9T7ThmahoPK3GNNN2tJCM"),
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? (isProd ? "" : "cqc-ready-platform-dev.firebaseapp.com"),
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? (isProd ? "" : "cqc-ready-platform-dev"),
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? (isProd ? "" : "cqc-ready-platform-dev.firebasestorage.app"),
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? (isProd ? "" : "1091963644813"),
  appId: env.VITE_FIREBASE_APP_ID ?? (isProd ? "" : "1:1091963644813:web:a1f5cbe28bc09578cf2bc4"),
};

if (isProd && !firebaseConfig.apiKey) {
  throw new Error("Missing Firebase config in production. Set VITE_FIREBASE_* env vars.");
}

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;