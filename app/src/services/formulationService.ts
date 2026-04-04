/**
 * Psychology formulations — collection `formulations`.
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
import type { Formulation } from "../models/formulationModel";

export const FORMULATIONS_COLLECTION = "formulations";

export type AddFormulationInput = {
  patientId: string;
  organisationId: string;
  presentingProblems: string;
  predisposingFactors: string;
  precipitatingFactors: string;
  perpetuatingFactors: string;
  protectiveFactors: string;
  triggers: string;
  copingStrategies: string;
  strengths: string;
  riskFormulation: string;
};

function mapFormulationDoc(d: QueryDocumentSnapshot): Formulation {
  const x = d.data() ?? {};
  return {
    id: d.id,
    patientId: typeof x.patientId === "string" ? x.patientId : "",
    organisationId: typeof x.organisationId === "string" ? x.organisationId : "",
    presentingProblems: typeof x.presentingProblems === "string" ? x.presentingProblems : "",
    predisposingFactors: typeof x.predisposingFactors === "string" ? x.predisposingFactors : "",
    precipitatingFactors: typeof x.precipitatingFactors === "string" ? x.precipitatingFactors : "",
    perpetuatingFactors: typeof x.perpetuatingFactors === "string" ? x.perpetuatingFactors : "",
    protectiveFactors: typeof x.protectiveFactors === "string" ? x.protectiveFactors : "",
    triggers: typeof x.triggers === "string" ? x.triggers : "",
    copingStrategies: typeof x.copingStrategies === "string" ? x.copingStrategies : "",
    strengths: typeof x.strengths === "string" ? x.strengths : "",
    riskFormulation: typeof x.riskFormulation === "string" ? x.riskFormulation : "",
    createdBy: typeof x.createdBy === "string" ? x.createdBy : "",
    createdAt: x.createdAt ?? null,
  };
}

export async function addFormulation(data: AddFormulationInput): Promise<{ id: string }> {
  const patientId = (data.patientId ?? "").toString().trim();
  const organisationId = (data.organisationId ?? "").toString().trim();
  if (!patientId || !organisationId) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ctx = await getUserContext();
  assertSameOrganisationData(organisationId, ctx.organisationId);

  const uid = auth.currentUser?.uid ?? "";
  if (!uid) throw new Error(GENERIC_USER_ERROR_MESSAGE);

  const ref = await addDoc(collection(db, FORMULATIONS_COLLECTION), {
    patientId,
    organisationId,
    presentingProblems: (data.presentingProblems ?? "").toString(),
    predisposingFactors: (data.predisposingFactors ?? "").toString(),
    precipitatingFactors: (data.precipitatingFactors ?? "").toString(),
    perpetuatingFactors: (data.perpetuatingFactors ?? "").toString(),
    protectiveFactors: (data.protectiveFactors ?? "").toString(),
    triggers: (data.triggers ?? "").toString(),
    copingStrategies: (data.copingStrategies ?? "").toString(),
    strengths: (data.strengths ?? "").toString(),
    riskFormulation: (data.riskFormulation ?? "").toString(),
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return { id: ref.id };
}

/** Latest formulation for the patient in the current organisation (or null). */
export async function getLatestFormulationForPatient(patientId: string): Promise<Formulation | null> {
  const pid = (patientId ?? "").toString().trim();
  if (!pid) return null;

  const { organisationId } = await getUserContext();
  if (!organisationId) return null;

  const q = query(
    collection(db, FORMULATIONS_COLLECTION),
    where("organisationId", "==", organisationId),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(1)
  );

  const snap = await getDocs(q);
  const doc = snap.docs?.[0];
  return doc ? mapFormulationDoc(doc) : null;
}
