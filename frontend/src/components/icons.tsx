import type { ReactElement } from "react";

/** Small SF-Symbol-flavored glyphs, tinted via `currentColor`. */

interface GlyphProps {
  readonly className?: string;
}

export function HeartGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

export function MoonGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export function FlameGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.048 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48z" />
      <path d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.547 5.975 5.975 0 0 1-2.133-1.04A5.99 5.99 0 0 0 12 18z" />
    </svg>
  );
}

export function WindGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9.59 4.59A2 2 0 1 1 11 8H2" />
      <path d="M12.59 19.41A2 2 0 1 0 14 16H2" />
      <path d="M17.73 7.73A2.5 2.5 0 1 1 19.5 12H2" />
    </svg>
  );
}

export function WalkGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="13" cy="4" r="2" fill="currentColor" stroke="none" />
      <path d="M13 6.5 12.2 13" />
      <path d="M12.2 13 15 21" />
      <path d="M12.2 13 9.5 21" />
      <path d="M13 8.5 17 10.5" />
      <path d="M13 8.5 9 10" />
    </svg>
  );
}

export function ScaleGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3" y="3" width="18" height="18" rx="4.5" />
      <path d="M8.5 10a3.5 3.5 0 0 1 7 0" />
      <path d="M12 10l1.8-2.6" />
    </svg>
  );
}

export function ActivityGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

export function StopwatchGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M10 3h4" />
      <path d="M12 3v3" />
      <path d="M12 13.5V9.8" />
      <path d="M12 13.5h2.6" />
    </svg>
  );
}

export function SunGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="m4.98 4.98 1.77 1.77" />
      <path d="m17.25 17.25 1.77 1.77" />
      <path d="m19.02 4.98-1.77 1.77" />
      <path d="m6.75 17.25-1.77 1.77" />
    </svg>
  );
}

export function TrashGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3.5 6h17" />
      <path d="M8.5 6V4.5A1.5 1.5 0 0 1 10 3h4a1.5 1.5 0 0 1 1.5 1.5V6" />
      <path d="M5.5 6l.8 13a2 2 0 0 0 2 1.9h7.4a2 2 0 0 0 2-1.9l.8-13" />
      <path d="M10 10.5v6" />
      <path d="M14 10.5v6" />
    </svg>
  );
}

export function CheckCircleGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="m8.3 12.4 2.5 2.5 4.9-5.3" />
    </svg>
  );
}

export function CircleGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
    </svg>
  );
}

export function SquaresGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </svg>
  );
}

export function SquarePencilGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M10.8 4.5H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5v-3.8" />
      <path d="M18.4 2.9a1.9 1.9 0 0 1 2.7 2.7L12 14.7l-4.3 1.2 1.2-4.3 9.5-8.7z" />
    </svg>
  );
}

export function ClockGlyph({ className = "h-4 w-4" }: GlyphProps): ReactElement {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  );
}
