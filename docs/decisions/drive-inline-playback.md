# Google Drive inline playback

For Google Drive recordings shared as public-by-link files, the student portal embeds the normalized `/preview` URL inside the learning page instead of navigating students to the Drive viewer.

This avoids handing playback to the Android Drive/browser flow, which can trigger a Google account chooser when multiple Google accounts are present on the device. Other providers continue to use their provider adapter behavior.

This remains an initial provider adapter. Production-grade protected playback should migrate to a signed-token streaming provider such as Cloudflare Stream.
