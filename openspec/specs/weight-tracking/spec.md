## Requirements

### Requirement: Record a weigh-in
The system SHALL allow recording a weigh-in with a date, a weight in kilograms, and an optional body-fat percentage and free-text note.

#### Scenario: Create a weigh-in
- **WHEN** the user submits a weigh-in with date `2026-09-14`, weight `82.5`, and no note
- **THEN** the system stores a new weight entry and returns it with a unique id

#### Scenario: Re-enter the same day
- **WHEN** the user submits a second weigh-in for an already-recorded date
- **THEN** the system updates the existing entry for that date instead of creating a duplicate

#### Scenario: Reject invalid weight
- **WHEN** the user submits a weight less than or equal to zero
- **THEN** the system rejects the entry with a validation error

### Requirement: List weight history
The system SHALL return weigh-ins ordered by date.

#### Scenario: Retrieve history
- **WHEN** the user requests weight history
- **THEN** the system returns all weigh-ins sorted by date ascending, including weight and date

### Requirement: Delete a weigh-in
The system SHALL allow deleting a weigh-in by id.

#### Scenario: Delete a weigh-in
- **WHEN** the user deletes an existing weigh-in by id
- **THEN** the entry is removed and no longer appears in history
