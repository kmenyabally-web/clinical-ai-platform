type ObsWithNews = { newsScore?: unknown };

/**
 * Expects `observations` sorted with newest first (createdAt DESC).
 * Returns null when fewer than 3 rows (insufficient context).
 */
export function detectDeterioration(observations: ObsWithNews[] | null | undefined): string | null {
  if (!observations || observations.length < 3) return null;

  const latest = observations[0];
  const previous = observations[1];

  const ln = Number(latest?.newsScore);
  const pn = Number(previous?.newsScore);

  if (Number.isFinite(ln) && Number.isFinite(pn) && ln > pn) {
    return "⚠️ Risk increasing";
  }

  if (Number.isFinite(ln) && ln >= 5) {
    return "🚨 High clinical risk";
  }

  return "Stable";
}
