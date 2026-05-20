export const dayStamp = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

const toSafeDate = (year, month, day) => {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;

  // Use noon local time to avoid timezone edge issues around midnight.
  const date = new Date(y, m - 1, d, 12, 0, 0, 0);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return null;
  }

  return date;
};

const parseNumericDate = (value) => {
  const trimmed = value.trim();

  // yyyy-mm-dd or yyyy/mm/dd or yyyy.mm.dd
  const ymd = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:\s+.*)?$/);
  if (ymd) {
    return toSafeDate(ymd[1], ymd[2], ymd[3]);
  }

  // dd-mm-yyyy or dd/mm/yyyy or dd.mm.yyyy
  const dmy = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})(?:\s+.*)?$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    return toSafeDate(year, month, day);
  }

  return null;
};

export const parseFlexibleDate = (rawDate) => {
  if (!rawDate) return null;

  if (rawDate instanceof Date) {
    return Number.isNaN(rawDate.getTime()) ? null : rawDate;
  }

  if (typeof rawDate === 'number') {
    // Accept both seconds and milliseconds timestamps.
    const milliseconds = rawDate < 1e12 ? rawDate * 1000 : rawDate;
    const date = new Date(milliseconds);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof rawDate === 'object' && typeof rawDate.toDate === 'function') {
    const date = rawDate.toDate();
    return date instanceof Date && !Number.isNaN(date.getTime()) ? date : null;
  }

  const value = String(rawDate).trim();
  if (!value) return null;

  const numericDate = parseNumericDate(value);
  if (numericDate) return numericDate;

  // Examples: "March 25, 2026", ISO date strings, etc.
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};
