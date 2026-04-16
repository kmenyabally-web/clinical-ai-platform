/**
 * Client-side patient ↔ structure matching.
 * Handles legacy demo IDs and id/name drift between patient documents and hospital/ward pickers.
 */

function norm(s) {
  return String(s ?? "")
    .trim()
    .toLowerCase();
}

/** Known typos / older seed variants → canonical ids used in structure + current seed. */
const HOSPITAL_CANON = {
  hosp001: "hospital001",
  "hosp-001": "hospital001",
  hospital001: "hospital001",
};

const WARD_CANON = {
  ward001: "ward_picu",
  "ward-001": "ward_picu",
  ward_picu: "ward_picu",
};

export function canonicalHospitalId(id) {
  const x = String(id ?? "").trim();
  if (!x) return "";
  return HOSPITAL_CANON[x] || x;
}

export function canonicalWardId(id) {
  const x = String(id ?? "").trim();
  if (!x) return "";
  return WARD_CANON[x] || x;
}

/**
 * @param {Record<string, unknown>} p - patient row
 * @param {string | null | undefined} selectedHospitalId
 * @param {string | null | undefined} selectedHospitalName - from structure picker
 */
export function patientMatchesHospitalFilter(p, selectedHospitalId, selectedHospitalName) {
  if (!selectedHospitalId) return true;
  const selCanon = canonicalHospitalId(selectedHospitalId);
  const pCanon = canonicalHospitalId(p?.hospitalId);
  if (pCanon && selCanon && pCanon === selCanon) return true;
  const pn = norm(p?.hospitalName);
  const hn = norm(selectedHospitalName);
  if (pn && hn && pn === hn) return true;
  return false;
}

/**
 * @param {Record<string, unknown>} p
 * @param {string | null | undefined} selectedWardId
 * @param {string | null | undefined} selectedWardName
 */
export function patientMatchesWardFilter(p, selectedWardId, selectedWardName) {
  if (!selectedWardId) return true;
  const selCanon = canonicalWardId(selectedWardId);
  const pCanon = canonicalWardId(p?.wardId);
  if (pCanon && selCanon && pCanon === selCanon) return true;
  const pn = norm(p?.wardName);
  const wn = norm(selectedWardName);
  if (pn && wn && pn === wn) return true;
  return false;
}
