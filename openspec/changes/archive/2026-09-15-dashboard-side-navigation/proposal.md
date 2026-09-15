## Why

The dashboard renders every feature — favorites, four logging forms, habits, derived
cards, 48 health-signal charts, weight history, lap history, and the correlation view —
as one long vertical scroll. As the app has grown, this single-page dump is hard to
navigate: related views (habit check-in vs. habit history, logging forms vs. their
histories) are scattered, and reaching a specific chart means scrolling past everything
else. A persistent side navigation — modeled on the Buffer web dashboard's sidebar
(logo, avatar, side navigation, top bar) — groups content into logical categories and
lets the user jump straight to what they need.

## What Changes

- Introduce a persistent left **sidebar navigation** that splits the single dashboard
  page into category panels, one visible at a time.
- Add category panels: **Insights** (favorites, weight trend, personal-best board,
  weight↔lap correlation), **Log** (profile, weigh-in, lap, and habit check-in forms),
  **Habits** (habit check-in + habit history), **Derived** (heart-rate zones and other
  derived metrics), **Signals** (all 48 health-signal charts), and **History**
  (weight and lap record tables).
- Move the app header (brand, global range control, backend health badge, theme toggle)
  into a top bar that persists across categories.
- Keep every existing component, data flow, and API intact — this is a pure
  layout/organization change. No backend or database changes.
- Extend the icon set and add active/inactive styling for sidebar items using existing
  theme tokens.

## Capabilities

### New Capabilities

<!-- none — this restructure changes how the existing dashboard is organized, not a new domain -->

### Modified Capabilities

- `dashboard`: add a requirement that the dashboard organizes its content into
  navigable category panels behind a persistent sidebar, with logical grouping and
  one active panel at a time.

## Impact

- Frontend only: `frontend/src/app/page.tsx` (reorganized into category panels),
  `frontend/src/app/layout.tsx` (app shell + sidebar mount), new sidebar/navigation
  components, `frontend/src/components/icons.tsx` (new glyphs). No API, database, or
  dependency changes.
