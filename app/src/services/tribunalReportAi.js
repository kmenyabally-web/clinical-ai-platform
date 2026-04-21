import { generateAIContent } from "./geminiAiService.js";
import { buildNursingTribunalPrompt } from "./ai/tribunalPromptBuilder.ts";

/**
 * Build a single text blob for AI context from live records.
 * @param {{
 *   notes?: unknown[],
 *   incidents?: unknown[],
 *   behaviourLogs?: unknown[],
 *   physicalHealth?: unknown[],
 *   capacityAssessment?: unknown,
 * }} input
 * @returns {string}
 */
export function buildTribunalEvidenceContext(input) {
  const lines = [];

  const notes = Array.isArray(input.notes) ? input.notes : [];
  if (notes.length) {
    lines.push("=== CLINICAL NOTES (excerpts) ===");
    notes.slice(0, 40).forEach((n, i) => {
      const text = (n?.content ?? n?.text ?? n?.body ?? "").toString().trim();
      const created = n?.createdAt?.toDate?.()?.toISOString?.() ?? n?.createdAt ?? "";
      if (text) lines.push(`${i + 1}. [${created}] ${text.slice(0, 1500)}`);
    });
  }

  const incidents = Array.isArray(input.incidents) ? input.incidents : [];
  if (incidents.length) {
    lines.push("\n=== INCIDENTS ===");
    incidents.slice(0, 30).forEach((x, i) => {
      const title = (x?.title ?? x?.type ?? "Incident").toString();
      const desc = (x?.description ?? x?.summary ?? "").toString().slice(0, 1200);
      lines.push(`${i + 1}. ${title}: ${desc}`);
    });
  }

  const beh = Array.isArray(input.behaviourLogs) ? input.behaviourLogs : [];
  if (beh.length) {
    lines.push("\n=== BEHAVIOUR LOGS ===");
    beh.slice(0, 30).forEach((b, i) => {
      const label = (b?.behaviourLabel ?? b?.label ?? b?.type ?? "Entry").toString();
      const detail = (b?.description ?? b?.notes ?? "").toString().slice(0, 800);
      lines.push(`${i + 1}. ${label}: ${detail}`);
    });
  }

  const phys = Array.isArray(input.physicalHealth) ? input.physicalHealth : [];
  if (phys.length) {
    lines.push("\n=== PHYSICAL HEALTH / OBSERVATIONS ===");
    phys.slice(0, 20).forEach((o, i) => {
      const news = o?.newsScore != null ? `NEWS ${o.newsScore}` : "";
      const risk = o?.riskLevel != null ? `risk ${o.riskLevel}` : "";
      const bits = [news, risk, o?.notes && String(o.notes).slice(0, 400)].filter(Boolean).join(" · ");
      lines.push(`${i + 1}. ${bits || JSON.stringify(o).slice(0, 300)}`);
    });
  }

  const cap = input?.capacityAssessment && typeof input.capacityAssessment === "object" ? input.capacityAssessment : null;
  if (cap) {
    lines.push("\n=== CAPACITY ASSESSMENT ===");
    lines.push(`Decision type: ${String(cap.decisionType ?? "—")}`);
    lines.push(`Outcome: ${cap.lacksCapacity === true ? "Lacks capacity" : "Capacity present"}`);
    const keyReasoning =
      String(cap.stage1Details ?? "").trim() ||
      String(cap.assessmentWarning ?? "").trim() ||
      String(cap.understandReasoning?.clinicianInterpretation ?? "").trim() ||
      String(cap.outcomeSummary ?? "").trim();
    lines.push(`Key reasoning: ${keyReasoning || "Not recorded"}`);
    const bestInterests =
      String(cap.chosenOption ?? "").trim() ||
      String(cap.justification ?? "").trim() ||
      String(cap.bestInterestsNotes ?? "").trim();
    lines.push(`Best interests: ${bestInterests ? bestInterests.slice(0, 1200) : "Not recorded"}`);
  }

  return lines.join("\n").slice(0, 100000);
}

/**
 * One AI call per nursing tribunal section — prompts from {@link ./ai/tribunalPromptBuilder}.
 * @param {{ sectionTitle: string, sectionType: string, evidenceText: string }} args
 * @returns {Promise<string | null>}
 */
export async function generateTribunalSectionAI({ sectionTitle, sectionType, evidenceText }) {
  const prompt = buildNursingTribunalPrompt({ sectionTitle, sectionType, evidenceText });
  return generateAIContent(prompt, { temperature: 0.15 });
}

/**
 * Best-effort parse first line Yes/No for yesno / yesno_text fields.
 * @param {string} raw
 * @returns {{ yesNo: string, rest: string }}
 */
export function parseYesNoPrefix(raw) {
  const text = (raw ?? "").toString().trim();
  if (!text) return { yesNo: "", rest: "" };
  const firstLine = text.split(/\r?\n/)[0]?.trim() ?? "";
  const lower = firstLine.toLowerCase();
  let yesNo = "";
  if (/^yes\b/i.test(firstLine)) yesNo = "yes";
  else if (/^no\b/i.test(firstLine)) yesNo = "no";
  const rest = text.includes("\n") ? text.slice(text.indexOf("\n") + 1).trim() : yesNo ? "" : text;
  return { yesNo, rest: yesNo ? rest : text };
}
