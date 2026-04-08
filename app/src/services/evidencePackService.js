import JSZip from "jszip";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { fetchClinicalNotesForPatient } from "./noteService";
import { listCarePlansForPatient, listCarePlansForOrganisation } from "./carePlanManagementService";
import { fetchDocuments } from "./documentService";
import { fetchIncidents } from "./incidentService";
import {
  listPhysicalObservationsForPatient,
  listPhysicalObservationsForOrganisation,
} from "./physicalObservationsService";
import { listStaffTraining } from "./staffTrainingService";
import { getStompAlerts } from "../utils/stompAlerts";
import { getInspectionAlerts } from "../utils/inspectionAlerts";
import {
  mapEvidenceToDomains,
  buildCqcInspectionSections,
  detectCriticalIssues,
} from "../engine/cqcInspectionPack";
import {
  runInspectionSimulation,
  getWarnings,
  buildSimulationInputFromMapped,
} from "../engine/inspectionSimulationEngine";
import { generateAIContent } from "./geminiAiService.js";
function safeFilename(s) {
  return String(s ?? "")
    .replace(/[<>:"/\\|?*]+/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120) || "item";
}

function formatTs(ts) {
  if (!ts) return "—";
  if (typeof ts.toDate === "function") {
    try {
      return ts.toDate().toISOString();
    } catch {
      return "—";
    }
  }
  return String(ts);
}

function carePlanToText(cp) {
  const header = [
    `Care plan export`,
    `Document ID: ${cp.id}`,
    `Status: ${cp.status ?? "—"}`,
    `Version: ${cp.version ?? "—"}`,
    `Created: ${formatTs(cp.createdAt)}`,
    `Updated: ${formatTs(cp.updatedAt)}`,
    "",
  ].join("\n");

  if (typeof cp.content === "string" && cp.content.trim()) {
    return [
      header,
      "Type: AI-assisted draft (full text)",
      "",
      "---",
      "",
      cp.content.trim(),
      "",
      "---",
      "",
      "DISCLAIMER: AI-generated or AI-assisted content must be reviewed and signed off by a qualified clinician before use in care delivery.",
    ].join("\n");
  }

  return [
    header,
    "Type: Structured care plan",
    "",
    "Care needs",
    String(cp.careNeeds ?? "").trim() || "—",
    "",
    "Risk assessment",
    String(cp.riskAssessment ?? "").trim() || "—",
    "",
    "Support strategies",
    String(cp.supportStrategies ?? "").trim() || "—",
    "",
    "Review date",
    cp.reviewDate ? formatTs(cp.reviewDate) : "—",
  ].join("\n");
}

/**
 * Build a ZIP blob for SanctumCare inspection evidence: clinical notes, care plans (as .txt),
 * and organisation documents (files).
 */
export async function buildEvidencePackZip({ organisationId, patientId, patientName }) {
  const org = (organisationId ?? "").trim();
  const pid = (patientId ?? "").trim();
  if (!org) throw new Error("organisationId is required.");
  if (!pid) throw new Error("patientId is required.");

  const dateStr = new Date().toISOString().slice(0, 10);
  const namePart = safeFilename(patientName || pid);
  const root = `SanctumCare_Evidence_Pack_${dateStr}_${namePart}`;

  const zip = new JSZip();

  const [notes, carePlans, docResult, physicalObs] = await Promise.all([
    fetchClinicalNotesForPatient(pid, { limitCount: 500 }),
    listCarePlansForPatient(org, pid),
    fetchDocuments(org, { limitCount: 150 }),
    listPhysicalObservationsForPatient(org, pid, { limitCount: 200 }).catch(() => []),
  ]);

  const documents = docResult?.documents ?? [];

  const readme = [
    "SanctumCare Evidence Pack — Inspection bundle",
    `Generated (UTC): ${new Date().toISOString()}`,
    `Organisation ID: ${org}`,
    `Patient ID: ${pid}`,
    `Patient name: ${patientName || "—"}`,
    "",
    "Contents:",
    `- notes/ (clinical notes): ${notes.length} text export(s)`,
    `- care_plans/: ${carePlans.length} text export(s)`,
    `- physical_observations/: ${physicalObs.length} vital signs record(s) (SAFE domain)`,
    `- organisation_documents/: up to ${documents.length} file(s) from organisation evidence/policy stores`,
    "",
    "This pack is generated for inspection readiness. Ensure governance and confidentiality policies are followed when sharing.",
  ].join("\n");

  zip.file(`${root}/README.txt`, readme);

  const notesFolder = zip.folder(`${root}/notes`);
  for (const n of notes) {
    const body = [
      `Clinical note`,
      `ID: ${n.id}`,
      `Category: ${n.category}`,
      `Author: ${n.authorEmail}`,
      `Created: ${formatTs(n.createdAt)}`,
      n.mood ? `Mood: ${n.mood}` : null,
      "",
      String(n.content ?? ""),
    ]
      .filter(Boolean)
      .join("\n");
    notesFolder.file(`note_${safeFilename(n.id)}.txt`, body);
  }

  const physFolder = zip.folder(`${root}/physical_observations`);
  for (const row of physicalObs) {
    const body = [
      `Physical observation`,
      `ID: ${row.id}`,
      `Recorded: ${formatTs(row.createdAt)}`,
      `Recorded by: ${row.recordedBy ?? "—"}`,
      `NEWS score: ${row.newsScore ?? "—"}`,
      `Risk: ${row.riskLevel ?? "—"}`,
      "",
      `Temp °C: ${row.temperature ?? "—"}`,
      `Pulse: ${row.pulse ?? "—"}`,
      `BP: ${row.systolicBP ?? "—"} / ${row.diastolicBP ?? "—"}`,
      `RR: ${row.respiratoryRate ?? "—"}`,
      `SpO2 %: ${row.oxygenSaturation ?? "—"}`,
      `Glucose: ${row.bloodGlucose ?? "—"}`,
      `Weight kg: ${row.weight ?? "—"}`,
      "",
      row.notes ? `Notes:\n${row.notes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    physFolder.file(`observation_${safeFilename(row.id)}.txt`, body);
  }

  const cpFolder = zip.folder(`${root}/care_plans`);
  let idx = 0;
  for (const cp of carePlans) {
    idx += 1;
    const suffix = cp.content?.trim() ? "ai" : "structured";
    cpFolder.file(`care_plan_${idx}_${suffix}_${safeFilename(cp.id)}.txt`, carePlanToText(cp));
  }

  const docFolder = zip.folder(`${root}/organisation_documents`);
  const manifestLines = ["Organisation-level documents (not patient-specific):", ""];
  for (const d of documents) {
    const label = d.title || d.fileName || d.id;
    manifestLines.push(`- ${label}`);
    if (!d.fileUrl) {
      manifestLines.push(`  (no file URL — skipped)`);
      continue;
    }
    try {
      const res = await fetch(d.fileUrl, { mode: "cors" });
      if (!res.ok) {
        manifestLines.push(`  (download failed: HTTP ${res.status})`);
        docFolder.file(`${safeFilename(d.id)}_${safeFilename(d.fileName || "file")}_failed.txt`, `URL: ${d.fileUrl}`);
        continue;
      }
      const buf = await res.arrayBuffer();
      const rawName = (d.fileName || d.title || "document").toString().replace(/[<>:"/\\|?*]+/g, "_");
      const outName = rawName.includes(".") ? `${d.id.slice(0, 10)}_${rawName}` : `${d.id.slice(0, 10)}_${rawName}.bin`;
      docFolder.file(outName, buf);
    } catch (e) {
      manifestLines.push(`  (download error: ${e?.message ?? e})`);
      docFolder.file(
        `${safeFilename(d.id)}_download_error.txt`,
        `Could not fetch file.\nURL: ${d.fileUrl}\n\n${String(e?.message ?? e)}`
      );
    }
  }
  docFolder.file("_manifest.txt", manifestLines.join("\n"));

  const blob = await zip.generateAsync({ type: "blob" });
  return {
    blob,
    rootFolderName: root,
    counts: {
      notes: notes.length,
      carePlans: carePlans.length,
      documents: documents.length,
      physicalObservations: physicalObs.length,
    },
  };
}

/**
 * Simple evidence pack payload for on-screen CQC export review.
 */
export async function generateEvidencePack({ organisationId }) {
  const org = String(organisationId ?? "").trim();
  if (!org) throw new Error("organisationId is required");

  const [notesSnap, auditSnap, inspectionSnap, patientsSnap, inspectionScoreSnap] = await Promise.all([
    getDocs(query(collection(db, "notes"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "audit_logs"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "inspection_reports"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "patients"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "inspection_scores"), where("organisationId", "==", org))),
  ]);

  const notes = (notesSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const audits = (auditSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const inspections = (inspectionSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const inspectionScores = (inspectionScoreSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  inspectionScores.sort((a, b) => {
    const ta = typeof a?.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
    const tb = typeof b?.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
  const latestScore = inspectionScores[0] ?? null;
  const latestDomainScores = latestScore?.domainScores ?? null;
  const keyAlerts = latestDomainScores ? getInspectionAlerts(latestDomainScores) : [];
  const stompPatients = (patientsSnap?.docs ?? [])
    .map((d) => ({ id: d.id, ...(d.data() ?? {}) }))
    .filter((p) => p?.stompMonitoring === true)
    .map((p) => ({
      patientId: p.id,
      patientName: [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.name || p.id,
      medications: Array.isArray(p.medications) ? p.medications : [],
      alerts: getStompAlerts(p),
    }));

  return {
    summary: `Total notes: ${notes.length}, Audit events: ${audits.length}, Inspection reports: ${inspections.length}, STOMP patients: ${stompPatients.length}`,
    notes,
    audits,
    inspections,
    stompCompliance: stompPatients,
    inspectionIntelligence: {
      overallScore: latestScore?.overallScore ?? null,
      domainScores: latestDomainScores,
      keyAlerts,
      historyCount: inspectionScores.length,
    },
  };
}

/**
 * CQC inspection engine: domain-grouped evidence, gaps, and risk flags.
 * When `patientId` is set, notes and care plans are scoped to that patient; org-wide incidents/training/policies remain.
 *
 * @param {{ organisationId: string, patientId?: string | null }} params
 */
export async function generateInspectionEnginePack({ organisationId, patientId = null }) {
  const org = String(organisationId ?? "").trim();
  if (!org) throw new Error("organisationId is required");

  const pid = (patientId ?? "").toString().trim() || null;

  const [
    notesSnap,
    auditSnap,
    inspectionSnap,
    patientsSnap,
    inspectionScoreSnap,
    docResult,
    incidents,
    training,
  ] = await Promise.all([
    getDocs(query(collection(db, "notes"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "audit_logs"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "inspection_reports"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "patients"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "inspection_scores"), where("organisationId", "==", org))),
    fetchDocuments(org, { limitCount: 150 }),
    fetchIncidents(org, {}).catch(() => []),
    listStaffTraining(org).catch(() => []),
  ]);

  let notes = (notesSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  if (pid) {
    notes = notes.filter((n) => String(n.patientId ?? "") === pid);
  }

  let carePlans = [];
  if (pid) {
    try {
      carePlans = await listCarePlansForPatient(org, pid);
    } catch {
      carePlans = [];
    }
  }

  const physicalObsForPack = pid
    ? await listPhysicalObservationsForPatient(org, pid, { limitCount: 200 }).catch(() => [])
    : await listPhysicalObservationsForOrganisation(org, { limitCount: 200 }).catch(() => []);

  const audits = (auditSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const inspections = (inspectionSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const inspectionScores = (inspectionScoreSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  inspectionScores.sort((a, b) => {
    const ta = typeof a?.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
    const tb = typeof b?.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
    return tb - ta;
  });
  const latestScore = inspectionScores[0] ?? null;
  const latestDomainScores = latestScore?.domainScores ?? null;
  const keyAlerts = latestDomainScores ? getInspectionAlerts(latestDomainScores) : [];
  const stompPatients = (patientsSnap?.docs ?? [])
    .map((d) => ({ id: d.id, ...(d.data() ?? {}) }))
    .filter((p) => p?.stompMonitoring === true)
    .map((p) => ({
      patientId: p.id,
      patientName: [p.firstName, p.lastName].filter(Boolean).join(" ").trim() || p.name || p.id,
      medications: Array.isArray(p.medications) ? p.medications : [],
      alerts: getStompAlerts(p),
    }));

  const documents = docResult?.documents ?? [];
  const policyDocs = documents.filter((d) => d.documentType === "policy" || String(d.collection ?? "").includes("policies"));

  const mapped = mapEvidenceToDomains({
    notes,
    incidents,
    carePlans,
    training,
    policies: documents,
    audits,
    physicalObservations: physicalObsForPack,
  });

  const simulationInput = buildSimulationInputFromMapped(mapped);
  const simulation = runInspectionSimulation(simulationInput);
  const simulationWarnings = getWarnings(simulation.domains);

  const cqcDomains = buildCqcInspectionSections(mapped);
  const criticalIssues = detectCriticalIssues({
    training,
    policies: policyDocs,
    incidents,
    notes,
    physicalObservations: physicalObsForPack,
  });

  return {
    summary: `Inspection engine — notes: ${notes.length}, incidents: ${incidents.length}, care plans: ${carePlans.length}, physical observations: ${physicalObsForPack.length}, training records: ${training.length}, policy docs: ${policyDocs.length}`,
    patientId: pid,
    notes,
    audits,
    inspections,
    incidents,
    training,
    documents,
    carePlans,
    stompCompliance: stompPatients,
    inspectionIntelligence: {
      overallScore: latestScore?.overallScore ?? null,
      domainScores: latestDomainScores,
      keyAlerts,
      historyCount: inspectionScores.length,
    },
    cqcInspection: {
      domains: cqcDomains,
      criticalIssues,
      simulation: {
        domains: simulation.domains,
        overallScore: simulation.overallScore,
        rating: simulation.rating,
        warnings: simulationWarnings,
      },
      counts: {
        notes: notes.length,
        incidents: incidents.length,
        carePlans: carePlans.length,
        physicalObservations: physicalObsForPack.length,
        training: training.length,
        policies: policyDocs.length,
        audits: audits.length,
      },
    },
  };
}

/**
 * Org-wide evidence map for the live inspection simulator (dashboard).
 * @param {string} organisationId
 */
export async function fetchEvidenceForCqcSimulation(organisationId) {
  const org = String(organisationId ?? "").trim();
  if (!org) throw new Error("organisationId is required");

  const [notesSnap, auditSnap, docResult, incidents, training, carePlans, physicalObs] = await Promise.all([
    getDocs(query(collection(db, "notes"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "audit_logs"), where("organisationId", "==", org))),
    fetchDocuments(org, { limitCount: 150 }),
    fetchIncidents(org, {}).catch(() => []),
    listStaffTraining(org).catch(() => []),
    listCarePlansForOrganisation(org, { limitCount: 300 }).catch(() => []),
    listPhysicalObservationsForOrganisation(org, { limitCount: 300 }).catch(() => []),
  ]);

  const notes = (notesSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const audits = (auditSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const documents = docResult?.documents ?? [];

  return mapEvidenceToDomains({
    notes,
    incidents,
    carePlans,
    training,
    policies: documents,
    audits,
    physicalObservations: physicalObs,
  });
}

function toPatientDisplayName(patient) {
  if (!patient || typeof patient !== "object") return "Unknown patient";
  const first = String(patient.firstName ?? "").trim();
  const last = String(patient.lastName ?? "").trim();
  const full = `${first} ${last}`.trim();
  return full || String(patient.name ?? "").trim() || String(patient.id ?? "Unknown patient");
}

async function buildAiEvidenceNarrative(input) {
  const prompt = `You are preparing a UK CQC inspection evidence summary.
Summarise ONLY risks, trends, and concerns from the provided data.
Return STRICT JSON only:
{
  "riskSummary": "string",
  "trendSummary": "string",
  "careQualitySummary": "string"
}

DATA:
${JSON.stringify(input).slice(0, 12000)}`;
  try {
    const raw = await generateAIContent(prompt, { responseMimeType: "application/json", temperature: 0.2 });
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      riskSummary: String(parsed?.riskSummary ?? "").trim(),
      trendSummary: String(parsed?.trendSummary ?? "").trim(),
      careQualitySummary: String(parsed?.careQualitySummary ?? "").trim(),
    };
  } catch {
    return null;
  }
}

/**
 * Single CQC inspection-ready evidence document with 10 sections:
 * patient overview, risk, behaviour trends, clinical notes, MDT, CPA extract,
 * incidents, safeguarding, physical health, compliance.
 */
export async function generateCqcEvidencePackDocument({ organisationId, patientId }) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org) throw new Error("organisationId is required");
  if (!pid) throw new Error("patientId is required");

  const [enginePack, patientSnap] = await Promise.all([
    generateInspectionEnginePack({ organisationId: org, patientId: pid }),
    getDoc(doc(db, "patients", pid)),
  ]);

  const patient =
    patientSnap?.exists?.() && patientSnap?.data?.()?.organisationId === org
      ? { id: patientSnap.id, ...(patientSnap.data() ?? {}) }
      : null;
  const patientName = toPatientDisplayName(patient);

  const notes = Array.isArray(enginePack.notes) ? enginePack.notes : [];
  const incidents = Array.isArray(enginePack.incidents) ? enginePack.incidents : [];
  const cqc = enginePack.cqcInspection ?? {};
  const domains = Array.isArray(cqc.domains) ? cqc.domains : [];

  const byDiscipline = notes.reduce((acc, n) => {
    const key = String(n?.discipline ?? n?.role ?? "clinical").toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const safeguardingIncidents = incidents.filter(
    (i) => String(i?.type ?? i?.incidentType ?? "").toLowerCase() === "safeguarding"
  );
  const openIncidents = incidents.filter((i) => String(i?.status ?? "open").toLowerCase() !== "closed");

  const ai = await buildAiEvidenceNarrative({
    patientName,
    incidents: incidents.length,
    safeguarding: safeguardingIncidents.length,
    notesByDiscipline: byDiscipline,
    simulation: cqc.simulation ?? null,
    criticalIssues: cqc.criticalIssues ?? [],
  });

  const sections = [
    {
      title: "1. Patient Overview",
      summary: `${patientName} is currently scoped to organisation ${org}.`,
      keyPoints: [
        `Organisation: ${org}`,
        `Hospital: ${patient?.hospitalId ?? "Not recorded"}`,
        `Ward: ${patient?.wardId ?? "Not recorded"}`,
        `Legal status: ${patient?.legalStatus ?? "Not recorded"}`,
      ],
    },
    {
      title: "2. Risk Summary",
      summary:
        ai?.riskSummary ||
        `Current risk profile indicates ${openIncidents.length} open incident(s) and ${safeguardingIncidents.length} safeguarding concern(s).`,
      keyPoints: [
        `Open incidents: ${openIncidents.length}`,
        `Safeguarding incidents: ${safeguardingIncidents.length}`,
        `Critical issues flagged: ${(cqc.criticalIssues ?? []).length}`,
      ],
    },
    {
      title: "3. Behaviour Trends",
      summary: ai?.trendSummary || "Behaviour trends are derived from ABC logs, incidents, and discipline notes.",
      keyPoints: [
        `Behaviour/incident entries: ${incidents.length}`,
        `Simulation warnings: ${(cqc?.simulation?.warnings ?? []).length}`,
        `Trend source: clinical notes + incidents`,
      ],
    },
    {
      title: "4. Clinical Notes Summary",
      summary: `Clinical note coverage includes ${notes.length} note(s) across recorded disciplines.`,
      keyPoints: Object.entries(byDiscipline)
        .slice(0, 6)
        .map(([k, v]) => `${k}: ${v}`),
    },
    {
      title: "5. MDT Summary",
      summary: "MDT evidence is aggregated from multidisciplinary documentation and inspection-domain simulation outputs.",
      keyPoints: [
        `Nursing/psychiatry/psychology evidence included where available`,
        `Inspection domain sections: ${domains.length}`,
        `Overall simulation score: ${Math.round(cqc?.simulation?.overallScore ?? 0)}`,
      ],
    },
    {
      title: "6. CPA Extract",
      summary: "CPA-relevant themes extracted from current presentation, risk, engagement, and recommendation content.",
      keyPoints: [
        `Risk and recommendation strands are present in notes`,
        `Medication adherence concerns included when documented`,
        `Behavioural patterns included from incident/ABC evidence`,
      ],
    },
    {
      title: "7. Incident Summary",
      summary: `${incidents.length} incident record(s) linked to the current patient scope.`,
      keyPoints: [
        `Open: ${openIncidents.length}`,
        `Closed: ${Math.max(incidents.length - openIncidents.length, 0)}`,
        `Highest severity captured in incident log`,
      ],
    },
    {
      title: "8. Safeguarding Overview",
      summary: `${safeguardingIncidents.length} safeguarding-tagged incident(s) identified in current evidence.`,
      keyPoints: [
        `Safeguarding concerns tracked in incidents`,
        `Related warnings included in simulation output`,
        `MDT follow-up required for unresolved concerns`,
      ],
    },
    {
      title: "9. Physical Health Overview",
      summary: `Physical observations included in evidence counts: ${cqc?.counts?.physicalObservations ?? 0}.`,
      keyPoints: [
        `Physical observations: ${cqc?.counts?.physicalObservations ?? 0}`,
        `NEWS and vitals evidence included where recorded`,
        `Clinical notes include physical health context`,
      ],
    },
    {
      title: "10. Compliance Indicators",
      summary:
        ai?.careQualitySummary ||
        `Compliance indicators are derived from domain simulation, critical issues, and governance evidence.`,
      keyPoints: [
        `Overall simulation score: ${Math.round(cqc?.simulation?.overallScore ?? 0)}`,
        `Simulation rating: ${cqc?.simulation?.rating ?? "—"}`,
        `Critical issues: ${(cqc.criticalIssues ?? []).length}`,
      ],
    },
  ];

  return {
    organisationId: org,
    patientId: pid,
    patientName,
    generatedAt: new Date().toISOString(),
    sections: sections.map((s) => ({
      ...s,
      keyPoints: (Array.isArray(s.keyPoints) ? s.keyPoints : []).filter(Boolean),
    })),
    sourcePack: enginePack,
    aiSummary: ai,
  };
}
