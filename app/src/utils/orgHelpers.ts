/**
 * Organisation-type helpers (care setting vs clinical setting).
 *
 * Note: organisation `type` is stored as lowercase values in Firestore.
 * If the type is missing, default behaviour is the clinical setting: `hospital`.
 */

export function isCareSetting(type) {
  const raw = type ?? "";
  const t = raw?.toString?.().trim?.() ?? "";
  const canonical = t.toLowerCase();
  return ["care_home", "nursing_home", "supported_living", "domiciliary_care"].includes(canonical);
}

export function isClinicalSetting(type) {
  // Default behaviour (and safe fallback): treat unknown / missing types as "hospital" (clinical).
  const raw = type ?? "";
  const t = raw?.toString?.().trim?.() ?? "";
  if (!t) return true;
  return !isCareSetting(t);
}

