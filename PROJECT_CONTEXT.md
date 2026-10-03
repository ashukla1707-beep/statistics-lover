# Statistics Lover — Project Handoff Context

> **Purpose:** This is the canonical continuity file for future ChatGPT conversations.  
> Before making changes in a new chat, read this file and then verify the current `develop` branch head and latest deployment status.
>
> **Update rule:** Keep this file current after major architecture decisions, deployment changes, or completed feature milestones. Later explicit decisions override older notes.

## Repository and active branch

- Repository: `ashukla1707-beep/statistics-lover`
- Active development branch: **`develop`**
- Do not use `main` as the source of truth for ongoing feature work unless explicitly requested.
- Current handoff base before this documentation commit: `8e1ef7217bbe834369b29e37b9450d8016ac105d`
- Current focus: Layer F4 — Production migration/build verification

## Deployment

- Temporary frontend host: **Vercel**
- Vercel team: **Statistics Lover**
- Vercel project: `statistics-lover`
- Development preview alias: `statistics-lover-git-develop-statistics-lover.vercel.app`
- `develop` deploys automatically to a Vercel preview.
- `main` is still the production branch for the current Vercel production deployment.
- Cloudflare deployment was temporarily abandoned because Workers Builds repeatedly failed during the **Initializing** stage before cloning/install/build.
- Long-term intention: move hosting back to Cloudflare later if desired.

## Backend and services

- Supabase is used for auth/data.
- Browser-visible Supabase configuration is already wired for the frontend.
- Video provider for the current Watch Recording implementation: **Google Drive**.
- Live provider configuration: Google Meet.
- Keep frontend hosting independent from auth/data/video architecture where practical.

## Watch Recording — current product decisions

### Google Drive playback

- Recordings currently use Google Drive preview/embed playback.
- Google Drive controls live inside a cross-origin iframe and cannot be directly styled or removed with our CSS.
- Google Drive serves a problematic mobile player on normal mobile-browser mode.
- Chrome's actual **Desktop site** mode gives the better desktop Google Drive player.
- A normal webpage cannot programmatically turn Chrome's Desktop site setting on.

### Mobile desktop-site gate

- On a browser detected as mobile mode, Watch Recording shows a **Desktop playback required** gate rather than loading the problematic Drive mobile player.
- User is instructed to enable **Desktop site / Request Desktop Website** and reload.
- This gate applies only to Watch Recording; the rest of Statistics Lover remains normal mobile UI.

### Branding overlay

- The Statistics Lover logo overlays the Google Drive popup/branding area.
- Logo overlay was enlarged to better cover the Drive popup button.
- Touch/mobile overlay size is currently large (96×96 in touch CSS) to cover the underlying Drive control.
- Desktop/base overlay is also larger than the original implementation.

### Custom fullscreen — current behavior

- Custom fullscreen is **phone/touch only**.
- It must **not appear on actual desktop computers**.
- On a phone, tapping custom fullscreen:
  1. enters fullscreen,
  2. requests **landscape orientation**,
  3. re-syncs player scaling after rotation for alignment.
- On fullscreen exit, the orientation lock is released.
- Orientation locking is best-effort: browsers that do not permit it still enter fullscreen normally.
- Actual desktops should use Google Drive's native fullscreen control instead.

### Latest relevant commits

- `8e1ef72` — phone-only custom fullscreen + landscape preference.
- `3e88881` — re-enabled custom fullscreen.
- `e15393d` — enlarged logo over Drive popup control.
- `e98d49c` — cleaned leftover JSX after temporary fullscreen-disable experiment.
- `3684ee7` — require desktop browser mode for recordings.
- `ef84cf8` — best visual alignment baseline for the custom fullscreen overlay before the later phone-only/orientation changes.

## Important rejected/abandoned approaches

- **Forced 1024px page viewport** for Watch Recording did not make Google Drive use its desktop player. It only made the outer page look desktop-sized while the Drive iframe still used mobile controls. This was reverted.
- Repeated pixel-by-pixel overlays over the native mobile Drive controls were fragile because Drive changes its control layout between playing/paused/mobile states.
- Do not reintroduce those abandoned hacks unless there is a new technical reason.

## Video storage / piracy discussion

- Existing video library is multiple TB, so a bulk migration away from Drive is not planned right now.
- Google Drive remains the current source.
- Main piracy limitation: if a Drive file is publicly available by link, the underlying Drive URL remains a weaker access boundary than the Statistics Lover enrollment check.
- Potential future deterrents:
  - disable Drive download/copy where applicable,
  - do not expose raw Drive links in the UI,
  - add moving per-student watermarking,
  - later move active videos to a stronger private delivery layer if needed.
- No player can fully prevent screen recording.

## Future APK direction

After the web app is complete, the plan is to build an Android APK.

For the APK:
- Use a dedicated recording WebView/activity.
- Set a desktop-style user agent for the recording screen so Google Drive can serve desktop controls there.
- Handle fullscreen natively through Android WebView / `WebChromeClient`.
- Lock landscape during fullscreen video and restore orientation on exit.
- This should provide much more reliable playback/control behavior than the mobile web workaround.

## General project working principles

- Treat the merged **Statistics Lover** project as the authoritative product history.
- Do not mix in the older Stat Archive project unless explicitly requested.
- Prefer clean reusable implementations over patch-on-patch fixes.
- Preserve prior UI/product decisions unless a later explicit decision changes them.
- When a deployment fails, inspect build/CI logs before changing code blindly.
- Continue feature work from `develop`.

## New-chat startup checklist

When continuing in a new chat:

1. Read this file.
2. Inspect current `develop` branch head.
3. Inspect latest Vercel `develop` deployment status.
4. Read the current files related to the requested feature before editing.
5. Follow the latest explicit decisions in this file and current code.
6. Update this handoff file after any major milestone or architecture decision.

## Immediate next state

At the time this handoff was written:
- Watch Recording is the active feature.
- Desktop-site gating is enabled for mobile browser mode.
- Logo overlay is enlarged.
- Custom fullscreen is phone-only.
- Phone fullscreen requests landscape and re-syncs alignment.
- The latest `develop` deployment for commit `8e1ef72` was READY on Vercel.


### Teaching checkpoint — protected study material

- Supabase migration `learning_resources_foundation` applied successfully.
- Repository migration: `database/migrations/0014_learning_resources_foundation.sql`.
- Admin/content-manager workspace: `/admin/resources`.
- Student resources render at batch, subject, module and lecture scope.
- Resource links are released only through enrollment-gated RPC and support `release_at` scheduling.
- GitHub Quality passed and the `develop` Vercel preview deployed successfully.


### Teaching checkpoint — live delivery + teacher assignments

- Live/recorded delivery admin now manages `available_from` / `available_until` windows; student RPC enforcement already existed and is now fully exposed in admin UX.
- Scheduled live lectures prefill a practical availability window (15 minutes before start through 30 minutes after planned duration), still editable by staff.
- Supabase migration `teacher_assignments` applied and repository migration `0015_teacher_assignments.sql` added.
- Teacher permissions are server-authoritative and scoped to assigned batch/subject through RLS helpers.
- Admin/owner can grant teacher/content-manager roles and manage teacher assignments from `/admin/staff`.
- Teacher workspace is available at `/teacher`, with scoped delivery and resource tools.
- Teacher/staff layer passed GitHub typecheck, lint and build; latest develop Vercel preview is READY.


### Teaching checkpoint — attendance

- Supabase migration `lecture_attendance` applied; repository migration `0016_lecture_attendance.sql` added.
- One validated attendance record per lecture/enrollment with statuses present/absent/late/excused.
- Admin/owner and assignment-scoped teachers can load rosters and mark attendance; students can read only their own records.
- Attendance workspaces: `/admin/attendance` and `/teacher/attendance`.
- Student learning space shows attendance percentage/history.
- Attendance layer passed GitHub typecheck, lint and build; latest develop Vercel preview is READY.
- Supabase advisors currently show no new RLS security findings; leaked-password protection remains an Auth-level warning to address in final security hardening. Performance advisors also flagged several missing creator/marker FK indexes and multiple permissive RLS policies; these are scheduled for the final DB optimization pass.


### Teaching checkpoint — assignments & submissions

- Supabase migrations `assignments_and_submissions` and `teacher_scope_hardening` are applied; repository migrations `0017_assignments_and_submissions.sql` and `0018_teacher_scope_hardening.sql` are committed.
- Assignments can be scoped to batch, subject, module or lecture with release/due dates, late-submission rules, score limits and draft/published/archive status.
- Student submissions are private and stored in the non-public `assignment-submissions` Supabase Storage bucket (25 MB file limit), with student-owned upload paths and protected signed access.
- Student workflow: `/learn/:batchId/assignments` supports response text, attachment upload, draft saving, submission/resubmission while open, and viewing grades/feedback.
- Staff workflow: `/admin/assignments`; teacher workflow: `/teacher/assignments`. Staff can publish assignments, review submissions, open protected attachments and grade/return work.
- Teacher scope hardening separates batch read access from whole-batch management, preventing subject-only teachers from publishing/editing batch-wide resources or assignments.
- Assignment layer passed GitHub typecheck, lint and build. Latest develop Vercel deployment for commit `aa8d806d5e381aa4035c636bb4ab36fe9ab7ff7e` is READY.
- Supabase security advisor has no new database/RLS security findings; leaked-password protection remains the known Auth-level warning for final hardening.


### Assessment checkpoint C1 — question bank

- Supabase migrations `assessment_question_bank` and `assessment_question_bank_save_rpc` applied; repository migrations `0019_assessment_question_bank.sql` and `0020_assessment_question_bank_save_rpc.sql` committed.
- Question bank supports single-choice, multiple-choice, numeric and short-text questions with difficulty, marks, negative marks, explanations and draft/published/archive lifecycle.
- Correctness data is kept in staff-only option/key tables; students have no direct table access to `is_correct`, numeric keys or expected text answers.
- Atomic RPC saves question + options/key in one transaction and validates answer shape before commit.
- PYQ metadata fields (source type/label/year) are present for the later PYQ assessment integration layer.
- Workspaces: `/admin/questions` for content-manager/admin/owner and `/teacher/questions` for assignment-scoped teachers.
- GitHub Quality passed for develop commit `61de69552e888f6f2339bff2a69a1781061edef2`; Vercel develop alias is READY.
- Next assessment checkpoint: C2 Test & Section Builder.


### Assessment checkpoint C2 — test & section builder

- Supabase migration `assessment_test_builder` applied; repository migration `0021_assessment_test_builder.sql` committed.
- Staff can create subject-scoped or whole-batch tests with draft/published/archive lifecycle, total duration, max attempts, shuffle settings and instructions.
- Tests contain ordered subject-specific sections; each section contains reusable Question Bank questions with test-specific marks and negative marks.
- Database validation prevents cross-batch subjects, cross-subject question placement and archived question insertion.
- Subject teachers can build subject tests; only whole-batch-assigned teachers can manage whole-batch tests.
- Workspaces: `/admin/tests` and `/teacher/tests`.
- C2 GitHub Quality passed on develop. Next checkpoint: C3 scheduling and student assignment windows.


### Assessment checkpoint C3 — scheduling & assignment

- Supabase migration `assessment_test_scheduling` applied; repository migration `0022_assessment_test_scheduling.sql` committed.
- Published tests can have one or more active exam windows with open/close timestamps, result-release policy, and batch-wide or selected-student audience.
- Selected-student schedules are validated against active enrollments in the test batch.
- Staff/teacher workspace: `/admin/test-schedules` and `/teacher/test-schedules`.
- Student discovery page: `/learn/:batchId/tests`; only active schedules assigned to the authenticated enrollment are returned by the protected RPC.
- Result policies supported in schema: immediate, after close, scheduled and manual.
- C3 GitHub Quality passed on develop. Next checkpoint: C4 student test-taking with secure resumable attempts.


### Assessment checkpoints C4–C5 — test-taking, attempts, scoring & results

- Supabase migrations `assessment_attempt_foundation` and `assessment_scoring_results` applied; repository migrations `0023_assessment_attempt_foundation.sql` and `0024_assessment_scoring_results.sql` committed.
- Starting a test validates active enrollment, schedule audience/window and max-attempt limits, then creates or resumes a timed attempt.
- Each attempt snapshots question prompt/type, section/order, marks/negative marks, answer key and options so later Question Bank edits cannot change an in-progress or completed attempt.
- Student payload RPC deliberately omits correctness flags and answer keys; direct attempt snapshot tables are staff-only under RLS.
- Student runner route: `/learn/:batchId/test/:scheduleId` with question palette, timer, answer persistence, save/exit, resume and submission.
- Server-side scoring handles exact single/multiple-choice matching, numeric tolerance, normalized short-text answers, negative marking, unanswered counts and total/max score.
- Result visibility follows schedule policy: immediate, after close, scheduled or manual. Manual release controls are available in Test Scheduling.
- Released results include safe per-question review, correct answers and awarded marks only after policy allows release.
- C4/C5 frontend and database commits pass GitHub typecheck, lint and build. Next checkpoint: C6 performance analytics.


### Assessment checkpoint C6 — performance analytics

- Supabase migration `assessment_performance_analytics` applied; repository migration `0025_assessment_performance_analytics.sql` committed.
- Staff/teacher test analytics are derived from finalized immutable attempt snapshots and include attempt/student counts, average/high/low percentages, per-question accuracy/average awarded marks, and recent student attempts.
- Student analytics expose only results whose schedule release policy currently permits visibility; unreleased scores are excluded from the analytics RPC.
- Student performance includes overall released-attempt average/best score, correct/incorrect/unanswered totals, subject-level score/accuracy, and released result history.
- Duplicate selected-option IDs are rejected server-side before MSQ scoring to prevent malformed/malicious answer arrays from affecting exact-set scoring.
- Workspaces: `/admin/test-analytics`, `/teacher/test-analytics`, and `/learn/:batchId/performance`.
- C6 GitHub Quality passed on develop commit `eff3934c8f70e9dfbd20c353d0758ca2ad238d26` (typecheck, lint, build).
- Deployment note: the Vercel connector currently resolves the stable develop alias to older commit `0347d050...` despite later GitHub CI success; latest preview deployment must be resynchronized/verified before release.
- Next assessment checkpoint: C7 PYQ assessment integration.


### Assessment checkpoint C7 — PYQ integration / Assessment layer complete

- Test Builder now carries Question Bank source metadata through saved test placements so existing tests can report their PYQ question count.
- Builder question picker supports All / Original / PYQ filtering and PYQ year filtering; source label/year are visible for both selected and available questions.
- One-click `+ PYQ test` starts a PYQ-focused practice-test workflow while retaining normal subject/batch sections, scheduling, secure runner, scoring and analytics.
- PYQ questions use the same protected answer-key, immutable-attempt snapshot, result-release and performance-analytics pipeline as original questions.
- C7 GitHub Quality passed on develop commit `61fbdb6c6928156c04709070d9d7c58736cb6dca` (typecheck, lint, build).
- Assessment execution-plan items C1–C7 are complete. Next layer: D Commerce & Communication, beginning with orders/payments/provider adapter and enrollment activation.
- Vercel stable develop alias remains known to lag behind current GitHub develop and must be resynchronized before release acceptance.


### Commerce checkpoint D1 — orders, payments, coupons, receipts & enrollment activation

- Supabase migration `commerce_orders_payments` applied and repository migration `0026_commerce_orders_payments.sql` committed.
- Commerce uses server-authoritative `batch_offers` pricing in minor currency units; browser clients never decide the paid amount or enrollment entitlement.
- Orders snapshot subtotal, discount, coupon, currency and payment provider. Coupons support percent/fixed discounts, time windows, minimum order, max discount, global redemption caps and per-user limits.
- Verified payment events are idempotent by provider/event ID. The provider-neutral service-role endpoint `record_verified_commerce_payment` is the adapter boundary for a future Razorpay/Stripe/external webhook; a live third-party gateway is not configured yet because no provider has been selected.
- Admin/owner can verify a manual payment from `/admin/commerce`; successful verification atomically marks the order paid, activates/updates the enrollment and creates a receipt snapshot.
- Public Store: `/store`. Authenticated order history: `/orders`. Header/dashboard now link to these workflows.
- Admin Commerce manages batch pricing, coupons and latest orders/payments. Student order creation cannot mark its own payment as verified.
- Migration `commerce_security_hardening` applied after Supabase advisor review: public offer discovery now uses SECURITY INVOKER, provider payment recording is service-role only, the admin manual-payment wrapper is invoker-safe, the order-offer FK is indexed, and Commerce write policies no longer create duplicate permissive SELECT policies. Repository migration `0027_commerce_security_hardening.sql` is committed.
- Supabase security advisor after D1 reports only the pre-existing Auth leaked-password-protection warning; no Commerce-specific security warnings remain.
- GitHub Quality passed for Commerce styling commit `e81e94ea5f5ff631b9ada8b75646b0f0744b4ac3` and Store/My Orders commit `edb49d1503e172ccb183adc38f2b0cf07004c34b` (typecheck, lint, build).
- Latest Vercel deployment surfaced by the connector is READY for Commerce styling commit `e81e94ea...`; Store/My Orders commit was CI-green but had not yet surfaced in the connector at this checkpoint.
- Next: D2 announcements, in-app notifications, then email/WhatsApp adapter hooks.


### Communication checkpoint D2 — announcements & notifications

- Supabase migration `announcements_in_app_notifications` applied and repository migration `0028_announcements_in_app_notifications.sql` committed.
- Announcements support global, batch and subject scope, draft/published/archive lifecycle, scheduled publish time and expiry. Subject/batch scope is validated server-side.
- Admin/content-manager workspace: `/admin/announcements`. Assignment-scoped teacher workspace: `/teacher/announcements`; teachers cannot publish global announcements.
- Publishing an announcement generates private per-student in-app notifications for eligible active students. Student inbox: `/notifications`, with unread/read state and mark-all-read.
- Supabase migration `notification_channel_outbox` applied and repository migration `0029_notification_channel_outbox.sql` committed.
- Students can manage email/WhatsApp delivery preferences; email defaults enabled and WhatsApp is opt-in. WhatsApp delivery requires a phone number on the profile.
- External email/WhatsApp notifications are queued in a service-role-controlled outbox with retry/attempt state; browser clients cannot read or mutate other users’ deliveries.
- Supabase Edge Function `notification-dispatch` version 1 is deployed ACTIVE with JWT verification plus an explicit service-role-token check. It implements Resend email delivery and Meta WhatsApp Cloud API template delivery, then completes/fails outbox rows through service-role-only RPCs.
- Required release-time external configuration for those channels: `RESEND_API_KEY`, `EMAIL_FROM`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, approved `WHATSAPP_TEMPLATE_NAME`, and optional template language/Graph version. Until configured, in-app notifications are fully operational while external-channel jobs remain dormant.
- Supabase security advisor after D2 reports only the pre-existing leaked-password-protection Auth warning; no announcement/notification-specific security warnings remain.
- GitHub Quality passed for announcement foundation `bccc7d7851acd9ed7bd4a7247803791f4ca6565f`, announcement/inbox UI `c321ef761025fc7e44a9854a09755bc732030db6`, and channel-outbox UI `0aa7ceefcdc4858d58e45d2b8dd1a6a0e038e765`.
- Layer D feature implementation is complete except for live external email/WhatsApp provider credentials/template verification, which is an external release configuration dependency.
- Next product layer: E1 student dashboard completion.


### Product checkpoint E1 — student dashboard complete

- Student dashboard now aggregates real enrolled batches, upcoming/live lecture actions, scheduled tests, released assignments, attendance summaries, pending orders and unread notification counts.
- Dashboard uses existing enrollment-gated/scoped services and `Promise.allSettled` per batch so one failing widget does not blank the whole portal; partial refresh failures are surfaced non-destructively.
- Course cards link directly to learning space and performance; live lecture actions use protected delivery-action URLs; tests, assignments, orders and notification inbox are directly reachable.
- Responsive dashboard styling is in `src/styles/dashboard.css`.
- Initial E1 commit `98ad3963...` exposed a React purity lint on render-time `Date.now()`; fixed in `1aeb15e47773bdb7f12399ce1d1f397c452ae4b7` using stable state initialization.
- E1 final GitHub Quality passed typecheck, lint and build on `1aeb15e47773bdb7f12399ce1d1f397c452ae4b7`.
- Next: E2 teacher dashboard completion.


### Product checkpoint E2 — teacher dashboard complete

- Teacher workspace now functions as a scoped operations dashboard rather than only a navigation grid.
- Dashboard aggregates active teacher assignments, assigned batches/subjects, upcoming lectures, published assignments/tests, announcement count and direct links to delivery/resources/attendance/assignments/question bank/tests/scheduling/analytics/announcements.
- Aggregation begins with `teacher_assignments` under teacher RLS and only follows data returned within those scopes; whole-batch vs subject-only access remains server-authoritative.
- Partial widget failures are non-destructive and surfaced without exposing broader admin data.
- Responsive styling is in `src/styles/teacher-dashboard.css`.
- Initial E2 commit `38b79495...` failed only because of an unused TypeScript import; fixed in `ffa9b3921bcc35b3e4873b58ab11f44b241f32b3`.
- E2 final GitHub Quality passed typecheck, lint and build on `ffa9b3921bcc35b3e4873b58ab11f44b241f32b3`.
- Next: E3 admin operations dashboard.


### Product checkpoint E3 — admin operations dashboard complete

- New role-aware admin overview is available at `/admin/overview` and is now the primary Admin entry point from the header/student dashboard.
- Content-manager/admin/owner users see academic delivery, upcoming lecture, assessment and announcement KPIs; admin/owner additionally receive active-enrollment, pending-order and staff-role counts.
- Sensitive enrollment/commerce/staff queries are not issued for content managers, so restricted operational data is not fetched merely to render unavailable cards.
- Quick actions link to academics, content, assessments, communication, enrollments, commerce and staff according to role.
- E3 GitHub Quality passed on develop commit `27a3fb534663f0a0b7389c94c2078f25b07f2a34` (typecheck, lint, build).
- Next: E4 shared search/filter/pagination controls across long management lists.


### Product checkpoint E4 — search, filter and pagination complete

- Added shared reusable collection controls in `src/features/admin/CollectionControls.tsx` with render-pure pagination, page-size selection, result counts and search toolbar.
- Applied high-volume management controls to Staff, Students/Enrollments, Question Bank, Commerce Orders, Tests, Resources and Assignments.
- Existing contextual filters (course/batch/subject/module/lecture/source/status) are preserved and compose with text search rather than replacing scope controls.
- React lint initially rejected effect-driven pagination resets; the hook was redesigned to derive page state from a reset key with no synchronous setState effects.
- Final E4 GitHub Quality passed on `249b37d7d6810563854ed03e42f7fba85b77da76` (typecheck, lint, build).
- Next: E5 audit logs and operational settings.


### Product checkpoint E5 — audit logs & settings complete

- Supabase migration `audit_logs_app_settings` applied and repository migration `0030_audit_logs_app_settings.sql` committed.
- Critical operational changes on courses, batches, profiles, enrollments, teacher assignments, assignments, tests/schedules, commerce and announcements now emit immutable audit events with actor/action/entity metadata and changed-column names only; full private row snapshots are intentionally not stored.
- Admin/owner Audit workspace: `/admin/audit`, with search, entity/action filters and shared pagination controls.
- Admin/owner Settings workspace: `/admin/settings`, managing non-secret operational values only. Provider/API secrets remain outside browser-visible data.
- Settings updates are themselves audited.
- Initial E5 frontend commit `20ec1e33...` had one missing parenthesis in the settings state initializer; corrected in `6f91e612cd9bd21224f592127dfa6cd323121491`.
- Supabase migration `audit_settings_security_hardening` applied and repository migration `0031_audit_settings_security_hardening.sql` committed: settings RPCs now use SECURITY INVOKER, admin/owner update rights are enforced by RLS, and anonymous settings RPC execution is removed.
- Supabase security advisor after E5 reports only the pre-existing Auth leaked-password-protection warning; no audit/settings-specific findings remain.
- E5 final GitHub Quality passed typecheck, lint and build on `6f91e612cd9bd21224f592127dfa6cd323121491`.
- Next: E6 accessibility, responsive and error-state pass.


### Product checkpoint E6 — accessibility, responsive and error-state pass complete

- Added keyboard skip navigation and route-level focus management to move focus to the main content region after navigation.
- Mobile navigation now closes on Escape and returns focus to the menu trigger; the toggle exposes a dynamic accessible label.
- Added global :focus-visible treatment, screen-reader-only utility, reduced-motion hardening, coarse-pointer touch-target minimums, mobile form font sizing, responsive nav overflow handling and disabled-control affordances.
- Added a top-level React error boundary with a user-facing reload/home fallback instead of an unhandled blank screen.
- Replaced wildcard redirect with a proper 404 page.
- E6 GitHub Quality passed typecheck, lint and build on `8d4a82f663b3afdb9e43fadf19a3aad990e6c1f7`.
- Next: E7 PWA and performance optimization.


### Product checkpoint E7 — PWA & performance complete

- Added installable web manifest, service-worker registration and a conservative same-origin cache strategy for the static shell and versioned assets; authenticated/API requests are not intercepted.
- Added Vercel cache headers for hashed assets, brand assets, manifest and revalidated service worker.
- Converted heavy product/admin/student routes to React lazy imports behind a shared Suspense fallback.
- Vite build now separates React/router and Supabase vendor chunks with Vite 8-compatible manual chunking.
- Initial PWA commit `689b2c4e403918d7831b3a5499c443ec8a218bcb` failed because the chunk configuration used an incompatible form for Vite 8; fixed in `62fc55e6dcfd32a2914374be5a0e12e2eb8923d1`.
- E7 final GitHub Quality passed typecheck, lint and build on `62fc55e6dcfd32a2914374be5a0e12e2eb8923d1`.
- Product layer E is complete. Next: F1 security audit.


### Product checkpoint E7 — PWA & performance complete

- Added dependency-free PWA metadata and a production service worker with same-origin static-asset caching plus navigation offline fallback. Authenticated/API/provider traffic is not cached; cross-origin Google Drive/Supabase traffic is bypassed.
- Fixed the broken favicon reference from a non-existent SVG to the existing Statistics Lover JPG and added manifest/apple-mobile metadata.
- Added route-level React lazy loading for heavy student/admin/teacher screens and Vite vendor chunking for React and Supabase.
- Vercel cache headers now mark hashed `/assets/*` immutable while forcing `sw.js` revalidation.
- Build output after code splitting: core app chunk ~44.43 KB / 9.25 KB gzip; heavy feature pages are separate ~2.7–17.9 KB chunks; React vendor ~73.26 KB gzip and Supabase vendor ~55.01 KB gzip for long-term caching.
- Initial E7 commit `689b2c4...` hit Vite 8 manualChunks typing; corrected in `62fc55e6dcfd32a2914374be5a0e12e2eb8923d1`.
- E7 final GitHub Quality passed typecheck, lint and build on `62fc55e6dcfd32a2914374be5a0e12e2eb8923d1`.
- Vercel preview deployment for the latest commits is currently blocked by the project’s Vercel `build-rate-limit` status, not by application build errors. A clean preview deployment and PWA file smoke check remain mandatory in F release verification once the rate limit clears.
- Product-completion layer E is now implemented. Next: F1 RLS/privilege/browser-secret/provider-link audit.


### Release checkpoint F1 — security audit complete

- All public application tables currently have RLS enabled.
- Supabase security advisor reports only the Auth leaked-password-protection warning; no database/RLS/service-role findings remain.
- Browser production configuration contains only the Supabase publishable client key and provider selections; no service-role, Resend, WhatsApp or payment-provider private credentials are browser-exposed.
- Notification provider credentials are read only inside the service-role-gated Supabase Edge Function.
- Students cannot directly SELECT raw lecture/resource source tables or assessment answer-key tables; those policies are restricted to scoped teachers/staff/admins.
- Student lecture/resource action URLs are returned only through enrollment-gated, release/availability-aware RPCs. Google Drive recording references are normalized to preview URLs. Authorized browser clients can still observe the final playback URL, which is an inherent limitation of browser-delivered Drive playback rather than an RLS bypass.
- Assignment submission storage remains private with owner/scoped-staff policies.
- Added Vercel browser hardening headers: CSP, frame blocking, no-sniff, strict referrer policy and restricted camera/microphone/geolocation permissions.
- Corrected production build marker to `VITE_APP_ENV=production`.
- Security hardening GitHub Quality passed on `d4e8b59d5d6f42cf06be20499c6fd59d52516c40`.
- External release setting still required: enable Supabase Auth leaked-password protection from the Supabase Auth dashboard/API when accessible.
- Next: F2 data-integrity audit.


### Release checkpoint F2 — data-integrity audit complete

- Ran a consolidated live anomaly scan across enrollment uniqueness/windows, teacher scope/windows, learning-resource/assignment scope, assessment scope/sections/questions/schedules/audience, attendance batch alignment, announcement scope/windows, offer/coupon/order math, paid timestamps and receipt snapshots.
- All 20 anomaly classes returned zero rows/issues.
- Verified cross-table invariants are enforced by database validation triggers for teacher assignments, learning resources, assignments, test scope/sections/questions/audience, attendance and announcements.
- Verified core uniqueness/check/foreign-key constraints for enrollment, assessment, commerce and teaching entities.
- Added migration `receipt_integrity_constraints` / repository migration `0032_receipt_integrity_constraints.sql` so receipt snapshots independently enforce currency format, nonnegative amounts, discount caps and arithmetic equality instead of relying only on trusted server creation.
- Next: F3 cross-role acceptance scenarios.


### Release checkpoint F3 — cross-role acceptance complete

- Used an existing active student identity inside rollback-only transactions and temporarily swapped app roles so no permanent account or permission changes were made.
- Student-only: active enrollment/batch access succeeds; direct raw delivery sources, assessment answer keys, audit logs and app settings return no rows.
- Subject-scoped teacher: teacher role and subject access succeed; scoped lecture delivery source is readable; whole-batch management remains false; audit/settings stay inaccessible.
- Content manager: academic/content delivery data is accessible; admin/owner scope remains false and audit/settings stay inaccessible.
- Admin and owner: admin scope is true and audit/settings are readable.
- Suspended account: active-user check, batch access, published subject visibility and notification visibility are all denied.
- Frontend route guards already mirror this split: teacher routes require teacher role; admin-sensitive commerce/enrollment/staff/audit/settings routes require admin/owner; content management routes permit content-manager/admin/owner.
- This matrix also closes the Teaching-layer acceptance-test item because it verifies student access, teacher subject scoping and whole-batch management denial under live RLS.
- Next: F4 production migration/build/deployment verification.
