export function getInspectionAlerts(domainScores) {
  const alerts = [];

  Object.entries(domainScores ?? {}).forEach(([domain, score]) => {
    if (score < 50) {
      alerts.push({
        domain,
        level: "critical",
        message: `${domain} domain is high risk`,
      });
    } else if (score < 70) {
      alerts.push({
        domain,
        level: "warning",
        message: `${domain} domain needs improvement`,
      });
    }
  });

  return alerts;
}
