/**
 * Return a single highest-priority CQC guidance insight for the provided context.
 *
 * @param {{
 *  missingReviewDate?: boolean,
 *  noPolicies?: boolean,
 *  missingIncidents?: boolean,
 *  noTraining?: boolean
 * }} context
 * @returns {{ level: "warning" | "info", message: string } | null}
 */
export function getCqcInsight(context = {}) {
  if (context.missingReviewDate) {
    return {
      level: "warning",
      message: "CQC inspectors expect evidence of regular medication reviews.",
    };
  }
  if (context.noPolicies) {
    return {
      level: "warning",
      message: "CQC inspectors expect current governance policies to be available in-system.",
    };
  }
  if (context.noTraining) {
    return {
      level: "warning",
      message: "CQC inspectors expect staff training records and competency evidence.",
    };
  }
  if (context.missingIncidents) {
    return {
      level: "info",
      message: "CQC inspections often ask for incident logs and learning outcomes evidence.",
    };
  }
  return null;
}
