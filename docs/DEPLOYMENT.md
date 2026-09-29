# Deployment Direction

## Environments

Keep development, staging/preview and production logically separate. Production secrets and data must never be copied into source code.

## Web frontend

The Vite build output is `dist/` and is suitable for static hosting on Cloudflare Pages or an equivalent service.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```

## Backend

Cloudflare Workers may be used for suitable API/edge responsibilities. Business data remains in the application database. Workers should not become an unstructured monolithic backend.

## Production ownership

The coaching owner should ultimately control the production Cloudflare project, domain/DNS, database/auth project, payment account and messaging/video provider accounts.
