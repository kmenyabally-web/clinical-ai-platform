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
  const care = getCareTemplate(type);
  if (care?.features) {
    return {
      ...DEFAULT_ORG_FEATURES,
      ...care.features,
      audit: true,
    };
  }
  const t = normalizeLegacyOrgType(type) ?? "GENERAL";
  const template = ORG_TEMPLATES[t] ?? ORG_TEMPLATES.GENERAL;
  const featuresFromTemplate = template?.features && typeof template.features === "object" ? template.features : {};

  return {
    ...DEFAULT_ORG_FEATURES,
    ...featuresFromTemplate,
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

