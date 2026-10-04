# Statistics Lover — Project Handoff Context

> **Purpose:** This is the canonical continuity file for future ChatGPT conversations.  
> Before making changes in a new chat, read this file and then verify the current `develop` branch head and latest deployment status.
>
> **Update rule:** Keep this file current after major architecture decisions, deployment changes, or completed feature milestones. Later explicit decisions override older notes.

## Repository and active branch

- Repository: `ashukla1707-beep/statistics-lover`
- Active development branch: **`develop`**
- Do not use `main` as the source of truth for ongoing feature work unless explicitly requested.
- Current handoff base before this documentation commit: `ff140ed53a6276dc278f34fb07c0cd0727ed63fc`
- Current focus: **Android A3 native teacher/admin editing workflows**. Recording, attendance, grading, assessment operations, and study-resource management are implemented; next native layer is lecture delivery-source management.

## Deployment

- **Current frontend deployment target: Vercel only.**
- Vercel team: **Statistics Lover**
- Vercel project: `statistics-lover`
- Development branch: `develop`; GitHub integration automatically creates Vercel Preview deployments for develop commits.
- `main` remains the production branch unless a later explicit release decision changes it.
- Stable develop alias remains `statistics-lover-git-develop-statistics-lover.vercel.app`.
- Cloudflare deployment automation was removed after the user explicitly decided to continue with Vercel only. The dormant `wrangler.jsonc` may remain for a future hosting switch but is not part of the active release path.
- Do not re-add or rerun Cloudflare deployment workflows unless the user explicitly changes this decision later.

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

## Android direction

- The older plan to make the whole APK a WebView shell is **superseded** by Android checkpoint A3 below.
- The current application shell is a true native Android client (`SplashActivity -> NativeMainActivity`) and must remain native rather than reverting the entire app to a website wrapper.
- Google Drive recording delivery remains a special integration problem. If an embedded recording surface is needed later, keep any WebView/provider-specific player isolated to the recording experience rather than using it as the architecture for the whole app.
- Android real-device validation and the missing native teacher/admin editing workflows remain pending after the current web UI stabilization pass.

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

At the latest handoff:
- The active workstream is the **public Home page and cross-device UI stabilization**, based on user screenshots showing authenticated-header overlap, narrow/mobile button/card overflow and misaligned text-arrow back links.
- The public Home page now represents the implemented product rather than the old foundation placeholder and uses working Store/Login/current-section navigation.
- A shared responsive hardening layer is loaded last to provide min-width/wrapping guardrails, earlier compact header behavior and narrow-screen action/card layouts across product areas.
- Back navigation now uses a reusable icon/text component so the arrow is vertically aligned instead of relying on a text glyph baseline.
- The prior experimental Android/player scaling changes were rolled back before this UI pass; do not reintroduce the rejected scaling race fixes without new evidence.
- GitHub Quality is green through UI code commit `bd14eac3b6ce9c81a973cde5995dc68ca6a8e3d9`.
- Vercel's connector still shows the newest READY `develop` preview at `c0f58a9b932c41ad06fe9dc1469befe7305a104f`, so the complete UI layer has **not yet surfaced as a verified READY preview**. Do not claim full deployed-device acceptance until the later commits appear on Vercel and are checked.
- After the latest UI build is deployed, verify Home, Login, Store, Dashboard and Learning pages on real 320/360/390/430px phones plus tablet/desktop-width layouts, then resume Android A3 work.


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


### Release checkpoint F4 — production migration/build verification complete

- Repository contains 33 SQL migration files and live Supabase migration history contains the corresponding 33 named migrations through `receipt_integrity_constraints`.
- Current develop head passed GitHub Quality (typecheck, lint, build).
- Vercel deployment for develop commit `3aae0da6eadf612fe5b203747d65d0bb64a5240d` is READY and owns the stable alias `statistics-lover-git-develop-statistics-lover.vercel.app`.
- Stable alias and raw deployment return identical built asset hashes.
- Deep SPA routes `/store` and `/login` return HTTP 200 through the rewrite.
- `/manifest.webmanifest` and `/sw.js` return HTTP 200 with the expected cache policies.
- Browser security headers, including CSP, no-sniff, referrer policy and frame denial, are present on the deployed response.
- Next: F5 compare/release develop to main, subject to the remaining external release-settings dependencies already documented.


### Android checkpoint A1 — installable test APK built

- Added standalone native Android project under `android-app/` with application ID `com.statisticslover.app.debug` for debug builds.
- Debug APK loads the current verified develop site `https://statistics-lover-git-develop-statistics-lover.vercel.app`; release build configuration targets `https://statistics-lover.vercel.app`.
- Recording route `/learn/:batchId/lecture/:lectureId` switches only that page to a desktop Chrome user agent, then restores the normal mobile WebView user agent after leaving the recording route.
- Native fullscreen uses immersive landscape orientation and restores portrait on exit.
- Android `FLAG_SECURE` is enabled to block normal screenshots/screen recording of the app window as a deterrent; this is not DRM and cannot prevent external-camera/rooted-device capture.
- File chooser support is enabled for assignment uploads. External links such as Google Meet open in the appropriate external app/browser.
- Cleartext HTTP is disabled; SSL errors are cancelled instead of bypassed.
- GitHub workflow `.github/workflows/android-apk.yml` builds and uploads a signed debug APK.
- Android commit `a1ed680e76db151f1cbaf4686f6f76b2b1331024` passed both Android APK workflow run `37127723234` and repository Quality workflow run `37127723208`.
- Generated debug APK SHA-256: `665d5716bd05e113faa6e000722c8fdda372a0c20db8174643891bfdd60afd9c`.
- Next Android step: install on a real phone and validate login/session persistence, recording desktop-UA behavior, fullscreen landscape, assignment file upload, external Meet links, back navigation, and screenshot blocking before production signing.


### Android checkpoint A2 — Stat Archive-style shell build complete

- Rebuilt Statistics Lover Android using the same architecture style as the existing Stat Archive Android app after inspecting `ashukla1707-beep/statarchive-android`.
- Added AndroidX/AppCompat/Core SplashScreen dependencies and enabled AndroidX in the Android project.
- Native launch stack now owns the cold-start splash and keeps it visible until the React app has actually rendered, rather than exposing a blank/basic WebView launch.
- Added a dedicated Statistics Lover WebView data profile, proper Android system-inset handling, Android Back dispatcher behavior, persistent cookies/session handling, trusted-host routing and native app-mode injection.
- Recording route still switches only Watch Recording to a desktop Chrome user agent; fullscreen remains immersive landscape and returns to portrait on exit.
- Assignment uploads use the Android file picker; external links such as Google Meet open outside the app; FLAG_SECURE remains enabled.
- The product UI remains web-driven inside the native shell, matching Stat Archive's architectural model rather than being a full native-screen rewrite.
- Initial Stat Archive-style commit `d187554acf8054eac3c34604e22be0bf395b7035` failed Android compilation because AndroidX mode was not enabled; fixed in `99bfafb34aebabfaa423b2e1ae5795c222a2fd79`.
- Android APK workflow run `37128489532` and normal Quality workflow run `37128489574` both passed.
- Workflow artifact digest: `sha256:4cd7cb096b7fb6846f54f5e2573a28c1a3a4d892cdcce6ffb9f33b549e4e4ab7` (ZIP). Extracted APK SHA-256: `e1321e2e4f39145d06222ee3e77113d349b27829b4924018d96062f56c74fa28`.
- Next Android step: install this A2 APK on the real phone and validate launch/splash feel, login persistence, normal navigation, Watch Recording desktop-UA behavior, fullscreen landscape, uploads, external Meet links and screenshot blocking. If the user means a fully native-screen app rather than Stat Archive-style shell behavior, that is a separate larger rewrite.


### Android checkpoint A2 — Stat Archive-style app-first shell

- User feedback showed the first Android APK still felt like the public website because it launched the marketing Home route.
- Verified the reference Stat Archive APK architecture from `ashukla1707-beep/statarchive-android`: it is also WebView-based, but uses an AndroidX/AppCompat native shell, native splash/launch readiness, dedicated WebView profile, Android back handling, file handling and APK/PWA-specific presentation behavior.
- Statistics Lover Android was upgraded to the same architecture style: `StatisticsLoverApplication`, `LaunchReadyActivity`, AndroidX/AppCompat/Core SplashScreen, safe system insets, dedicated WebView profile, native Back dispatcher, native file chooser, secure fullscreen/orientation handling and app-only DOM mode.
- APK launch target is now `/dashboard`, not the public Home page. Logged-out users are redirected by the existing auth guard to Login; authenticated users land directly in Dashboard.
- Inside Android app mode, the public marketing footer and Home-section navigation are suppressed, the header is compact, and tapping the Statistics Lover brand returns to Dashboard. The normal website is unchanged.
- Recording route still switches only `/learn/:batchId/lecture/:lectureId` to desktop Chrome UA and fullscreen enters immersive landscape.
- AndroidX build blocker was fixed with `android.useAndroidX=true` in `android-app/gradle.properties`.
- App-first commit `e512a46be397787021bc6ea46babcf60c90c6d68` passed Android APK build/verification/upload in workflow run `37128754777`.
- App-first APK artifact SHA-256 (GitHub zip): `797bf5a3e39e90cb7e052d3812e8227d11e78f4785fb8f2f865674ffba98eeb8`.
- Extracted APK SHA-256: `c362630e985019c84f0a952b651cc2c1a6e4709accfa1db442fab83272114e1b`.
- Next: install this A2 APK on the real Android phone and validate that startup lands in Login/Dashboard rather than marketing Home, then validate session persistence, recording desktop-UA/fullscreen landscape, assignment uploads, external Meet routing and screenshot blocking.


### Android checkpoint A3 — true native client build complete

- User explicitly rejected the WebView-based A1/A2 builds, so Android direction changed to a true native client.
- The Android launcher now uses `SplashActivity -> NativeMainActivity`; obsolete `MainActivity` and `LaunchReadyActivity` WebView activities were deleted from the Android source tree.
- Native screens now include sign-in, dashboard, enrolled courses, native subject/module/lecture hierarchy, notification inbox, orders, store/order creation, teacher scope and role-aware operations shell.
- Google Meet/Google Drive lecture actions open as external provider links; the Statistics Lover website itself is not loaded inside an Android WebView.
- Added Supabase Edge Function `native-api` (ACTIVE, verify_jwt=false) as the mobile API. It uses the anon client plus the user's own JWT for RLS-protected operations; service-role access is not used for normal native user data.
- Android session state is stored locally and the native API client supports token refresh.
- Android `FLAG_SECURE` remains enabled as a screenshot/screen-recording deterrent.
- Final WebView-free Android head `9a4bd97495a2cc074eddcebc7dc1171c5e1ab1ea` passed repository Quality workflow and Android APK workflow run `37130958520`.
- GitHub APK artifact id `11277210361`; artifact ZIP digest `sha256:9783bf3e20ff69eedf2c0170e9df3fc9d885e622fc70b96ccaf5cac025fbf318`.
- Extracted APK SHA-256: `c72b271f93ae25b991d64cb4fcf2525ac111adb02cb8f53a22f1e8d7f62e549f`.
- Next: install A3 on a real phone and validate native login/session restore, course learning hierarchy, inbox/orders/store, provider action routing and role-specific screens. Teacher/admin edit workflows remain the next native Android layer after device validation.


### UI stabilization checkpoint — Home, responsive shell & navigation

- Replaced the obsolete public Home foundation copy with current product-facing content for courses/batches, student dashboard, live/recorded learning, tests/performance, assignments/resources and PYQ/study-resource workflows.
- Home CTAs now route to the real Store and Student Login; public section IDs/navigation were simplified to Home, Platform, Assessments, PYQs & Resources and About.
- Repaired Footer links that still targeted removed Home anchors; footer Platform links now use the real Store, Assessments, Resources and Student Login destinations.
- Authenticated Header no longer renders the full marketing navigation alongside account/role links. Medium/tablet layouts now switch to the hamburger navigation at 1180px to prevent the branding/navigation collision seen in user testing.
- Added `src/styles/responsive.css`, imported last, as a cross-product responsive safety layer: flex/grid children receive `min-width: 0`, text/buttons can wrap safely, common action groups wrap, narrow learning/dashboard/assignment actions stack full-width, KPI helper text no longer forces nowrap overflow, and tablet/narrow card headings/actions collapse predictably.
- Added reusable `BackLink` with a dedicated arrow element and applied it to student learning/tests/performance/assignments/results, teacher dashboard, and teacher-mode admin workspaces so back arrows align consistently with their labels.
- Service-worker static cache advanced to `statistics-lover-static-v7` so the stabilized shell is not held behind an old cached UI.
- GitHub Quality passed typecheck, lint and build on `bd14eac3b6ce9c81a973cde5995dc68ca6a8e3d9`. Earlier transient CI failures during the BackLink refactor were only unused-import errors on intermediate commits and were resolved by the final green head.
- The prior Vercel preview lag is resolved. The stable develop alias now serves the stabilized build; automated smoke checks return HTTP 200 for Home, Store, Login and Dashboard SPA routes, and the deployed CSS contains the 1180px header breakpoint, reusable back-link styles and learning-action responsive rules.
- Remaining UI acceptance is visual/real-device only: authenticated phone/tablet screenshots should still be checked for any screenshot-specific regressions as they are reported, but the deployed web baseline is no longer blocking Android A3 work.


### Deployment checkpoint — Cloudflare selected as current frontend target

- User explicitly changed the near-term deployment plan: use **Cloudflare now** and return to Vercel later.
- Added GitHub Actions workflow `.github/workflows/cloudflare-deploy.yml` on develop commit `40441488ec4a33dadd7b720408a0315e0b5a78e2`.
- The workflow builds and verifies the frontend in GitHub Actions, then runs `npx --yes wrangler@4 deploy` against the existing `wrangler.jsonc` static-assets Worker configuration. This intentionally bypasses the previously unreliable Cloudflare Workers Builds Git integration.
- Workflow run `37162214830` passed install, typecheck, lint and Vite build, then stopped at the credential guard because `CLOUDFLARE_API_TOKEN` is missing from GitHub repository secrets. `CLOUDFLARE_ACCOUNT_ID` is also unset.
- No Cloudflare deployment is being claimed yet. The deployment is **wired but blocked on Cloudflare authentication**.
- After the user reported adding the credentials, Cloudflare Deploy run `37162329262` was re-run (attempt 2). Install/typecheck/lint/build all passed again, but GitHub Actions still received an empty `CLOUDFLARE_API_TOKEN` and empty `CLOUDFLARE_ACCOUNT_ID` at the credential check. This means the values are not currently available to the workflow as GitHub **Actions repository secrets** (for example, they may have been added under a different secret store/category or with different names).
- Safe unblock: add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` as GitHub repository secrets, then rerun the Cloudflare Deploy workflow. Never commit those credentials.
- Vercel remains connected but should not be used as the current acceptance target until the user explicitly switches back.


### Deployment checkpoint — Vercel-only path restored

- User explicitly ended the Cloudflare attempt and decided to use **Vercel only** for frontend deployment.
- The temporary GitHub Actions Cloudflare deploy workflow was deleted on commit `333a3fab6ae53eb4edb9a7474c320e09d4fa5e63`.
- `docs/DEPLOYMENT.md` was restored to a Vercel-only release policy on `fb6ca399601297b19823e0d55e31b2a4018ba9f3`.
- The existing Vercel Git integration is healthy and is again the authoritative deployment path for `develop`.
- During the Cloudflare experiment, Vercel continued to catch up automatically; the develop branch produced READY preview deployments through commit `b9504a1450a0fb8861b89b691ab1f340dff8cfe3`.
- Cloudflare credentials/workflows should not be revisited unless the user explicitly asks to switch away from Vercel later.
- Next deployment task: wait for the latest Vercel preview created from the current documentation/policy commits, verify the stable develop alias, then use that deployment for mobile/tablet/desktop UI acceptance.


### Android checkpoint A3.1 — dedicated native recording activity

- Added a dedicated Android `RecordingActivity` for authorized Google Drive recording actions while keeping the rest of the A3 app true-native. The Statistics Lover website is still not used as the Android application shell.
- Verified the live Supabase `native-api` learning action still calls `get_batch_delivery_actions`; the RPC returns `lecture_id, action_kind, provider, action_url, label`, matching the Android routing contract.
- `LearningScreen` now preserves and renders **multiple actions per lecture** instead of overwriting one action in a single-value map. This prevents Hybrid/live+recorded lectures from losing one of their actions.
- Google Meet and non-Drive provider actions still open externally. Only `watch + google_drive` is routed to the dedicated recording activity.
- Recording playback uses an isolated Android WebView with a desktop Chrome user agent, wide viewport, JavaScript/DOM storage and HTTPS-only app configuration so Google Drive can serve its desktop-style preview inside the recording screen.
- Added a **Statistics Lover custom fullscreen control**. Normal mode keeps the custom button over the lower-right provider fullscreen area; native fullscreen hides the toolbar/system bars, locks to sensor landscape and moves the Exit Fullscreen control to the upper-right so Drive's bottom playback controls stay visible.
- If Google Drive itself requests HTML fullscreen, the activity cancels the provider custom-view takeover and enters the same Statistics Lover activity fullscreen mode instead, avoiding the separate Drive fullscreen layout.
- Android Back exits fullscreen first; outside fullscreen it closes the recording activity and returns to the native learning hierarchy.
- Latest explicit screenshot/testing decision: **debug builds allow screenshots and screen recording**. `FLAG_SECURE` is now applied only to non-debug/release builds in both the native shell and recording activity. This supersedes older A1/A2/A3 notes that said debug testing was screenshot-blocked.
- Android test version advanced to `1.0.3-test` / versionCode 4.
- Final recording commit `5e9e37af9794b310936c6743965ba87abf3a9282` passed GitHub Quality run `37163138687` and Android APK run `37163138675`.
- GitHub APK artifact id `11288521240`; artifact ZIP digest `sha256:7a3604963577563585993a4b26d1b4a43dac2b4e780f24775e274d770b56a976`.
- Extracted debug APK SHA-256 from the workflow: `87a9f605b342bed2408d638e77b0f69666b83d85ae0349cbf2654688d292a6a7`.
- Next Android acceptance: install this APK on the real phone and validate Watch Recording startup, play/pause/seek visibility, custom fullscreen enter/exit, landscape restoration, Android Back, screenshot/screen recording, and Hybrid lecture dual actions. After player/device acceptance, continue native teacher/admin editing workflows.


### Android checkpoint A3.2 — native attendance editing complete

- Added repository source for the existing Supabase Edge Function under `supabase/functions/native-api/` so the deployed mobile API is no longer an untracked dashboard-only function.
- Deployed `native-api` version 2 from the same repository source. It remains `verify_jwt=false` because sign-in/recovery are public actions, while every protected action still requires the user's access token and uses a user-scoped Supabase client so RLS remains authoritative.
- Extended bootstrap teacher assignments with readable course/batch/subject labels while preserving assignment IDs and scope.
- Added protected mobile actions:
  - `attendanceLectures`: returns RLS-visible subject/module/lecture hierarchy, optionally restricted to a teacher assignment's batch/subject.
  - `attendanceRoster`: calls the existing protected `get_attendance_roster` RPC.
  - `saveAttendance`: validates status/note payloads, upserts `lecture_attendance` with the user's JWT, then reloads the protected roster.
- No service-role bypass was added. Existing teacher/admin attendance RLS and the database validation trigger remain the write authority.
- Added native `AttendanceScreen` with scoped lecture selection, roster editing, Present/Absent/Late/Excused status controls, optional notes, Mark All Present and Save Attendance.
- Teacher workspace now displays human-readable assignment context and a **Take attendance** action for each active scope.
- Admin/owner native Ops now exposes **Manage attendance** across their RLS-visible academic scope; content managers are not given attendance write UI because current attendance policies restrict writes to assigned teachers/admin/owner.
- Android test version advanced to `1.0.4-test` / versionCode 5.
- Attendance commit `1b728d205894d5560fd3890e7302813bef5a337a` passed GitHub Quality run `37163518108` and Android APK run `37163518109`.
- APK artifact id `11288462935`; artifact ZIP digest `sha256:bdc0c712d96e00762566396a5a1b23a399e26a580033f59bd5bbc3c247853dba`.
- Extracted debug APK SHA-256: `0a99ceb674322777e19015567637225a7a4c9127f8dee888bd78cabad72ba8ec`.
- Next native layer: assignment submission review/grading for teacher/admin, followed by assessment/content editing and the remaining admin operations modules.


### Android checkpoint A3.3 — native assignment review & grading complete

- Extended the repository-backed `native-api` and deployed live version 3 from the same source.
- Added RLS-scoped mobile actions:
  - `managedAssignments`: returns assignments visible to the caller with course/batch/subject/module/lecture context.
  - `assignmentSubmissions`: uses the existing protected `get_assignment_submissions` RPC.
  - `gradeSubmission`: updates only `graded`/`returned` status, nullable score and feedback through the caller's JWT/RLS, then reloads the protected submission list.
  - `submissionSignedUrl`: creates a short-lived URL through the caller's private Storage permissions for an assignment attachment.
- No service-role grading path was introduced. Existing `assignment_submissions_update_staff` RLS, teacher assignment scope hardening and the `validate_assignment_grade` database trigger remain authoritative. The trigger still rejects scores above the assignment max and stamps grader/time.
- Added native `AssignmentReviewScreen` with assignment context, due/max-score information, submission text, protected attachment opening, grading/return status, decimal score validation and feedback.
- Student draft submissions are visible to authorized staff but deliberately not gradable until submitted.
- Teacher workspace now exposes **Review assignments** per active batch scope; database RLS automatically restricts subject-only teachers to assignments they are authorized to manage.
- Content-manager/admin/owner Ops exposes **Review assignments** according to existing assignment RLS. Attendance remains admin/owner or assigned-teacher only.
- Android test version advanced to `1.0.5-test` / versionCode 6.
- Assignment grading commit `ae6c3e83e67649c645b6c696a1ebb59db51dcb07` passed GitHub Quality run `37163942305` and Android APK run `37163942343`.
- Live Supabase `native-api` is ACTIVE at version 3 and contains all four assignment actions above.
- APK artifact id `11288244610`; artifact ZIP digest `sha256:8ee20fe8440dce21ee354b2002bb662f6d8eb2f1271e92a9da8b5062ebe9bc8e`.
- Extracted debug APK SHA-256: `7a39abb48ae3f06d8b883fcf48dac6cc34b849ef2fbbe72a33d829870da860a2`.
- Next native layer: assessment/test operations, then content/resource editing and the remaining admin modules.


### Android checkpoint A3.4 — native assessment operations complete

- Deployed repository-backed `native-api` version 4 with RLS-scoped assessment operations.
- Added mobile API actions:
  - `assessmentTests`: lists tests visible to the current content-manager/admin/owner or assignment-scoped teacher.
  - `assessmentSchedules`: lists schedules for an authorized test.
  - `setScheduleActive`: pauses/reactivates an existing schedule through normal schedule UPDATE RLS.
  - `setManualResultsReleased`: calls the existing protected result-release RPC to release or hide manual-policy results.
  - `assessmentAnalytics`: calls the existing staff/teacher test analytics RPC.
- No assessment answer keys or student-private data are exposed outside the existing protected analytics/scheduling interfaces.
- Added native `AssessmentOpsScreen` with role-scoped test discovery, schedule windows/status, pause/activate controls, manual-result release/hide controls, and summary performance metrics.
- Teacher workspace exposes **Tests & results** per active batch assignment; subject-only teachers remain restricted by `private.has_teacher_test_access` and existing test/schedule RLS.
- Content-manager/admin/owner Ops exposes **Tests & results** across the caller's RLS-visible scope.
- This layer intentionally manages existing tests/schedules rather than recreating the full question-bank/test-builder editor on mobile. Question/test authoring remains a later native layer.
- Android test version advanced to `1.0.6-test` / versionCode 7.
- Assessment operations commit `92e97349d2e4411915ecb5f37ff5a2dbb62fe09b` passed GitHub Quality run `37164179952` and Android APK run `37164179736`.
- Live Supabase `native-api` is ACTIVE at version 4 with all five assessment operations above.
- APK artifact id `11288926723`; artifact ZIP digest `sha256:2728763e6c880ca59c8c89f105b2b5d0c6306188372930241c557519d28fb4fc`.
- Extracted debug APK SHA-256: `7b859159a27671ceaff615a2f5b85d17d6fc2468b1a7379479faa95c8a5caa0b`.
- Next native layer: content/resource editing (study resources and delivery-source management), then remaining admin operations and optional full assessment authoring.


### Android checkpoint A3.5 — native study-resource management complete

- Deployed repository-backed `native-api` version 5 with native learning-resource management.
- Added API actions:
  - `contentBatches`: lists RLS-visible batches for the operations workspace.
  - `resourceWorkspace`: loads the authorized subject/module/lecture hierarchy plus visible learning resources and their source metadata.
  - `saveLearningResource`: validates resource scope/kind/status/position/provider/HTTPS URL, enforces Google Drive host rules, then inserts/updates the resource and upserts its source through the caller's JWT/RLS.
- No service-role bypass was introduced. Existing teacher manage-scope hardening remains authoritative: subject-only teachers cannot edit batch-wide resources even when those resources are visible for teaching context.
- Added native `ResourceManagerScreen` with:
  - batch selection for content-manager/admin/owner operations;
  - batch/subject/module/lecture target selection;
  - Study Material / Notes / PYQ / Reference kinds;
  - Draft / Published / Archived lifecycle;
  - optional release time and ordering;
  - Google Drive / external provider selection and student-facing action label;
  - create and edit flows.
- Teacher workspace exposes **Study resources** per assignment scope. Subject teachers can create/edit subject/module/lecture resources within their assigned subject; visible batch resources are rendered read-only. Whole-batch teachers can manage batch scope.
- Operations workspace exposes **Manage study resources** for content-manager/admin/owner.
- Navigation hardening commit `ff140ed53a6276dc278f34fb07c0cd0727ed63fc` ensures Cancel exits the editor cleanly and the create action is hidden when no authorized hierarchy target exists.
- Android test version advanced to `1.0.7-test` / versionCode 8.
- Resource implementation commit `cf3460bde5a24526b3b5d8a3d3f5fcab5bed3d49` and hardening commit `ff140ed53a6276dc278f34fb07c0cd0727ed63fc` are Quality-green; latest Quality run `37164468783` and Android APK run `37164468784` both succeeded.
- Live Supabase `native-api` is ACTIVE at version 5.
- APK artifact id `11289171194`; artifact ZIP digest `sha256:aa9cf323a13be65b4e4f9ada1d3ec1dd61ccbc8c9cf62e33c72ff1aba92e9d2e`.
- Extracted debug APK SHA-256: `b216a066bd0168dd84cbf12580b70173bb7e74f646620190e503eea538bb8451`.
- Next native layer: lecture delivery-source management (Meet/Drive/external availability windows), then remaining admin operations.
