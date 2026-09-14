/** Pure helpers for the hand-rolled SVG charts. */

export interface Pt {
  readonly x: number;
  readonly y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function linearScale(
  domain: readonly [number, number],
  range: readonly [number, number],
): (value: number) => number {
  const [domainMin, domainMax] = domain;
  const [rangeMin, rangeMax] = range;
  const domainSpan = domainMax - domainMin;
  if (domainSpan === 0) {
    const mid = (rangeMin + rangeMax) / 2;
    return () => mid;
  }
  return (value) =>
    rangeMin + ((value - domainMin) / domainSpan) * (rangeMax - rangeMin);
}

/** Round, human-friendly tick values between min and max (inclusive). */
export function niceTicks(
  min: number,
  max: number,
  count: number,
): readonly number[] {
  if (min === max) {
    return [min];
  }
  const rawStep = (max - min) / Math.max(1, count - 1);
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step =
    (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) *
    magnitude;
  const ticks: number[] = [];
  const first = Math.ceil(min / step) * step;
  for (let tick = first; tick <= max + step * 1e-9; tick += step) {
    ticks.push(tick);
  }
  return ticks;
}

/** SVG path string connecting the points with straight segments. */
export function linePath(points: readonly Pt[]): string {
  return points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`)
    .join(" ");
}

export interface Fit {
  readonly slope: number;
  readonly intercept: number;
}

/** Least-squares linear fit; null when fewer than 2 points or zero variance. */
export function linearRegression(points: readonly Pt[]): Fit | null {
  if (points.length < 2) {
    return null;
  }
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXX += point.x * point.x;
    sumXY += point.x * point.y;
  }
  const n = points.length;
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return null;
  }
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/** Pearson correlation coefficient; null when undefined (n < 2, zero variance). */
export function pearsonR(points: readonly Pt[]): number | null {
  if (points.length < 2) {
    return null;
  }
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumYY = 0;
  let sumXY = 0;
  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
    sumXX += point.x * point.x;
    sumYY += point.y * point.y;
    sumXY += point.x * point.y;
  }
  const n = points.length;
  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt(
    (n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY),
  );
  if (denominator === 0) {
    return null;
  }
  return numerator / denominator;
}
