/**
 * TypeScript entry re-export for Firebase (see firebase.js for implementation).
 * Ensures: getFirestore(app) → db
 */
export { auth, db, storage, functions, default } from "./firebase.js";
