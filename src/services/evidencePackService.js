import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { db } from "../firebase";

const MAX_ITEMS = 500;

function formatDate(value) {
  const d = value?.toDate?.() ?? (value?.seconds ? new Date(value.seconds * 1000) : null);
  if (!d || Number.isNaN(d.getTime())) return "N/A";
  return d.toISOString();
}

function safeName(value, fallback = "item") {
  const base = String(value ?? "").trim() || fallback;
  return base.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").replace(/\s+/g, "_").slice(0, 120);
}

function serializeForManifest(item) {
  return JSON.parse(
    JSON.stringify(item, (_key, val) => {
      if (val && typeof val.toDate === "function") return formatDate(val);
      return val;
    })
  );
}

async function fetchByPatient(collectionName, organisationId, patientId, serviceId = null) {
  const constraints = [
    where("organisationId", "==", organisationId),
    where("patientId", "==", patientId),
    orderBy("createdAt", "desc"),
    limit(MAX_ITEMS),
  ];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const snap = await getDocs(query(collection(db, collectionName), ...constraints));
  return (snap.docs ?? []).map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

async function fetchOrganisationDocuments(organisationId, serviceId = null) {
  const collections = ["policies", "evidence_documents", "documents"];
  const all = [];
  for (const name of collections) {
    try {
      const constraints = [where("organisationId", "==", organisationId), orderBy("createdAt", "desc"), limit(MAX_ITEMS)];
      if (serviceId) constraints.push(where("serviceId", "==", serviceId));
      const snap = await getDocs(query(collection(db, name), ...constraints));
      const mapped = (snap.docs ?? []).map((d) => ({ id: d.id, sourceCollection: name, ...d.data() }));
      all.push(...mapped);
    } catch {
      // Skip missing/non-indexed collections to keep export resilient.
    }
  }

  const seen = new Set();
  return all.filter((docItem) => {
    const key = `${docItem.sourceCollection}:${docItem.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toCarePlanText(plan) {
  const lines = [
    "# Care Plan",
    "",
    `- ID: ${plan.id ?? "N/A"}`,
    `- Status: ${plan.status ?? "N/A"}`,
    `- Created: ${formatDate(plan.createdAt)}`,
    `- Updated: ${formatDate(plan.updatedAt)}`,
    "",
  ];

  if (typeof plan.content === "string" && plan.content.trim()) {
    lines.push("## Content", "", plan.content.trim());
    return lines.join("\n");
  }

  lines.push(
    "## Care Needs",
    String(plan.careNeeds ?? "N/A"),
    "",
    "## Risk Assessment",
    String(plan.riskAssessment ?? "N/A"),
    "",
    "## Support Strategies",
    String(plan.supportStrategies ?? "N/A"),
    ""
  );
  return lines.join("\n");
}

function toClinicalNoteSummary(notes) {
  const header = [
    "# Clinical Notes Summary",
    "",
    `Total Notes: ${notes.length}`,
    "",
    "## Notes",
    "",
  ];
  const body = notes.map((n, idx) => {
    const category = n.category ?? "general";
    const author = n.authorEmail ?? n.createdBy ?? "Unknown";
    return `${idx + 1}. [${formatDate(n.createdAt)}] (${category}) ${author} - ${String(n.content ?? "").slice(0, 200)}`;
  });
  return [...header, ...(body.length > 0 ? body : ["No notes found for this patient."])].join("\n");
}

export async function fetchPatientsForEvidencePack(organisationId, serviceId = null) {
  if (!organisationId) return [];
  const constraints = [where("organisationId", "==", organisationId), orderBy("createdAt", "desc"), limit(MAX_ITEMS)];
  if (serviceId) constraints.push(where("serviceId", "==", serviceId));
  const snap = await getDocs(
    query(collection(db, "organisations", organisationId, "patients"), ...constraints)
  );
  return (snap.docs ?? []).map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
}

export async function generateBundle({ organisationId, patientId, patientDisplayName, serviceId = null }) {
  const org = String(organisationId ?? "").trim();
  const pid = String(patientId ?? "").trim();
  if (!org) throw new Error("Organisation context is missing.");
  if (!pid) throw new Error("Patient selection is required.");

  const [carePlans, clinicalNotes, documentMetadata] = await Promise.all([
    fetchByPatient("care_plans", org, pid, serviceId),
    fetchByPatient("clinical_notes", org, pid, serviceId),
    fetchOrganisationDocuments(org, serviceId),
  ]);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const packName = `SanctumCare_Evidence_Pack_${safeName(patientDisplayName || pid)}_${timestamp}`;
  const zip = new JSZip();

  const carePlansFolder = zip.folder("Care_Plans");
  for (const plan of carePlans) {
    const fileName = `${safeName(plan.title || plan.id || "care-plan")}.md`;
    carePlansFolder.file(fileName, toCarePlanText(plan));
  }

  const clinicalNotesFolder = zip.folder("Clinical_Notes");
  clinicalNotesFolder.file("Summary.md", toClinicalNoteSummary(clinicalNotes));

  const manifest = {
    generatedAt: new Date().toISOString(),
    organisationId: org,
    serviceId: serviceId ?? null,
    patient: {
      id: pid,
      displayName: patientDisplayName || pid,
    },
    counts: {
      carePlans: carePlans.length,
      clinicalNotes: clinicalNotes.length,
      documentMetadata: documentMetadata.length,
    },
    includedFiles: {
      carePlans: carePlans.map((plan) => ({
        id: plan.id ?? null,
        fileName: `${safeName(plan.title || plan.id || "care-plan")}.md`,
        createdAt: formatDate(plan.createdAt),
      })),
      clinicalNotes: [{ fileName: "Clinical_Notes/Summary.md", totalNotes: clinicalNotes.length }],
      documentMetadata: documentMetadata.map((docItem) => ({
        id: docItem.id ?? null,
        sourceCollection: docItem.sourceCollection ?? "unknown",
        title: docItem.title ?? docItem.fileName ?? "Untitled",
        fileName: docItem.fileName ?? null,
        fileUrl: docItem.fileUrl ?? null,
        createdAt: formatDate(docItem.createdAt),
        metadata: serializeForManifest(docItem),
      })),
    },
  };

  zip.file("Manifest.json", JSON.stringify(manifest, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `${packName}.zip`);
  return manifest.counts;
}
