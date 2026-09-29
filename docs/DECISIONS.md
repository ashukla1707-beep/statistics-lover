# Architecture Decision Log

This file records why important choices were made so a future maintainer does not need to reverse-engineer intent.

## ADR-001 — No patch-on-patch development

**Status:** accepted

When a component or feature is structurally wrong, refactor the owning implementation. Do not add a second global script or CSS override whose only purpose is to compensate for the first implementation.

## ADR-002 — External services are adapters

**Status:** accepted

Google Meet, Google Drive, Cloudflare Stream, payment gateways and notification vendors are providers. Statistics Lover owns the domain model and access rules.

## ADR-003 — React + TypeScript + Vite frontend

**Status:** accepted for the web foundation

Reasons:

- modular component architecture
- strict compile-time checks
- straightforward Cloudflare-compatible static deployment
- no dependency on a server-rendering framework for the initial public/LMS shell
- backend can remain API-oriented for a future native app

This decision can be revisited through a new ADR if later requirements justify it.

## ADR-004 — Courses are database-driven

**Status:** accepted

The exact exam/course catalogue is intentionally not hard-coded. An owner/admin must be able to create future exams, courses and batches without changing application source code.
