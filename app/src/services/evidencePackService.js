import JSZip from "jszip";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { fetchClinicalNotesForPatient } from "./noteService";
import { listCarePlansForPatient } from "./carePlanManagementService";
import { fetchDocuments } from "./documentService";

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

  const [notes, carePlans, docResult] = await Promise.all([
    fetchClinicalNotesForPatient(pid, { limitCount: 500 }),
    listCarePlansForPatient(org, pid),
    fetchDocuments(org, { limitCount: 150 }),
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
  return { blob, rootFolderName: root, counts: { notes: notes.length, carePlans: carePlans.length, documents: documents.length } };
}

/**
 * Simple evidence pack payload for on-screen CQC export review.
 */
export async function generateEvidencePack({ organisationId }) {
  const org = String(organisationId ?? "").trim();
  if (!org) throw new Error("organisationId is required");

  const [notesSnap, auditSnap, inspectionSnap] = await Promise.all([
    getDocs(query(collection(db, "notes"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "audit_logs"), where("organisationId", "==", org))),
    getDocs(query(collection(db, "inspection_reports"), where("organisationId", "==", org))),
  ]);

  const notes = (notesSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const audits = (auditSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));
  const inspections = (inspectionSnap?.docs ?? []).map((d) => ({ id: d.id, ...(d.data() ?? {}) }));

  return {
    summary: `Total notes: ${notes.length}, Audit events: ${audits.length}, Inspection reports: ${inspections.length}`,
    notes,
    audits,
    inspections,
  };
}
