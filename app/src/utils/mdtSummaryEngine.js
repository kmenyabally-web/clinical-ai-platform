/**
 * Deterministic MDT-style summary from notes, behaviour logs, and incidents.
 * Groups clinical notes by discipline bucket for multi-disciplinary review screens.
 */

/** @typedef {{ id?: string, discipline?: string, content?: string, createdAt?: unknown, structured?: Record<string, unknown>, mdtReview?: Record<string, unknown> }} NoteLike */
/** @typedef {{ behaviourType?: string, severity?: string, trigger?: string, action?: string, createdAt?: unknown }} BehaviourLike */
/** @typedef {{ type?: string, severity?: string, description?: string, status?: string, reportedAt?: unknown, createdAt?: unknown }} IncidentLike */

const BUCKETS = ["nurse", "doctor", "psychologist", "ot", "salt", "other"];

/**
 * Map free-text discipline / role to canonical MDT bucket.
 * @param {string} raw
 */
export function disciplineToBucket(raw) {
  const d = (raw ?? "").toString().trim().toLowerCase();
  if (!d) return "other";

  if (
    d.includes("nurse") ||
    d.includes("support worker") ||
    d.includes("healthcare assistant") ||
    d.includes("head of care") ||
    d.includes("ward manager") ||
    d.includes("deputy ward") ||
    d.includes("hospital manager") ||
    d.includes("clinical lead") ||
    d.includes("activity coordinator") ||
    d.includes("carer")
  ) {
    return "nurse";
  }
  if (
    d.includes("psychiatr") ||
    d.includes("specialty doctor") ||
    d.includes("consultant") ||
    d.includes("gp") ||
    d.includes("doctor")
  ) {
    return "doctor";
  }
  if (d.includes("psycholog")) return "psychologist";
  if (d.includes("occupational")) return "ot";
  if (d.includes("speech") || d.includes("salt") || d.includes("slt")) return "salt";
  if (d.includes("physio") || d.includes("dietitian") || d.includes("social worker")) return "other";

  return "other";
}

function timeMillis(v) {
  if (!v) return 0;
  if (typeof v === "object" && v !== null && typeof v.toMillis === "function") {
    try {
      return v.toMillis();
    } catch {
      return 0;
    }
  }
  if (v instanceof Date) return v.getTime();
  const t = new Date(v);
  return Number.isNaN(t.getTime()) ? 0 : t.getTime();
}

/**
 * @param {object} params
 * @param {NoteLike[]} params.notes
 * @param {BehaviourLike[]} params.behaviours
 * @param {IncidentLike[]} params.incidents
 */
export function buildMdtDisciplineGroups({ notes, behaviours, incidents }) {
  /** @type {Record<string, NoteLike[]>} */
  const grouped = { nurse: [], doctor: [], psychologist: [], ot: [], salt: [], other: [] };
  const list = Array.isArray(notes) ? notes : [];
  for (const n of list) {
    const disc = (n?.discipline ?? n?.role ?? "").toString();
    const key = disciplineToBucket(disc);
    const bucket = grouped[key] ? key : "other";
    grouped[bucket].push(n);
  }
  for (const k of BUCKETS) {
    if (!grouped[k]) grouped[k] = [];
    grouped[k].sort((a, b) => timeMillis(b?.createdAt) - timeMillis(a?.createdAt));
  }
  return { grouped, behaviours: Array.isArray(behaviours) ? behaviours : [], incidents: Array.isArray(incidents) ? incidents : [] };
}

/**
 * @param {object} params
 * @param {NoteLike[]} params.notes
 * @param {BehaviourLike[]} params.behaviours
 * @param {IncidentLike[]} params.incidents
 */
export function buildStructuredMdtSummary({ notes, behaviours, incidents }) {
  const { grouped } = buildMdtDisciplineGroups({ notes, behaviours, incidents });
  const noteTexts = (Array.isArray(notes) ? notes : []).map((n) => (n?.content ?? "").toString().trim()).filter(Boolean);
  const joinedNotes = noteTexts.join("\n").toLowerCase();

  const openIncidents = (Array.isArray(incidents) ? incidents : []).filter(
    (i) => (i?.status ?? "").toString().toLowerCase() !== "closed"
  );
  const highIncidents = (Array.isArray(incidents) ? incidents : []).filter((i) =>
    ["high", "critical", "severe"].includes((i?.severity ?? "").toString().toLowerCase())
  );

  const behaviourTrendParts = [];
  const bh = Array.isArray(behaviours) ? behaviours : [];
  if (bh.length) {
    const byType = {};
    for (const b of bh) {
      const t = (b?.behaviourType ?? "Other").toString();
      byType[t] = (byType[t] ?? 0) + 1;
    }
    behaviourTrendParts.push(
      `Recorded behaviour events (recent): ${bh.length}. By type: ${Object.entries(byType)
        .map(([k, v]) => `${k} (${v})`)
        .join(", ")}.`
    );
  } else {
    behaviourTrendParts.push("No structured behaviour logs in scope for this period.");
  }

  let medicationConcerns = "Insufficient data";
  if (joinedNotes.includes("medication") || joinedNotes.includes("mar") || joinedNotes.includes("stomp")) {
    const snippets = noteTexts
      .filter((t) => /medication|mar|tablet|stomp|prescription/i.test(t))
      .slice(0, 3);
    medicationConcerns =
      snippets.length > 0
        ? `Themes from notes: ${snippets.map((s) => s.slice(0, 220)).join(" | ")}`
        : "Medication mentioned in notes; review full entries for detail.";
  }

  const risks = [];
  if (highIncidents.length) risks.push(`${highIncidents.length} high/critical incident(s) on file — review outcomes and care plan alignment.`);
  if (openIncidents.length) risks.push(`${openIncidents.length} incident(s) not closed — governance follow-up.`);
  const riskFromNotes = (Array.isArray(notes) ? notes : [])
    .map((n) => n?.structured?.risk ?? n?.risk)
    .filter((r) => r && String(r).toLowerCase() === "high");
  if (riskFromNotes.length) risks.push("One or more notes flag high risk — cross-check with behaviour and incidents.");

  const recommendationsByDiscipline = {};
  for (const key of ["nurse", "doctor", "psychologist", "ot", "salt", "other"]) {
    const arr = grouped[key] ?? [];
    const lines = [];
    for (const n of arr.slice(0, 5)) {
      const mr = n?.mdtReview;
      if (mr && typeof mr === "object") {
        const rec = Array.isArray(mr.recommendations) ? mr.recommendations : [];
        for (const r of rec) {
          if (r) lines.push(String(r));
        }
      }
    }
    if (!lines.length && arr.length) {
      lines.push(`Review latest ${arr.length} note(s) in this discipline for continuity and handover.`);
    }
    recommendationsByDiscipline[key] = lines.length ? [...new Set(lines)].slice(0, 8) : ["Insufficient structured recommendations — review raw notes."];
  }

  const presentation =
    noteTexts.length > 0
      ? `Latest narrative themes (from ${noteTexts.length} note(s)): ${noteTexts[0].slice(0, 400)}${noteTexts[0].length > 400 ? "…" : ""}`
      : "Insufficient data: no clinical note text in scope.";

  return {
    currentPresentation: presentation,
    risks: risks.length ? risks : ["No automated high-priority risk flags from structured fields; confirm with full record."],
    behaviourTrends: behaviourTrendParts.join(" "),
    medicationConcerns,
    recommendationsByDiscipline,
    grouped,
  };
}
