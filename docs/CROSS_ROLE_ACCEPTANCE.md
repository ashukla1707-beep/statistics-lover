# Cross-role Acceptance Matrix — Release F3

All role swaps below were performed inside rollback-only database transactions using an existing active account. No permanent role/profile changes were made.

| Scenario | Expected | Result |
| --- | --- | --- |
| Student | Own active batch access; no raw delivery-source table, answer key, audit or settings access | PASS |
| Subject teacher | Assigned subject access; scoped delivery source readable; no whole-batch management | PASS |
| Content manager | Academic/content operations; no admin-only audit/settings scope | PASS |
| Admin | Admin operational scope including audit/settings | PASS |
| Owner | Owner operational scope including audit/settings | PASS |
| Suspended | No active-user/batch/content/notification access | PASS |

The frontend route guard matrix matches the database boundaries: teacher routes require teacher role; content workspaces accept content-manager/admin/owner; commerce/enrollment/staff/audit/settings require admin/owner.
