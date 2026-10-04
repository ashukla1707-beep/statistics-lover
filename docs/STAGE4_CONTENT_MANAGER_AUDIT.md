# Stage 4 — Content Manager Workflow Audit

Date: 2026-10-04

## Result

**PASS** on the connected live Supabase project using rollback-only fixtures.

No temporary course, batch, content, assessment, announcement, role, enrollment or commerce data was retained.

## Verified content-manager lifecycle

| Workflow | Result |
| --- | --- |
| Create/update/publish course | PASS |
| Create/update/activate batch | PASS |
| Create/update/publish subject | PASS |
| Create/update/publish module | PASS |
| Create/update/publish lecture | PASS |
| Create lecture delivery source | PASS |
| Create/update/publish learning resource | PASS |
| Create resource provider source | PASS |
| Create/update/publish assignment | PASS |
| Create question through protected RPC | PASS |
| Create/publish test through protected RPC | PASS |
| Create/update test schedule | PASS |
| Toggle manual result release | PASS |
| Create/update/publish announcement | PASS |
| Own-profile-only identity visibility | PASS |
| No audit/settings visibility | PASS |
| No enrollment visibility or management | PASS |
| No commerce-order visibility | PASS |
| No role escalation | PASS |
| Core course deletion remains admin/owner-only | PASS |
| Test-schedule deletion remains allowed staff operation | PASS |

## Frontend correspondence

The deployable routes for academics, content, delivery, resources, assignments, question bank, tests, schedules, analytics and announcements all admit `content_manager`.

Core delete buttons for course/content/resource/assignment/question/test pages are already hidden in the UI unless the identity is `admin` or `owner`, matching the live RLS delete policies.

Test-schedule deletion is intentionally a staff-scoped operation and the current UI exposes it to Content Manager.

## Security boundary

Content Manager remains a content-production role, not an account/commerce/platform-administration role. Live RLS confirmed that Content Manager cannot:

- enumerate user profiles beyond self;
- read or mutate enrollments;
- read commerce orders;
- read audit logs;
- read application settings;
- grant itself Admin;
- delete core academic/content records reserved for Admin/Owner.

## Repeatable test

`database/tests/content_manager_workflow_acceptance.sql`
