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

Migrations `0002_auth_security_hardening.sql` and `0003_auth_policy_performance.sql` keep authorization helpers in the private schema, tighten direct API access and consolidate/optimize auth policies.

The first owner must be bootstrapped once from a trusted administrative environment. No browser user can promote itself to owner.

## Implemented: academic enrollment foundation

Migrations `0004_academic_enrollment_foundation.sql` and `0005_academic_enrollment_access_hardening.sql` establish:

- `courses`
- `batches`
- `enrollments`
- course, batch and enrollment lifecycle status enums
- database constraints for slugs, date windows and enrollment access windows
- indexed foreign keys and enrollment lookups
- explicit Data API grants
- RLS for public catalog visibility, staff management and student-owned enrollments
- private `has_batch_access` / `has_course_access` helpers so valid enrollment can authorize non-public learning content without exposing provider or administrative data

Enrollment is the server-authoritative link between a student and a batch. A frontend role badge or route guard never grants course access by itself.

## Planned entity groups

### Identity and permissions

- profiles ✅
- user roles ✅
- teacher assignments ✅

### Academics

- courses ✅
- batches ✅
- subjects
- modules
- lectures
- live sessions
- lecture resources
- enrollments ✅

### Teaching access

- teacher assignments ✅
- assignment-scoped teacher authorization ✅
- delivery availability windows ✅

### Learning resources

- study materials
- PYQs
- assignments
- assignment submissions

### Attendance

- lecture attendance ✅
- assignment-scoped teacher roster access ✅
- student-owned attendance history ✅

### Assignments

- scoped assignments ✅
- private student submissions ✅
- secure attachment storage ✅
- grading and feedback ✅
- due dates / late rules ✅

### Assessment

- question bank ✅
- protected question options / answer keys ✅
- MCQ / MSQ / numeric / short-text question types ✅
- PYQ metadata foundation ✅
- tests ✅
- test sections ✅
- ordered test question placement ✅
- scheduling / selected-student assignment ✅
- attempts ✅
- immutable attempt question/option snapshots ✅
- answers ✅
- automatic scoring / negative marking ✅
- result release policies / review ✅
- immutable attempt-based test analytics ✅
- student subject performance analytics ✅
- PYQ-integrated test building/filtering ✅

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
