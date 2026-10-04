# Stage 4 — Content Manager Workflow Audit

Date: 2026-10-04

## Result

**PASS** on the live Supabase project using rollback-only fixtures.

No permanent content/course/user/commerce changes were retained.

## Verified capabilities

- create a draft course with a returned row;
- publish/update the course;
- create and activate a batch;
- create/publish subject and module;
- create/publish a lecture;
- attach protected delivery source;
- create/publish learning resource + source;
- create/publish assignment;
- create question through protected question RPC;
- create published test through protected test-builder RPC;
- create test schedule;
- access test analytics;
- create/publish scoped announcement;
- archive a course through lifecycle state.

## Verified restrictions

Content Manager does **not** automatically gain:

- hard-delete authority on courses/batches/content reserved to admin/owner;
- student enrollment administration;
- teacher assignment administration;
- commerce offer mutation;
- role/staff assignment authority;
- attendance marking;
- audit-log visibility;
- app-settings visibility;
- platform-wide profile visibility.

The hard-delete acceptance check explicitly uses affected-row count because RLS may safely reduce an unauthorized DELETE to zero affected rows instead of raising an exception.

## Frontend consistency

The route matrix exposes content-management workspaces to `content_manager` and keeps attendance, commerce, enrollments, staff, audit and settings routes restricted to `admin`/`owner`.

`AcademicManagementPage` already hides delete controls unless the current identity includes `admin` or `owner`, matching the database boundary.

Regression test: `database/tests/content_manager_workflow_acceptance.sql`.
