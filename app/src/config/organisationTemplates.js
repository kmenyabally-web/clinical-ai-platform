// Smart organisation templates.
// Templates control which *optional* system modules are enabled for the tenant.

export const KNOWN_FEATURE_KEYS = [
  "clinicalNotes",
  "mdt",
  "risk",
  "medication",
  "vitals",
  "careLogs",
  "inspection",
  "evidencePack",
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
      mdt: true,
      risk: true,
      medication: true,
      vitals: true,
      careLogs: false,
      inspection: true,
      evidencePack: true,
    },
    roles: ["Doctor", "Nurse", "Manager", "Support Worker"],
  },

  MENTAL_HEALTH: {
    features: {
      clinicalNotes: true,
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
      mdt: false,
      risk: false,
    },
    roles: ["Carer", "Senior Carer", "Manager"],
  },

  NURSING_HOME: {
    features: {
      clinicalNotes: true,
      medication: true,
      vitals: true,
      careLogs: true,
    },
    roles: ["Nurse", "Care Assistant", "Manager"],
  },
};

function normalizeType(raw) {
  if (!raw) return null;
  const u = String(raw).trim().toUpperCase();
  return Object.prototype.hasOwnProperty.call(ORG_TEMPLATES, u) ? u : null;
}

export function getRolesForOrganisationType(type) {
  const t = normalizeType(type) ?? "GENERAL";
  const template = ORG_TEMPLATES[t];
  return template?.roles ?? ORG_TEMPLATES.GENERAL.roles ?? [];
}

export function getFeaturesForOrganisationType(type) {
  const t = normalizeType(type) ?? "GENERAL";
  const template = ORG_TEMPLATES[t] ?? ORG_TEMPLATES.GENERAL;
  const featuresFromTemplate = template?.features && typeof template.features === "object" ? template.features : {};

  // Start from baseline "all optional modules off", then apply template overrides.
  return {
    ...DEFAULT_ORG_FEATURES,
    ...featuresFromTemplate,
    audit: true,
  };
}

