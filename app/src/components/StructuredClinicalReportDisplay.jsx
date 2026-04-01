import React from "react";
import GenericSectionedReport from "./GenericSectionedReport";

const SECTION_ORDER = [
  ["patientOverview", "Patient Overview"],
  ["currentPresentation", "Current Presentation"],
  ["riskAssessment", "Risk Assessment"],
  ["incidentsSummary", "Incident Summary"],
  ["behaviourAnalysis", "Behavioural Analysis"],
  ["medicationCompliance", "Medication Compliance"],
  ["MDTObservations", "MDT Observations"],
  ["legalContext", "Legal Context"],
  ["recommendation", "Clinical Recommendation"],
];

/**
 * @param {{ report: { title: string, sections: Record<string, string> }, filenameBase?: string }} props
 */
export default function StructuredClinicalReportDisplay({ report, filenameBase = "Clinical_Report" }) {
  return (
    <GenericSectionedReport
      report={report}
      sectionOrder={SECTION_ORDER}
      filenameBase={filenameBase}
      containerId="report-container"
      printRootClassName="structured-clinical-report-print-root"
    />
  );
}
