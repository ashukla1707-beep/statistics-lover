# Statistics Lover

Statistics Lover is a coaching and learning platform for statistics education.

**Tagline:** Learn • Practice • Succeed

## Current milestone

This repository starts with the public responsive application shell and the architecture/documentation required for a maintainable handover. It intentionally does **not** contain production auth, payments, LMS data, or hard-coded course catalogues yet.

## Product scope

- Public website
- Free content and paid courses/batches
- Student portal
- Teacher portal
- Admin/owner portal
- Live classes
- Recorded lectures
- Test series
- PYQs
- Study material
- WhatsApp integration
- Future native/mobile app support

## Engineering principles

1. **No patch-on-patch development.** Fix or refactor the owning component instead of layering overrides.
2. **External services are adapters, not the application.** Google Meet, Google Drive, Cloudflare Stream, payment gateways and messaging providers must remain replaceable.
3. **One owner for each state.** Avoid multiple scripts/components independently controlling the same state.
4. **Business operations must be data-driven.** Creating a course, changing a class time or publishing a lecture should not require a code deployment.
5. **Backend authorization is authoritative.** Hiding a button in the UI is never considered access control.
6. **Handover is a product requirement.** A new developer should be able to run, understand and deploy the project from this repository.

## Technology foundation

- React 19.3
- TypeScript
- Vite 8
- Plain CSS design tokens/components (no UI framework lock-in yet)

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run lint
npm run build
```

## Environment safety

Only browser-safe public configuration may use `VITE_*` variables. Service-role keys, payment secrets and private provider credentials must never be shipped to the browser.

## Repository workflow

- `main` — production-ready code only
- `develop` — integration branch
- `feature/<name>` — larger feature work
- pull request into `develop`
- release pull request from `develop` into `main`

## Contact

Public coaching contact: **+91 9264927804**
