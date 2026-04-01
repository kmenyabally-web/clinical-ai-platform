/**
 * CQC Five Key Questions — map heterogeneous records into domain buckets + summaries + gap detection.
 */

export const CQC_DOMAINS = ["SAFE", "EFFECTIVE", "CARING", "RESPONSIVE", "WELL_LED"];

const RISK_HIGH_RE = /\b(high risk|critical risk|severe|ligature|abscond|self-?harm|suicide|violence|assault)\b/i;
const MED_RE = /\b(medication|mar\b|prescription|prn|refused|omission|error)\b/i;
const BEHAVIOUR_RE = /\b(behaviour|behavior|aggression|abscond|restrictive|pmva|restraint)\b/i;
const VOICE_RE = /\b(wishes|preferences|advocate|best interests|capacity|consent|involved|family)\b/i;
const ACTION_RE = /\b(action|response|immediate|management plan|investigation|rca)\b/i;

function noteText(n) {
  if (!n || typeof n !== "object") return "";
  const o = /** @type {Record<string, unknown>} */ (n);
  const c = o.content ?? o.correctedNote ?? o.aiSummary ?? "";
  return String(c ?? "");
}

function isHighRiskNote(n) {
  const t = noteText(n);
  if (RISK_HIGH_RE.test(t)) return true;
  const st = n?.structured;
  if (st && typeof st === "object" && "riskLevel" in st) {
    const rl = String(/** @type {Record<string, unknown>} */ (st).riskLevel ?? "").toLowerCase();
    if (rl === "high" || rl === "critical") return true;
  }
  return String(n?.riskLevel ?? "").toLowerCase() === "high";
}

function isMedicationNote(n) {
  const t = noteText(n);
  if (MED_RE.test(t)) return true;
  return n?.medicationRefused === true || n?.medicationIssues === true;
}

function isBehaviourNote(n) {
  const t = noteText(n);
  if (BEHAVIOUR_RE.test(t)) return true;
  const d = String(n?.discipline ?? n?.category ?? "").toLowerCase();
  return d.includes("behaviour") || d.includes("behavior");
}

function isReviewNote(n) {
  const ty = String(n?.type ?? n?.noteType ?? n?.category ?? "").toLowerCase();
  return ty.includes("review") || ty.includes("mdt") || ty.includes("cpa");
}

function isInteractionNote(n) {
  const ty = String(n?.type ?? n?.category ?? "").toLowerCase();
  return ty.includes("interaction") || ty.includes("therapeutic") || ty.includes("1:1");
}

function containsPatientVoice(n) {
  return VOICE_RE.test(noteText(n));
}

function hasActionTaken(n) {
  return ACTION_RE.test(noteText(n)) || Boolean(n?.actionTaken);
}

function incidentToLine(inc) {
  const desc = String(inc?.description ?? inc?.summary ?? "").slice(0, 200);
  return `${inc?.type ?? "incident"} (${inc?.severity ?? "—"}): ${desc || inc?.id || "—"}`;
}

function trainingToLine(t) {
  return `${t?.trainingName ?? "Training"} — ${t?.status ?? "—"} (${t?.staffName ?? t?.staffId ?? "staff"})`;
}

function carePlanToLine(cp) {
  return `Care plan ${cp?.id?.slice?.(0, 8) ?? ""} — ${cp?.status ?? "—"}`;
}

function policyToLine(d) {
  return String(d?.title ?? d?.fileName ?? d?.id ?? "Policy");
}

function auditToLine(a) {
  return `${a?.action ?? a?.eventType ?? "audit"} — ${a?.userEmail ?? a?.userId ?? "—"}`;
}

/**
 * @param {{
 *   notes?: unknown[],
 *   incidents?: unknown[],
 *   carePlans?: unknown[],
 *   training?: unknown[],
 *   policies?: unknown[],
 *   audits?: unknown[],
 *   physicalObservations?: unknown[],
 * }} input
 */
export function mapEvidenceToDomains(input) {
  const notes = Array.isArray(input.notes) ? input.notes : [];
  const incidents = Array.isArray(input.incidents) ? input.incidents : [];
  const carePlans = Array.isArray(input.carePlans) ? input.carePlans : [];
  const training = Array.isArray(input.training) ? input.training : [];
  const policies = Array.isArray(input.policies) ? input.policies : [];
  const audits = Array.isArray(input.audits) ? input.audits : [];
  const physicalObservations = Array.isArray(input.physicalObservations) ? input.physicalObservations : [];

  return {
    SAFE: {
      incidents,
      riskNotes: notes.filter((n) => isHighRiskNote(n)),
      medicationIssues: notes.filter((n) => isMedicationNote(n)),
      behaviours: notes.filter((n) => isBehaviourNote(n)),
      physicalObservations,
    },
    EFFECTIVE: {
      carePlans,
      training,
      clinicalReviews: notes.filter((n) => isReviewNote(n)),
    },
    CARING: {
      interactions: notes.filter((n) => isInteractionNote(n)),
      patientVoice: notes.filter((n) => containsPatientVoice(n)),
      generalNotes: notes.filter((n) => !isInteractionNote(n) && noteText(n).length > 20).slice(0, 15),
    },
    RESPONSIVE: {
      incidents,
      responseActions: notes.filter((n) => hasActionTaken(n)),
    },
    WELL_LED: {
      audits,
      policies,
      governance: policies.filter((p) => String(p?.domainType ?? "").includes("governance")),
    },
  };
}

/**
 * Flatten domain bucket values to count items (arrays only).
 * @param {Record<string, unknown>} domainData
 */
function countEvidenceItems(domainData) {
  if (!domainData || typeof domainData !== "object") return 0;
  let n = 0;
  for (const v of Object.values(domainData)) {
    if (Array.isArray(v)) n += v.length;
  }
  return n;
}

/**
 * @param {string} domain
 * @param {Record<string, unknown>} data
 */
export function generateDomainSummary(domain, data) {
  const total = countEvidenceItems(data);
  if (!data || total === 0) {
    return {
      status: "⚠️ Missing evidence",
      message: "No supporting evidence found for this domain in the selected data. Upload notes, policies, or training records.",
    };
  }

  if (domain === "SAFE") {
    const inc = /** @type {unknown[]} */ (data.incidents ?? []);
    const risks = /** @type {unknown[]} */ (data.riskNotes ?? []);
    const phys = /** @type {unknown[]} */ (data.physicalObservations ?? []);
    const highNews = phys.filter((p) => String(p?.riskLevel ?? "").toLowerCase() === "high");
    if (inc.length > 0 || risks.length > 0 || highNews.length > 0) {
      return {
        status: "⚠️ Risk signals present",
        message: `Incidents (${inc.length}), elevated-risk notes (${risks.length}), and high NEWS physical observations (${highNews.length}). Ensure reviews, vitals escalation, and MAR checks are contemporaneous.`,
      };
    }
    return {
      status: "✅ Evidence present",
      message:
        phys.length > 0
          ? `Safety-related documentation located including ${phys.length} physical observation record(s).`
          : "Safety-related documentation located. Verify completeness at inspection.",
    };
  }

  if (domain === "EFFECTIVE") {
    const cp = /** @type {unknown[]} */ (data.carePlans ?? []);
    const tr = /** @type {unknown[]} */ (data.training ?? []);
    if (cp.length === 0 && tr.length === 0) {
      return {
        status: "⚠️ Gaps likely",
        message: "Limited care plan and training evidence in this extract.",
      };
    }
    return {
      status: "✅ Evidence present",
      message: `Care plans (${cp.length}) and training records (${tr.length}) available for sampling.`,
    };
  }

  if (domain === "CARING") {
    const pv = /** @type {unknown[]} */ (data.patientVoice ?? []);
    if (pv.length === 0) {
      return {
        status: "⚠️ Patient voice thin",
        message: "Few notes explicitly capture wishes, capacity, or involvement — strengthen person-centred record.",
      };
    }
    return {
      status: "✅ Evidence present",
      message: "Notes reference preferences, capacity, or involvement.",
    };
  }

  if (domain === "RESPONSIVE") {
    const inc = /** @type {unknown[]} */ (data.incidents ?? []);
    if (inc.length > 3) {
      return {
        status: "⚠️ Follow response themes",
        message: "Multiple incidents — ensure each has proportionate response and learning.",
      };
    }
    return {
      status: "✅ Evidence present",
      message: "Response and action themes documented where data exists.",
    };
  }

  if (domain === "WELL_LED") {
    const pol = /** @type {unknown[]} */ (data.policies ?? []);
    const aud = /** @type {unknown[]} */ (data.audits ?? []);
    if (pol.length === 0) {
      return {
        status: "⚠️ Governance gap",
        message: "No policy documents in evidence library for this scope.",
      };
    }
    return {
      status: "✅ Evidence present",
      message: `Policies (${pol.length}) and audit events (${aud.length}) listed.`,
    };
  }

  return {
    status: "✅ Evidence present",
    message: "Sufficient documentation available for sampling.",
  };
}

/**
 * @param {Record<string, Record<string, unknown>>} mapped
 */
export function buildCqcInspectionSections(mapped) {
  return CQC_DOMAINS.map((domain) => {
    const data = mapped[domain] ?? {};
    const summary = generateDomainSummary(domain, data);
    return {
      domain,
      status: summary.status,
      summary: summary.message,
      evidence: data,
    };
  });
}

/**
 * @param {{
 *   training?: unknown[],
 *   policies?: unknown[],
 *   incidents?: unknown[],
 *   notes?: unknown[],
 *   physicalObservations?: unknown[],
 * }} data
 */
export function detectCriticalIssues(data) {
  const issues = [];
  const training = data.training ?? [];
  const policies = data.policies ?? [];
  const incidents = data.incidents ?? [];
  const notes = data.notes ?? [];
  const physicalObservations = Array.isArray(data.physicalObservations) ? data.physicalObservations : [];

  if (!training.length) {
    issues.push("❌ No staff training records found for this organisation scope");
  }
  if (!policies.length) {
    issues.push("❌ No governance/policy documents in organisation evidence library");
  }
  if (incidents.length > 5) {
    issues.push(`⚠️ High incident count (${incidents.length}) — review themes and learning`);
  }
  if (!notes.length) {
    issues.push("⚠️ No clinical notes in extract — select a patient or widen scope");
  }

  const expiredTraining = training.filter((t) => t?.status === "Expired");
  if (expiredTraining.length > 0) {
    issues.push(`⚠️ ${expiredTraining.length} training record(s) expired`);
  }

  const highNewsPhys = physicalObservations.filter(
    (o) => String(o?.riskLevel ?? "").toLowerCase() === "high"
  );
  if (highNewsPhys.length > 0) {
    issues.push(
      `⚠️ ${highNewsPhys.length} physical observation(s) with high NEWS — immediate clinical review required`
    );
  }

  return issues;
}

/**
 * Normalise any item to a short display string for UI lists.
 * @param {unknown} item
 */
export function evidenceItemToDisplay(item) {
  if (item == null) return "—";
  if (typeof item === "string") return item.slice(0, 400);
  if (typeof item === "object") {
    const o = /** @type {Record<string, unknown>} */ (item);
    if (noteText(o)) return noteText(o).slice(0, 400);
    if (o.trainingName) return trainingToLine(o);
    if (o.description || o.type) return incidentToLine(o);
    if (o.title || o.fileName) return policyToLine(o);
    if (o.action || o.eventType) return auditToLine(o);
    if (o.status && o.id) return carePlanToLine(o);
  }
  return "Data item";
}
