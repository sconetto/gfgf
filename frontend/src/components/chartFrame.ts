/** Shared geometry + sizing helpers for the hand-rolled SVG charts (viewBox units). */

export const CHART_WIDTH = 720;
export const CHART_WIDTH_COMPACT = 420;
export const CHART_HEIGHT_REGULAR = 250;
export const CHART_HEIGHT_COMPACT = 230;
export const CHART_PAD_LEFT = 68;
export const CHART_PAD_RIGHT = 18;
export const CHART_PAD_LEFT_COMPACT = 44;
export const CHART_PAD_RIGHT_COMPACT = 14;
export const CHART_PAD_TOP = 22;
export const CHART_PAD_BOTTOM = 30;

/**
 * Rough SF Pro advance-width estimate (a slight overestimate keeps tooltip
 * boxes and legends roomy). Pure presentation helper.
 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.62;
}
