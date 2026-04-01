/**
 * In Vite dev (`import.meta.env.DEV`), merge these onto `organisation.features`
 * so local builds can exercise gated modules without Firestore/plan edits.
 * Production builds are unchanged.
 */
export const DEV_ORG_FEATURES_OVERRIDE = {
  ai: true,
  aiReports: true,
  evidencePack: true,
  inspection: true,
  inspectionSimulator: true,
  risk: true,
  riskEngine: true,
  reports: true,
  clinicalNotes: true,
  mdt: true,
  policies: true,
  medication: true,
  carePlans: true,
  tasks: true,
};

/**
 * @param {Record<string, unknown> | null | undefined} organisation
 * @returns {Record<string, unknown> | null | undefined}
 */
export function applyDevOrganisationFeatures(organisation) {
  if (!import.meta.env.DEV || !organisation || typeof organisation !== "object") {
    return organisation;
  }
  const merged = {
    ...organisation,
    features: { ...(organisation.features || {}), ...DEV_ORG_FEATURES_OVERRIDE },
  };
  // eslint-disable-next-line no-console -- intentional dev diagnostics
  console.log("FEATURE FLAGS:", merged.features);
  return merged;
}
