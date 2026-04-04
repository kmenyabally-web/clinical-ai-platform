/**

 * Maps full CPA aggregate into the subset sent to the model for a given section title.

 */



import type { CpaAggregatedPatientData } from "./ai/cpaPatientDataTypes";

import { buildFormulationSummary } from "./formulationSummary";



function norm(sectionName: string): string {

  return String(sectionName ?? "")

    .trim()

    .toLowerCase()

    .replace(/\s+/g, " ");

}



function formulationExtras(data: CpaAggregatedPatientData): Record<string, unknown> {

  const f = data.formulation;

  const psych = data.psychology != null ? { psychologyStructured: data.psychology } : {};

  if (f == null || typeof f !== "object") {
    return psych;
  }

  const o = f as Record<string, unknown>;

  return {

    formulation: f,

    formulationSummary: buildFormulationSummary(o),

    ...psych,

  };

}



export function mapDataToSection(

  sectionName: string,

  data: CpaAggregatedPatientData

): Record<string, unknown> {

  const n = norm(sectionName);



  switch (sectionName) {

    case "Psychological Formulation":

      return formulationExtras(data);

    case "Presenting difficulties and psychological formulation":

      return formulationExtras(data);

    case "Risk Assessment":

      return {

        ...formulationExtras(data),

        incidents: data.incidents,

        behaviours: data.behaviours,

        abcLogs: data.abcLogs,

      };

    case "Physical Health":

      return {

        physicalHealth: data.physicalHealth,

      };

    case "Medication Management":

      return {

        nursingObs: data.nursingObs,

        medications: data.medications,

        notes: data.notes,

        psychiatryStructured: data.psychiatry,

      };

    case "Behavioural Presentation":

      return {

        ...formulationExtras(data),

        abcLogs: data.abcLogs,

      };

    case "Activities of Daily Living":

      return {

        nursingObs: data.nursingObs,

        careLogs: data.careLogs,

        otStructured: data.ot,

      };

    case "Mental State Examination":

      return {

        notes: data.notes,

        psychiatryStructured: data.psychiatry,

      };

    default:

      break;

  }



  if (n.includes("psychological formulation")) {

    return formulationExtras(data);

  }



  if (n.includes("risk assessment") || (n.includes("risk") && n.includes("protective factors"))) {

    return {

      ...formulationExtras(data),

      incidents: data.incidents,

      behaviours: data.behaviours,

      abcLogs: data.abcLogs,

    };

  }

  if (n.includes("medication")) {

    return {
      nursingObs: data.nursingObs,
      medications: data.medications,
      notes: data.notes,
      psychiatryStructured: data.psychiatry,
    };

  }

  if (n.includes("physical health") && !n.includes("medication")) {

    return { physicalHealth: data.physicalHealth };

  }

  if (

    n.includes("behavioural presentation") ||

    n.includes("behavioral presentation") ||

    (n.includes("behaviour") && n.includes("presentation")) ||

    (n.includes("behavior") && n.includes("presentation"))

  ) {

    return {

      ...formulationExtras(data),

      abcLogs: data.abcLogs,

      behaviours: data.behaviours,

    };

  }

  if (n.includes("activities of daily") || (n.includes("adl") && n.includes("living"))) {

    return { nursingObs: data.nursingObs, careLogs: data.careLogs, otStructured: data.ot };

  }

  if (n.includes("swallow") || n.includes("dysphagia")) {

    return { saltStructured: data.salt, notes: data.notes, nursingObs: data.nursingObs };

  }

  if (n.includes("occupational") || (n.includes("functional") && n.includes("assessment"))) {

    return { otStructured: data.ot, nursingObs: data.nursingObs, notes: data.notes, careLogs: data.careLogs };

  }

  if (

    n.includes("mental state examination") ||

    (n.includes("mental state") && (n.includes("examination") || n.includes("findings")))

  ) {

    return { notes: data.notes, psychiatryStructured: data.psychiatry };

  }

  if (n.includes("mdt") && (n.includes("summary") || n.includes("input") || n.includes("contribution"))) {

    return {

      mdtSummaryText: data.mdtSummaryText,

      mdtReviews: data.mdtReviews,

      notes: data.notes,

      abcLogs: data.abcLogs,

      nursingObs: data.nursingObs,

      ...formulationExtras(data),

    };

  }



  return {

    notes: data.notes,

    mdtSummaryText: data.mdtSummaryText,

    mdtReviews: data.mdtReviews,

    abcLogs: data.abcLogs,

    nursingObs: data.nursingObs,

    psychologyStructured: data.psychology,

    psychiatryStructured: data.psychiatry,

    otStructured: data.ot,

    saltStructured: data.salt,

    ...formulationExtras(data),

  };

}


