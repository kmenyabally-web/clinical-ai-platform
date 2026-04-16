import { addDoc, collection, getDocs, limit, query, serverTimestamp, where } from "firebase/firestore";
import { db, auth } from "../firebase";
import { orgPatientsCollection } from "../utils/tenantCollections";

function normalizeText(value) {
  return String(value ?? "").trim().toLowerCase();
}

/**
 * Simulate a CQC-style inspection using clinical note signals.
 * Saves the generated report to `inspection_reports`.
 */
export const runInspection = async ({ organisationId, hospitalId = null }) => {
  const org = String(organisationId ?? "").trim();
  if (!org) {
    throw new Error("organisationId is required");
  }

  const noteConstraints = [where("organisationId", "==", org)];
  if (hospitalId) {
    noteConstraints.push(where("hospitalId", "==", String(hospitalId).trim()));
  }

  const patientCol = orgPatientsCollection(db, org);
  const patientQ = hospitalId
    ? query(patientCol, where("hospitalId", "==", String(hospitalId).trim()), limit(500))
    : query(patientCol, limit(500));

  const [notesSnap, patientsSnap, tasksSnap] = await Promise.all([
    getDocs(query(collection(db, "notes"), ...noteConstraints)),
    getDocs(patientQ),
    getDocs(query(collection(db, "tasks"), where("organisationId", "==", org))),
  ]);
  const notes = (notesSnap?.docs ?? []).map((d) => d.data() ?? {});
  const patients = (patientsSnap?.docs ?? []).map((d) => d.data() ?? {});
  const careTasks = (tasksSnap?.docs ?? []).map((d) => d.data() ?? {});

  let riskScore = 0;
  let highRiskCount = 0;
  let lowMoodCount = 0;
  let lowEngagementCount = 0;

  notes.forEach((note) => {
    const risk = normalizeText(note.risk);
    const mood = normalizeText(note.mood);
    const engagement = normalizeText(note.engagement);
    const content = normalizeText(note.content);

    if (risk === "high" || risk === "critical" || content.includes("high risk")) {
      riskScore += 3;
      highRiskCount += 1;
    }
    if (mood === "low" || mood === "depressed" || content.includes("low mood")) {
      riskScore += 2;
      lowMoodCount += 1;
    }
    if (engagement === "low" || content.includes("low engagement") || content.includes("refused")) {
      riskScore += 2;
      lowEngagementCount += 1;
    }
  });

  let stompGapCount = 0;
  patients.forEach((p) => {
    if (p?.stompMonitoring !== true) return;
    const meds = Array.isArray(p?.medications) ? p.medications : [];
    meds.forEach((m) => {
      const hasReviewDate = Boolean(m?.reviewDate);
      const hasReductionPlan = m?.hasReductionPlan === true;
      if (!hasReviewDate || !hasReductionPlan) {
        stompGapCount += 1;
      }
    });
  });
  if (stompGapCount > 0) {
    riskScore += Math.min(20, stompGapCount * 2);
  }

  const pendingCareTasks = careTasks.filter((t) => String(t?.status ?? "").toLowerCase() === "pending");
  if (pendingCareTasks.length > 0) {
    riskScore += Math.min(15, Math.ceil(pendingCareTasks.length / 5));
  }

  const score = Math.max(0, 100 - riskScore);
  let rating = "Good";
  if (score < 50) rating = "Inadequate";
  else if (score < 70) rating = "Requires Improvement";

  const risks = [];
  if (lowEngagementCount > 0) risks.push("Low engagement trends");
  if (highRiskCount > 0) risks.push("High-risk clinical observations in notes");
  if (lowMoodCount > 0) risks.push("Sustained low mood indicators");
  if (stompGapCount > 0) risks.push("STOMP compliance gaps identified");
  if (pendingCareTasks.length > 0) {
    risks.push(`Outstanding care tasks (${pendingCareTasks.length} pending)`);
  }
  if (risks.length === 0) risks.push("No major note-based risk trends detected");

  const recommendations = [];
  if (lowEngagementCount > 0) recommendations.push("Improve patient engagement strategies");
  if (highRiskCount > 0) recommendations.push("Increase MDT reviews");
  if (lowMoodCount > 0) recommendations.push("Strengthen wellbeing interventions and monitoring");
  if (recommendations.length === 0) recommendations.push("Continue routine MDT quality checks");

  const report = {
    organisationId: org,
    hospitalId: hospitalId ? String(hospitalId).trim() : null,
    score,
    rating,
    risks,
    recommendations,
    noteCount: notes.length,
    createdBy: auth.currentUser?.uid ?? null,
    createdAt: serverTimestamp(),
  };

  const ref = await addDoc(collection(db, "inspection_reports"), report);
  return { id: ref.id, ...report };
};

export function calculateCQCScore(data) {
  return {
    safe: 80,
    effective: 75,
    caring: 90,
    responsive: 70,
    wellLed: 85,
  };
}
