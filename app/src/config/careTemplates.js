import { CARE_TYPES } from "./careTypes";

/**
 * Per–care-type defaults: feature flags, roles, and UI shell ({@link useUIMode}).
 * Merged with {@link DEFAULT_ORG_FEATURES} in organisationTemplates.
 */
export const CARE_TEMPLATES = {
  HOSPITAL: {
    features: {
      clinicalNotes: true,
      mdt: true,
      risk: true,
      medication: true,
      tasks: true,
      stomp: true,
      vitals: true,
    },
    roles: ["Doctor", "Nurse", "Psychologist", "Support Worker"],
    uiMode: "CLINICAL",
  },

  MENTAL_HEALTH_UNIT: {
    features: {
      clinicalNotes: true,
      mdt: true,
      risk: true,
      medication: true,
      tasks: true,
      stomp: true,
      vitals: true,
    },
    roles: ["Doctor", "Nurse", "Psychologist", "Support Worker"],
    uiMode: "CLINICAL",
  },

  MENTAL_HEALTH: {
    features: {
      clinicalNotes: true,
      mdt: true,
      risk: true,
      medication: true,
      tasks: true,
      stomp: true,
    },
    roles: ["Doctor", "Nurse", "Psychologist", "Support Worker"],
    uiMode: "CLINICAL",
  },

  LD: {
    features: {
      clinicalNotes: true,
      mdt: true,
      risk: true,
      medication: true,
      tasks: true,
      stomp: true,
    },
    roles: ["Psychologist", "Nurse", "Support Worker", "Manager"],
    uiMode: "HYBRID",
  },

  CARE_HOME: {
    features: {
      careLogs: true,
      medication: true,
      tasks: true,
      clinicalNotes: false,
      mdt: false,
      vitals: true,
    },
    roles: ["Carer", "Senior Carer", "Manager"],
    uiMode: "CARER",
  },

  DOMICILIARY_CARE: {
    features: {
      tasks: true,
      careLogs: true,
      medication: true,
    },
    roles: ["Carer", "Coordinator"],
    uiMode: "CARER",
  },

  SUPPORTED_LIVING: {
    features: {
      tasks: true,
      careLogs: true,
      medication: true,
      risk: true,
      vitals: true,
    },
    roles: ["Support Worker", "Manager"],
    uiMode: "CARER",
  },

  NURSING_HOME: {
    features: {
      clinicalNotes: true,
      medication: true,
      vitals: true,
      tasks: true,
      careLogs: true,
    },
    roles: ["Nurse", "Care Assistant"],
    uiMode: "HYBRID",
  },
};

/** @param {string | null | undefined} type */
export function getCareTemplate(type) {
  const k = String(type ?? "").trim().toUpperCase();
  return CARE_TEMPLATES[k] ?? null;
}

/** Validate care type string (optional helper for forms). */
export function isKnownCareType(type) {
  const k = String(type ?? "").trim().toUpperCase();
  return CARE_TYPES.includes(k);
}
