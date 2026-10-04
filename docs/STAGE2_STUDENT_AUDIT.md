# Stage 2 — Student End-to-End Workflow Audit

Date: 2026-10-04

## Result

**PASS** on the connected live Supabase project using rollback-only fixtures. No temporary course, batch, lecture, resource, assignment, test, notification, order, submission, attempt, or preference data was retained.

## Verified boundaries

| Student workflow | Result |
| --- | --- |
| Active enrollment grants batch access | PASS |
| Non-enrolled batch does not grant protected learning access | PASS |
| Published/released subject/module/lecture visibility | PASS |
| Future lecture hidden | PASS |
| Raw lecture delivery source table hidden | PASS |
| Safe delivery-action RPC returns only allowed released action | PASS |
| Raw learning-resource source table hidden | PASS |
| Learning-resource RPC returns released content only | PASS |
| Draft/future resources hidden | PASS |
| Published/released assignments visible | PASS |
| Draft/future assignments hidden | PASS |
| Student can submit an open assignment | PASS |
| Future assignment submission rejected | PASS |
| Open assigned test appears through student schedule RPC | PASS |
| Raw question bank and answer-key tables hidden | PASS |
| Raw attempt snapshot tables hidden | PASS |
| Active attempt payload contains sanitized options and no answer keys | PASS |
| Answer save + attempt submit | PASS |
| Manual-result policy withholds result until staff release | PASS |
| Released result becomes visible after staff release | PASS |
| Released result contributes to student analytics | PASS |
| In-app notifications isolated to current user and availability window | PASS |
| Mark-read operation constrained to current user | PASS |
| Notification preferences save for current user | PASS |
| Student can create own pending order on a public offer | PASS |
| Student cannot read another user's commerce orders | PASS |

## Frontend path review

The current student pages use the same server-authoritative surfaces tested above:

- learning hierarchy: direct RLS reads of published subjects/modules/lectures;
- lecture actions: `get_batch_delivery_actions`;
- learning resources: `get_batch_learning_resources`;
- assignments: `get_batch_assignments` + `save_my_assignment_submission`;
- tests: `get_my_assessment_schedules`, attempt RPCs and result RPC;
- performance: `get_my_assessment_analytics`;
- notifications: owner-scoped RLS/RPCs;
- commerce: public offer RPC + `create_commerce_order` + owner-scoped order reads.

The test intentionally demonstrated that students cannot query answer-key or raw provider-source tables even though the safe RPCs can return the minimum data required by the UI.

## Notes

Public course/batch catalog visibility is intentionally separate from protected learning access. A student may see a public active batch in the catalog without being able to read its protected subjects, lectures, resources, assignments or tests.

The complete rollback acceptance script is stored in `database/tests/student_workflow_acceptance.sql`.
