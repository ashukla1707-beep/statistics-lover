# Database migrations

Statistics Lover uses migration-first database changes. The Supabase dashboard is not the source of truth for schema design.

## Auth foundation

`migrations/0001_auth_foundation.sql` creates:

- `profiles`
- `user_roles`
- `app_role` and `account_status` enums
- automatic profile creation for new Supabase Auth users
- default `student` role on self-registration
- helper functions for role and active-account checks
- Row Level Security policies for profile and role access

## First owner bootstrap

RLS intentionally does not allow a normal client to promote itself to `owner`. After the first owner account has registered, use a trusted administrative environment (Supabase SQL editor/service-role backend) once:

```sql
insert into public.user_roles (user_id, role, assigned_by)
values ('<FIRST_OWNER_AUTH_USER_UUID>', 'owner', null)
on conflict (user_id, role) do nothing;
```

Never put the service-role key in `VITE_*` variables or browser code.

## Verification checklist

After applying the migration:

1. Register a test user.
2. Confirm one `profiles` row exists for the auth user.
3. Confirm the user automatically has the `student` role.
4. Confirm the user can read their own profile and roles.
5. Confirm the user cannot read another profile.
6. Bootstrap an owner in a trusted admin environment.
7. Confirm the owner can inspect role assignments.
8. Confirm an admin cannot assign `admin` or `owner` roles through the browser client.
