/**
 * Evidence pack for discipline CPA AI — notes, incidents, behaviour, care plans, physical health, MDT summaries.
 * @param {{
 *   notes?: unknown[],
 *   incidents?: unknown[],
 *   behaviourLogs?: unknown[],
 *   physicalHealth?: unknown[],
 *   carePlans?: unknown[],
 *   mdtSummaryText?: string,
 * }} input
 */
export function buildCpaDisciplineEvidenceContext(input) {
  const lines = [];

  const mdt = (input.mdtSummaryText ?? "").toString().trim();
  if (mdt) {
    lines.push("=== MDT MULTI-DISCIPLINE SUMMARIES (from notes) ===");
    lines.push(mdt);
  }

  const notes = Array.isArray(input.notes) ? input.notes : [];
  if (notes.length) {
    lines.push("\n=== CLINICAL NOTES (excerpts) ===");
    notes.slice(0, 45).forEach((n, i) => {
      const text = (n?.content ?? n?.text ?? n?.body ?? "").toString().trim();
      const role = (n?.mdtRole ?? n?.createdByRole ?? "").toString();
      const created = n?.createdAt?.toDate?.()?.toISOString?.() ?? n?.createdAt ?? "";
      if (n?.structured && typeof n.structured === "object") {
        try {
          const s = n.structured;
          const bits = [s.summary, s.risk, s.progress].filter(Boolean).map((x) => String(x).slice(0, 500)).join(" | ");
          if (bits) lines.push(`${i + 1}. [Structured] ${bits}`);
        } catch {
          /* ignore */
        }
      }
      if (text) lines.push(`${i + 1}. [${role}] [${created}] ${text.slice(0, 1600)}`);
    });
  }

  const incidents = Array.isArray(input.incidents) ? input.incidents : [];
  if (incidents.length) {
    lines.push("\n=== INCIDENTS ===");
    incidents.slice(0, 30).forEach((x, i) => {
      const title = (x?.title ?? x?.type ?? "Incident").toString();
      const desc = (x?.description ?? x?.summary ?? "").toString().slice(0, 1000);
      lines.push(`${i + 1}. ${title}: ${desc}`);
    });
  }

  const beh = Array.isArray(input.behaviourLogs) ? input.behaviourLogs : [];
  if (beh.length) {
    lines.push("\n=== BEHAVIOUR LOGS ===");
    beh.slice(0, 30).forEach((b, i) => {
      const label = (b?.behaviourLabel ?? b?.label ?? "").toString();
      const detail = (b?.description ?? b?.notes ?? "").toString().slice(0, 700);
      lines.push(`${i + 1}. ${label}: ${detail}`);
    });
  }

  const phys = Array.isArray(input.physicalHealth) ? input.physicalHealth : [];
  if (phys.length) {
    lines.push("\n=== PHYSICAL HEALTH ===");
    phys.slice(0, 22).forEach((o, i) => {
      const news = o?.newsScore != null ? `NEWS ${o.newsScore}` : "";
      const risk = o?.riskLevel != null ? String(o.riskLevel) : "";
      lines.push(`${i + 1}. ${[news, risk].filter(Boolean).join(" · ") || "—"}`);
    });
  }

  const cps = Array.isArray(input.carePlans) ? input.carePlans : [];
  if (cps.length) {
    lines.push("\n=== CARE PLANS ===");
    cps.slice(0, 12).forEach((cp, i) => {
      const a = (cp?.careNeeds ?? "").toString().slice(0, 500);
      const b = (cp?.riskAssessment ?? "").toString().slice(0, 500);
      const c = (cp?.content ?? "").toString().slice(0, 500);
      lines.push(`${i + 1}. Needs: ${a || "—"} | Risks: ${b || "—"} | ${c}`);
    });
  }

  return lines.join("\n").slice(0, 120000);
}
