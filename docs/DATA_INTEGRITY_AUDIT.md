# Data Integrity Audit — Release F2

## Live anomaly scan

The release audit checked the current database for:

- duplicate or invalid enrollment windows
- teacher assignment batch/subject mismatches and invalid windows
- learning-resource and assignment scope mismatches
- assignment release/due ordering
- test subject/batch, section, question and selected-enrollment mismatches
- invalid test windows
- attendance lecture/enrollment batch mismatches
- announcement scope and expiry mismatches
- invalid offer/coupon windows and pricing
- commerce order arithmetic and paid timestamps
- receipt/order snapshot mismatches

All checked anomaly classes returned zero.

## Structural enforcement

Cross-table scope rules are backed by validation triggers; local shape/math rules are backed by CHECK/UNIQUE/FK constraints. Release F2 additionally adds arithmetic/currency constraints directly to immutable commerce receipt snapshots.
