/** Local-date helpers (YYYY-MM-DD strings, matching the API contract). */

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  return ISO_DATE_PATTERN.test(value);
}

export function toLocalISO(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function todayLocalISO(): string {
  return toLocalISO(new Date());
}

/** Shift an ISO date back by `days` days (calendar-aware, local timezone). */
export function minusDaysISO(iso: string, days: number): string {
  const match = ISO_DATE_PATTERN.exec(iso);
  if (match === null) {
    return iso;
  }
  const [, yearRaw, monthRaw, dayRaw] = match;
  if (yearRaw === undefined || monthRaw === undefined || dayRaw === undefined) {
    return iso;
  }
  const date = new Date(Number(yearRaw), Number(monthRaw) - 1, Number(dayRaw));
  date.setDate(date.getDate() - days);
  return toLocalISO(date);
}

export function formatShortDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatShortDateTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
