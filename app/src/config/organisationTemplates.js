// Smart organisation templates.
// Templates control which *optional* system modules are enabled for the tenant.

import { getCareTemplate } from "./careTemplates";

export const KNOWN_FEATURE_KEYS = [
  "clinicalNotes",
  "policies",
  "stomp",
  "mdt",
  "risk",
  "medication",
  "vitals",
  "careLogs",
  "inspection",
  "evidencePack",
  "tasks",
];

/** Organisation-type presentation/default profile (non-blocking; does not hide system modules). */
export const ORG_TYPE_PROFILES = {
  hospital: {
    label: "Hospital (Full System)",
    summary: "Full system enabled with complete clinical workflows.",
    defaults: { careModel: "full_system", clinicalFocus: "balanced" },
  },
  care_home: {
    label: "Care Home",
    summary: "Care-home defaults with reduced psychiatry emphasis in wording.",
    defaults: { careModel: "care_home", clinicalFocus: "no_psychiatry_default" },
  },
  nursing_home: {
    label: "Nursing Home",
    summary: "Nursing-home defaults prioritising physical health context.",
    defaults: { careModel: "nursing_home", clinicalFocus: "physical_health_first" },
  },
  supported_living: {
    label: "Supported Living",
    summary: "Simplified defaults for supported living workflows.",
    defaults: { careModel: "supported_living", clinicalFocus: "simplified" },
  },
};

// Baseline feature state for all templates:
// - optional modules default to `false` (unless the template explicitly enables them)
// - audit is always enabled (core capability)
export const DEFAULT_ORG_FEATURES = KNOWN_FEATURE_KEYS.reduce(
  (acc, k) => {
    acc[k] = false;
    return acc;
  },
  /** @type {Record<string, boolean>} */ ({ audit: true })
);

export const ORG_TEMPLATES = {
  GENERAL: {
    features: {
      clinicalNotes: true,
      policies: true,
      stomp: true,
      mdt: true,
      risk: true,
      medication: true,
      vitals: true,
      careLogs: false,
      inspection: true,
      evidencePack: true,
      tasks: true,
    },
    roles: ["Doctor", "Nurse", "Manager", "Support Worker"],
  },

  MENTAL_HEALTH: {
    features: {
      clinicalNotes: true,
      policies: true,
      stomp: true,
      mdt: true,
      risk: true,
      medication: true,
      vitals: true,
      inspection: true,
      evidencePack: true,
    },
    roles: ["Doctor", "Nurse", "Psychologist", "Support Worker"],
  },

  CARE_HOME: {
    features: {
      careLogs: true,
      medication: true,
      clinicalNotes: false,
      policies: true,
      stomp: true,
      mdt: false,
      risk: false,
      tasks: true,
    },
    roles: ["Carer", "Senior Carer", "Manager"],
  },

  NURSING_HOME: {
    features: {
      clinicalNotes: true,
      policies: true,
      stomp: true,
      medication: true,
      vitals: true,
      careLogs: true,
      tasks: true,
    },
    roles: ["Nurse", "Care Assistant", "Manager"],
  },
};

function normalizeLegacyOrgType(raw) {
  if (!raw) return null;
  const u = String(raw).trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(ORG_TEMPLATES, u) ? u : null;
}

export function getRolesForOrganisationType(type) {
  const care = getCareTemplate(type);
  if (care?.roles?.length) return care.roles;
  const t = normalizeLegacyOrgType(type) ?? "GENERAL";
  const template = ORG_TEMPLATES[t];
  return template?.roles ?? ORG_TEMPLATES.GENERAL.roles ?? [];
}

export function getFeaturesForOrganisationType(type) {
  // System-wide safe default: keep features available; org type should shape defaults/labels, not hide system.
  return {
    ...Object.fromEntries(KNOWN_FEATURE_KEYS.map((k) => [k, true])),
    audit: true,
  };
}

/** UI mode for {@link useUIMode}: CLINICAL | CARER | HYBRID */
export function getUiModeForOrganisationType(type, storedUiMode) {
  if (storedUiMode === "CLINICAL" || storedUiMode === "CARER" || storedUiMode === "HYBRID") {
    return storedUiMode;
  }
  return getCareTemplate(type)?.uiMode ?? "CLINICAL";
}

/** Non-blocking profile for labels/defaults by organisation type. */
export function getOrganisationTypeProfile(type) {
  const key = String(type ?? "hospital").trim().toLowerCase();
  return ORG_TYPE_PROFILES[key] ?? ORG_TYPE_PROFILES.hospital;
}

