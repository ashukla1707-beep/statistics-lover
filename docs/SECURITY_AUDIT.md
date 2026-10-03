# Security Audit — Release F1

## Passed checks

- Public application tables have Row Level Security enabled.
- Sensitive answer-key/provider-source/outbox/settings data is not student-readable through direct table policies.
- Assignment submission storage is private and path/scope restricted.
- Service-role-only payment and notification operations remain server-side.
- Browser environment contains no private provider credentials.
- Student delivery/resource links are released through enrollment-aware RPCs with publication and availability checks.
- Google Drive recording links are normalized to preview URLs.
- Browser response policy now includes CSP, frame denial, no-sniff, strict referrer policy and restricted device permissions.

## Accepted browser limitation

Any URL that a browser must load for playback can be observed by an authorized user with developer tools. Current controls prevent unauthorized database access and avoid exposing source tables, but Google Drive playback is not DRM. This is already documented as a product limitation and is planned to improve in the Android/WebView layer.

## External release dependency

Supabase Auth leaked-password protection is disabled. The connected Supabase project tools used in this workspace do not expose Auth password-policy mutation, so this must be enabled through Supabase Auth settings before final production handover if that setting remains unavailable programmatically.
