import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase";
import { getPatientById } from "./patientService";
import { assertWardTenantContext } from "../utils/tenantContext";
import { logEnterpriseAudit } from "./auditService";
import { listCapacityAssessmentsForPatient } from "./capacityAssessmentService";

export const LIBERTY_SAFEGUARDS_COLLECTION = "libertySafeguards";
export const LIBERTY_SAFEGUARD_TYPES = Object.freeze(["DoLS", "LPS"]);
export const LIBERTY_SAFEGUARD_STATUSES = Object.freeze([
  "pending",
  "applied",
  "authorised",
  "expired",
  "rejected",
]);
export const LIBERTY_SAFEGUARD_TRANSITIONS = Object.freeze({
  pending: ["applied", "rejected"],
  applied: ["authorised", "rejected"],
  authorised: ["expired"],
  expired: [],
  rejected: [],
});

function normalizeType(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === "dols") return "DoLS";
  if (raw === "lps") return "LPS";
  return "";
}

function normalizeStatus(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  return LIBERTY_SAFEGUARD_STATUSES.includes(raw) ? raw : "pending";
}

function canTransitionStatus(fromStatus, toStatus) {
  const from = normalizeStatus(fromStatus);
  const to = normalizeStatus(toStatus);
  if (from === to) return true;
  const allowed = LIBERTY_SAFEGUARD_TRANSITIONS[from] ?? [];
  return allowed.includes(to);
}

function normalizeString(value) {
  return String(value ?? "").trim();
}

function normalizeStringList(value) {
  if (Array.isArray(value)) {
    return value.map((x) => String(x ?? "").trim()).filter(Boolean);
  }
  const single = String(value ?? "").trim();
  return single ? [single] : [];
}

function toDateOrNull(value) {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? null : text;
}

function snapshotFromDoc(d) {
  const row = d?.data?.() ?? {};
  return {
    id: d?.id ?? "",
    organisationId: normalizeString(row?.organisationId),
    hospitalId: normalizeString(row?.hospitalId),
    wardId: normalizeString(row?.wardId),
    patientId: normalizeString(row?.patientId),
    type: normalizeType(row?.type),
    status: normalizeStatus(row?.status),
    reasonForDeprivation: normalizeString(row?.reasonForDeprivation),
    restrictions: normalizeStringList(row?.restrictions),
    applicationDate: toDateOrNull(row?.applicationDate),
    authorisationDate: toDateOrNull(row?.authorisationDate),
    expiryDate: toDateOrNull(row?.expiryDate),
    supervisoryBody: normalizeString(row?.supervisoryBody),
    conditions: normalizeStringList(row?.conditions),
    createdAt: row?.createdAt ?? null,
    updatedAt: row?.updatedAt ?? null,
  };
}

export async function createLibertySafeguard(payload) {
  const organisationId = normalizeString(payload?.organisationId);
  const patientId = normalizeString(payload?.patientId);
  const type = normalizeType(payload?.type);
  if (!organisationId) throw new Error("organisationId is required");
  if (!patientId) throw new Error("patientId is required");
  if (!type) throw new Error("type must be DoLS or LPS");
  if (type === "DoLS") {
    const eligibility = await getDolsWorkflowEligibility(organisationId, patientId);
    if (!eligibility.allowed) {
      throw new Error("DoLS workflow requires a residence capacity assessment with lacks capacity outcome.");
    }
  }

  const patient = await getPatientById(patientId);
  const hospitalId = normalizeString(patient?.hospitalId);
  const wardId = normalizeString(patient?.wardId);
  assertWardTenantContext(organisationId, hospitalId, wardId);

  const docPayload = {
    organisationId,
    hospitalId,
    wardId,
    patientId,
    type,
    status: normalizeStatus(payload?.status),
    reasonForDeprivation: normalizeString(payload?.reasonForDeprivation),
    restrictions: normalizeStringList(payload?.restrictions),
    applicationDate: toDateOrNull(payload?.applicationDate),
    authorisationDate: toDateOrNull(payload?.authorisationDate),
    expiryDate: toDateOrNull(payload?.expiryDate),
    supervisoryBody: normalizeString(payload?.supervisoryBody),
    conditions: normalizeStringList(payload?.conditions),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, LIBERTY_SAFEGUARDS_COLLECTION), docPayload);
  void logEnterpriseAudit({
    action: "LIBERTY_SAFEGUARD_CREATED",
    entityId: ref.id,
    organisationId,
    hospitalId,
    wardId,
    patientId,
    metadata: {
      safeguardId: ref.id,
      type,
      status: docPayload.status,
    },
  });
  return { id: ref.id, ...docPayload };
}

export async function getDolsWorkflowEligibility(organisationId, patientId) {
  const org = normalizeString(organisationId);
  const pid = normalizeString(patientId);
  if (!org || !pid) return { allowed: false, reason: "Missing organisation or patient." };
  const rows = await listCapacityAssessmentsForPatient(org, pid, { limitCount: 120 }).catch(() => []);
  const latestResidence = (Array.isArray(rows) ? rows : []).find((row) => {
    const decisionType = String(row?.decisionType ?? "").trim().toLowerCase();
    const status = String(row?.status ?? "completed").trim().toLowerCase();
    return decisionType === "residence" && status !== "pending";
  });
  if (!latestResidence) {
    return { allowed: false, reason: "No completed residence capacity assessment recorded." };
  }
  if (latestResidence?.lacksCapacity !== true) {
    return { allowed: false, reason: "Residence decision does not currently indicate lacks capacity." };
  }
  return { allowed: true, reason: "", assessmentId: String(latestResidence?.id ?? "").trim() || null };
}

export async function getLibertySafeguardWorkflowEligibility(organisationId, patientId) {
  return getDolsWorkflowEligibility(organisationId, patientId);
}

export async function updateLibertySafeguard(id, payload) {
  const safeguardId = normalizeString(id);
  if (!safeguardId) throw new Error("id is required");
  const ref = doc(db, LIBERTY_SAFEGUARDS_COLLECTION, safeguardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Liberty safeguard record not found.");
  const current = snapshotFromDoc(snap);

  const patch = {
    updatedAt: serverTimestamp(),
  };
  if (payload?.type !== undefined) {
    const type = normalizeType(payload?.type);
    if (!type) throw new Error("type must be DoLS or LPS");
    patch.type = type;
  }
  if (payload?.status !== undefined) {
    const nextStatus = normalizeStatus(payload?.status);
    if (!canTransitionStatus(current.status, nextStatus)) {
      throw new Error(`Invalid status transition: ${current.status} -> ${nextStatus}`);
    }
    patch.status = nextStatus;
  }
  if (payload?.reasonForDeprivation !== undefined) patch.reasonForDeprivation = normalizeString(payload?.reasonForDeprivation);
  if (payload?.restrictions !== undefined) patch.restrictions = normalizeStringList(payload?.restrictions);
  if (payload?.applicationDate !== undefined) patch.applicationDate = toDateOrNull(payload?.applicationDate);
  if (payload?.authorisationDate !== undefined) patch.authorisationDate = toDateOrNull(payload?.authorisationDate);
  if (payload?.expiryDate !== undefined) patch.expiryDate = toDateOrNull(payload?.expiryDate);
  if (payload?.supervisoryBody !== undefined) patch.supervisoryBody = normalizeString(payload?.supervisoryBody);
  if (payload?.conditions !== undefined) patch.conditions = normalizeStringList(payload?.conditions);

  await updateDoc(ref, patch);
  void logEnterpriseAudit({
    action: "LIBERTY_SAFEGUARD_UPDATED",
    entityId: safeguardId,
    organisationId: current.organisationId,
    hospitalId: current.hospitalId,
    wardId: current.wardId,
    patientId: current.patientId,
    metadata: {
      safeguardId,
      status: patch?.status ?? current.status,
    },
  });
  return { id: safeguardId, ...current, ...patch };
}

export async function transitionLibertySafeguardStatus(id, nextStatus) {
  return updateLibertySafeguard(id, { status: nextStatus });
}

export async function getLibertySafeguardById(organisationId, id) {
  const org = normalizeString(organisationId);
  const safeguardId = normalizeString(id);
  if (!org || !safeguardId) return null;
  const ref = doc(db, LIBERTY_SAFEGUARDS_COLLECTION, safeguardId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const row = snapshotFromDoc(snap);
  return row.organisationId === org ? row : null;
}

export async function listLibertySafeguardsForPatient(organisationId, patientId, { limitCount = 80 } = {}) {
  const org = normalizeString(organisationId);
  const pid = normalizeString(patientId);
  if (!org || !pid) return [];
  const lim = Math.max(1, Math.min(200, Number(limitCount) || 80));
  const q = query(
    collection(db, LIBERTY_SAFEGUARDS_COLLECTION),
    where("organisationId", "==", org),
    where("patientId", "==", pid),
    orderBy("createdAt", "desc"),
    limit(lim)
  );
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => snapshotFromDoc(d));
}

export async function listLibertySafeguardsForOrganisation(organisationId, { limitCount = 200 } = {}) {
  const org = normalizeString(organisationId);
  if (!org) return [];
  const lim = Math.max(1, Math.min(500, Number(limitCount) || 200));
  const q = query(
    collection(db, LIBERTY_SAFEGUARDS_COLLECTION),
    where("organisationId", "==", org),
    orderBy("createdAt", "desc"),
    limit(lim)
  );
  const snap = await getDocs(q);
  return (snap?.docs ?? []).map((d) => snapshotFromDoc(d));
}

export async function getLibertySafeguardsDashboardStats(organisationId) {
  const org = normalizeString(organisationId);
  if (!org) {
    return {
      activeSafeguards: 0,
      expiringNext30Days: 0,
      overdue: 0,
    };
  }
  const rows = await listLibertySafeguardsForOrganisation(org, { limitCount: 500 }).catch(() => []);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plus30 = new Date(today);
  plus30.setDate(plus30.getDate() + 30);

  let activeSafeguards = 0;
  let expiringNext30Days = 0;
  let overdue = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const status = normalizeStatus(row?.status);
    const expiry = toDateOrNull(row?.expiryDate);
    const expiryDate = expiry ? new Date(expiry) : null;
    if (status === "authorised") activeSafeguards += 1;
    if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate <= plus30 && expiryDate >= today) expiringNext30Days += 1;
      if (expiryDate < today && status !== "expired" && status !== "rejected") overdue += 1;
    }
  }

  return {
    activeSafeguards,
    expiringNext30Days,
    overdue,
  };
}

function buildDolsAlertsFromRows(rows) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plus30 = new Date(today);
  plus30.setDate(plus30.getDate() + 30);
  const alerts = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const safeguardType = normalizeType(row?.type) || "DoLS";
    const status = normalizeStatus(row?.status);
    const expiry = toDateOrNull(row?.expiryDate);
    const expiryDate = expiry ? new Date(expiry) : null;
    if (expiryDate && !Number.isNaN(expiryDate.getTime())) {
      expiryDate.setHours(0, 0, 0, 0);
      if (expiryDate >= today && expiryDate <= plus30) {
        alerts.push({
          id: `dols-expiring-${row.id}`,
          kind: "expiring_30_days",
          patientId: row.patientId,
          safeguardId: row.id,
          message: "Liberty safeguard authorisation expires within 30 days.",
          type: safeguardType,
          status,
          expiryDate: row.expiryDate,
          severity: "high",
        });
      }
      if (expiryDate < today && status !== "expired" && status !== "rejected") {
        alerts.push({
          id: `dols-overdue-${row.id}`,
          kind: "overdue",
          patientId: row.patientId,
          safeguardId: row.id,
          message: "Liberty safeguard authorisation overdue.",
          type: safeguardType,
          status,
          expiryDate: row.expiryDate,
          severity: "critical",
        });
      }
    }
    if (status === "pending") {
      alerts.push({
        id: `dols-not-applied-${row.id}`,
        kind: "status_not_applied",
        patientId: row.patientId,
        safeguardId: row.id,
        message: "Liberty safeguard status is not applied.",
        type: safeguardType,
        status,
        expiryDate: row.expiryDate ?? null,
        severity: "medium",
      });
    }
  }
  return alerts;
}

export async function listDolsAlertsForOrganisation(organisationId, { limitCount = 500 } = {}) {
  const rows = await listLibertySafeguardsForOrganisation(organisationId, { limitCount }).catch(() => []);
  return buildDolsAlertsFromRows(rows);
}

export async function listDolsAlertsForPatient(organisationId, patientId, { limitCount = 120 } = {}) {
  const rows = await listLibertySafeguardsForPatient(organisationId, patientId, { limitCount }).catch(() => []);
  return buildDolsAlertsFromRows(rows);
}
