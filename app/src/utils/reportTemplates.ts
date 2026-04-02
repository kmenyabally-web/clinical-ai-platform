/**
 * Report templates to drive consistent section rendering.
 *
 * These are UI/render templates; the AI engine may still generate different section
 * headings. We map/transform available report content to these template sections
 * in the report pages.
 */
export function getReportTemplate(type, discipline, orgType) {
  const org = (orgType ?? "hospital")?.toString?.().trim?.().toLowerCase?.() ?? "hospital";
  const isCare = ["care_home", "nursing_home", "supported_living"].includes(org);

  //-----------------------------------
  // CARE SETTINGS (NO MDT)
  //-----------------------------------
  if (isCare) {
    return [
      "1. Daily Care Summary",
      "2. Physical Health",
      "3. Nutrition & Hydration",
      "4. Behaviour",
      "5. Risks",
      "6. Actions Taken",
      "7. Recommendations",
    ];
  }

  //-----------------------------------
  // DISCIPLINE REPORT
  //-----------------------------------
  if (discipline) {
    return [
      "1. Patient Overview",
      "2. Current Presentation",
      "3. Key Risks",
      "4. Interventions",
      "5. Progress",
      "6. Recommendations",
      "7. Plan",
    ];
  }

  //-----------------------------------
  // MDT REPORT
  //-----------------------------------
  return [
    "1. Overall Summary",
    "2. Nursing",
    "3. Medical",
    "4. Psychology",
    "5. Occupational Therapy",
    "6. Speech & Language",
    "7. Risk Summary",
    "8. Plan",
  ];
}

