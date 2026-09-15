## Requirements

### Requirement: Accept health metrics via JSON ingest
The system SHALL expose an endpoint that accepts a JSON payload of health metric records from a third-party bridge app.

#### Scenario: Ingest a valid payload
- **WHEN** a bridge app POSTs a payload containing records with metric type, value, unit, and timestamp
- **THEN** the system stores each record and returns a success response

#### Scenario: Reject malformed payload
- **WHEN** a bridge app POSTs a payload missing required fields (metric type or value)
- **THEN** the system responds with a 400 error and stores nothing

### Requirement: Store health metrics generically
The system SHALL store ingested health metrics in a generic schema keyed by metric type.

#### Scenario: Store a step-count metric
- **WHEN** a record with type `step_count`, value `8000`, unit `count` is ingested
- **THEN** the system stores it retrievable by type `step_count`

### Requirement: Retrieve health metrics by type
The system SHALL return health metric values for a given metric type ordered by time.

#### Scenario: Retrieve a metric series
- **WHEN** the user requests metrics of type `resting_heart_rate`
- **THEN** the system returns all stored values for that type sorted by measured time ascending
