# Stage 3 — Teacher Workflow Audit

Date: 2026-10-04

## Result

**PASS after one live RLS fix.**

All workflow fixtures were created inside rollback-only transactions. The only permanent database change in this stage is the scoped RLS correction recorded in migration `0033_teacher_insert_returning_rls.sql`.

## Defect found and corrected

The first teacher acceptance run exposed a real frontend failure:

- a subject-scoped teacher was correctly authorized by `private.has_teacher_module_access(module_id)`;
- `INSERT` of a lecture without a returned row succeeded;
- the frontend-equivalent `INSERT ... RETURNING` failed RLS;
- the same failure occurred for teacher-created assignments.

The cause was self-referential teacher SELECT policies:

- lecture visibility called `private.has_teacher_lecture_access(id)`, which queried `lectures` by the newly inserted row id;
- assignment visibility called `private.has_teacher_assignment_access(id)`, which queried `assignments` by the newly inserted row id.

PostgREST uses `INSERT ... RETURNING` for the current frontend creation services. The inserted row therefore also had to satisfy SELECT visibility immediately.

The migration replaces only those SELECT expressions with equivalent row-field scope checks. It does **not** expand teacher scope.

## Verified teacher boundaries

| Teacher workflow | Result |
| --- | --- |
| Assigned batch read scope | PASS |
| Subject assignment does not grant whole-batch manage scope | PASS |
| Assigned subject/module visible | PASS |
| Unassigned subject/module hidden | PASS |
| Direct profile visibility remains own profile only | PASS |
| Audit logs/settings remain inaccessible | PASS |
| Lecture creation in assigned module with returned row | PASS |
| Lecture creation in unassigned module blocked | PASS |
| Delivery source on assigned lecture | PASS |
| Delivery source on unassigned lecture blocked | PASS |
| Subject-scoped learning-resource creation | PASS |
| Whole-batch resource blocked for subject-scoped teacher | PASS |
| Unassigned-subject resource blocked | PASS |
| Subject-scoped assignment creation with returned id | PASS |
| Whole-batch assignment blocked for subject-scoped teacher | PASS |
| Assigned lecture attendance roster | PASS |
| Unassigned attendance roster hidden | PASS |
| Attendance marking within assigned lecture | PASS |
| Attendance marking outside assigned scope blocked | PASS |
| Assigned assignment submissions visible | PASS |
| Unassigned assignment submissions hidden | PASS |
| Grading + feedback sets grader metadata | PASS |
| Question creation in assigned subject | PASS |
| Question creation in unassigned subject blocked | PASS |
| Subject-scoped test creation | PASS |
| Whole-batch test creation blocked for subject-scoped teacher | PASS |
| Test scheduling for owned test | PASS |
| Test roster/analytics for owned test | PASS |
| Analytics for unassigned test blocked | PASS |
| Subject announcement creation | PASS |
| Whole-batch announcement blocked without whole-batch assignment | PASS |

## Frontend correspondence

The regression specifically covers the patterns currently used by:

- `createManagedLecture()` in `contentAdminService.ts`, which performs `.insert(...).select(...).single()`;
- `saveManagedAssignment()` in `assignmentService.ts`, which performs `.insert(...).select('id').single()`.

Question/test creation is performed through protected RPCs and was also exercised in the full acceptance run.

## Live migration

Supabase migration applied successfully:

`teacher_insert_returning_rls`

Repository migration:

`database/migrations/0033_teacher_insert_returning_rls.sql`

Regression test:

`database/tests/teacher_workflow_acceptance.sql`
