# Drive archive, Cloudflare Stream delivery

Status: accepted

Recorded lectures keep their original/source copy in Google Drive for staff archival and operational continuity. Student playback is a separate delivery concern and should use Cloudflare Stream when available.

## Why

Google Drive is convenient for storing originals, but its embedded player exposes Google-owned controls and account/UI behavior that the application cannot reliably remove because the player runs in a cross-origin iframe.

Cloudflare Stream is the delivery adapter for student playback because it is designed for adaptive video delivery and mobile playback. The application still performs enrollment and lecture-availability authorization before returning a playback action.

## Data ownership

- `lecture_recording_archives` stores the staff-only archive/source reference. It is never returned by the student delivery RPC.
- `lecture_delivery_sources` stores the active student delivery provider/reference.
- Existing Google Drive watch sources are copied into the archive table during migration so the original is not lost.
- Google Drive can remain as a temporary student-playback fallback until a Stream copy is ready.

## Cloudflare Stream setup

The admin saves a Stream player URL such as `https://customer-<CODE>.cloudflarestream.com/<VIDEO_UID>/iframe` as the student delivery source. The app normalizes supported Stream player URLs to the `/iframe` form and renders them inside the protected Statistics Lover player page.

For production paid content, enable Stream signed URLs and issue short-lived playback tokens from a server-side component. Do not place Cloudflare API tokens or signing secrets in Vite/browser environment variables.

Cloudflare recommends upload-by-link only when the origin exposes a reliable direct download URL; Google Drive share links are not a dependable ingestion source. Keep Drive as the archive, and upload/copy a delivery copy to Stream through an owner-controlled server-side workflow or the Stream dashboard until an automated ingestion service is configured.
