# Architecture

## Goal

Statistics Lover is an education platform, not a collection of pages. The public site, student portal, teacher portal, admin portal and future app must share one domain model and one backend contract.

## Domain hierarchy

```text
Course
└── Batch
    ├── Subject
    │   └── Module
    │       ├── Lecture
    │       ├── Study Material
    │       ├── Assignment
    │       └── Test
    └── Teacher assignments
```

## Roles

- Student
- Teacher
- Content manager
- Admin
- Owner

Permissions will be enforced by the backend/database layer, not only by frontend rendering.

## Frontend boundaries

- `components/` — reusable UI/layout only
- `features/` — domain-oriented feature modules
- `config/` — centralized browser-safe application configuration
- `services/` — API clients and provider adapters
- `types/` — shared frontend domain contracts
- `styles/` — global design tokens and base styles

Feature logic must not be moved into random global scripts to solve local issues.

## Backend direction

Planned production shape:

```text
Web / future mobile app
        │
        ▼
Application API
        │
        ├── Authentication / authorization
        ├── Courses / batches / enrollment
        ├── Lectures / tests / materials
        ├── Payments
        └── Notifications
        │
        ▼
PostgreSQL / Supabase
```

Cloudflare can host the frontend and suitable edge/API functions. Supabase/PostgreSQL remains the structured source of truth unless a later documented decision changes that.

## Provider adapters

The domain talks about a `LiveSession` or `Recording`, not a Google Meet or Drive file.

Initial provider candidates:

- live: Google Meet
- recorded: Google Drive
- later recorded: Cloudflare Stream
- messaging: WhatsApp provider later
- payments: gateway selected later

Provider-specific IDs stay behind adapters.

## Application lifecycle

Startup state will be explicit rather than timeout-driven:

```text
BOOT → CONFIG READY → AUTH CHECK → DATA READY → UI READY
```

## Responsive rule

Components respond to their available width. Testing must include normal mobile, desktop, tablet and mobile browser “Desktop site” behavior.
