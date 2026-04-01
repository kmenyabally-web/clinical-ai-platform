/**
 * Clinical-grade behaviour type list — structured for risk, AI, and inspection reporting.
 * Use {@link normalizeLegacyBehaviourType} when reading older Firestore labels.
 */

export const BEHAVIOUR_TYPES = [
  "Agitation",
  "Verbal Aggression",
  "Physical Aggression",
  "Self-Harm",
  "Suicidal Ideation",
  "Absconding Risk",
  "Medication Refusal",
  "Property Damage",
  "Sexualised Behaviour",
  "Withdrawal / Isolation",
  "Disinhibition",
  "Non-compliance",
  "Anxiety Episode",
  "Psychotic Episode",
  "Other",
];

/** Risk engine: elevated physical / safety behaviours. */
export const BEHAVIOUR_TYPES_HIGH_RISK = [
  "Physical Aggression",
  "Self-Harm",
  "Absconding Risk",
];

/** Risk engine: elevated verbal / arousal behaviours. */
export const BEHAVIOUR_TYPES_MEDIUM_RISK = ["Verbal Aggression", "Agitation"];

const LEGACY_NORMALISATION_MAP = {
  aggression: "Physical Aggression",
  "physical aggression": "Physical Aggression",
  verbal: "Verbal Aggression",
  "verbal aggression": "Verbal Aggression",
  "self-harm": "Self-Harm",
  "self harm": "Self-Harm",
  selfharm: "Self-Harm",
  absconding: "Absconding Risk",
  "absconding risk": "Absconding Risk",
  "medication refusal": "Medication Refusal",
  "medicationrefusal": "Medication Refusal",
  "property damage": "Property Damage",
  // Previous app labels (behaviourService v1)
  Aggression: "Physical Aggression",
  "Self-harm": "Self-Harm",
  Absconding: "Absconding Risk",
  "Medication refusal": "Medication Refusal",
};

/**
 * Map legacy / free-text labels to canonical {@link BEHAVIOUR_TYPES} where possible.
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeLegacyBehaviourType(raw) {
  if (raw == null || typeof raw !== "string") return "";
  const t = raw.trim();
  if (!t) return "";
  if (BEHAVIOUR_TYPES.includes(t)) return t;
  const lower = t.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(LEGACY_NORMALISATION_MAP, lower)) {
    return LEGACY_NORMALISATION_MAP[lower];
  }
  if (Object.prototype.hasOwnProperty.call(LEGACY_NORMALISATION_MAP, t)) {
    return LEGACY_NORMALISATION_MAP[t];
  }
  const byLower = BEHAVIOUR_TYPES.find((x) => x.toLowerCase() === lower);
  if (byLower) return byLower;
  return t;
}
