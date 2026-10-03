# Deployment Direction

## Current decision

Vercel is the only active frontend deployment target for Statistics Lover right now.

- GitHub repository: `ashukla1707-beep/statistics-lover`
- Active development branch: `develop`
- Vercel team: `Statistics Lover`
- Vercel project: `statistics-lover`
- `develop` deploys automatically to Vercel Preview through the connected GitHub integration.
- `main` remains the production branch unless a later explicit release decision changes it.

Cloudflare deployment automation is disabled for now. The existing `wrangler.jsonc` may remain as dormant configuration for a later migration, but it is not part of the current release path.

## Environments

Keep development, preview/staging and production logically separate. Production secrets and data must never be copied into source code.

## Web frontend

The frontend is a Vite static build.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

Vercel is configured through the existing project/Git integration and `vercel.json`.

## Deployment flow

1. Commit changes to `develop`.
2. GitHub Quality runs typecheck, lint and build.
3. Vercel automatically creates a Preview deployment for the same `develop` commit.
4. Verify the Preview deployment and the stable develop alias before treating the UI as accepted.
5. Promote/release to `main` only as a separate release decision.

## Backend

Frontend hosting remains independent from business data. Supabase/PostgreSQL remains the structured source of truth for authentication and application data.

## Cloudflare

Cloudflare is not the active deployment target. Do not add or rerun Cloudflare deployment workflows unless the user explicitly switches hosting back to Cloudflare later.

## Production ownership

The coaching owner should ultimately control the production hosting project/domain, database/auth project, payment account and messaging/video provider accounts.
