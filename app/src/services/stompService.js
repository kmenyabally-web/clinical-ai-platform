import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { getUserContext } from "./authService";
import { logAuditEvent } from "./auditService";

const PATIENTS_COLLECTION = "patients";

function requireValue(v, label) {
  const x = String(v ?? "").trim();
  if (!x) throw new Error(`${label} is required`);
  return x;
}

function ensureSameOrganisation(patientOrgId, contextOrgId) {
  if (!patientOrgId || !contextOrgId || String(patientOrgId).trim() !== String(contextOrgId).trim()) {
    throw new Error("403 Forbidden: organisation scope mismatch");
  }
}

function normalizeMedication(data) {
  return {
    name: String(data?.name ?? "").trim(),
    indication: requireValue(data?.indication, "indication"),
    startDate: data?.startDate ?? null,
    reviewDate: requireValue(data?.reviewDate, "reviewDate"),
    hasReductionPlan: data?.hasReductionPlan === true,
    lastReviewedAt: data?.lastReviewedAt ?? null,
  };
}

async function loadPatientForStomp(patientId, context) {
  const id = String(patientId ?? "").trim();
  if (!id) throw new Error("patientId is required");
  const ctx = context ?? (await getUserContext());
  if (!ctx?.organisationId) throw new Error("organisationId missing from context");
  const ref = doc(db, PATIENTS_COLLECTION, id);
  const snap = await getDoc(ref);
  if (!snap?.exists?.()) throw new Error("Patient not found");
  const patient = snap.data?.() ?? {};
  ensureSameOrganisation(patient.organisationId, ctx.organisationId);
  return { id, ref, patient, ctx };
}

export async function addMedication(patientId, data, context) {
  const { id, ref, patient, ctx } = await loadPatientForStomp(patientId, context);
  const medications = Array.isArray(patient.medications) ? [...patient.medications] : [];
  const nextMedication = normalizeMedication(data);
  medications.push(nextMedication);
  await updateDoc(ref, {
    stompMonitoring: patient.stompMonitoring === true ? true : true,
    medications,
    updatedAt: serverTimestamp(),
  });
  await logAuditEvent("STOMP_MEDICATION_ADD", {
    organisationId: ctx.organisationId,
    patientId: id,
    medicationName: nextMedication.name,
  });
}

export async function updateMedication(patientId, medicationIndex, updates, context) {
  const { id, ref, patient, ctx } = await loadPatientForStomp(patientId, context);
  const index = Number(medicationIndex);
  const medications = Array.isArray(patient.medications) ? [...patient.medications] : [];
  if (!Number.isInteger(index) || index < 0 || index >= medications.length) {
    throw new Error("Invalid medication index");
  }
  const merged = {
    ...(medications[index] ?? {}),
    ...(updates ?? {}),
  };
  medications[index] = normalizeMedication(merged);
  await updateDoc(ref, {
    medications,
    updatedAt: serverTimestamp(),
  });
  await logAuditEvent("STOMP_MEDICATION_UPDATE", {
    organisationId: ctx.organisationId,
    patientId: id,
    medicationIndex: index,
  });
}

export async function removeMedication(patientId, medicationIndex, context) {
  const { id, ref, patient, ctx } = await loadPatientForStomp(patientId, context);
  const index = Number(medicationIndex);
  const medications = Array.isArray(patient.medications) ? [...patient.medications] : [];
  if (!Number.isInteger(index) || index < 0 || index >= medications.length) {
    throw new Error("Invalid medication index");
  }
  medications.splice(index, 1);
  await updateDoc(ref, {
    medications,
    updatedAt: serverTimestamp(),
  });
  await logAuditEvent("STOMP_MEDICATION_REMOVE", {
    organisationId: ctx.organisationId,
    patientId: id,
    medicationIndex: index,
  });
}
