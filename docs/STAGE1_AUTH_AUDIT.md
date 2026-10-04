# Stage 1 — Authentication & Authorization Audit

Date: 2026-10-04

## Scope

This checkpoint verifies the authentication and authorization foundation across the live Supabase database, browser application, production deployment, and the Android 1.0.41 WebView shell.

The database/backend remains the security boundary. Frontend route guards are treated as UX controls only.

## Live database results

All checks below were executed against the connected Supabase project with rollback-only transactions. No account, role, assignment, course, or suspension changes were retained.

| Boundary | Result |
| --- | --- |
| Student sees only own profile/roles and cannot read audit/settings | PASS |
| Teacher gets only explicitly assigned teaching scope and cannot read audit/settings | PASS |
| Content manager can access managed draft content but cannot read audit/settings | PASS |
| Admin can administer normal users and grant lower staff roles | PASS |
| Admin cannot grant another admin/owner role | PASS |
| Owner can grant privileged admin role | PASS |
| Suspended identity keeps only enough identity visibility to render the suspension state | PASS |
| Suspended identity loses protected enrollments, notifications, audit and settings access | PASS |

All public application tables were confirmed to have RLS enabled.

## Frontend route guards

The current React router matrix was reviewed on the deployable `develop` branch.

- Student/learning routes require authentication and rely on RLS for batch/content scope.
- Teacher workspace routes require `teacher`.
- Content workspaces accept `content_manager`, `admin`, or `owner` where intended.
- Attendance/commerce/staff/enrollment/audit/settings administration requires `admin` or `owner`.
- Suspended sessions redirect to `/account-suspended`.
- The APK-only `/app-start` route waits for session restoration before selecting the landing route.

## Runtime verification

- Latest web Quality run before this checkpoint passed typecheck, lint and production build.
- Vercel reported no runtime error clusters in the last 24 hours.
- Recent Supabase Auth traffic contains successful password login, token refresh and logout activity.
- Observed Auth error classes were ordinary recoverable/abuse-control conditions: invalid credentials, stale refresh tokens, a stale logout session, and email-send rate limiting.

No PII from runtime logs is retained in this document.

## Edge-function boundary

The deployed `native-api` function currently has platform `verify_jwt=false` because it intentionally serves both public actions (sign-in/sign-up/recovery/offers) and protected actions in one endpoint.

Protected actions explicitly require an access token, validate/use it through a user-scoped Supabase client, and are still constrained by database RLS. Do not simply enable `verify_jwt` on the whole function; doing so would break the public auth actions. A future hardening option is to split public and protected endpoints and then enable platform JWT verification on the protected function.

## Android auth surface

Statistics Lover Android 1.0.41 is a WebView shell. Its active authentication path is the same browser Supabase session used by the website.

Legacy native UI/auth classes remain in the source tree but are not referenced by the active 1.0.41 activity. In particular, the legacy `SessionStore` uses plain SharedPreferences for tokens, but it is not part of the current runtime path. Remove or modernize that dead code only in a separately verified Android cleanup release.

## Remaining security item

Supabase Security Advisor reports one Auth warning: **Leaked Password Protection Disabled**.

This requires an Auth configuration change rather than a database migration. It is recorded as a production-hardening item and was not changed during this stage because the connected toolset does not expose that Auth configuration control.

## Repeatable acceptance tests

Rollback-only SQL is stored at:

`database/tests/auth_role_acceptance.sql`

The test file dynamically selects an existing owner account as its temporary test subject and rolls back all role/status/test-data changes.
