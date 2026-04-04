/**
 * Aggregate evidence for RC tribunal AI — notes, incidents, behaviour, MDT extracts, care plans, physical health.
 * @param {{
 *   notes?: unknown[],
 *   incidents?: unknown[],
 *   behaviourLogs?: unknown[],
 *   physicalHealth?: unknown[],
 *   carePlans?: unknown[],
 * }} input
 * @returns {string}
 */
export function buildRcTribunalEvidenceContext(input) {
  const lines = [];

  const notes = Array.isArray(input.notes) ? input.notes : [];
  if (notes.length) {
    lines.push("=== CLINICAL NOTES ===");
    notes.slice(0, 45).forEach((n, i) => {
      const text = (n?.content ?? n?.text ?? n?.body ?? "").toString().trim();
      const role = (n?.mdtRole ?? n?.createdByRole ?? "").toString();
      const created = n?.createdAt?.toDate?.()?.toISOString?.() ?? n?.createdAt ?? "";
      if (n?.mdtReview && typeof n.mdtReview === "object") {
        try {
          lines.push(`${i + 1}. [MDT in note ${created}] ${JSON.stringify(n.mdtReview).slice(0, 2000)}`);
        } catch {
          /* ignore */
        }
      }
      if (n?.structured && typeof n.structured === "object") {
        try {
          const s = n.structured;
          const bits = [s.summary, s.risk, s.progress, s.medicationIssues, s.physicalHealth]
            .filter(Boolean)
            .map((x) => String(x).slice(0, 600))
            .join(" | ");
          if (bits) lines.push(`${i + 1}. [Structured] ${bits}`);
        } catch {
          /* ignore */
        }
      }
      if (n?.reports?.mdtReview && typeof n.reports.mdtReview === "object") {
        try {
          lines.push(`${i + 1}. [reports.mdtReview] ${JSON.stringify(n.reports.mdtReview).slice(0, 1500)}`);
        } catch {
          /* ignore */
        }
      }
      if (text) lines.push(`${i + 1}. [${role}] [${created}] ${text.slice(0, 1800)}`);
    });
  }

  const incidents = Array.isArray(input.incidents) ? input.incidents : [];
  if (incidents.length) {
    lines.push("\n=== INCIDENTS ===");
    incidents.slice(0, 35).forEach((x, i) => {
      const title = (x?.title ?? x?.type ?? "Incident").toString();
      const desc = (x?.description ?? x?.summary ?? "").toString().slice(0, 1200);
      lines.push(`${i + 1}. ${title}: ${desc}`);
    });
  }

  const beh = Array.isArray(input.behaviourLogs) ? input.behaviourLogs : [];
  if (beh.length) {
    lines.push("\n=== BEHAVIOUR LOGS ===");
    beh.slice(0, 35).forEach((b, i) => {
      const label = (b?.behaviourLabel ?? b?.label ?? b?.type ?? "Entry").toString();
      const detail = (b?.description ?? b?.notes ?? "").toString().slice(0, 800);
      lines.push(`${i + 1}. ${label}: ${detail}`);
    });
  }

  const phys = Array.isArray(input.physicalHealth) ? input.physicalHealth : [];
  if (phys.length) {
    lines.push("\n=== PHYSICAL HEALTH / OBSERVATIONS ===");
    phys.slice(0, 25).forEach((o, i) => {
      const news = o?.newsScore != null ? `NEWS ${o.newsScore}` : "";
      const risk = o?.riskLevel != null ? `risk ${o.riskLevel}` : "";
      const bits = [news, risk, o?.notes && String(o.notes).slice(0, 500)].filter(Boolean).join(" · ");
      lines.push(`${i + 1}. ${bits || "—"}`);
    });
  }

  const cps = Array.isArray(input.carePlans) ? input.carePlans : [];
  if (cps.length) {
    lines.push("\n=== CARE PLANS ===");
    cps.slice(0, 15).forEach((cp, i) => {
      const needs = (cp?.careNeeds ?? "").toString().slice(0, 600);
      const risks = (cp?.riskAssessment ?? "").toString().slice(0, 600);
      const strat = (cp?.supportStrategies ?? "").toString().slice(0, 600);
      const content = (cp?.content ?? "").toString().slice(0, 800);
      lines.push(`${i + 1}. Care needs: ${needs || "—"}`);
      if (risks) lines.push(`   Risk: ${risks}`);
      if (strat) lines.push(`   Strategies: ${strat}`);
      if (content) lines.push(`   Content: ${content}`);
    });
  }

  return lines.join("\n").slice(0, 120000);
}
