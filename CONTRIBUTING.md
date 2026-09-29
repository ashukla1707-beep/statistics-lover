# Contributing

## Branching

- Never develop directly on `main`.
- Use `develop` for integration.
- Use `feature/<short-name>` for substantial work.
- Keep pull requests focused on one domain or concern.

## No patch-on-patch rule

Before adding a fix file, global override, duplicate event listener, second source of state or broad `!important`, stop and identify the component/module that owns the behavior.

A correct fix usually belongs in that owner. If the owner is too tangled to fix safely, refactor it first and record the reason in `docs/DECISIONS.md` when the change is architectural.

## Definition of done

A feature is not complete until:

- desktop and mobile behavior are checked
- mobile browser Desktop Site mode is considered for layout-sensitive UI
- keyboard/focus behavior is reasonable
- loading, empty and error states are defined where relevant
- backend permission checks exist for protected operations
- `npm run typecheck`, `npm run lint` and `npm run build` pass
- documentation is updated if the public contract or architecture changed

## Secrets

Do not commit credentials, service-role keys, private API tokens or production webhook secrets.
