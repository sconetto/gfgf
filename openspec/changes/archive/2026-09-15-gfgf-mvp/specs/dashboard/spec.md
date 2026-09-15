## ADDED Requirements

### Requirement: Show weight trend
The system SHALL render a weight trend chart from the stored weigh-in history.

#### Scenario: Render weight trend
- **WHEN** weigh-ins exist for multiple dates
- **THEN** the dashboard displays a line chart of weight over time with the most recent weight highlighted

### Requirement: Show weight-versus-lap-time correlation per track
The system SHALL display, per track, a correlation view that plots one point per race day using that day's best lap joined to the nearest weight reading.

#### Scenario: Correlation with sufficient data
- **WHEN** a track has lap data across multiple race days and weight readings exist for those periods
- **THEN** the dashboard displays a scatter/trend of weight versus lap time for that track

#### Scenario: Insufficient data
- **WHEN** a track has fewer than two race days or no paired weight readings
- **THEN** the dashboard displays an "insufficient data" state instead of a misleading trend

### Requirement: Show per-track lifetime personal best board
The system SHALL display the lifetime personal best lap for each track.

#### Scenario: Render personal best board
- **WHEN** laps exist for one or more tracks
- **THEN** the dashboard lists each track with its fastest recorded lap time

### Requirement: Expose health metric signals
The system SHALL display ingested health metrics for the prioritized signal types.

#### Scenario: Render health signals
- **WHEN** health metrics exist for prioritized signal types
- **THEN** the dashboard displays charts for those signals
