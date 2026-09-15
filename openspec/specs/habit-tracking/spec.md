## Requirements

### Requirement: Record a daily habit log
The system SHALL allow recording a daily log for a given date with an "exercised" flag and optional extensible habit flags.

#### Scenario: Mark a day as exercised
- **WHEN** the user logs `exercised = true` for date `2026-09-14`
- **THEN** the system stores a daily log for that date with the exercised flag set

#### Scenario: Re-enter the same day
- **WHEN** the user logs again for an already-logged date
- **THEN** the system updates the existing daily log for that date

### Requirement: Retrieve habit history
The system SHALL return daily logs for a date range.

#### Scenario: Retrieve recent habit logs
- **WHEN** the user requests daily logs for the last 30 days
- **THEN** the system returns each day's log including the exercised flag
