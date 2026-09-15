import type { ReactElement } from "react";

import { Brand } from "@/components/Brand";
import { HealthBadge, type HealthState } from "@/components/HealthBadge";
import { RangeSegmentedControl, type ChartRange } from "@/components/RangeSegmentedControl";
import { ThemeToggle } from "@/components/ThemeToggle";

interface TopBarProps {
  readonly healthState: HealthState;
  readonly globalRange: ChartRange;
  readonly onGlobalRange: (range: ChartRange) => void;
}

/**
 * Persistent top bar with the global chart time range, shown across all
 * categories (design D4). The brand, health badge, and theme toggle live in
 * the sidebar footer on desktop; below `md:` the sidebar is hidden, so the
 * compact brand and the badge/toggle pair stay visible here.
 */
export function TopBar({
  healthState,
  globalRange,
  onGlobalRange,
}: TopBarProps): ReactElement {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-6 lg:px-8">
      <div className="md:hidden">
        <Brand markClassName="h-7 w-7" />
      </div>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <RangeSegmentedControl
          value={globalRange}
          onChange={onGlobalRange}
          label="Global chart time range"
        />
        <div className="flex items-center gap-2 md:hidden">
          <HealthBadge state={healthState} />
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
