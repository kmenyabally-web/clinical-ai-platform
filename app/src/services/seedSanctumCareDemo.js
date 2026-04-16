import {
  collection,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../firebase";

const SEED_KEY = "sanctumcare.demo.seed.v3";

const IDS = {
  organisationId: "demo-org",
  hospitalId: "hospital001",
  wards: {
    picu: "ward_picu",
    acute: "ward_acute",
    rehab: "ward_rehab",
    lowSecure: "ward_low_secure",
  },
  patients: {
    daniel: "patient001",
  },
};

const ORG = {
  id: IDS.organisationId,
  name: "SanctumCare Demo org",
  type: "hospital",
};

const HOSPITAL = {
  id: IDS.hospitalId,
  name: "SanctumCare Main Hospital",
  organisationId: IDS.organisationId,
};

const WARDS = [
  { id: IDS.wards.picu, name: "PICU Ward", type: "picu" },
  { id: IDS.wards.acute, name: "Acute Ward", type: "acute" },
  { id: IDS.wards.rehab, name: "Rehab Ward", type: "rehab" },
  { id: IDS.wards.lowSecure, name: "Low Secure Unit", type: "low_secure" },
];

const PATIENTS = [
  {
    id: IDS.patients.daniel,
    firstName: "Daniel",
    lastName: "K",
    dob: "1995-06-12",
    wardId: IDS.wards.picu,
    wardName: "PICU Ward",
    hasLD: true,
    hasMentalHealth: true,
    diagnosis: ["Schizoaffective Disorder", "Mild Learning Disability"],
    legalStatus: "Section 3 MHA",
    admissionDate: "2026-03-28",
    riskLevel: "high",
  },
  {
    id: "patient002",
    firstName: "Amina",
    lastName: "Diallo",
    wardId: IDS.wards.acute,
    wardName: "Acute Ward",
    hasLD: false,
    hasMentalHealth: true,
  },
  {
    id: "patient003",
    firstName: "John",
    lastName: "Smith",
    wardId: IDS.wards.rehab,
    wardName: "Rehab Ward",
    hasLD: true,
    hasMentalHealth: false,
  },
];

const DEFAULT_POLICIES = [
  { title: "Safeguarding Policy", type: "SAFEGUARDING" },
  { title: "Medication Policy", type: "MEDICATION" },
  { title: "Risk Management Policy", type: "GENERAL" },
];

const DEFAULT_TRAINING = [
  "Basic Life Support",
  "Safeguarding Adults",
  "Medication Administration",
];

async function upsertOrganisation() {
  const ref = doc(db, "organisations", ORG.id);
  await setDoc(
    ref,
    {
      name: ORG.name,
      type: ORG.type,
      organisationType: ORG.type,
      status: "active",
      plan: "BASIC",
      updatedAt: serverTimestamp(),
      isDeleted: false,
    },
    { merge: true }
  );
}

async function upsertHospital() {
  const ref = doc(db, "hospitals", HOSPITAL.id);
  await setDoc(
    ref,
    {
      id: HOSPITAL.id,
      name: HOSPITAL.name,
      organisationId: HOSPITAL.organisationId,
      hospitalId: HOSPITAL.id,
      updatedAt: serverTimestamp(),
      isDeleted: false,
    },
    { merge: true }
  );
  await setDoc(
    doc(db, "organisations", ORG.id, "hospitals", HOSPITAL.id),
    {
      id: HOSPITAL.id,
      name: HOSPITAL.name,
      organisationId: HOSPITAL.organisationId,
      hospitalId: HOSPITAL.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isDeleted: false,
    },
    { merge: true }
  );
}

async function upsertWards() {
  for (const ward of WARDS) {
    const ref = doc(db, "wards", ward.id);
    await setDoc(
      ref,
      {
        id: ward.id,
        name: ward.name,
        hospitalId: HOSPITAL.id,
        organisationId: ORG.id,
        wardId: ward.id,
        type: ward.type,
        wardType: ward.type,
        updatedAt: serverTimestamp(),
        isDeleted: false,
      },
      { merge: true }
    );
    await setDoc(
      doc(db, "organisations", ORG.id, "wards", ward.id),
      {
        id: ward.id,
        name: ward.name,
        hospitalId: HOSPITAL.id,
        organisationId: ORG.id,
        wardId: ward.id,
        type: ward.type,
        wardType: ward.type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDeleted: false,
      },
      { merge: true }
    );
  }
}

async function upsertPatients() {
  /** Single source of truth: organisations/{orgId}/patients — master clinical records. */
  for (const p of PATIENTS) {
    const ref = doc(db, "organisations", ORG.id, "patients", p.id);
    const name = `${p.firstName} ${p.lastName}`.trim();
    const wardType = WARDS.find((w) => w.id === p.wardId)?.type ?? "acute";
    await setDoc(
      ref,
      {
        id: p.id,
        name,
        firstName: p.firstName,
        lastName: p.lastName,
        dob: p.dob ?? null,
        dateOfBirth: p.dob ?? null,
        organisationId: ORG.id,
        hospitalId: HOSPITAL.id,
        hospitalName: HOSPITAL.name,
        wardId: p.wardId,
        wardName: p.wardName,
        wardType,
        hasLD: Boolean(p.hasLD),
        hasMentalHealth: Boolean(p.hasMentalHealth),
        diagnosis: Array.isArray(p.diagnosis) ? p.diagnosis : [],
        legalStatus: p.legalStatus ?? "",
        admissionDate: p.admissionDate ?? "",
        riskLevel: p.riskLevel ?? "medium",
        isDeleted: false,
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertDefaultPolicies() {
  for (const p of DEFAULT_POLICIES) {
    const id = `policy-${p.type.toLowerCase()}`;
    const ref = doc(db, "policies", id);
    await setDoc(
      ref,
      {
        organisationId: ORG.id,
        title: p.title,
        type: p.type,
        content: `${p.title} - default seeded template content. Update as needed.`,
        version: 1,
        status: "ACTIVE",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertDefaultTraining() {
  for (const trainingName of DEFAULT_TRAINING) {
    const staffId = `seed-${trainingName.toLowerCase().replace(/\s+/g, "-")}`;
    const ref = doc(db, "staff_training", `${staffId}-${ORG.id}`);
    await setDoc(
      ref,
      {
        organisationId: ORG.id,
        hospitalId: HOSPITAL.id,
        wardId: IDS.wards.acute,
        serviceId: null,
        staffId,
        staffName: "Demo Staff",
        trainingName,
        expiryDate: "31/12/2027",
        status: "Valid",
        evidenceUrl: "",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertDanielClinicalNotes() {
  const notes = [
    {
      id: "note-patient001-001",
      discipline: "nursing",
      content:
        "Patient observed to be increasingly restless throughout the morning shift. Continued pacing behaviour noted. Refused morning medication despite encouragement. Minimal verbal engagement. Appears internally preoccupied.",
      mood: "low",
      riskLevel: "medium",
      status: "final",
    },
    {
      id: "note-patient001-002",
      discipline: "support_worker",
      content:
        "Observed patient becoming verbally aggressive towards another patient during meal time. De-escalation techniques applied successfully.",
      mood: "irritable",
      riskLevel: "high",
      status: "final",
    },
    {
      id: "note-patient001-003",
      discipline: "speech_language_therapy",
      content:
        "Patient demonstrates difficulty processing complex instructions. Requires simplified communication and repetition.",
      mood: "neutral",
      riskLevel: "medium",
      status: "final",
    },
  ];

  for (const n of notes) {
    const ref = doc(db, "notes", n.id);
    await setDoc(
      ref,
      {
        organisationId: ORG.id,
        hospitalId: HOSPITAL.id,
        wardId: IDS.wards.picu,
        patientId: IDS.patients.daniel,
        discipline: n.discipline,
        role: n.discipline,
        category: "Structured",
        content: n.content,
        originalText: n.content,
        correctedText: n.content,
        mood: n.mood,
        risk: n.riskLevel,
        status: n.status,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  const mdtNotes = [
    {
      id: "note-patient001-psychiatry-001",
      discipline: "psychiatry",
      content:
        "Ongoing psychotic symptoms with paranoid ideation towards staff. Mental state remains unstable. Medication review required due to repeated non-adherence concerns.",
      mood: "anxious",
      riskLevel: "high",
      status: "final",
    },
    {
      id: "note-patient001-psychology-001",
      discipline: "psychology",
      content:
        "Identified triggers include noise and unfamiliar environments. Behavioural escalation appears linked to anxiety and paranoid interpretation. Recommend a structured coping plan with predictable routines.",
      mood: "tense",
      riskLevel: "medium",
      status: "final",
    },
    {
      id: "note-patient001-ot-001",
      discipline: "occupational_therapy",
      content:
        "Limited engagement in meaningful activities observed this week. Requires graded activity plan and short sessions due to difficulty sustaining attention.",
      mood: "low",
      riskLevel: "medium",
      status: "final",
    },
  ];

  for (const n of mdtNotes) {
    const ref = doc(db, "notes", n.id);
    await setDoc(
      ref,
      {
        organisationId: ORG.id,
        hospitalId: HOSPITAL.id,
        wardId: IDS.wards.picu,
        patientId: IDS.patients.daniel,
        discipline: n.discipline,
        role: n.discipline,
        category: "Structured",
        content: n.content,
        originalText: n.content,
        correctedText: n.content,
        mood: n.mood,
        risk: n.riskLevel,
        status: n.status,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertDanielBehaviourLogs() {
  const rows = [
    {
      id: "behaviour-patient001-001",
      behaviourType: "verbal_aggression",
      severity: "high",
      trigger: "interaction during meal",
      action: "de-escalation",
      medicationRefused: false,
    },
    {
      id: "behaviour-patient001-002",
      behaviourType: "agitation",
      severity: "medium",
      trigger: "unknown",
      action: "observation",
      medicationRefused: true,
    },
  ];

  const clinicalNow = new Date().toISOString();
  for (const row of rows) {
    const ref = doc(db, "behaviours", row.id);
    await setDoc(
      ref,
      {
        organisationId: ORG.id,
        hospitalId: HOSPITAL.id,
        wardId: IDS.wards.picu,
        patientId: IDS.patients.daniel,
        behaviourType: row.behaviourType,
        severity: row.severity,
        trigger: row.trigger,
        action: row.action,
        medicationRefused: row.medicationRefused,
        stompRelated: false,
        clinicalTime: clinicalNow,
        createdBy: "seed-system",
        recordedBy: "seed-system",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertDanielAbcLogs() {
  const rows = [
    {
      id: "abc-patient001-001",
      antecedent: "Meal time interaction",
      behaviour: "Verbal aggression towards peer",
      consequence: "Staff de-escalation, patient separated",
      severity: "high",
      staff: "seed-system",
    },
    {
      id: "abc-patient001-002",
      antecedent: "Unstructured time",
      behaviour: "Pacing and restlessness",
      consequence: "Observation and reassurance provided",
      severity: "medium",
      staff: "seed-system",
    },
    {
      id: "abc-patient001-003",
      antecedent: "Medication round",
      behaviour: "Refused oral medication",
      consequence: "Documented and escalated for RC medication review",
      severity: "medium",
      staff: "seed-system",
    },
  ];

  for (const row of rows) {
    const ref = doc(db, "abc_logs", row.id);
    await setDoc(
      ref,
      {
        organisationId: ORG.id,
        hospitalId: HOSPITAL.id,
        wardId: IDS.wards.picu,
        patientId: IDS.patients.daniel,
        antecedent: row.antecedent,
        behaviour: row.behaviour,
        consequence: row.consequence,
        severity: row.severity,
        staff: row.staff,
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertDanielIncidentsAndSafeguarding() {
  const incidents = [
    {
      id: "incident-patient001-aggression-001",
      type: "aggression",
      severity: "high",
      title: "Verbal aggression during meal",
      description: "Verbal aggression towards another patient during meal time; no physical harm.",
      actionTaken: "De-escalated and logged.",
      status: "open",
      discipline: "nursing",
    },
    {
      id: "incident-patient001-safeguarding-001",
      type: "safeguarding",
      severity: "medium",
      title: "Safeguarding vulnerability alert",
      description: "Increased vulnerability due to fluctuating mental state and reduced engagement.",
      actionTaken: "Increased observation level and MDT review planned.",
      status: "open",
      discipline: "safeguarding",
    },
  ];

  for (const row of incidents) {
    const ref = doc(db, "incidents", row.id);
    await setDoc(
      ref,
      {
        incidentId: row.id,
        organisationId: ORG.id,
        hospitalId: HOSPITAL.id,
        wardId: IDS.wards.picu,
        patientId: IDS.patients.daniel,
        type: row.type,
        incidentType: row.type,
        severity: row.severity,
        title: row.title,
        description: row.description,
        actionTaken: row.actionTaken,
        actionsTaken: row.actionTaken,
        status: row.status,
        discipline: row.discipline,
        reportedBy: "seed-system",
        reportedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertDanielNursingObservation() {
  const ref = doc(db, "nursing_observations", "nursingobs-patient001-001");
  await setDoc(
    ref,
    {
      organisationId: ORG.id,
      hospitalId: HOSPITAL.id,
      wardId: IDS.wards.picu,
      patientId: IDS.patients.daniel,
      discipline: "nursing",
      observationLevel: "Level 2 intermittent",
      medicationAdherence: "Intermittent refusal; RC review required",
      nutrition: "Eating approximately 70% of meals",
      hydration: "Adequate intake",
      sleep: "Disturbed",
      adls: {
        washing: "independent",
        dressing: "independent",
        hygiene: "good",
      },
      continence: "Normal stool and urine output",
      riskLevel: "medium",
      physicalHealth:
        "Food chart: 70% intake. Fluid chart: adequate. Stool chart: normal. Urine output: normal. Sleep disturbed. Mobility independent.",
      notes:
        "Food chart: 70% intake. Fluid chart: adequate. Stool chart: normal. Urine output: normal. Sleep disturbed. Mobility independent.",
      createdBy: "seed-system",
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function upsertDanielSavedReports() {
  const reports = [
    {
      id: "report-patient001-cpa-v1",
      type: "cpa",
      title: "CPA Report — Daniel K",
      content: {
        nursing: "Increased agitation, pacing, and intermittent medication refusal; reassurance required.",
        psychiatry: "Ongoing psychotic symptoms with paranoid ideation; medication review indicated.",
        psychology:
          "Triggers include noise and unfamiliar environments; anxiety/paranoia formulation supports structured coping plan.",
        occupationalTherapy: "Limited activity engagement; graded functional plan recommended.",
        salt: "Complex instruction processing difficulty; simplified communication and visual prompts required.",
      },
    },
    {
      id: "report-patient001-tribunal-v1",
      type: "tribunal",
      title: "Tribunal Report — Daniel K",
      content: {
        mentalState: "Persistent psychotic symptoms with paranoia and variable engagement.",
        riskSummary: "Recent verbal aggression and agitation episodes increase dynamic risk.",
        medicationAdherence: "Intermittent refusal documented; review with RC pending.",
        legalStatus: "Section 3 MHA",
        recommendation: "Continue inpatient treatment with structured MDT monitoring and review.",
      },
    },
    {
      id: "report-patient001-mdt-v1",
      type: "mdtReview",
      title: "MDT Summary — Daniel K",
      content: {
        contributions: [
          "Nursing: agitation and medication refusal pattern",
          "Psychiatry: psychosis/paranoia persists",
          "Psychology: anxiety-paranoia formulation",
          "OT: graded activity pathway",
          "SALT: simplified communication plan",
        ],
        overallSummary:
          "MDT consensus supports continued structured PICU care, observation, and phased engagement plan.",
      },
    },
    {
      id: "report-patient001-hearing-v1",
      type: "Management_Hearing",
      title: "Management Hearing Brief — Daniel K",
      content: {
        riskOverview: "High dynamic behavioural risk with recent verbal aggression and medication non-adherence.",
        complianceIssues: "Medication concordance and engagement remain inconsistent.",
        recommendations:
          "Maintain safeguards, monitor adherence, and review multidisciplinary care strategy at hearing.",
      },
    },
  ];

  for (const row of reports) {
    const ref = doc(db, "reports", row.id);
    await setDoc(
      ref,
      {
        organisationId: ORG.id,
        hospitalId: HOSPITAL.id,
        wardId: IDS.wards.picu,
        patientId: IDS.patients.daniel,
        type: row.type,
        title: row.title,
        content: JSON.stringify(row.content),
        createdBy: "seed-system",
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );
  }
}

async function upsertDanielPhysicalBaseline() {
  const ref = doc(db, "physical_observations", "phys-patient001-baseline");
  await setDoc(
    ref,
    {
      organisationId: ORG.id,
      hospitalId: HOSPITAL.id,
      wardId: IDS.wards.picu,
      patientId: IDS.patients.daniel,
      temperature: 36.8,
      pulse: 88,
      systolicBP: 120,
      diastolicBP: 80,
      bloodPressure: "120/80",
      oxygenSaturation: 97,
      weight: 72,
      notes: "Baseline physical health stable",
      recordedBy: "seed-system",
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

function triggerUiRefresh() {
  try {
    localStorage.setItem("seed.refresh.patients", String(Date.now()));
    localStorage.setItem("seed.refresh.notes", String(Date.now()));
    localStorage.setItem("seed.refresh.reports", String(Date.now()));
    window.dispatchEvent(new Event("storage"));
  } catch {
    // no-op
  }
}

export async function seedSanctumCareDemoData() {
  if (import.meta.env.DEV !== true) return;
  if (localStorage.getItem(SEED_KEY) === "done") return;
  try {
    await upsertOrganisation();
    await upsertHospital();
    await upsertWards();
    await upsertPatients();
    await upsertDefaultPolicies();
    await upsertDefaultTraining();
    await upsertDanielClinicalNotes();
    await upsertDanielBehaviourLogs();
    await upsertDanielAbcLogs();
    await upsertDanielIncidentsAndSafeguarding();
    await upsertDanielPhysicalBaseline();
    await upsertDanielNursingObservation();
    await upsertDanielSavedReports();
    triggerUiRefresh();
    localStorage.setItem(SEED_KEY, "done");
    // eslint-disable-next-line no-console
    console.log("SanctumCare demo seed complete (Daniel K full context)");
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("SanctumCare demo seed failed", err);
  }
}

