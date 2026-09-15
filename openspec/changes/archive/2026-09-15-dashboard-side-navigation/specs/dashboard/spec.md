## ADDED Requirements

### Requirement: Organize dashboard into navigable category panels
The system SHALL group dashboard content into logical category panels — Insights, Log,
Habits, Derived, Signals, and History — presented behind a persistent sidebar, with exactly
one panel active at a time.

#### Scenario: Navigate between categories
- **WHEN** the user selects a category in the sidebar
- **THEN** the dashboard displays that category's panels, hides the other panels, and marks
  the selected item as active

#### Scenario: Default category on first load
- **WHEN** the dashboard loads with no previously selected category
- **THEN** the Insights panel is shown and marked active by default

#### Scenario: Every dashboard view is reachable from a category
- **WHEN** the dashboard renders
- **THEN** each existing view (favorites, profile/weigh-in/lap logging forms, habit check-in,
  habit history, derived cards, health-signal charts, weight history, lap history, personal
  best board, and correlation) is reachable from exactly one category
