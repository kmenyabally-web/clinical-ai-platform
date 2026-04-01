/**
 * Build Recharts-friendly trend rows from physical observations.
 * Input may be in any order; output is chronological (oldest → newest) for left-to-right charts.
 */

type Obs = Record<string, unknown>;

function createdAtToDate(createdAt: unknown): Date {
  if (createdAt && typeof (createdAt as { toDate?: () => Date }).toDate === "function") {
    try {
      return (createdAt as { toDate: () => Date }).toDate();
    } catch {
      /* fall through */
    }
  }
  if (createdAt && typeof (createdAt as { seconds?: number }).seconds === "number") {
    return new Date((createdAt as { seconds: number }).seconds * 1000);
  }
  const d = new Date(createdAt as string | number);
  return Number.isNaN(d.getTime()) ? new Date(0) : d;
}

function createdAtMs(o: Obs): number {
  return createdAtToDate(o.createdAt).getTime();
}

function num(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Maps observations to chart points. Sorts by time ascending so the X axis reads naturally.
 * Firestore `Timestamp` is supported in addition to `Date` and ISO strings.
 */
export function buildTrendData(observations: unknown[]) {
  const rows = [...(Array.isArray(observations) ? observations : [])];
  rows.sort((a, b) => createdAtMs(a as Obs) - createdAtMs(b as Obs));
  return rows.map((raw) => {
    const o = raw as Obs;
    const d = createdAtToDate(o.createdAt);
    return {
      date: d.toLocaleDateString(),
      news: num(o.newsScore),
      pulse: num(o.pulse),
      temp: num(o.temperature),
    };
  });
}

/** Latest-first order for deterioration logic and tables (createdAt DESC). */
export function sortObservationsByCreatedAtDesc(observations: unknown[]): unknown[] {
  const rows = [...(Array.isArray(observations) ? observations : [])];
  rows.sort((a, b) => createdAtMs(b as Obs) - createdAtMs(a as Obs));
  return rows;
}
