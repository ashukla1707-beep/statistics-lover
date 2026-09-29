# Database Direction

The production schema will be implemented through migrations. Course names/exams are data, not source code.

## Planned entity groups

### Identity and permissions

- profiles
- roles / user roles
- teacher assignments

### Academics

- courses
- batches
- subjects
- modules
- lectures
- live sessions
- lecture resources
- enrollments

### Learning resources

- study materials
- PYQs
- assignments
- assignment submissions

### Assessment

- tests
- test sections
- questions
- question options
- attempts
- answers
- results

### Operations

- attendance
- announcements
- notifications
- audit logs
- settings

### Commerce

- orders
- payments
- coupons
- refunds / adjustments where required

## Rules

- Use stable IDs rather than names as relationships.
- Keep provider-specific external IDs separate from domain IDs.
- Use database constraints for invariants that should never be violated.
- Protected data requires row-level/backend authorization; frontend filtering is not security.
- Schema changes happen through migrations, not manual production edits.
