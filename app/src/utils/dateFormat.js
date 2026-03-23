/** Strict UK calendar date: DD/MM/YYYY */
export function parseUkDateString(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  const m = text.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(year, month - 1, day);
  if (Number.isNaN(d.getTime())) return null;
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) return null;
  return d;
}

/**
 * Converts HTML date input value (YYYY-MM-DD) to UK string DD/MM/YYYY.
 * @param {string} isoString
 * @returns {string|null}
 */
export function formatToUKDate(isoString) {
  if (!isoString || typeof isoString !== "string") return null;
  const m = isoString.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function toDate(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const uk = parseUkDateString(value);
    if (uk) return uk;
  }
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === "function") {
    try {
      const d = value.toDate();
      return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    } catch {
      return null;
    }
  }
  if (typeof value?.toMillis === "function") {
    const ms = value.toMillis();
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatUkDate(value, fallback = "—", options = {}) {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options,
  });
}

export function formatUkDateTime(value, fallback = "—", options = {}) {
  const d = toDate(value);
  if (!d) return fallback;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    ...options,
  });
}

export { toDate };
