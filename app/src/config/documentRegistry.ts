/**
 * Document & module registry — organisation type drives **modules** (nav / app surfaces);
 * ward type drives **supporting documents** (and optional extra form emphasis).
 * Use helpers from UI (Sidebar, patient hub, documents) and from report builders.
 */

import { NAV_ITEMS } from "./routes.js";
import { normalizeWardType, type WardTypeCanonical } from "../engine/clinicalContextEngine";

/** Every primary app module path from `routes.js` `NAV_ITEMS`. */
export const ALL_MODULE_PATHS: string[] = NAV_ITEMS.map((i) => i.path);

/**
 * DOCUMENT_REGISTRY_V1
 * UI menus should derive document groups from this object.
 */
export const DOCUMENTS = {
  reports: [
    "CPA (discipline)",
    "MDT Summary",
    "Tribunal Report (Nursing)",
    "RC Tribunal Report",
    "Management Hearing",
    "CTR Report",
  ],
  care: [
    "Care Plan",
    "72hr Care Plan",
    "PBS Plan",
    "Communication Plan",
  ],
  risk: [
    "Risk Assessment",
    "Para-risk Assessment",
    "Safeguarding",
    "Incident Report",
  ],
  compliance: [
    "Policies",
    "Staff Training",
    "Audit Logs",
  ],
} as const;

export type DocumentRegistryCategory = keyof typeof DOCUMENTS;
export type DocumentRegistryLabel = (typeof DOCUMENTS)[DocumentRegistryCategory][number];

export type MenuItem = { path: string; label: string };

/** Non-role-filtered menu derived from DOCUMENT_REGISTRY_V1. */
export function getMainMenuFromDocumentRegistry(): MenuItem[] {
  return [
    { path: "/dashboard", label: "Dashboard" },
    { path: "/patients", label: "Patients" },
    { path: "/clinical-notes", label: "Clinical Notes" },
    { path: "/behaviour", label: "Behaviour Tracking" },
    { path: "/physical-health", label: "Physical Health" },
    { path: "/incidents", label: "Incidents & Safeguarding" },
    { path: "/documents", label: "Documents" },
    { path: "/care-plans", label: "Care Plans" },
    { path: "/capacity", label: "Capacity & Consent" },
    { path: "/mdt", label: "MDT Reviews" },
    // From DOCUMENTS.reports
    { path: "/reports", label: "AI Reports" },
    { path: "/evidence-pack", label: "Evidence Pack" },
    { path: "/inspection-simulator", label: "Inspection Simulator" },
    // From DOCUMENTS.compliance
    { path: "/organisation/policies", label: "Policies" },
    { path: "/staff-training", label: "Staff Training" },
    { path: "/audit-log", label: "Audit Log" },
  ];
}

export function getManagementMenuFromDocumentRegistry(): MenuItem[] {
  return [
    { path: "/management/organisations", label: "Organisations" },
    { path: "/management/hospitals", label: "Hospitals" },
    { path: "/management/wards", label: "Wards" },
    { path: "/management/users", label: "Users" },
  ];
}

export type OrganisationRegistryKey =
  | "hospital"
  | "care_home"
  | "nursing_home"
  | "supported_living"
  | "domiciliary_care"
  | "default";

function canonicalOrganisationType(raw: string | null | undefined): OrganisationRegistryKey {
  const s = String(raw ?? "hospital")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s === "mental_health" || s === "mh") return "hospital";
  if (s === "care_home") return "care_home";
  if (s === "nursing_home") return "nursing_home";
  if (s === "supported_living") return "supported_living";
  if (s === "domiciliary" || s === "domiciliary_care") return "domiciliary_care";
  if (!s) return "default";
  return s as OrganisationRegistryKey;
}

/**
 * organisationType → allowed module paths (nav items).
 * Organisation type logic is defaults/labels only; never hide system modules by org type.
 */
export const MODULES_BY_ORGANISATION: Record<OrganisationRegistryKey, string[]> = {
  hospital: [...ALL_MODULE_PATHS],
  default: [...ALL_MODULE_PATHS],
  care_home: [...ALL_MODULE_PATHS],
  nursing_home: [...ALL_MODULE_PATHS],
  supported_living: [...ALL_MODULE_PATHS],
  domiciliary_care: [...ALL_MODULE_PATHS],
};

/** Supporting / formal document identifiers (not routes — used for labels, exports, future Documents hub). */
export type SupportingDocumentId =
  | "clinical_notes"
  | "behaviour_logs"
  | "physical_health"
  | "care_monitoring"
  | "cpa_discipline"
  | "mdt_review"
  | "tribunal_nursing"
  | "tribunal_rc"
  | "management_hearing"
  | "ctr"
  | "care_plan_72h"
  | "para_risk_assessment"
  | "capacity_assessment"
  | "safeguarding_review"
  | "incident_investigation"
  | "s17_leave_risk"
  | "s117_aftercare"
  | "restrictive_practice_log"
  | "high_frequency_behaviour"
  | "rapid_risk_review"
  | "crisis_plan"
  | "admission_assessment"
  | "ot_plan"
  | "progress_report"
  | "discharge_planning"
  | "risk_assessment"
  | "moj_report";

const BASE_DOCUMENTS: SupportingDocumentId[] = [
  "clinical_notes",
  "behaviour_logs",
  "physical_health",
  "care_monitoring",
  "cpa_discipline",
  "mdt_review",
  "tribunal_nursing",
  "tribunal_rc",
  "management_hearing",
  "ctr",
  "care_plan_72h",
  "para_risk_assessment",
  "capacity_assessment",
  "safeguarding_review",
  "incident_investigation",
  "s17_leave_risk",
  "s117_aftercare",
];

/**
 * wardType → documents emphasised / applicable (union of base + ward-specific).
 * Unknown or missing ward type → base list only.
 */
export const DOCUMENTS_BY_WARD: Record<WardTypeCanonical, SupportingDocumentId[]> = {
  acute: [...BASE_DOCUMENTS, "crisis_plan", "admission_assessment", "mdt_review"],
  picu: [
    ...BASE_DOCUMENTS,
    "incident_investigation",
    "rapid_risk_review",
    "restrictive_practice_log",
    "high_frequency_behaviour",
  ],
  rehab: [...BASE_DOCUMENTS, "ot_plan", "progress_report", "discharge_planning"],
  low_secure: [...BASE_DOCUMENTS, "tribunal_nursing", "tribunal_rc", "s17_leave_risk", "risk_assessment", "moj_report"],
  medium_secure: [...BASE_DOCUMENTS, "tribunal_nursing", "tribunal_rc", "s17_leave_risk", "risk_assessment", "moj_report"],
};

/** Canonical ward-type document logic for form availability (does not hide core modules). */
export function getDocumentsForWardType(wardType: string | null | undefined): SupportingDocumentId[] {
  return getSupportingDocumentsForWard(wardType);
}

/** AI Reports page pipeline values (aligned with `ClinicalAiReports` dropdown). */
export type ReportPipelineValue =
  | "CPA"
  | "Tribunal"
  | "Management_Hearing"
  | "MDT_SUMMARY"
  | "WEEKLY"
  | "MONTHLY";

export const REPORT_PIPELINES_BY_ORGANISATION: Record<OrganisationRegistryKey, ReportPipelineValue[]> = {
  hospital: ["CPA", "Tribunal", "Management_Hearing", "MDT_SUMMARY", "WEEKLY", "MONTHLY"],
  default: ["CPA", "Tribunal", "Management_Hearing", "MDT_SUMMARY", "WEEKLY", "MONTHLY"],
  care_home: ["Management_Hearing"],
  nursing_home: ["Management_Hearing"],
  supported_living: ["Management_Hearing"],
  domiciliary_care: ["Management_Hearing"],
};

/** Maps report pipeline to supporting document ids (for ward-level filtering). */
export const REPORT_PIPELINE_REQUIRED_DOCUMENTS: Partial<Record<ReportPipelineValue, SupportingDocumentId[]>> = {
  CPA: ["cpa_discipline"],
  Tribunal: ["tribunal_nursing", "tribunal_rc"],
  Management_Hearing: ["management_hearing"],
  MDT_SUMMARY: ["mdt_review"],
  WEEKLY: ["clinical_notes"],
  MONTHLY: ["clinical_notes"],
};

/** Form / workflow slugs tied to modules (for dynamic show/hide with modules). */
export type FormSlug =
  | "clinical_note"
  | "behaviour_log"
  | "physical_health_obs"
  | "care_monitoring"
  | "capacity_assessment"
  | "incident"
  | "cpa_section"
  | "mdt_review"
  | "tribunal_nursing_section"
  | "tribunal_rc_section"
  | "management_hearing"
  | "rapid_risk_review"
  | "restrictive_intervention_log"
  | "crisis_plan"
  | "admission_assessment"
  | "ot_plan"
  | "progress_report"
  | "discharge_planning"
  | "section_17_leave"
  | "risk_assessment"
  | "moj_report";

/** modulePath → forms available when that module is visible. */
export const FORMS_BY_MODULE: Record<string, FormSlug[]> = {
  "/clinical-notes": ["clinical_note"],
  "/behaviour": ["behaviour_log", "rapid_risk_review", "restrictive_intervention_log", "risk_assessment"],
  "/physical-health": ["physical_health_obs"],
  "/incidents": ["incident", "rapid_risk_review", "restrictive_intervention_log"],
  "/reports": ["cpa_section", "mdt_review", "tribunal_nursing_section", "tribunal_rc_section", "progress_report", "moj_report"],
  "/mdt": ["mdt_review"],
  "/care-plans": ["care_monitoring", "crisis_plan", "admission_assessment", "ot_plan", "discharge_planning", "section_17_leave"],
  "/care-plan": ["care_monitoring", "crisis_plan", "admission_assessment", "ot_plan", "discharge_planning", "section_17_leave"],
  "/capacity": ["capacity_assessment"],
};

const DOCUMENTS_BY_FORM: Partial<Record<FormSlug, SupportingDocumentId[]>> = {
  clinical_note: ["clinical_notes"],
  behaviour_log: ["behaviour_logs"],
  physical_health_obs: ["physical_health"],
  care_monitoring: ["care_monitoring"],
  capacity_assessment: ["capacity_assessment"],
  incident: ["incident_investigation"],
  cpa_section: ["cpa_discipline"],
  mdt_review: ["mdt_review"],
  tribunal_nursing_section: ["tribunal_nursing"],
  tribunal_rc_section: ["tribunal_rc"],
  management_hearing: ["management_hearing"],
  rapid_risk_review: ["rapid_risk_review"],
  restrictive_intervention_log: ["restrictive_practice_log"],
  crisis_plan: ["crisis_plan"],
  admission_assessment: ["admission_assessment"],
  ot_plan: ["ot_plan"],
  progress_report: ["progress_report"],
  discharge_planning: ["discharge_planning"],
  section_17_leave: ["s17_leave_risk"],
  risk_assessment: ["risk_assessment"],
  moj_report: ["moj_report"],
};

export function getModulesForOrganisation(organisationType: string | null | undefined): string[] {
  const key = canonicalOrganisationType(organisationType);
  const list = MODULES_BY_ORGANISATION[key] ?? MODULES_BY_ORGANISATION.default;
  return [...list];
}

export function isModulePathAllowedForOrganisation(
  modulePath: string,
  organisationType: string | null | undefined
): boolean {
  const allowed = new Set(getModulesForOrganisation(organisationType));
  return allowed.has(modulePath);
}

export function getSupportingDocumentsForWard(wardTypeRaw: string | null | undefined): SupportingDocumentId[] {
  const w = normalizeWardType(wardTypeRaw);
  const raw = w ? (DOCUMENTS_BY_WARD[w] ?? BASE_DOCUMENTS) : BASE_DOCUMENTS;
  return [...new Set(raw)];
}

export function isSupportingDocumentApplicableForWard(
  docId: SupportingDocumentId,
  wardTypeRaw: string | null | undefined
): boolean {
  const list = new Set(getSupportingDocumentsForWard(wardTypeRaw));
  return list.has(docId);
}

export function getFormsForModulePath(modulePath: string): FormSlug[] {
  return FORMS_BY_MODULE[modulePath] ? [...FORMS_BY_MODULE[modulePath]] : [];
}

export function getVisibleFormsForContext(args: {
  organisationType: string | null | undefined;
  modulePath: string;
  wardType?: string | null;
}): FormSlug[] {
  const forms = getFormsForModulePath(args.modulePath);
  if (!args.wardType) return forms;
  const docs = new Set(getDocumentsForWardType(args.wardType));
  return forms.filter((f) => {
    const needs = DOCUMENTS_BY_FORM[f];
    if (!needs?.length) return true;
    return needs.some((d) => docs.has(d));
  });
}

/**
 * Combined visibility for nav items: organisation module allowlist ∧ optional feature flag.
 */
export function isNavModuleVisible(args: {
  path: string;
  organisationType: string | null | undefined;
  /** If false, module is hidden regardless of registry. */
  featureAllowed?: boolean;
}): boolean {
  if (args.featureAllowed === false) return false;
  return isModulePathAllowedForOrganisation(args.path, args.organisationType);
}

/** Same care-like set as `utils/orgHelpers` `isCareSetting` — registry is the single place for org classification used by nav/reports. */
export function isCareLikeOrganisation(organisationType: string | null | undefined): boolean {
  const key = canonicalOrganisationType(organisationType);
  return ["care_home", "nursing_home", "supported_living", "domiciliary_care"].includes(key);
}

export function getReportPipelineValuesForOrganisation(
  organisationType: string | null | undefined
): ReportPipelineValue[] {
  const key = canonicalOrganisationType(organisationType);
  const list = REPORT_PIPELINES_BY_ORGANISATION[key] ?? REPORT_PIPELINES_BY_ORGANISATION.default;
  return [...list];
}

/**
 * Whether a report pipeline is allowed for org ∧ ward supporting documents.
 * Ward unknown → base document set (all pipelines that org allows remain available).
 */
export function isReportPipelineAllowedForContext(args: {
  pipeline: ReportPipelineValue;
  organisationType: string | null | undefined;
  wardTypeRaw?: string | null;
}): boolean {
  const orgOk = getReportPipelineValuesForOrganisation(args.organisationType).includes(args.pipeline);
  if (!orgOk) return false;
  const need = REPORT_PIPELINE_REQUIRED_DOCUMENTS[args.pipeline];
  if (!need?.length) return true;
  const docs = new Set(getSupportingDocumentsForWard(args.wardTypeRaw ?? null));
  return need.every((id) => docs.has(id));
}
