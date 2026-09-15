import type { ReactElement } from "react";

interface BrandProps {
  /** Size class for the logo mark; defaults to the sidebar's 32px. */
  readonly markClassName?: string;
  /** Show the tagline under the name (sidebar variant only). */
  readonly withTagline?: boolean;
}

/**
 * Logo mark matching the app favicon (`frontend/src/app/icon.svg`): a rounded
 * square in the brand green with a bold monospace "gf". Brand colors are
 * literal asset colors (like the favicon), not theme tokens.
 */
function BrandMark({
  className = "h-8 w-8",
}: {
  readonly className?: string;
}): ReactElement {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="#16a34a" />
      <text
        x="16"
        y="21"
        fontFamily="monospace"
        fontSize="12"
        fontWeight="bold"
        textAnchor="middle"
        fill="#052e16"
      >
        gf
      </text>
    </svg>
  );
}

/**
 * Project brand: favicon-matching mark + name, with an optional tagline.
 * The full variant (with tagline) heads the desktop sidebar; the compact
 * variant (mark + name) covers mobile, where the sidebar is hidden.
 */
export function Brand({
  markClassName,
  withTagline = false,
}: BrandProps): ReactElement {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark className={markClassName ?? "h-8 w-8"} />
      <span className="flex flex-col">
        <span className="text-[15px] font-bold leading-tight text-label">gfgf</span>
        {withTagline ? (
          <span className="text-[11px] leading-tight text-label-secondary">
            get fit, get fast
          </span>
        ) : null}
      </span>
    </div>
  );
}
