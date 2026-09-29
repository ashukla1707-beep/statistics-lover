# Handover Guide

This document will evolve with the project. Handover readiness is a development requirement, not an end-of-project cleanup task.

## Ownership principle

Production business infrastructure should ultimately be controlled by the coaching owner, including:

- GitHub repository or organization
- domain and DNS
- Cloudflare account/project
- production database/auth
- production file/video infrastructure
- payment gateway account
- email/SMS/WhatsApp provider accounts

The developer may remain a collaborator/administrator after handover.

## Repository transfer

At project completion, transfer the repository to the owner's GitHub account or organization rather than handing over an unversioned ZIP as the canonical project.

## Secrets

Secrets must not be committed. `.env.example` documents required variable names without values.

## Before production handover

- confirm all production services are owner-controlled
- rotate temporary/developer credentials
- verify deployment from a clean checkout
- verify database migrations from scratch
- verify backup/restore process
- document recurring costs
- document provider dashboards and support contacts
- document release workflow
