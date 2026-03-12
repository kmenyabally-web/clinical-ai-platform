import { collection, query, where, limit, getDocs } from "firebase/firestore";
import { db } from "../firebase";

const PLATFORM_ADMINS_COLLECTION = "platform_admins";

/**
 * Check whether the user is a platform administrator. Single query by userId.
 * @param {string} uid - Firebase Auth UID
 * @returns {Promise<boolean>}
 */
export async function isPlatformAdmin(uid) {
  if (!uid?.trim()) return false;
  const ref = collection(db, PLATFORM_ADMINS_COLLECTION);
  const q = query(ref, where("userId", "==", uid), limit(1));
  const snapshot = await getDocs(q);
  return !snapshot.empty;
}
