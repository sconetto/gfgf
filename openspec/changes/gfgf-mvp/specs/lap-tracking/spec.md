## ADDED Requirements

### Requirement: Record a lap time
The system SHALL allow recording an individual lap time with a track name, a lap time, a date, and an optional kart class and note.

#### Scenario: Create a lap entry
- **WHEN** the user submits a lap with track `Kartódromo X`, time `40.132` (seconds format), and date `2026-09-01`
- **THEN** the system stores the lap with its time converted to integer milliseconds (`40132`)

#### Scenario: Reject invalid time format
- **WHEN** the user submits a lap time that cannot be parsed as `m:ss.ms` or `ss.ms`
- **THEN** the system rejects the entry with a validation error

### Requirement: Parse lap time input
The system SHALL accept lap times entered as `m:ss.ms` or `ss.ms` and store them as integer milliseconds.

#### Scenario: Convert minutes and seconds
- **WHEN** the user enters `1:03.500`
- **THEN** the system stores `63500` milliseconds

#### Scenario: Convert seconds only
- **WHEN** the user enters `40.132`
- **THEN** the system stores `40132` milliseconds

### Requirement: List laps per track
The system SHALL return lap entries for a given track ordered by date.

#### Scenario: Retrieve laps for a track
- **WHEN** the user requests laps for track `Kartódromo X`
- **THEN** the system returns all laps for that track sorted by date ascending

### Requirement: Derive session best and lifetime personal best
The system SHALL compute, per track, the session best lap (fastest per race day) and the lifetime personal best (fastest overall).

#### Scenario: Compute lifetime personal best
- **WHEN** laps of `40132`, `40200`, and `39950` ms exist for the same track
- **THEN** the system reports the lifetime personal best as `39950` ms

#### Scenario: Compute session best per day
- **WHEN** laps of `40132`, `39950`, and `39800` ms exist on the same day for a track
- **THEN** the system reports that day's session best as `39800` ms
