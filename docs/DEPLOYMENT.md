# Deployment Direction

## Current decision

Cloudflare is the current frontend deployment target for `develop`. Vercel remains connected but is intentionally de-prioritized until a later explicit switch back.

The previous Cloudflare Git-connected Workers Builds path failed during the provider's **Initializing** stage before repository checkout. To avoid depending on that build pipeline, Statistics Lover now builds inside GitHub Actions and deploys the already-built `dist/` directory directly with Wrangler.

## Environments

Keep development, staging/preview and production logically separate. Production secrets and data must never be copied into source code.

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

Cloudflare configuration lives in `wrangler.jsonc` and serves `dist/` as static assets with SPA fallback.

Repository deployment workflow:

```text
.github/workflows/cloudflare-deploy.yml
```

The workflow performs install, typecheck, lint and build before deploying with:

```bash
npx --yes wrangler@4 deploy
```

## Cloudflare credentials

Cloudflare credentials must be stored only as GitHub repository secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

The API token must have sufficient permission to deploy the `statistics-lover` Worker. Never commit the token to the repository or add it to `.env.production`.

## Backend

Cloudflare is currently used for frontend delivery only. Business data/auth remains in Supabase/PostgreSQL. Edge deployment must not become an unstructured monolithic backend.

## Vercel

Existing Vercel deployment configuration may remain in the repository while Cloudflare is the active target. Do not treat Vercel as the current acceptance environment until a later documented decision switches back.

## Production ownership

The coaching owner should ultimately control the production Cloudflare project, domain/DNS, database/auth project, payment account and messaging/video provider accounts.
