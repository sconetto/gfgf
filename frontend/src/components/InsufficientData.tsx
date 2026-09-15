import type { ReactElement } from "react";

import { ActivityGlyph } from "@/components/icons";

export function InsufficientData({
  message,
  hint,
}: {
  readonly message: string;
  readonly hint?: string;
}): ReactElement {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[12px] border border-separator bg-card px-4 py-8 text-center">
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full bg-separator/60 text-label-tertiary"
        aria-hidden="true"
      >
        <ActivityGlyph className="h-4 w-4" />
      </span>
      <p className="text-[13px] text-label-secondary">{message}</p>
      {hint === undefined ? null : (
        <p className="text-xs text-label-tertiary">{hint}</p>
      )}
    </div>
  );
}
