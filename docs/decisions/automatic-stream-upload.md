# Automatic Cloudflare Stream upload

## Decision

Recorded-lecture playback is uploaded from the Statistics Lover admin workspace directly to Cloudflare Stream. Staff no longer need to open the Cloudflare dashboard or copy Stream player URLs for each lecture.

The original Google Drive recording remains a separate staff-only archive reference. The Stream video is the student-delivery copy.

## Flow

1. Staff selects a recorded lecture and chooses a local video file.
2. The Statistics Lover Worker verifies the Supabase session and a staff role.
3. For files up to 200 MB, the Worker uses the Cloudflare Stream binding to create a private one-time direct upload.
4. The browser uploads directly to Stream; the file never passes through the Worker or Supabase database.
5. The Worker tracks the Stream video ID in `lecture_stream_assets`.
6. The admin page polls processing status.
7. When Stream reports the video ready, the Worker automatically promotes `stream://<video_id>` into the protected lecture delivery source.
8. Students still pass the existing enrollment/lecture-availability RPC. The player then asks the Worker for a one-hour signed Stream token and embeds that signed player URL.

## Large recordings

Cloudflare's Stream binding currently creates basic direct uploads only, which are limited to 200 MB. Larger videos use the TUS endpoint implemented by the Worker. TUS requires two one-time Worker secrets/settings:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_STREAM_API_TOKEN` with Stream Write permission

These are runtime secrets and must never be committed to GitHub or exposed to the browser. Once configured, large recordings upload in resumable 50 MB chunks through the same admin UI.

## Security

- Stream uploads are created with signed playback required.
- Stream video IDs are stored as opaque internal references, not public player links.
- Student playback tokens are generated only after the existing Supabase authorization RPC confirms access.
- Google Drive archive references remain staff-only and are never returned by the student delivery RPC.
- Cloudflare and Supabase privileged credentials are never shipped in the frontend bundle.
