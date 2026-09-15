## 1. Icons and navigation config

- [x] 1.1 Add new glyphs to `frontend/src/components/icons.tsx`: a Grid/Squares glyph for Insights, a SquarePencil glyph for Log, and a Clock/List glyph for History — matching the existing SF-Symbol-flavored `currentColor` SVG style
- [x] 1.2 Define the `NAV_ITEMS` config (type `{ id, label, icon, panel }`) with six entries in display order: Insights, Log, Habits, Derived, Signals, History

## 2. Sidebar and shell

- [x] 2.1 Create a `Sidebar` component that renders `NAV_ITEMS` with icon + label, highlights the active item, and is fixed-left on desktop (`md:` and up)
- [x] 2.2 Create a mobile variant (a horizontally scrollable top tab bar) that renders the same `NAV_ITEMS` and appears below the `md:` breakpoint
- [x] 2.3 Move the header controls (brand, `RangeSegmentedControl`, `HealthBadge`, `ThemeToggle`) into a persistent top-bar component shown across all categories

## 3. Extract category panels

- [x] 3.1 Extract an Insights panel (Favorites tiles, `WeightTrendChart` + `PersonalBestBoard`, `CorrelationPanel`) into its own component receiving data/range props
- [x] 3.2 Extract a Log panel (`ProfileForm`, `WeighInForm`, `LapForm`) into its own component
- [x] 3.3 Extract a Habits panel (`HabitCheckIn`, `HabitHistory`) into its own component
- [x] 3.4 Extract a Derived panel (`DerivedCards`) into its own component
- [x] 3.5 Extract a Signals panel (`HealthSignals`) into its own component
- [x] 3.6 Extract a History panel (`WeightHistory`, `LapHistory`) into its own component

## 4. Wire navigation

- [x] 4.1 Add `activeCategory` state to `HomePage` defaulting to `insights`
- [x] 4.2 Replace the single-scroll `page.tsx` body with the shell (sidebar + top bar + active panel only), keeping all data hooks/state in `HomePage` and passing them to panels as props (no refetch on navigation)
- [x] 4.3 Confirm every panel is reachable from exactly one category (no orphaned or duplicated components)

## 5. Polish

- [x] 5.1 Persist the last active category to `localStorage` (key `gfgf-nav`), defaulting to `insights` (optional per design D7)
- [x] 5.2 Verify responsive behavior: sidebar on desktop, horizontally scrollable tab bar below `md:`

## 6. Verification

- [x] 6.1 Run `npm run typecheck` in `frontend/` and confirm it is clean
- [x] 6.2 Manual smoke test: each category renders its expected panels, the default view is Insights, and navigation switches instantly with no data refetch
