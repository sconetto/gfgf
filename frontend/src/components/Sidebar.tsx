import type { ReactElement } from "react";

import { Brand } from "@/components/Brand";
import { HealthBadge, type HealthState } from "@/components/HealthBadge";
import { NAV_ITEMS, type CategoryId } from "@/components/nav";
import { ThemeToggle } from "@/components/ThemeToggle";

interface NavControlProps {
  readonly active: CategoryId;
  readonly onSelect: (id: CategoryId) => void;
}

interface SidebarProps extends NavControlProps {
  readonly healthState: HealthState;
}

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-ios-blue/40";

/**
 * Persistent desktop sidebar (design D4/D5): fixed-width, sticks to the left
 * edge for the full viewport height on `md:` and up. The project brand heads
 * the column above a hairline divider; the active item gets the iOS
 * list-selection treatment — fill background, semibold label, and the
 * Apple-Health pink glyph. A fill container pinned to the bottom pairs the
 * theme toggle with stacked backend/db health chips (mobile shows the toggle
 * and a combined health pill in the top bar instead).
 */
export function Sidebar({
  active,
  onSelect,
  healthState,
}: SidebarProps): ReactElement {
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-separator bg-card px-3 py-5 md:flex">
      <div className="border-b border-separator px-3 pb-4">
        <Brand withTagline />
      </div>
      <nav aria-label="Dashboard categories" className="flex flex-col gap-0.5 pt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = item.id === active;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                onSelect(item.id);
              }}
              aria-current={isActive ? "page" : "false"}
              className={`flex items-center gap-3 rounded-[9px] px-3 py-2 text-left text-[15px] transition-colors ${FOCUS_RING} ${
                isActive
                  ? "bg-fill font-semibold text-label"
                  : "font-medium text-label-secondary hover:bg-fill/60 hover:text-label"
              }`}
            >
              <Icon
                className={`h-[18px] w-[18px] shrink-0 ${
                  isActive ? "text-ios-pink" : ""
                }`}
              />
              {item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto flex items-center justify-between gap-2 rounded-xl bg-fill p-2.5">
        <ThemeToggle />
        <HealthBadge state={healthState} variant="split" />
      </div>
    </aside>
  );
}

/**
 * Mobile variant (design D5): below `md:` the sidebar collapses into a
 * horizontally scrollable pill tab bar. Same NAV_ITEMS, same active state.
 */
export function MobileTabBar({ active, onSelect }: NavControlProps): ReactElement {
  return (
    <nav
      aria-label="Dashboard categories"
      className="flex gap-1.5 overflow-x-auto px-4 pb-3 md:hidden"
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.id === active;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              onSelect(item.id);
            }}
            aria-current={isActive ? "page" : "false"}
            className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${FOCUS_RING} ${
              isActive
                ? "bg-card font-semibold text-label shadow-sm"
                : "font-medium text-label-secondary hover:text-label"
            }`}
          >
            <Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-ios-pink" : ""}`} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
