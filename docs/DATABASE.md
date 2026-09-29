# Database Direction

The production schema is implemented through versioned migrations. Course names/exams are data, not source code.

## Implemented: identity foundation

Migration `0001_auth_foundation.sql` establishes:

- `profiles`
- `user_roles`
- `app_role`
- `account_status`
- auth-user → profile trigger
- default student role trigger
- RLS helper functions and initial policies

The first owner must be bootstrapped once from a trusted administrative environment. No browser user can promote itself to owner.

## Planned entity groups

### Identity and permissions

- profiles ✅
- user roles ✅
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
- Protected data requires Row Level Security/backend authorization; frontend filtering is not security.
- Schema changes happen through migrations, not manual production edits.
- Service-role credentials never enter browser bundles.
