/**
 * SanctumCare unified clinical context — combines LD, mental health, ward type, and organisation type.
 * Used by AI prompts (CPA and other generators). Templates stay fixed; this layer is context-aware only.
 */

export const ORGANISATION_TYPES = ["hospital", "care_home", "nursing_home", "supported_living"] as const;
export type OrganisationTypeCanonical = (typeof ORGANISATION_TYPES)[number];

export const WARD_TYPES = ["acute", "picu", "rehab", "low_secure", "medium_secure"] as const;
export type WardTypeCanonical = (typeof WARD_TYPES)[number];

export type ClinicalContextInput = {
  hasLD: boolean;
  hasMentalHealth: boolean;
  wardType: string | null | undefined;
  organisationType: string | null | undefined;
  /** Echo for audit / prompt labelling */
  discipline?: string;
  sectionName?: string;
};

function canonicalOrgType(raw: string | null | undefined): string {
  const s = String(raw ?? "hospital")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (s === "mental_health" || s === "mh") return "hospital";
  return s || "hospital";
}

/** Normalise ward type labels from Firestore or UI. */
export function normalizeWardType(raw: unknown): WardTypeCanonical | null {
  const s = String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
  if (!s) return null;
  const aliases: Record<string, WardTypeCanonical> = {
    acute: "acute",
    picu: "picu",
    psychiatric_intensive_care: "picu",
    rehab: "rehab",
    rehabilitation: "rehab",
    low_secure: "low_secure",
    low: "low_secure",
    medium_secure: "medium_secure",
    medium: "medium_secure",
  };
  const v = aliases[s] ?? (WARD_TYPES.includes(s as WardTypeCanonical) ? (s as WardTypeCanonical) : null);
  return v;
}

/**
 * Structured meta object — include in telemetry and prompt headers.
 * All AI calls should carry these dimensions (real data only).
 */
export function buildAiContextMeta(input: ClinicalContextInput): Record<string, unknown> {
  return {
    discipline: input.discipline ?? "",
    sectionName: input.sectionName ?? "",
    hasLD: Boolean(input.hasLD),
    hasMentalHealth: Boolean(input.hasMentalHealth),
    wardType: normalizeWardType(input.wardType) ?? "",
    organisationType: canonicalOrgType(input.organisationType),
  };
}

/**
 * Human-readable instructions prepended to patient JSON in CPA / clinical AI prompts.
 * LD + MH + ward are always combined (final rule).
 */
export function buildClinicalContextPromptBlock(input: ClinicalContextInput): string {
  const org = canonicalOrgType(input.organisationType);
  const ward = normalizeWardType(input.wardType);
  const ld = Boolean(input.hasLD);
  const mh = Boolean(input.hasMentalHealth);

  const lines: string[] = [
    "=== SANCTUM CLINICAL CONTEXT (mandatory — apply with patient data; do not contradict recorded facts) ===",
    `Organisation type: ${org}.`,
    ward ? `Ward type: ${ward}.` : "Ward type: not specified.",
    `Learning disability (LD) pathway: ${ld ? "yes" : "no"}.`,
    `Mental health pathway: ${mh ? "yes" : "no"}.`,
    "Combine LD, mental health, and ward context where both/all apply — do not treat them in isolation.",
  ];

  if (ld) {
    lines.push(
      "LD: Frame behaviour as communication where appropriate; include PBS and communication needs; use clear, simple language."
    );
  }
  if (mh) {
    lines.push(
      "Mental health: Where data supports it, reflect diagnosis, mental state, medication, and clinical risk appropriately for the section."
    );
  }
  if (ward) {
    if (ward === "picu") {
      lines.push("PICU: Emphasise aggression-related themes, incidents, and high-intensity nursing observations where data exists.");
    } else if (ward === "acute") {
      lines.push("Acute: Emphasise crisis presentation, stabilisation, and immediate risk where data exists.");
    } else if (ward === "rehab") {
      lines.push("Rehab: Emphasise independence, occupational participation, and recovery goals where data exists.");
    } else if (ward === "low_secure" || ward === "medium_secure") {
      lines.push("Secure: Emphasise forensic/legal risk, security considerations, and restrictive practice only where recorded.");
    }
  }
  if (org === "care_home" || org === "nursing_home") {
    lines.push("Care / nursing home: Prioritise nursing and care monitoring narratives; avoid hospital-only psychiatry assumptions if data is absent.");
  }

  lines.push(
    "Use ONLY information present in Patient Data. If insufficient, state that clearly. Match tone to the discipline for this section."
  );
  lines.push("=== END SANCTUM CLINICAL CONTEXT ===");

  return lines.join("\n");
}

export type ClinicalContext = {
  hasLD: boolean;
  hasMentalHealth: boolean;
  organisationType: string;
  wardType: WardTypeCanonical | null;
  /** Final-rule marker: LD + MH + Ward must always be combined (always true). */
  combined: true;
  /** Used in AI prompts as structured instructions (no facts). */
  aiContextBlock: string;
  /** Used for UI visibility gating (never drives facts). */
  uiVisibility: {
    showPsychiatry: boolean;
    showPsychology: boolean;
    showNursingAndCareLogs: boolean;
    showRestrictivePracticeEmphasis: boolean;
    showForensicRiskEmphasis: boolean;
    /** LD framing always affects communication/PBS emphasis in narrative prompts. */
    ldFramingEnabled: boolean;
    /** MH framing always affects diagnosis/MSE/risk/medication emphasis in narrative prompts. */
    mhFramingEnabled: boolean;
  };
  /** Used in report systems to decide which sections should be emphasized. */
  reports: {
    includePBSAndCommunicationNeeds: boolean;
    includeDiagnosisMSEMedicationAndRisk: boolean;
    wardEmphasis: string | null;
  };
  /** Optional telemetry / debugging. */
  meta: ReturnType<typeof buildAiContextMeta>;
};

/**
 * Returns the single structured clinical context object used across:
 * - AI prompts
 * - UI visibility
 * - report generation
 *
 * Final rule: LD + MH + Ward must always be combined.
 */
export function deriveClinicalContext(input: ClinicalContextInput): ClinicalContext {
  const organisationType = canonicalOrgType(input.organisationType);
  const wardType = normalizeWardType(input.wardType);
  const hasLD = Boolean(input.hasLD);
  const hasMentalHealth = Boolean(input.hasMentalHealth);

  const isCareSetting = ["care_home", "nursing_home", "supported_living"].includes(organisationType);
  const showPsych = !isCareSetting && hasMentalHealth;
  const showPsychology = !isCareSetting && hasMentalHealth;

  const showRestrictivePracticeEmphasis = wardType === "picu";
  const showForensicRiskEmphasis = wardType === "low_secure" || wardType === "medium_secure";

  const aiContextBlock = buildClinicalContextPromptBlock({
    ...input,
    organisationType,
    wardType: wardType ?? input.wardType,
  });

  return {
    hasLD,
    hasMentalHealth,
    organisationType,
    wardType,
    combined: true,
    aiContextBlock,
    uiVisibility: {
      showPsychiatry: showPsych,
      showPsychology: showPsychology,
      showNursingAndCareLogs: true,
      showRestrictivePracticeEmphasis,
      showForensicRiskEmphasis,
      ldFramingEnabled: hasLD,
      mhFramingEnabled: hasMentalHealth,
    },
    reports: {
      includePBSAndCommunicationNeeds: hasLD,
      includeDiagnosisMSEMedicationAndRisk: hasMentalHealth,
      wardEmphasis: wardType ? `Ward emphasis: ${wardType}` : null,
    },
    meta: buildAiContextMeta({ ...input, organisationType, wardType: wardType ?? input.wardType }),
  };
}
