function toMillis(v) {
  if (!v) return 0;
  if (typeof v?.toMillis === "function") {
    try {
      return v.toMillis();
    } catch {
      return 0;
    }
  }
  if (typeof v?.toDate === "function") {
    try {
      return v.toDate().getTime();
    } catch {
      return 0;
    }
  }
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function getTrend(scoresHistory = []) {
  const history = Array.isArray(scoresHistory) ? scoresHistory : [];
  if (history.length < 2) return "stable";

  const sorted = [...history].sort((a, b) => toMillis(a?.createdAt) - toMillis(b?.createdAt));
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];

  const lastScore = Number(last?.overallScore ?? 0);
  const prevScore = Number(prev?.overallScore ?? 0);
  if (lastScore > prevScore) return "improving";
  if (lastScore < prevScore) return "declining";
  return "stable";
}
