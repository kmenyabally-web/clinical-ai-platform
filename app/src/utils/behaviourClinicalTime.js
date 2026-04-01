/**
 * Behaviour log timestamps: "when it happened" (clinical) vs record time (createdAt).
 * Prefer `clinicalTime` (ISO string), then legacy `eventAt`, then `createdAt`.
 */

/**
 * @param {unknown} entry
 * @returns {number} Epoch ms, or 0 if unknown
 */
export function getBehaviourClinicalTimeMs(entry) {
  if (!entry || typeof entry !== "object") return 0;

  if (typeof entry.clinicalTime === "string" && entry.clinicalTime.trim()) {
    const d = new Date(entry.clinicalTime.trim());
    if (!Number.isNaN(d.getTime())) return d.getTime();
  }

  const ev = entry.eventAt;
  if (ev && typeof ev.toDate === "function") {
    try {
      const d = ev.toDate();
      if (d && !Number.isNaN(d.getTime())) return d.getTime();
    } catch {
      /* ignore */
    }
  }

  const ca = entry.createdAt;
  if (ca && typeof ca.toDate === "function") {
    try {
      const d = ca.toDate();
      if (d && !Number.isNaN(d.getTime())) return d.getTime();
    } catch {
      /* ignore */
    }
  }

  return 0;
}

/**
 * Newest clinical event first (for timeline + analytics).
 * @template T
 * @param {T[]} entries
 * @returns {T[]}
 */
export function sortBehavioursByClinicalTimeDesc(entries) {
  const list = Array.isArray(entries) ? [...entries] : [];
  return list.sort((a, b) => getBehaviourClinicalTimeMs(b) - getBehaviourClinicalTimeMs(a));
}

/** UK-style display: DD/MM/YYYY, HH:mm (local). */
export function formatBehaviourClinicalUk(entry) {
  const ms = getBehaviourClinicalTimeMs(entry);
  if (!ms) return "—";
  const d = new Date(ms);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
}
