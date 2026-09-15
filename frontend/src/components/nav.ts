import type { ComponentType } from "react";

import {
  ActivityGlyph,
  CheckCircleGlyph,
  ClockGlyph,
  HeartGlyph,
  SquarePencilGlyph,
  SquaresGlyph,
} from "@/components/icons";
import { DerivedPanel } from "@/components/panels/DerivedPanel";
import { HabitsPanel } from "@/components/panels/HabitsPanel";
import { HistoryPanel } from "@/components/panels/HistoryPanel";
import { InsightsPanel } from "@/components/panels/InsightsPanel";
import { LogPanel } from "@/components/panels/LogPanel";
import { SignalsPanel } from "@/components/panels/SignalsPanel";
import type { DashboardPanelProps } from "@/components/panels/types";

/** The six dashboard categories (design D3). */
export type CategoryId = "insights" | "log" | "habits" | "derived" | "signals" | "history";

export interface NavItem {
  readonly id: CategoryId;
  readonly label: string;
  readonly icon: ComponentType<{ readonly className?: string }>;
  readonly panel: ComponentType<DashboardPanelProps>;
}

/** Sidebar/tab-bar source of truth — display order is the array order (design D2). */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: "insights", label: "Insights", icon: SquaresGlyph, panel: InsightsPanel },
  { id: "log", label: "Log", icon: SquarePencilGlyph, panel: LogPanel },
  { id: "habits", label: "Habits", icon: CheckCircleGlyph, panel: HabitsPanel },
  { id: "derived", label: "Derived", icon: HeartGlyph, panel: DerivedPanel },
  { id: "signals", label: "Signals", icon: ActivityGlyph, panel: SignalsPanel },
  { id: "history", label: "History", icon: ClockGlyph, panel: HistoryPanel },
];

/**
 * Resolve a nav item by category id. Total by construction — `NAV_ITEMS`
 * covers every `CategoryId` — so callers never handle a missing entry.
 */
export function findNavItem(id: CategoryId): NavItem {
  for (const item of NAV_ITEMS) {
    if (item.id === id) {
      return item;
    }
  }
  // Unreachable while CategoryId stays in sync with NAV_ITEMS.
  throw new Error(`No nav item for category: ${id}`);
}
