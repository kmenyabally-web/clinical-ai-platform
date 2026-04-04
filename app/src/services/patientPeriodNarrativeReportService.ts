/**
 * Deterministic clinical narratives for Weekly / Monthly patient summaries (no raw log dumps).
 */

import { getNoteBodyText } from "../utils/mdtNoteGrouping.js";
import { buildNarrative, buildClinicalParagraph, NARRATIVE_EMPTY_PERIOD } from "./narrativeBuilder";
import type { UnifiedReport } from "./reportEngine";
import { STRUCTURED_CLINICAL_REPORT_TAGLINE } from "../config/clinicalReportMessages";
import type { PatientPeriodMdtLoadResult } from "./patientPeriodMdtSummaryService";
import type { NursingObservation } from "../models/nursingModel";
import type { ABCEntry } from "../models/abcModel";
import type { PsychologyTrackingRecord } from "../models/psychologyModel";
import type { PsychiatryRecord } from "../models/psychiatryModel";
import type { OTRecord } from "../models/otModel";
import type { SALTRecord } from "../models/saltModel";

function sentenceCaseBody(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return "";
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
}

function noteToSentence(note: unknown): string {
  const raw = getNoteBodyText(note as Record<string, unknown>).trim();
  if (!raw) return "";
  return sentenceCaseBody(raw);
}

function incidentToSentence(raw: unknown): string {
  const x = raw as Record<string, unknown>;
  const title = typeof x.title === "string" ? x.title.trim() : "";
  const desc = typeof x.description === "string" ? x.description.trim() : "";
  const sev = typeof x.severity === "string" ? x.severity.trim() : "";
  if (!title && !desc) return "";
  let s = "An incident was recorded";
  if (sev) s += ` with ${sev} documented severity`;
  s += ".";
  if (title) s += ` ${sentenceCaseBody(title)}`;
  if (desc) s += ` ${sentenceCaseBody(desc)}`;
  return s.replace(/\s+/g, " ").trim();
}

function abcToSentence(e: ABCEntry): string {
  const a = e.antecedent?.trim() || "unspecified context";
  const b = e.behaviour?.trim() || "unspecified behaviour";
  const c = e.consequence?.trim() || "unspecified consequence";
  return `An ABC sequence was recorded (${e.severity} severity), with antecedent ${a}, observed behaviour ${b}, and consequence ${c}.`.replace(/\s+/g, " ");
}

function behaviourToSentence(raw: unknown): string {
  const x = raw as Record<string, unknown>;
  const bt = typeof x.behaviourType === "string" ? x.behaviourType.trim() : "";
  const custom = typeof x.behaviourCustom === "string" ? x.behaviourCustom.trim() : "";
  const sev = typeof x.severity === "string" ? x.severity.trim() : "";
  const tr = typeof x.trigger === "string" ? x.trigger.trim() : "";
  const act = typeof x.action === "string" ? x.action.trim() : "";
  if (!bt) return "";
  const typeLine = bt === "Other" && custom ? `${custom}` : bt;
  const parts = [
    `A structured behaviour entry documented ${typeLine.toLowerCase()}`,
    sev && `with ${sev} severity`,
    tr && `following trigger ${tr}`,
    act && `with response ${act}`,
  ].filter(Boolean);
  return sentenceCaseBody(parts.join(", ") + ".");
}

function adlsWashingPhrase(adls: NursingObservation["adls"]): string {
  if (adls && typeof adls === "object" && adls !== null && "washing" in adls) {
    const w = (adls as { washing?: string }).washing;
    if (w) return String(w);
  }
  if (typeof adls === "string" && adls.trim()) return adls.trim();
  return "variable";
}

function buildNursingObsNarratives(obs: NursingObservation[]): string[] {
  return obs.map((n) => {
    const wash = adlsWashingPhrase(n.adls);
    const level = n.observationLevel?.trim() || "general";
    const sleep = n.sleep?.trim() || "not stated";
    const nutrition = n.nutrition?.trim() || "not stated";
    const meds = n.medicationAdherence?.trim() || "not stated";
    const extra = [n.hydration && `Hydration was ${n.hydration}.`, n.riskLevel && `Nursing risk level was ${n.riskLevel}.`, n.physicalHealth?.trim() && `Physical health notes: ${n.physicalHealth.trim()}.`, n.notes?.trim() && `Additional nursing notes: ${n.notes.trim()}.`]
      .filter(Boolean)
      .join(" ");
    const core = `The patient required ${level} observation. Activities of daily living for washing were ${wash}. Sleep was ${sleep}. Nutrition was ${nutrition}. Medication adherence was ${meds}.`;
    return `${core} ${extra}`.replace(/\s+/g, " ").trim();
  });
}

function buildPsychologyNarrative(formulation: Record<string, unknown> | null, psychology: PsychologyTrackingRecord | null): string {
  const f = formulation && typeof formulation === "object" ? formulation : null;
  const precip = f && typeof f.precipitatingFactors === "string" ? f.precipitatingFactors.trim() : "";
  const perpet = f && typeof f.perpetuatingFactors === "string" ? f.perpetuatingFactors.trim() : "";
  const coping = psychology?.copingStrategies?.length ? psychology.copingStrategies.map((s) => String(s).trim()).filter(Boolean).join(", ") : "";

  const p1 = precip || "identified triggers where clinically recorded";
  const p2 = perpet || "ongoing behavioural and contextual patterns described in the record";
  const p3 = coping || "under review with the clinical team";

  return `Behaviour appears influenced by ${p1}. Maintaining factors include ${p2}. Coping strategies recorded in psychology tracking remain ${p3}.`.replace(/\s+/g, " ").trim();
}

function buildMedicalNarrative(psychiatry: PsychiatryRecord | null): string {
  if (!psychiatry) return "";
  const dx = psychiatry.diagnosis?.trim() || "ongoing assessment";
  const medMonitored = Array.isArray(psychiatry.medication) && psychiatry.medication.length > 0;
  const medPhrase = medMonitored ? "being monitored with prescribed entries on record" : "unclear from structured entries; confirm against the MAR and prescriber review";
  const mood = psychiatry.mse?.mood?.trim() || "no significant change clearly documented in the latest structured mental state entry";

  return `The patient remains under psychiatric review with a diagnosis framed as ${dx}. Medication adherence is ${medPhrase}. Mental state examination material indicates ${mood}.`.replace(/\s+/g, " ").trim();
}

function buildOtNarrative(ot: OTRecord | null): string {
  if (!ot) return "";
  const ind = ot.independenceLevel || "variable";
  const part = ot.activityParticipation?.trim() || "limited where described";
  return `Functional ability remains ${ind} in structured occupational therapy records. Engagement in structured activities is ${part}.`.replace(/\s+/g, " ").trim();
}

function commLevelPhrase(level: string | undefined): string {
  const l = String(level ?? "").toLowerCase();
  if (l === "verbal") return "largely verbal";
  if (l === "non-verbal" || l === "non_verbal") return "predominantly non-verbal";
  if (l === "limited") return "limited verbal communication";
  return "reduced or not fully described";
}

function buildSaltNarrative(salt: SALTRecord | null): string {
  if (!salt) return "";
  const comm = commLevelPhrase(salt.communicationLevel);
  const sw = salt.swallowRisk || "low";
  return `Communication ability is ${comm} in the latest SALT record. Swallowing risk is assessed as ${sw}.`.replace(/\s+/g, " ").trim();
}

function hasAnySignal(ctx: PatientPeriodMdtLoadResult): boolean {
  const g = ctx.grouped;
  const noteBuckets = [g.nursing, g.psychiatry, g.psychology, g.occupationalTherapy, g.speechAndLanguage, g.supportWorker].some((b) => Array.isArray(b) && b.length > 0);
  return (
    noteBuckets ||
    ctx.nursingObs.length > 0 ||
    ctx.incidents.length > 0 ||
    ctx.abcFiltered.length > 0 ||
    ctx.behaviours.length > 0 ||
    ctx.formulation != null ||
    ctx.psychologyRec != null ||
    ctx.psychiatryRec != null ||
    ctx.otRec != null ||
    ctx.saltRec != null
  );
}

/**
 * Build unified weekly/monthly report: full sentences, no numbered raw log lines.
 */
export function buildNarrativeWeeklyMonthlyUnifiedReport(ctx: PatientPeriodMdtLoadResult, reportTitle: string): UnifiedReport {
  const g = ctx.grouped;

  const nursingNotes = (g.nursing ?? []).map(noteToSentence).filter(Boolean);
  const incidentSents = ctx.incidents.map(incidentToSentence).filter(Boolean);
  const abcSents = ctx.abcFiltered.map(abcToSentence);
  const behaviourSents = ctx.behaviours.map(behaviourToSentence).filter(Boolean);

  let overallRaw = buildNarrative([...nursingNotes, ...behaviourSents, ...incidentSents, ...abcSents]);
  if (overallRaw === "No significant clinical updates recorded during this period." && hasAnySignal(ctx)) {
    const otherNotes = [
      ...(g.psychiatry ?? []).map(noteToSentence),
      ...(g.psychology ?? []).map(noteToSentence),
      ...(g.occupationalTherapy ?? []).map(noteToSentence),
      ...(g.speechAndLanguage ?? []).map(noteToSentence),
      ...(g.supportWorker ?? []).map(noteToSentence),
    ].filter(Boolean);
    overallRaw = buildNarrative([...nursingNotes, ...otherNotes, ...behaviourSents, ...incidentSents, ...abcSents]);
  }

  const overallSummary =
    !hasAnySignal(ctx) && overallRaw === "No significant clinical updates recorded during this period."
      ? NARRATIVE_EMPTY_PERIOD
      : overallRaw;

  const nursingFromObs = buildNarrative(buildNursingObsNarratives(ctx.nursingObs));
  const nursingNarrative =
    nursingFromObs === "No significant clinical updates recorded during this period."
      ? buildClinicalParagraph("Nursing", "")
      : buildClinicalParagraph("Nursing", nursingFromObs);

  const medicalNarrative = buildClinicalParagraph("Medical", buildMedicalNarrative(ctx.psychiatryRec));
  const psychNarrativeRaw = buildPsychologyNarrative(
    ctx.formulation && typeof ctx.formulation === "object" ? (ctx.formulation as Record<string, unknown>) : null,
    ctx.psychologyRec
  );
  const psychologyNarrative =
    !ctx.formulation && !ctx.psychologyRec
      ? buildClinicalParagraph("Psychology", "")
      : buildClinicalParagraph("Psychology", psychNarrativeRaw);

  const otNarrative = buildClinicalParagraph("Occupational Therapy", buildOtNarrative(ctx.otRec));
  const saltNarrative = buildClinicalParagraph("Speech & Language Therapy", buildSaltNarrative(ctx.saltRec));

  return {
    kind: "unified",
    title: reportTitle,
    summary: [STRUCTURED_CLINICAL_REPORT_TAGLINE, overallSummary].filter(Boolean).join("\n\n"),
    sections: [
      { heading: "1. Overall Summary", content: overallSummary },
      { heading: "2. Nursing", content: nursingNarrative },
      { heading: "3. Medical (Psychiatry / RC)", content: medicalNarrative },
      { heading: "4. Psychology", content: psychologyNarrative },
      { heading: "5. Occupational Therapy", content: otNarrative },
      { heading: "6. Speech & Language Therapy", content: saltNarrative },
    ],
    recommendations: [],
  };
}
