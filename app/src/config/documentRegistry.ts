/**
 * Document & module registry — organisation type drives **modules** (nav / app surfaces);
 * ward type drives **supporting documents** (and optional extra form emphasis).
 * Use helpers from UI (Sidebar, patient hub, documents) and from report builders.
 */

import { NAV_ITEMS } from "./routes.js";
import { normalizeWardType, type WardTypeCanonical } from "../engine/clinicalContextEngine";

/** Every primary app module path from `routes.js` `NAV_ITEMS`. */
export const ALL_MODULE_PATHS: string[] = NAV_ITEMS.map((i) => i.path);

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

/** Module paths hidden for care-like orgs (psychiatry/psychology-heavy CPA surfaces). */
const CARE_LIKE_HIDDEN_MODULES = new Set<string>(["/psychology-formulation", "/mdt-structured-clinical"]);

/**
 * organisationType → allowed module paths (nav items). Hospital-like gets full clinical stack;
 * care-like orgs drop MDT psychology surfaces; unknown types fall back to hospital.
 */
export const MODULES_BY_ORGANISATION: Record<OrganisationRegistryKey, string[]> = {
  hospital: [...ALL_MODULE_PATHS],
  default: [...ALL_MODULE_PATHS],
  care_home: ALL_MODULE_PATHS.filter((p) => !CARE_LIKE_HIDDEN_MODULES.has(p)),
  nursing_home: ALL_MODULE_PATHS.filter((p) => !CARE_LIKE_HIDDEN_MODULES.has(p)),
  supported_living: ALL_MODULE_PATHS.filter((p) => !CARE_LIKE_HIDDEN_MODULES.has(p)),
  /** Domiciliary: align with care-like for psychiatry/psychology CPA modules. */
  domiciliary_care: ALL_MODULE_PATHS.filter((p) => !CARE_LIKE_HIDDEN_MODULES.has(p)),
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
  | "high_frequency_behaviour";

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
  acute: BASE_DOCUMENTS,
  picu: [
    ...BASE_DOCUMENTS,
    "restrictive_practice_log",
    "high_frequency_behaviour",
  ],
  rehab: BASE_DOCUMENTS,
  low_secure: BASE_DOCUMENTS,
  medium_secure: BASE_DOCUMENTS,
};

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
  | "incident"
  | "cpa_section"
  | "mdt_review"
  | "tribunal_nursing_section"
  | "tribunal_rc_section"
  | "management_hearing";

/** modulePath → forms available when that module is visible. */
export const FORMS_BY_MODULE: Record<string, FormSlug[]> = {
  "/clinical-notes": ["clinical_note"],
  "/behaviour": ["behaviour_log"],
  "/physical-health": ["physical_health_obs"],
  "/incidents": ["incident"],
  "/reports": ["cpa_section", "mdt_review", "tribunal_nursing_section", "tribunal_rc_section"],
  "/mdt": ["mdt_review"],
  "/care-plans": ["care_monitoring"],
  "/care-plan": ["care_monitoring"],
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
}): FormSlug[] {
  if (!isModulePathAllowedForOrganisation(args.modulePath, args.organisationType)) return [];
  return getFormsForModulePath(args.modulePath);
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
