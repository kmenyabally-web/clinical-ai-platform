function parseDate(value) {
  if (!value) return null;
  if (typeof value?.toDate === "function") {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getStompAlerts(patient) {
  const alerts = [];
  const meds = Array.isArray(patient?.medications) ? patient.medications : [];
  if (!meds.length) return alerts;
  const now = new Date();

  meds.forEach((m, idx) => {
    const name = String(m?.name ?? "").trim() || `Medication ${idx + 1}`;
    const reviewDateRaw = m?.reviewDate ?? null;
    const reviewDate = parseDate(reviewDateRaw);
    if (!reviewDateRaw || !reviewDate) {
      alerts.push({
        severity: "medium",
        text: `${name}: Missing medication review date`,
      });
    } else if (reviewDate.getTime() < now.getTime()) {
      alerts.push({
        severity: "high",
        text: `${name}: Medication review overdue`,
      });
    }
    if (m?.hasReductionPlan !== true) {
      alerts.push({
        severity: "medium",
        text: `${name}: No reduction plan recorded`,
      });
    }
  });

  return alerts;
}
