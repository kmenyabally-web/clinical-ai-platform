import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Organisations belonging to an enterprise group (tenant isolation: same groupId only).
 * @param {string} groupId
 * @returns {Promise<Array<{ id: string } & Record<string, unknown>>>}
 */
export async function getGroupOrganisations(groupId) {
  const gid = String(groupId ?? "").trim();
  if (!gid) return [];

  const q = query(collection(db, "organisations"), where("groupId", "==", gid));
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => ({
    id: d.id,
    ...(d.data() ?? {}),
  }));
}
