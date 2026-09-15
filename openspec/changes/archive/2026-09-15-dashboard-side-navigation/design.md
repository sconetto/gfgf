## Context

The frontend is a Next.js 16 App Router app. The entire dashboard lives in
`frontend/src/app/page.tsx` — a single `"use client"` component that loads all data up
front (weights, session bests, personal bests, habit logs, health metrics, profile) via
`useLoad`/`useState` and renders every section in one vertical scroll: header, Favorites,
Log forms, DerivedCards, HabitHistory, Highlights (weight trend + personal-best board),
WeightHistory, CorrelationPanel, LapHistory, HealthSignals (48 signals), footer.

There are six distinct data concerns — summary/insights, data entry, habits, derived
metrics, health signals, and historical records — and as the app has grown, the single
scroll has become unwieldy. The goal is a persistent sidebar (modeled on Buffer's web
dashboard: logo, side navigation, top navigation bar) that groups these into category
panels.

Conventions to preserve:
- `Panel` component (`rounded-[12px] border border-separator bg-card p-5`) wraps each card.
- Theme tokens: `--health-bg` (page), `--card`, `--separator`, `--label`,
  `--label-secondary`, `--label-tertiary`, iOS status colors (`--ios-green`, `--ios-red`).
- Icons are hand-rolled SF-Symbol-flavored SVGs in `icons.tsx`, tinted via `currentColor`.
- Components are presentational; all data fetching and state lives in `HomePage`.

## Goals / Non-Goals

**Goals:**
- Split the single-page dashboard into six navigable category panels: Insights, Log,
  Habits, Derived, Signals, History.
- Persistent left sidebar (desktop) with icons + labels, active-state styling, and a top
  bar for global controls (brand, range, health badge, theme).
- Preserve every existing component, data flow, and visual style. No backend changes.
- Instant navigation (no route/refetch churn) and mobile-friendly behavior.

**Non-Goals:**
- No URL routing / deep-linking per category (single-user LAN app; client state suffices).
- No new data fetching, caching, or state libraries.
- No backend, database, or API changes.
- No redesign of individual charts/forms — only their organization.

## Decisions

**D1 — Client-side category state instead of App Router routes.**
Track the active category with `useState<CategoryId>` in `HomePage`; render only the
active panel. Rationale: the page already loads all data once and is fully client-side;
client state gives instant switching with no loading flash, no shared-state lifting, and
no route churn. Alternative considered: App Router routes (`/insights`, `/log`, …) — these
enable deep links/back-button but force lifting shared data into a provider or refetching
per route, adding complexity disproportionate to a single-user LAN app. Revisit only if
URL-addressable sections become a requirement.

**D2 — Data-driven nav config.**
Define a `NAV_ITEMS` array of `{ id, label, icon, panel }` (order defines display). The
sidebar renders from it and the active panel is looked up by `id`. Rationale: adding or
removing a category later is a one-line change and keeps `HomePage` free of hard-coded nav
markup.

**D3 — Category taxonomy and placement (no component duplication).**
- **Insights** — Favorites, Highlights (WeightTrendChart + PersonalBestBoard),
  CorrelationPanel.
- **Log** — ProfileForm, WeighInForm, LapForm.
- **Habits** — HabitCheckIn, HabitHistory.
- **Derived** — DerivedCards.
- **Signals** — HealthSignals.
- **History** — WeightHistory, LapHistory.
Rationale: groups each component with its related view (habit check-in + habit history
together; logging forms together; records together). HabitCheckIn lives in Habits (not
Log) to keep the habit lifecycle in one place.

**D4 — Shell layout.**
Wrap the app in a flex shell: fixed-width sidebar (left, desktop) + main column. Header
controls (brand, RangeSegmentedControl, HealthBadge, ThemeToggle) move into a top bar above
the active panel. Rationale: mirrors Buffer's side-nav + top-nav; keeps global controls
visible on every category.

**D5 — Responsive behavior.**
Desktop/tablet (≥ md): persistent left sidebar. Mobile (< md): collapse the sidebar into a
horizontally scrollable top tab bar (labels + icons). Rationale: avoids bottom-bar/hamburger
complexity while staying usable on phones; matches existing mobile grid behavior.

**D6 — Icons.**
Add ~3 new glyphs (Grid/Squares for Insights, SquarePencil for Log, Clock/List for History);
reuse ActivityGlyph (Signals), HeartGlyph (Derived), CheckCircleGlyph (Habits). Rationale:
minimal new SVG surface; consistent with the existing SF-Symbol-flavored `currentColor`
glyphs.

**D7 — Persist active category (optional).**
Persist the last active category to `localStorage` (key `gfgf-nav`), defaulting to
`insights`. Rationale: matches the existing `gfgf-theme` persistence pattern; trivial and
improves UX. Kept out of the spec so it is optional during implementation.

## Risks / Trade-offs

- [Reorganizing page.tsx is a large diff] → Extract panels into small commits first, then
  add the sidebar, then wire navigation; typecheck clean after each step.
- [Some panels may feel sparse (Derived has one card)] → Acceptable now; the taxonomy is
  extensible (D2) so future derived metrics slot into the Derived panel without rework.
- [HabitCheckIn moves from Log to Habits — muscle-memory change] → Still one click from the
  sidebar; grouping check-in with history is the intended "logical linking".
- [Losing "everything on one page" (Ctrl+F / scroll overview)] → Mitigate by keeping the
  Insights panel as a rich summary (favorites + trends + correlation) so the at-a-glance
  value is preserved on the default view.
- [Client-side state means no shareable deep link to a category] → Accepted non-goal (D1).

## Open Questions

- Exact icon set / category labels — defaults specified in D6, finalized during
  implementation.
- Whether the top bar also shows a small avatar/status element (Buffer shows avatar + status
  dot) — cosmetic and optional, not required for this change.
