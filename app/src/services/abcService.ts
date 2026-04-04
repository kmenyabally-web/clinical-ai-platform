/**
 * ABC behaviour logs — collection `abc_logs`.
 */

import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  where,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { getUserContext } from "./authService";
import { assertSameOrganisationData, GENERIC_USER_ERROR_MESSAGE } from "../utils/tenantContext";
import type { ABCEntry } from "../models/abcModel";

export const ABC_LOGS_COLLECTION = "abc_logs";

export type AddABCEntryInput = {
  patientId: string;
  organisationId: string;
  antecedent: string;
  behaviour: string;
  consequence: string;
  severity: "low" | "medium" | "high";
  staff: string;
};

function mapAbcDoc(d: QueryDocumentSnapshot): ABCEntry {
  const x = d.data() ?? {};
  const sev = String(x.severity ?? "low").toLowerCase();
  const severity =
    sev === "high" || sev === "medium" || sev === "low" ? sev : "low";
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    antecedent: typeof x.antecedent === "string" ? x.antecedent : "",
    behaviour: typeof x.behaviour === "string" ? x.behaviour : "",
    consequence: typeof x.consequence === "string" ? x.consequence : "",
    severity,
    staff: typeof x.staff === "string" ? x.staff : "",
    createdAt: x.createdAt ?? null,
  };
}

export async function addABCEntry(data: AddABCEntryInput): Promise<{ id: string }> {
  const patientId = (data.patientId ?? "").toString().trim();
  const organisationId = (data.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);

  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const antecedent = (data.antecedent ?? "").toString().trim();
  const behaviour = (data.behaviour ?? "").toString().trim();
  const consequence = (data.consequence ?? "").toString().trim();
  const staff = (data.staff ?? "").toString().trim() || uid;
  const rawSev = (data.severity ?? "low").toString().trim().toLowerCase();
  const severity: "low" | "medium" | "high" =
    rawSev === "high" || rawSev === "medium" ? rawSev : "low";

  if (!antecedent || !behaviour || !consequence) {
    throw new Error("Antecedent, behaviour, and consequence are required.");
  }

  const ref = await addDoc(collection(db, ABC_LOGS_COLLECTION), {
    patientId,
    organisationId,
    antecedent,
    behaviour,
    consequence,
    severity,
    staff,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

/** Alias for CPA aggregator naming. */
export async function getABCLogsForPatient(
  patientId: string,
  { limitCount = 50 } = {}
): Promise<ABCEntry[]> {
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return [];

  const { organisationId } = await getUserContext();
  if (!organisationId) return [];

  const cap = Math.min(200, Math.max(10, limitCount));

  const q = query(
    collection(db, ABC_LOGS_COLLECTION),
    where("organisationId", "==", organisationId),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(cap)
  );

  const snap = await getDocs(q);
  return (snap.docs ?? []).map((doc) => mapAbcDoc(doc));
}
