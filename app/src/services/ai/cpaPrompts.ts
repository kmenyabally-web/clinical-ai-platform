/**
 * CPA prompt bodies (STRICT STRUCTURED V4) — discipline-specific clinical templates.
 * Consumed by {@link ./cpaPromptBuilder#buildCPAPrompt} (builder switch unchanged).
 */

import type { CpaPromptPatientData } from "./cpaPatientDataTypes";

/** Shared instruction: CPA slices may include `abcLogs` and `nursingObs` from Firestore. */
const STRUCTURED_SOURCES_RULE =
  "DATA PRIORITY: Use structured ABC behaviour logs and structured nursing observations (when present in Patient Data) as the primary factual source for behaviour patterns, antecedents/consequences, observation level, medication adherence, nutrition, hydration, sleep, ADLs, continence, and risk where applicable. Supplement with narrative clinical notes only where structured data is missing — do NOT rely only on narrative notes when structured entries exist.";

const STRUCTURED_DISCIPLINE_V2_RULE =
  "STRUCTURED MDT DATA (V2): When Patient Data includes psychologyStructured, psychiatryStructured, otStructured, or saltStructured, treat those objects as the primary factual source for that discipline before narrative clinical notes. Cross-check with notes only where structured fields are empty or need context.";

const PSYCHOLOGY_FORMULATION_RULE =
  'FORMULATION: When the Patient Data object includes "formulation" or "formulationSummary", use predisposing, precipitating, perpetuating, and protective factors (and presenting problems, triggers, coping, strengths, risk formulation) to explain behaviour patterns and risk. Do not describe behaviour or incidents in isolation without linking to this formulation framework where data allows.';

const RISK_PRIORITISATION_RULE =
  'RISK: When "patientRisk" is present in Patient Data, use its overallRisk level, component scores (behaviour, incident, clinical), riskDrivers, and trend to prioritise safety-focused wording and recommendations. Address the highest-risk drivers explicitly.';

const EARLY_WARNING_RULE =
  'EARLY WARNINGS: When "activeAlerts" is present in Patient Data, use alert severity (high first), source discipline, type, and message to prioritise safety, safeguarding, and MDT recommendations. Reference active alert themes explicitly where they overlap the section (e.g. behaviour escalation, medication issues, swallowing risk, functional decline).';

/** Safe JSON for prompts (Timestamps → ISO; avoids circular errors). */
function patientDataJson(patientData: CpaPromptPatientData): string {
  try {
    return JSON.stringify(patientData, (_key, value) => {
      if (value instanceof Date) {
        return value.toISOString();
      }
      if (value != null && typeof value === "object" && typeof (value as { toDate?: () => Date }).toDate === "function") {
        try {
          return (value as { toDate: () => Date }).toDate().toISOString();
        } catch {
          return String(value);
        }
      }
      return value;
    });
  } catch {
    return "{}";
  }
}

export function psychologyPrompt(sectionName: string, patientData: CpaPromptPatientData): string {
  return `
Generate the "${sectionName}" section of a Psychology CPA report.

Follow this structure strictly:

1. Referral Context / Purpose
2. Engagement with Psychology
3. Psychological Formulation
4. Psychometric Assessments
5. Risk Assessment
6. Behavioural Presentation
7. Behavioural Management Strategies
8. Clinical Interventions (Direct and Indirect)
9. Progress Since Last CPA
10. Coping Strategies & Skills
11. Safeguarding Considerations
12. Summary
13. Recommendations

STRICT RULES:
- Only generate the requested section
- Use formulation where appropriate
- Do NOT generate full report
- If no data → "No information recorded"
- ${STRUCTURED_SOURCES_RULE}
- ${STRUCTURED_DISCIPLINE_V2_RULE}
- ${PSYCHOLOGY_FORMULATION_RULE}
- ${RISK_PRIORITISATION_RULE}
- ${EARLY_WARNING_RULE}

Patient Data:
${patientDataJson(patientData)}
`;
}

export function psychiatryPrompt(sectionName: string, patientData: CpaPromptPatientData): string {
  return `
Generate the "${sectionName}" section of a Psychiatry CPA report.

Follow this structure strictly:

1. Legal Status
2. Diagnoses
3. Clinical Progress
4. Mental State Examination
5. Risk Assessment
6. Pharmacological Treatment
7. Physical Health
8. MDT Input
9. Leave Status
10. Risk Management Plan
11. Social / Discharge Planning
12. Capacity & Insight
13. Progress Since Last CPA
14. Recommendations

STRICT RULES:
- Only generate the requested section
- Use medical diagnostic language
- No hallucination
- ${STRUCTURED_SOURCES_RULE}
- ${STRUCTURED_DISCIPLINE_V2_RULE}
- ${RISK_PRIORITISATION_RULE}
- ${EARLY_WARNING_RULE}

Patient Data:
${patientDataJson(patientData)}
`;
}

export function nursingPrompt(sectionName: string, patientData: CpaPromptPatientData): string {
  return `
Generate the "${sectionName}" section of a Nursing CPA report.

Follow this structure strictly:

1. Current Presentation
2. Observation Levels
3. Physical Health
4. Medication Management
5. Activities of Daily Living
6. Nutrition & Diet
7. Continence
8. Sleep
9. Mobility & Falls Risk
10. Communication
11. Social Functioning
12. Substance Use
13. Risk Management
14. Therapeutic Engagement
15. Patient Voice
16. Safeguarding
17. Progress Since Last CPA
18. Nursing Interventions
19. Discharge Planning
20. Recommendations

STRICT RULES:
- Only generate the requested section
- Focus on care, ADLs, observation
- No assumptions
- ${STRUCTURED_SOURCES_RULE}
- ${STRUCTURED_DISCIPLINE_V2_RULE}
- ${RISK_PRIORITISATION_RULE}
- ${EARLY_WARNING_RULE}

Patient Data:
${patientDataJson(patientData)}
`;
}

export function otPrompt(sectionName: string, patientData: CpaPromptPatientData): string {
  return `
Generate the "${sectionName}" section of an Occupational Therapy CPA report.

Follow this structure strictly:

1. Engagement with OT
2. Functional Assessment
3. Cognitive & Executive Function
4. Occupational Performance
5. Social & Community Skills
6. Risk & Safety in Activities
7. Sensory / Behavioural Observations
8. Progress Since Last CPA
9. OT Interventions
10. Discharge Planning
11. Recommendations

STRICT RULES:
- Only generate the requested section
- Focus on function, independence, ADLs, cognition
- Use occupational therapy clinical reasoning
- Do NOT generate full report
- If no data → "No information recorded"
- ${STRUCTURED_SOURCES_RULE}
- ${STRUCTURED_DISCIPLINE_V2_RULE}
- ${RISK_PRIORITISATION_RULE}
- ${EARLY_WARNING_RULE}

Patient Data:
${patientDataJson(patientData)}
`;
}

export function saltPrompt(sectionName: string, patientData: CpaPromptPatientData): string {
  return `
Generate the "${sectionName}" section of a Speech and Language Therapy CPA report.

Follow this structure strictly:

1. Communication Profile
2. Functional Communication
3. Cognitive Communication
4. Speech Assessment
5. Swallowing / Dysphagia
6. Communication Environment
7. Progress Since Last CPA
8. SALT Interventions
9. Risks
10. Recommendations

STRICT RULES:
- Only generate the requested section
- Focus on communication ability, understanding, swallowing safety
- Use speech and language therapy clinical reasoning
- Do NOT generate full report
- If no data → "No information recorded"
- ${STRUCTURED_SOURCES_RULE}
- ${STRUCTURED_DISCIPLINE_V2_RULE}
- ${RISK_PRIORITISATION_RULE}
- ${EARLY_WARNING_RULE}

Patient Data:
${patientDataJson(patientData)}
`;
}
