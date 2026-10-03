# Authorization Model

Authentication proves who the user is. Authorization decides what that identity may do. Statistics Lover treats the database/backend as authoritative; frontend hiding is only a usability layer.

## Roles

### Student

Default role for self-registration. Can access the student's own profile and, as later migrations are added, valid enrollments, released content, assigned tests, attempts/results and permitted materials.

### Teacher

Can manage teaching resources only for explicitly assigned batches/subjects unless granted a broader staff role.

### Content manager

Can manage selected academic/public content but does not automatically gain payment, owner or staff-permission authority.

### Admin

Can perform normal platform administration. Admins may grant/revoke `student`, `teacher` and `content_manager`, but cannot create another `admin` or `owner` from the browser client.

### Owner

Controls platform-wide settings, privileged role assignment and owner-reserved operations.

## Current auth tables

- `profiles`: one application profile per `auth.users` identity.
- `user_roles`: many-to-many role assignments. A user may have more than one role.

Self-registration creates the profile and grants `student`. Higher roles are explicit assignments.

## Account status

`profiles.account_status` is currently `active` or `suspended`. Future protected content policies should include `public.is_active_user()` so suspension is enforced server-side rather than just hidden in the interface.

## Frontend contract

`AuthProvider` owns browser auth/session state. It loads the profile and role set after Supabase establishes a session and guards against stale asynchronous identity loads.

`RequireAuth` can gate UI by authentication and role, but it is not a security boundary.

## Enforcement

Every protected database read/write must have a matching RLS/backend rule.

Example lecture check:

```text
request
  → authenticated?
  → active account?
  → enrolled in batch/course?
  → content released?
  → allow / deny
```

Teacher write checks will similarly require explicit teacher-to-batch/subject assignments rather than merely the `teacher` label.
