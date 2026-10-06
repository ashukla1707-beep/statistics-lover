# Statistics Lover — Project Handoff Context

> **Purpose:** This is the canonical continuity file for future ChatGPT conversations.  
> Before making changes in a new chat, read this file and then verify the current `develop` branch head and latest deployment status.
>
> **Update rule:** Keep this file current after major architecture decisions, deployment changes, or completed feature milestones. Later explicit decisions override older notes.

## Repository and active branch

- Repository: `ashukla1707-beep/statistics-lover`
- Active development branch: **`develop`**
- Do not use `main` as the source of truth for ongoing feature work unless explicitly requested.
- Current verified branch heads (2026-10-04): `develop` = `5c85c41383ce22708a1e188492642f997390fce6`; `main` = `a7cf2408b6b4d74d47f0b5d584c7dc7cd1e45381`. `develop` is newer and remains the canonical implementation branch.
- Current handoff base before this documentation commit: `5c85c41383ce22708a1e188492642f997390fce6`
- Current focus: **Razorpay Test Mode activation + external production configuration, while Android 1.0.41 / versionCode 42 remains the authoritative APK baseline for device validation.**

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

At the latest verified handoff on **2026-10-04**:

- The staged platform audit is complete through **Stage 6**:
  - Auth/Roles: PASS;
  - Student: PASS;
  - Teacher: PASS after the scoped returning-RLS fix;
  - Content Manager: PASS;
  - Admin/Owner: PASS;
  - Production hardening/runtime: PASS.
- Android **1.0.41 / versionCode 42** is the authoritative APK baseline. Do not regress to recovered 1.0.15/16, 1.0.37, or the earlier experimental full-WebView wrapper line unless the user explicitly asks to revert.
- Razorpay integration is complete through **Stage 7C** on the Statistics Lover side:
  - backend order/webhook foundation exists;
  - web checkout is wired;
  - payment-domain acceptance passed;
  - rollout gate remains safely OFF.
- Razorpay activation is blocked only by external Test Mode configuration:
  1. set `RAZORPAY_KEY_ID`;
  2. set `RAZORPAY_KEY_SECRET`;
  3. set `RAZORPAY_WEBHOOK_SECRET`;
  4. configure the Test Mode webhook at `https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/razorpay-webhook` for at least `payment.captured` and `payment.failed`;
  5. run one real sandbox payment and verify order -> payment -> receipt -> enrollment;
  6. only then set `commerce_razorpay_enabled=true`.
- Supabase leaked-password protection remains an external Auth configuration item because the connected project tools do not expose that setting.
- Production email/WhatsApp delivery infrastructure exists, but real delivery still depends on provider credentials/templates being configured.
- Vercel is the active frontend host. Latest verified `develop` deployment:
  - deployment `dpl_7y6tZKHaJdy6MFk11bvtQheb23XF`;
  - source commit `5c85c41383ce22708a1e188492642f997390fce6`;
  - state **READY**;
  - stable develop alias `statistics-lover-git-develop-statistics-lover.vercel.app`.
- Canonical `statistics-lover.vercel.app` currently serves the same built assets as that latest develop deployment:
  - JS `/assets/index-D4X7g2U9.js`;
  - CSS `/assets/index-Bt2CpQQC.css`;
  - Razorpay CSP origins are present;
  - manifest/PWA metadata are present.
- GitHub Quality run **37204654493** for current develop head `5c85c413...` completed successfully.
- Cloudflare deployment automation is not part of the active release path; continue with Vercel unless the user explicitly changes hosting direction.
- Next recommended work: configure Razorpay Test Mode secrets/webhook and run the real sandbox payment; in parallel continue real-device acceptance of Android 1.0.41.


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


### Android checkpoint A3.6 — native lecture delivery management complete

- Added native management for protected lecture delivery sources while preserving the existing provider-neutral data model and RLS authorization.
- Repository-backed `native-api` was extended with:
  - `deliveryWorkspace`: loads RLS-visible subjects/modules/lectures plus protected delivery sources for a batch or teacher-assigned subject.
  - `saveDeliverySource`: validates action/provider/link compatibility, label length and optional availability windows, then upserts through the caller's user JWT/RLS.
  - `deleteDeliverySource`: removes a join/watch source only when the caller's DELETE policy allows it; current database policy keeps deletion admin/owner-only.
- Existing database authorization remains authoritative. Live RLS currently permits assigned teachers to read/insert/update delivery sources only for lectures in their teaching scope; content-manager/admin/owner staff policies remain in force. No service-role bypass was added.
- Provider validation matches the database contract:
  - Google Meet → `join` + `https://meet.google.com/...`
  - Google Drive → `watch` + `https://drive.google.com/...`
  - Cloudflare Stream → `watch` + approved Stream delivery hosts
  - External → HTTPS
- Added native `DeliveryManagerScreen`:
  - operations users can choose a batch and manage lecture delivery;
  - teachers get **Live & recording access** inside each assigned batch/subject scope;
  - Live/Hybrid lectures expose join-source editing;
  - Recorded/Hybrid lectures expose recording-source editing;
  - provider, protected link, student label and optional ISO availability window can be edited;
  - admin/owner can remove an existing source; teacher/content-manager UI does not offer deletion when RLS does not allow it.
- Android navigation now exposes **Manage lecture delivery** in Ops and delivery access within teacher assignment cards.
- Android test version advanced to `1.0.8-test` / versionCode 9.
- Source commit `cc8bbb1f72221c4c23de3edb39fdf1768f3997c3` passed GitHub Quality run `37172336885` and Android APK run `37172336921`.
- Live Supabase `native-api` is ACTIVE at version 6 and the deployed function contains all three delivery-management actions using the existing user-scoped RLS client.
- APK artifact id `11291349444`; artifact ZIP digest `sha256:794e9b5ffd0851fd6f15663ca05b93997b84d5b54c9f4f88d12d7c7f2b16a19c`.
- Extracted debug APK SHA-256: `5759180c7de10d5ef123f1292aa62ed5f47dce0ebeb3fa17cabe8247d30b7426`.
- Next native layer: remaining admin operations (enrollment management, announcements/communications, commerce/payment verification, staff/role administration and settings/audit), followed by optional full mobile assessment authoring. Continue real-device testing of the recording/fullscreen path in parallel with these native operations layers.


### Android installed-build clarification

- Real-device observation from the user: the APK currently installed on the phone is still behaving as the older **web/WebView application**.
- This is distinct from the current `develop` Android source, whose launcher is `SplashActivity -> NativeMainActivity` and whose main shell is native.
- Therefore A3.1–A3.6 describe the **new native APK source/build artifacts**, not proof that the user's currently installed APK has been replaced.
- Do not say the user's phone is running A3.x until the latest native APK is explicitly installed and validated on that device.
- `android-app/README.md` previously still described the obsolete WebView architecture and was stale; it has now been corrected to match the current source.
- Current native test build uses versionCode 9 / versionName `1.0.8-test`; older A3 baseline used versionCode 3 / `1.0.2-test`.
- Next device-validation step must first confirm the installed package/version and native launcher behavior before testing A3.6 features.


### Android direction reset — WebView APK is canonical

- User rejected the native A3 APK experience after installing/testing the native build and explicitly preferred the WebView APK.
- Effective immediately, **the canonical Android direction is the WebView shell**, not continued native-screen redevelopment.
- A3.1–A3.6 remain as historical experimental/native implementation checkpoints only. Do not continue A3.7/native admin-screen work unless the user explicitly reverses this decision.
- The WebView APK should reuse the Vercel-deployed Statistics Lover web product so Home, authentication, dashboards, teaching/admin tools and future UI fixes stay synchronized automatically.
- Keep native Android responsibilities focused on the shell: splash, system insets, back handling, file chooser/uploads, trusted-host/external-link routing, recording-specific desktop UA where needed, custom Statistics Lover fullscreen/orientation, and debug screenshot/screen-recording policy.
- Preserve the latest user preference for recording UX: use the Statistics Lover custom fullscreen control rather than relying on Google Drive fullscreen; avoid the rejected player scaling/layout experiments.
- The next Android deliverable should be a refreshed WebView APK built from the current stabilized Vercel web UI, not another native A3 APK.


### Android checkpoint W1 — canonical WebView APK restored

- User explicitly rejected the true-native A3 experience and selected the WebView APK as the preferred/canonical Android experience.
- Restored the proven WebView launcher architecture from the last pre-native shell:
  - `LaunchReadyActivity -> MainActivity`
  - complete Statistics Lover Vercel app remains the UI/source of truth;
  - Android retains splash, system insets, Back navigation, file chooser, external-link routing and recording/fullscreen integration.
- Debug loads `https://statistics-lover-git-develop-statistics-lover.vercel.app/dashboard`; release targets the production Vercel dashboard.
- WebView user agent includes `StatisticsLoverAndroid/1.0.16`. The recording route switches to desktop Chrome UA while retaining that marker, so the web app stays in Android-app mode and bypasses the normal mobile-browser desktop-site gate.
- Added the `StatisticsLoverNative` JavaScript bridge expected by the current recording page:
  - custom Statistics Lover fullscreen enters native immersive sensor-landscape mode;
  - exit restores portrait/system bars;
  - Android Back exits custom fullscreen first and dispatches the web fullscreen-exit event instead of navigating away.
- Debug builds allow screenshots/screen recording; non-debug/release builds retain `FLAG_SECURE`.
- Restored native launch-ready overlay so the WebView is not exposed while React is still starting.
- WebView test version is `1.0.16-test` with versionCode 16. The deliberately higher versionCode is intended to supersede earlier test installs, including the previously referenced 1.0.15 generation.
- Source commit `e0afd4b34cc41ab5a9be1941752ac30d7133f508` passed GitHub Quality run `37173287927` and Android APK run `37173288085`.
- APK artifact id `11291408941`; artifact ZIP digest `sha256:69e20ad378f87d3285c2c0480209abfe7b31361f0c5e5e0936b1d3beb9a84d8f`.
- Extracted debug APK SHA-256: `d202ce3c17ae53e0c9abfee2632f8f4fd16dd46c3571bb46ae0801e2832e9087`.
- Next acceptance: install this exact WebView APK and validate login/session, Android app chrome, Home/Dashboard/Learning navigation, assignment upload, Watch Recording startup, custom fullscreen enter/exit, Android Back, safe status-bar inset, screenshot/screen recording, and external Google Meet routing.


### Android recovery checkpoint — Statistics Lover 1.0.15 / versionCode 16

- User explicitly requested recovery of **Statistics Lover 1.0.15 — versionCode 16** after rejecting the accidentally recreated 1.0.16-test line.
- Important provenance: the original historical 1.0.15 APK binary was not retained in reachable GitHub commits, releases or Actions artifacts. The recovery therefore uses the preserved pre-native WebView shell architecture and current Android app-mode/fullscreen integration rather than falsely claiming byte-for-byte recovery of the old APK.
- Recovery source commit: `9a385f341765c424430d59def3ad6ad52d3e4c5f`.
- Android metadata is now exactly:
  - versionName `1.0.15`
  - versionCode `16`
  - debug package `com.statisticslover.app.debug`
- Canonical architecture remains the app-first WebView shell:
  - `LaunchReadyActivity -> MainActivity`
  - Statistics Lover internal/Vercel navigation remains inside the app;
  - external providers such as Google Meet can open externally;
  - Android app-mode UA marker is `StatisticsLoverAndroid/1.0.15`;
  - recording route keeps desktop-style Drive playback behavior plus the Statistics Lover native fullscreen bridge.
- Restored an in-app update mechanism in `AppUpdateManager`:
  - checks `/android-update.json` on startup;
  - only prompts when the manifest advertises a higher versionCode;
  - uses Android DownloadManager rather than opening the Statistics Lover UI in a browser;
  - can request Android's per-app install permission;
  - verifies SHA-256 when supplied by the update manifest before opening the package installer.
- Current `public/android-update.json` advertises versionCode 16, so the recovered 1.0.15 build will not update itself until a later APK is intentionally published and the manifest is advanced.
- Debug capture remains enabled for testing; release builds keep `FLAG_SECURE`.
- GitHub Quality run `37174214861` passed typecheck, lint and production web build.
- Android APK run `37174214907` completed successfully.
- APK artifact id `11292850972`; artifact ZIP digest `sha256:a140c1f8357abcbdb5d430f975ac9109dd1ba292ed01f2aa7b0377674693aac3`.
- Extracted APK SHA-256: `212b49b53435677b93231a647d38b7db230c8d48081a3e59691fc5fc8b7119bf`.
- The previous W1 1.0.16-test checkpoint is **superseded** by this recovery decision. Do not treat 1.0.16-test as the stable Android baseline.
- Next: install this exact recovered APK and validate launch experience, internal navigation, update-check behavior, recording playback/fullscreen, Android Back, uploads and system insets before making any further APK changes.


### Android authoritative baseline — Statistics Lover 1.0.20 / versionCode 21

- The exact successful Android release was recovered from the dedicated repository `ashukla1707-beep/statistics-lover-android`.
- Verified product/version: **Statistics Lover 1.0.20**.
- Verified Android `versionCode`: **21**. Earlier references to versionCode 20 were an assumption and are superseded by the release metadata.
- Dedicated Android source commit: `7fff278316d50bf6ea3970f6d90ea52316acf8fc`.
- Dedicated release workflow run: **37175526613 — SUCCESS**.
- Release artifact ID: **11292129608**.
- Signed release APK size: **644359 bytes**.
- Signed release APK SHA-256: **`67827ccf3f11abd963383f23c9d170dc8affc5bdf8bb0723110acb614f81bd3b`**.
- Auto-update channel: **1.0.20 / versionCode 21**.
- Package ID: `com.statisticslover.app`; the permanent signing key and existing update chain remain authoritative in the dedicated Android repository.
- This release was rebuilt from the pinned 1.0.15 working runtime behavior and intentionally excludes the later 1.0.16–1.0.18 player-layout/scaling experiments.
- This supersedes the attempted monorepo 1.0.15 recovery, the accidental 1.0.16-test rebuild, and the native A3 experimental APKs as the Android baseline.


### Android source reconciliation — develop now mirrors verified 1.0.20

- Located the dedicated Android repository `ashukla1707-beep/statistics-lover-android` and its canonical project handoff rather than reconstructing the APK from stale monorepo history.
- Mirrored the verified release source commit `7fff278316d50bf6ea3970f6d90ea52316acf8fc` into `statistics-lover/develop/android-app/`.
- Runtime/version/manifest sync commits:
  - `672c39e3556f610595728a759d0f4d797c548d29` — restored verified 1.0.20 runtime, updater and launcher metadata.
  - `cf8fa30e19f946f5713b86ffc6fc01d557b6f595` — synced required release resources and FileProvider paths.
  - `50e084dd4a87994abf2aa294903076dd5006f98d` — removed stale alternate launcher/experimental Android classes and made 1.0.20 the only active monorepo source path.
  - `3e656287426dd1336aba79e70a9495dcae9734d9` — completed the remaining source mirror.
- Verified by Git tree comparison: all Android source/build files mirrored from the dedicated 1.0.20 commit now have identical Git blob SHAs in the monorepo; no extra runtime files remain except the monorepo-specific `android-app/README.md`.
- Monorepo Quality run `37177024373` passed.
- Monorepo Android verification run `37177024460` passed build, APK verification and artifact upload.
- Monorepo debug artifact ID: `11293698157`; debug APK SHA-256: `6b917af726a9e59c4bdcc703f7f1982eefd45f75c23e95a27ddef49298bc727c`.
- The monorepo workflow intentionally does **not** publish over the stable self-update channel. Signed stable release publication remains owned by the dedicated Android repository so existing installs keep the same permanent signing certificate/update lineage.
- For installable stable APK requests, use the verified dedicated-repo **1.0.20 signed release** (644359 bytes, SHA-256 `67827ccf3f11abd963383f23c9d170dc8affc5bdf8bb0723110acb614f81bd3b`) rather than the monorepo debug artifact.


### Android fullscreen fix — 1.0.21 / versionCode 22

- User supplied a real-device recording showing the 1.0.20 custom fullscreen transition rotating into a sideways/narrow layout and settling with incorrect portrait-like geometry.
- Fix was made in the dedicated signed Android repository, not by reconstructing from stale monorepo code.
- Dedicated source fix commit: `c84fda9f4a44ad0d891ee6ec129a02f22e57d433`.
- Verified signed release: **Statistics Lover 1.0.21 / versionCode 22**.
- Dedicated workflow run: **37177622093 — SUCCESS**.
- Signed release artifact ID: **11293579153**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **644607 bytes**.
- APK SHA-256: **`0ebef70a62cf5066494caabee8c057fb4e7a65472f99fcae213825919e700495`**.
- Auto-update channel now advertises **1.0.21 / versionCode 22**, so installed signed 1.0.20 builds can update in-app.
- Root-cause fix:
  - Drive nested WebChromeClient fullscreen is rejected; Statistics Lover custom fullscreen is the only fullscreen owner.
  - fallback JS no longer capture-blocks the React fullscreen handler.
  - custom fullscreen button covers the Drive fullscreen hit area while fullscreen is active.
  - fixed landscape replaces sensor-landscape during fullscreen transition.
  - safe-area padding is removed during fullscreen and restored on exit.
  - WebView resize/orientation reflow is forced across the transition.
  - immersive bars are re-applied on focus return.
- Monorepo Android source has been advanced from the mirrored 1.0.20 source to this 1.0.21 fix and should remain aligned with the dedicated repo for future APK changes.


### Android fullscreen layout correction — 1.0.22 / versionCode 23

- User clarified with screenshots that fullscreen should match the compact 16:9 Drive presentation, not the stretched full-viewport desktop controls.
- Dedicated Android fix commit: `100b1e582da341d6cd153b9d183296a78ae3d28f`.
- Verified signed release: **Statistics Lover 1.0.22 / versionCode 23**.
- Dedicated workflow run: **37178429643 — SUCCESS**.
- Signed release artifact ID: **11294076787**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **644751 bytes**.
- APK SHA-256: **`65b0b90f9db13dd55ff162079db6f1ae390e7c0286db99a074f07907d61586d8`**.
- Auto-update channel now advertises **1.0.22 / versionCode 23**.
- Layout fix preserves 1.0.21 native fullscreen stability while restoring the 1.0.18 compact geometry: fixed 1024x576 Drive canvas + uniform fit-to-viewport scale, with overlay/button/logo using the same scale.
- Do not return to the 1.0.21 stretched 100% x 100% iframe geometry unless explicitly requested.


### Android correction — 1.0.23 / versionCode 24

- User reported two issues after 1.0.22:
  - custom fullscreen should open in landscape;
  - APK homepage was still the older production homepage rather than the working homepage fixed earlier in this project.
- Verified causes:
  - `NativeMainActivity` still had `android:screenOrientation="portrait"` in the manifest;
  - APK `APP_URL` still targeted `https://statistics-lover.vercel.app/`.
- Dedicated Android fix commit: `1f1d510059de11116913ecdb3ced82d8438c11ad`.
- Verified signed release: **Statistics Lover 1.0.23 / versionCode 24**.
- Dedicated workflow run: **37179092335 — SUCCESS**.
- Signed release artifact ID: **11294711461**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **644851 bytes**.
- APK SHA-256: **`01c2098f2e4ae24acf21827aabaf0a6868a7f446ade30e7b1345fbc88882bb92`**.
- Auto-update channel now advertises **1.0.23 / versionCode 24**.
- Fullscreen now:
  - removes the manifest portrait lock;
  - keeps portrait for normal app use via `onCreate`;
  - enters fixed landscape for Statistics Lover custom fullscreen;
  - reasserts landscape at 80 ms and 240 ms during the transition;
  - retains the compact 1024x576 scaled Drive layout from 1.0.22.
- APK web source now points to the stable Vercel develop alias:
  `https://statistics-lover-git-develop-statistics-lover.vercel.app/`.
- This intentionally uses the current working homepage/header/footer/responsive fixes without merging `develop` into production `main`.


### Android session-origin correction — 1.0.24 / versionCode 25

- User reported that 1.0.23 behaved like a fresh browser visit and requested sign-in again.
- Root cause: changing the APK from `statistics-lover.vercel.app` to the `develop` Vercel hostname changed the browser origin; Supabase/WebView session storage is origin-scoped.
- Dedicated Android fix commit: `253bc5650fe325a4d4fd83e70b854e8b8b18780e`.
- Verified signed release: **Statistics Lover 1.0.24 / versionCode 25**.
- Dedicated workflow run: **37179541593 — SUCCESS**.
- Signed release artifact ID: **11294701290**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **644863 bytes**.
- APK SHA-256: **`d10e99dff759d5a60ab8dd47aa17f854047934a074edb8265da4c674cc9644d6`**.
- Auto-update channel now advertises **1.0.24 / versionCode 25**.
- APK `APP_URL` is restored to the stable origin and direct app route:
  `https://statistics-lover.vercel.app/dashboard`.
- Vercel production alias `statistics-lover.vercel.app` was reassigned to current develop deployment `dpl_BRMCC4xjefkc5DAowgaRgwyxBzUP`.
- Verification: production and stable develop aliases both serve JS bundle `index-DC55xXSS.js`.
- This preserves stored login/session continuity while delivering the current working homepage/header/footer/responsive fixes on the original app origin.
- Fullscreen behavior remains the 1.0.23 compact landscape implementation.


### Android UI correction — 1.0.26 / versionCode 27

- User explicitly clarified that the APK should show the **same responsive web UI**, not a separate Android-specific UI.
- Root cause: the always-on `StatisticsLoverAndroid/<version>` user-agent made `src/App.tsx` replace the normal website Header/Footer with `AndroidAppHeader` and `AndroidBottomNav`.
- Web source commit `24f93fbce8bf71be20795774432c2efc37b4d327` also removes that layout substitution for future deployments; Quality run `37179835625` passed.
- APK no longer depends on that web deployment to get the correct UI:
  - normal pages use the WebView's real mobile website user-agent;
  - recording pages alone switch to desktop Chrome + `StatisticsLoverAndroid/<version>` for Drive/native fullscreen;
  - leaving recording restores the normal website user-agent.
- Dedicated Android source commits:
  - `ce99c08224bbb3dc45799abb44995190d02428de`
  - `db01d079bbbf4c7c0c6f3e4df3e0a3de08cff185`
- Verified signed release: **Statistics Lover 1.0.26 / versionCode 27**.
- Dedicated workflow run: **37180060760 — SUCCESS**.
- Signed release artifact ID: **11294094436**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **645119 bytes**.
- APK SHA-256: **`b9fa02ead68b6db5f044ee330a99d9df64f6fef25cabc961c74bf756707bde42`**.
- Auto-update channel now advertises **1.0.26 / versionCode 27**.
- Stable app origin remains `https://statistics-lover.vercel.app/` so existing WebView/Supabase sessions remain on the same origin.
- Fullscreen retains the compact landscape behavior from the accepted fullscreen line.
- 1.0.25 is superseded.


### Android recording startup correction — 1.0.27 / versionCode 28

- User supplied the repeated-loading recording again and pointed out this had been solved earlier.
- Historical checkpoint A15 was recovered from the dedicated Android history: commit `293b1a2e88f4667173f04d4fa8e48d5e4e05578b` identified the exact cause as mobile-UA → desktop-UA switching and a route reload after **Watch recording**.
- 1.0.26 had unintentionally reintroduced that same route-scoped UA switching.
- Dedicated Android fix commit: `84384549591f3e98c8c4342a98e5ae1900d03cc6`.
- Verified signed release: **Statistics Lover 1.0.27 / versionCode 28**.
- Dedicated workflow run: **37180641112 — SUCCESS**.
- Signed release artifact ID: **11294579346**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **655138 bytes**.
- APK SHA-256: **`e98b55697aed956ab6e35af38008e939eb19c6583e21ef5dfd141b7042ade991`**.
- Auto-update channel now advertises **1.0.27 / versionCode 28**.
- Recording startup architecture:
  - WebView/network UA is Drive-capable desktop Chrome + `StatisticsLoverAndroid/<version>` from startup;
  - route navigation never changes UA or reloads the lecture URL;
  - AndroidX WebKit document-start script hides the marker from normal website routes, preserving the website UI;
  - the marker becomes JS-visible only on lecture routes so the existing native fullscreen bridge still works.
- This restores the A15 single-navigation behavior while preserving the newer web-UI requirement, compact landscape fullscreen, stable session origin and auto-update chain.


### Android seek-control correction — 1.0.29 / versionCode 30

- User reported that tapping/dragging the Drive video time/progress line could leave the seek UI stuck even though playback continued.
- Dedicated Android fixes:
  - `d07c1e475485827a63cba505bcf8eff287f1ee67` clears Drive's synthetic touch/mouse scrub state after fullscreen touch release.
  - `75df561f9414c4bff6d0812319584d21627bf199` freezes compact fullscreen scale during transient resize events so Drive's pointer state is not disrupted mid-seek.
- Verified signed release: **Statistics Lover 1.0.29 / versionCode 30**.
- Dedicated workflow run: **37181709525 — SUCCESS**.
- Signed release artifact ID: **11295292272**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **655582 bytes**.
- APK SHA-256: **`6fd0353834cd513d2af8a61784add36e833e78f3f41c1b46a687a31212410751`**.
- Auto-update channel now advertises **1.0.29 / versionCode 30**.
- Existing website UI, A15 single-transition recording startup, compact landscape fullscreen and stable session origin are preserved.


### APK startup landing behavior — auth-aware root routing

- User requested APK startup behavior:
  - anonymous / not signed in -> public Home page;
  - authenticated -> Dashboard;
  - suspended -> Account suspended.
- Implemented in web commit `d12f60e5b2258021d72179aa2ffad47f8c2a86c5`.
- Browser behavior is unchanged: normal website visitors at `/` still see Home.
- APK detection uses the native JavaScript bridge (`window.StatisticsLoverNative`) rather than the user-agent marker, because current APKs intentionally hide that marker on ordinary web routes to preserve website UI.
- The root route waits for `AuthProvider` session hydration before deciding, preventing a signed-in user from briefly seeing Home before Dashboard.
- GitHub Quality run `37182500981` passed typecheck, lint and production build.
- Vercel deployment `dpl_9gqkdAYqoHbvaeoY3LG3gKNVK4Sq` is READY and `statistics-lover.vercel.app` now serves that deployment.
- Production and preview were verified to serve the same JS bundle: `index-DUc0RxZf.js`.
- No APK rebuild is required: Statistics Lover 1.0.29 already launches `https://statistics-lover.vercel.app/` on the stable session origin.


### APK launch/navigation + splash integration — web side for Android 1.0.30

- User requested:
  - anonymous APK cold start -> Home;
  - authenticated APK cold start -> Dashboard;
  - clicking Home from the website menu -> Home even while authenticated;
  - a smooth logo splash while the website/session is loading.
- Web commit `f874aad193f934a098c94ffb688bb66692504d72` separates startup routing from normal Home navigation:
  - root `/` is always `HomePage`;
  - APK cold-start route `/app-start` alone performs auth-aware startup routing;
  - while auth status is `booting`, `/app-start` renders nothing so the native splash remains visible;
  - authenticated -> `/dashboard`, suspended -> `/account-suspended`, anonymous -> `/`.
- Added `NativeReadySignal`, which calls `StatisticsLoverNative.appReady()` after auth has hydrated and the final non-startup route has rendered. This lets Android keep a circular logo splash over the WebView until the actual destination is ready.
- Quality run `37183208568` passed.
- Vercel deployment `dpl_8j8Fbyyfna9woyqwe2tbTuSk7PCH` is READY and assigned to production alias `statistics-lover.vercel.app`.
- Android 1.0.30 / versionCode 31 uses `https://statistics-lover.vercel.app/app-start` as its cold-start URL, while all menu Home navigation still uses `/`.


### Android 1.0.30 final launch/splash checkpoint

- Verified signed Android release: **Statistics Lover 1.0.30 / versionCode 31**.
- Dedicated Android source commit: `72adfccf12f2e288e7c6b2f005e7ca12255f173b`.
- Dedicated Android workflow run: **37183354378 — SUCCESS**.
- Signed release artifact ID: **11296375705**.
- Signature verification: **PASSED** (APK Signature Scheme v2).
- Self-update publication: **PASSED**.
- APK size: **669698 bytes**.
- APK SHA-256: **`d4f21fa5e1c14b337c0880948e0a1adafe4ad83421b183fa4afe95625dd7ca5b`**.
- Auto-update channel is now **1.0.30 / versionCode 31**.
- Launch behavior:
  - APK cold-start URL is `https://statistics-lover.vercel.app/app-start`;
  - anonymous -> Home;
  - authenticated -> Dashboard;
  - suspended -> Account suspended;
  - menu/brand Home links continue to `/` and always show Home, including for authenticated users.
- Splash behavior:
  - old `SplashActivity` + 350 ms handoff removed;
  - `NativeMainActivity` is the launcher and uses Android SplashScreen directly;
  - WebView starts immediately behind a native overlay;
  - existing Statistics Lover logo asset is shown clipped as a circular splash logo;
  - native overlay remains until the final web route calls `StatisticsLoverNative.appReady()`;
  - WebView fades in over 180 ms while splash fades out over 220 ms;
  - 10-second fallback prevents a permanent splash if an old web bundle is ever served.
- Web startup-routing commit: `f874aad193f934a098c94ffb688bb66692504d72`; Quality run **37183208568 — SUCCESS**.
- Production Vercel alias now serves deployment `dpl_8j8Fbyyfna9woyqwe2tbTuSk7PCH`; both `/` and `/app-start` serve bundle `index-DrSE62Uv.js`.
- Monorepo Android mirror commit: `8aba1d238cef2b3e7b0b7cf209d1f7d5c52edf28`.
- Monorepo Quality run **37183540738 — SUCCESS**.
- Monorepo Android verification run **37183540801 — SUCCESS**.
- Existing website-style UI, stable session origin, auto-update lineage, single-transition recording startup, compact landscape fullscreen, inline-player exit fix and Drive seek-control stabilization remain preserved.


### Android/web theme + splash correction — 1.0.31 / versionCode 32

- User screenshots showed two splash logo states: Android system splash first displayed a zoomed/masked logo, then the custom circular overlay displayed a second logo.
- Restored the earlier validated **420x420** original logo blob `4af648e1fcba3aa00ec481101b05cbe36ebc7393`; the previous current asset was only 240x240.
- Web commit `f973e87514b4df8c6efabb1bcb23689d2bdbffac` adds automatic `prefers-color-scheme` light/dark styling, separate light/dark browser theme colors, service-worker cache v8, and the higher-resolution logo.
- Web Quality run `37184284499` passed.
- Vercel deployment `dpl_Cfeg8GzJYRGoi2uHfyo6j1a3anU8` is READY and assigned to `statistics-lover.vercel.app`; production root and `/app-start` serve bundle `index-DaYV35YY.js`.
- Dedicated Android source commit: `7c7a6b34f13980af62c7f51c05b10acd6621e410`.
- Verified signed release: **Statistics Lover 1.0.31 / versionCode 32**.
- Dedicated workflow run: **37184367615 — SUCCESS**.
- Signed release artifact ID: **11296217436**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **672466 bytes**.
- APK SHA-256: **`4dc85506f5576cd6351dc1ffb9d76c78f5711a4368932c60677b091697459f48`**.
- Auto-update channel: **1.0.31 / versionCode 32**.
- Splash fix:
  - Android system splash icon is now transparent, so it no longer shows a competing first logo;
  - the Statistics Lover logo appears only once in the custom overlay;
  - overlay uses FIT_CENTER, circular clipping and the 420x420 original, eliminating the previous CENTER_CROP zoom/crop.
- Native theme:
  - light splash/window/system bars: `#F7F8FB` with dark icons;
  - dark splash/window/system bars: `#0B1020` with light icons;
  - added Android `values-night` resources;
  - system theme is re-applied on `uiMode` changes.
- Monorepo Android mirror synced through commits `242e50e1f54a5448168268a96c6a007520aadf3d`, `8ce5d8398d2c206d494c38bfa3b922d88a951ac5`, `fb997d76e22986fa800854f6e8b03722b50cbe41`, `2b7b8f048ab1b944b7f1e13bf60129a690e598d0`, `16272074bdb789610ba9a39b7d1dda95c04c4653`, and `a46f4a1d05f5d914aad637c2ce164f94c1980235`.
- Existing auth-aware startup/Home behavior, website UI, session continuity, single-transition recording startup, compact landscape fullscreen, inline-player exit and Drive seek fixes remain preserved.


### Android startup recovery — 1.0.32 / versionCode 33

- User reported the app stopped opening after the 1.0.31 native splash/theme experiment.
- Dedicated Android recovery commit: `93f09e2040d92b0cef02010c27b1895df00aff97`.
- Recovery restores the exact known-working 1.0.30 native startup/splash implementation while preserving current web routing, recording/fullscreen fixes, seek-control fixes, signing and auto-update lineage.
- Verified signed release: **Statistics Lover 1.0.32 / versionCode 33**.
- Dedicated workflow run: **37185313234 — SUCCESS**.
- Signed release artifact ID: **11296617602**.
- APK size: **669694 bytes**.
- APK SHA-256: **`9f9d75b65ee75f7f9a4d0384cbb5047783d67c24720e039a4dedf89cf8e42211`**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- Auto-update channel now advertises **1.0.32 / versionCode 33**.
- The 1.0.31 Android-native theme/splash changes are rolled back and must not be reintroduced until this recovery is confirmed opening correctly on-device.
- The web light/dark theme deployment remains untouched.


### Android splash/theme correction — 1.0.34 / versionCode 35

- User confirmed the 1.0.32 rollback reopened the app but did not resolve the duplicate splash/logo-quality problem.
- Root cause: 1.0.32 restored the 1.0.30 system splash icon and the older 240x240 Android logo, so Android still showed a first masked/zoomed logo before the custom circular overlay.
- Final fix deliberately preserves the known-working 1.0.32 startup architecture:
  - system splash icon is transparent and has zero icon animation;
  - logo appears only once in the custom native overlay;
  - Android logo is the validated 420x420 web original (blob 4af648e1fcba3aa00ec481101b05cbe36ebc7393);
  - custom logo uses FIT_CENTER + circular clipping instead of CENTER_CROP;
  - no values-night/styles.xml override is used.
- Native light/dark resources:
  - light shell/splash/system bars #F7F8FB;
  - dark shell/splash/system bars #0B1020;
  - adaptive light/dark system-bar icons;
  - spinner #C6005A light / #FF5397 dark;
  - safe uiMode refresh updates native chrome without changing the Activity startup flow.
- Web dark mode remains active through prefers-color-scheme; production currently serves bundle index-DaYV35YY.js.
- Dedicated Android commits: f3b4121e7cbf5fd5e83b9110f2d51981b04f19b5, 2663cb82dd320eb4d2b945faaa12b2c216ea1195, a7ca7352ce8eedb530f6d9cdaca5a27d6f150f98.
- Verified signed release: Statistics Lover 1.0.34 / versionCode 35.
- Dedicated workflow run: 37186374672 — SUCCESS.
- Signed release artifact ID: 11296689615.
- Signature verification: PASSED.
- Self-update publication: PASSED.
- APK size: 672938 bytes.
- APK SHA-256: 9bb92f9cc7a9557cb0aea70a2c239f3338b894419c65b929298e329cd5838a55.
- Auto-update channel now advertises 1.0.34 / versionCode 35.
- Monorepo source sync commits: 8702b508af45d780dbe828a07f2e8f2733120ef1, 26d4236a0e85c115c63000834467f0dc541513c2, 2df1c081b3b7e05bd476e540766d476ef2e06bb1.
- Existing auth-aware startup/Home routing, website UI, stable session origin, single-transition recording startup, compact landscape fullscreen, inline-player exit fix and Drive seek stabilization are preserved.


### Android 1.0.35 splash/header-logo recovery

- Real-device recording showed that the 1.0.34 circular splash logo was not visible and the website header logo was missing.
- Dedicated Android fix commit: `fade6a561dbbd4420a5440f689b24f8f93de170c`.
- Verified signed release: **Statistics Lover 1.0.35 / versionCode 36**.
- Dedicated workflow run: **37187831151 — SUCCESS**.
- Signed release artifact ID: **11298046692**.
- Signature verification: **PASSED**.
- Self-update publication: **PASSED**.
- APK size: **673018 bytes**.
- APK SHA-256: **`18837a88c4c313238d5f0a28c4cbcf649517b17fef2d6d123503b5fb4c25d9bd`**.
- Auto-update channel now advertises **1.0.35 / versionCode 36**.
- Splash fix: native circular logo overlay has a 1300 ms minimum visible duration so early web readiness cannot remove it before the system splash exits.
- Header logo fix: web commit `7d11ea92da7256128a92aa9ef9d01fdbd18a0f7a`, cache-busted logo URL, SW cache v9, Quality run `37187777649`, Vercel deployment `dpl_DpDi4Wwwynu3UtbaMvxGKsm3fJUR` assigned to production.
- Production bundle verified as `index-Cbxz-gPm.js` and contains the new logo URL.
- Automatic light/dark theming remains active in Android DayNight resources and web `prefers-color-scheme` CSS.


### Current logo/splash recovery checkpoint — web side

- User reported that both the APK splash logo and the website/header logo were still missing.
- Web-side audit confirmed the Header component could still depend on a cached public image path in older installed WebViews/service-worker shells.
- First mitigation commit `68eba241f514f195a8ac855292e1e336818bbec7`:
  - moved the header logo into the Vite bundle as `src/assets/statistics-lover-logo.jpg`;
  - Header imports the bundled logo instead of relying only on a public URL;
  - service worker cache bumped to `statistics-lover-static-v10`.
- That build passed Quality run `37188788958` and Vercel deployment `dpl_GRwRhyfLRse6w7iSFyxvNjt3GirH` was READY.
- Production alias `statistics-lover.vercel.app` was assigned to that deployment and verified to serve bundle `index-Difc2g3c.js`.
- The repo logo asset itself was then found to be visually degraded.
- The clean **1254×1254 original user-uploaded Statistics Lover logo** is now the authoritative web logo asset.
- Web original-logo commit: `06d0d0a769198814007f01f169c832bd25f0722b`.
  - replaces `public/brand/statistics-lover-logo.jpg`;
  - replaces bundled `src/assets/statistics-lover-logo.jpg`;
  - updates manifest icon size metadata to 1254×1254;
  - bumps service-worker cache to `statistics-lover-static-v11`;
  - updates logo cache-busting URLs to `?v=20261004-3`.
- Current verification state for `06d0d0a...` at this checkpoint:
  - GitHub Quality run `37189461579` is **still in progress**;
  - a Vercel deployment for that exact commit had **not yet appeared** in the last deployment poll;
  - therefore do **not** claim the 1254×1254 web/header logo is live in production until the Quality run and matching Vercel deployment are verified.
- Android 1.0.37 already uses the same 1254×1254 original logo and its signed release is verified.


### CURRENT ANDROID BASELINE REFERENCE — Statistics Lover 1.0.37

- The authoritative APK baseline is **Statistics Lover 1.0.37 / versionCode 38**.
- Dedicated Android source commit: `1b101de64428322554afe1f637c708d25ef54491`.
- Android workflow run: **37189418107 — SUCCESS**.
- Signed release artifact ID: **11297979731**.
- Signed APK SHA-256: **`1ee53781bcd0e3375f4a458768c50c292d2cea97499e6de48de1a660c84a1415`**.
- Auto-update channel: **1.0.37 / versionCode 38**.
- The clean original **1254×1254** Statistics Lover logo is the canonical logo source for both Android splash and website/header work.
- Web original-logo commit `06d0d0a769198814007f01f169c832bd25f0722b` has now passed GitHub Quality run **37189461579**.
- At the last Vercel poll, no deployment for exact commit `06d0d0a...` had appeared yet. Do not claim the matching 1254×1254 web/header logo is live until a Vercel deployment for that exact commit is verified and assigned.
- Future Android work must start from 1.0.37 rather than older 1.0.35/1.0.34 splash experiments.


## LOGO / APK STARTUP CHECKPOINT — 2026-10-04

- User recording confirmed that the previously deployed logo appeared blank in the website header while Android also showed a blank custom splash.
- The 420×420 logo copy previously treated as healthy was structurally damaged despite having a JPEG header; strict decoding of the same bytes extracted from Android 1.0.38 failed.
- Web authoritative logo source is now the clean pre-corruption 240×240 JPEG blob `86549c806ec54b82cbe8765082cffcc7a0a4c28f`.
- Web repair commit: `faa50b124acbed7c48fa02aef3dbdba54e8decad`.
- New cache-safe asset: `statistics-lover-logo-clean.jpg`.
- Header imports the new clean asset; old public and bundled logo paths were also overwritten with clean bytes to prevent accidental reuse.
- Service-worker cache advanced to `statistics-lover-static-v13`; public cache-bust is `?v=20261004-5`.
- Vercel deployment `dpl_C3iFuqcRcwxsuxugG5zxcCwU9ZA6` is READY and `statistics-lover.vercel.app` is mapped to it.
- Live production bundle `index-8bpmSzop.js` renders the header `brand-logo` from bundled asset `/assets/statistics-lover-logo-clean-Dqadk_XN.jpg`.
- The bundled asset returns HTTP 200, `image/jpeg`, 13085 bytes, JFIF.
- Matching Android baseline is **Statistics Lover 1.0.39 / versionCode 40**, which removes the second custom splash overlay and changes the launcher icon to the Statistics Lover logo.


## STAGE 1 COMPLETE — Authentication, roles and authorization (2026-10-04)

- Stage 1 of the post-APK platform audit is complete.
- Live Supabase role/RLS acceptance was executed using rollback-only transactions; **no permanent account, role, course, assignment, or suspension changes were retained**.
- Verified role boundaries:
  - Student isolation: **PASS**.
  - Teacher assignment-scoped access: **PASS**.
  - Content Manager content scope: **PASS**.
  - Admin normal staff grant + privileged escalation block: **PASS**.
  - Owner privileged role authority: **PASS**.
  - Suspended-account server enforcement: **PASS**.
- Every public application table currently reports RLS enabled.
- Frontend `RequireAuth` route matrix was reviewed and matches the intended five-role model.
- Current browser auth session restoration and suspension routing were reviewed.
- Production Vercel runtime errors for the checked 24-hour window: **none**.
- Supabase runtime Auth traffic shows successful login/refresh/logout; observed error classes were ordinary invalid-credential, stale-token/session and email-send-rate-limit cases.
- Supabase Security Advisor has one remaining Auth warning: **Leaked Password Protection Disabled**. This is an Auth configuration item, not a migration, and is deferred to production hardening because the connected toolset does not expose that setting.
- `native-api` remains `verify_jwt=false` intentionally because it mixes public auth actions with token-protected actions. Protected actions validate/use the supplied access token and remain constrained by RLS. Do not flip the entire function to platform JWT verification without first splitting public/protected endpoints.
- Android **1.0.41 / versionCode 42** remains the authoritative APK baseline; Stage 1 made no Android release changes.
- Repeatable rollback-only test suite added at `database/tests/auth_role_acceptance.sql`.
- Audit record added at `docs/STAGE1_AUTH_AUDIT.md`.
- Next major checkpoint: **Stage 2 — Student end-to-end workflow**, including enrollment isolation, learning content release boundaries, lectures/resources, assignments/submissions, tests/results, notifications and orders.


## STAGE 2 COMPLETE — Student end-to-end workflow (2026-10-04)

- Stage 2 was executed against the connected live Supabase project with temporary fixtures inside a transaction; **all fixture/data changes were rolled back**.
- Student workflow acceptance: **PASS**.
- Verified:
  - active enrollment grants protected batch learning access;
  - a non-enrolled catalog batch does not grant protected content access;
  - released lectures are visible and future lectures are hidden;
  - raw lecture delivery/provider-source rows remain hidden from students;
  - safe delivery-action RPC exposes only allowed released actions;
  - learning-resource RPC exposes released resources only; future/draft resources remain hidden;
  - released assignments appear, future/draft assignments do not;
  - open assignment submission works; future assignment submission is rejected;
  - assigned open test schedules appear through the student RPC;
  - raw question bank, answer keys and internal attempt snapshots are not directly readable;
  - active attempt payload is sanitized and contains no answer-key fields;
  - answer-save + submit flow works;
  - manual result policy withholds results until staff release;
  - released result becomes visible and contributes to student analytics;
  - notifications are isolated by user and availability window;
  - mark-read and notification-preference updates operate on the current user;
  - student can create/read an own pending commerce order and cannot read another user's orders.
- Student pages/services were checked against these same server-authoritative RPC/RLS surfaces.
- Audit record: `docs/STAGE2_STUDENT_AUDIT.md`.
- Repeatable test: `database/tests/student_workflow_acceptance.sql`.
- No production schema or Android changes were required. Android **1.0.41 / versionCode 42** remains the authoritative APK baseline.
- Next checkpoint: **Stage 3 — Teacher workflow and assignment-scoped authoring/attendance/grading/testing boundaries**.


## STAGE 3 COMPLETE — Teacher scoped workflow (2026-10-04)

- Stage 3 teacher end-to-end acceptance is complete and **PASS**.
- One real production defect was discovered and fixed:
  - teacher lecture creation and assignment creation failed when the frontend requested the newly inserted row/id (`INSERT ... RETURNING`);
  - plain inserts worked, proving the insert authorization itself was correct;
  - the failure came from self-referential teacher SELECT policies that re-queried the newly inserted table row by id.
- Live Supabase migration `teacher_insert_returning_rls` applied successfully.
- Repository migration: `database/migrations/0033_teacher_insert_returning_rls.sql`.
- The fix keeps existing teacher scope boundaries and only rewrites teacher SELECT visibility to equivalent row-field checks.
- Regression probes for frontend-style lecture/assignment creation with returned rows: **PASS**.
- Full rollback-only teacher matrix: **PASS**.
- Verified:
  - subject assignment grants batch read context but not whole-batch management;
  - assigned subject/module authoring works;
  - unassigned subject/module authoring is blocked;
  - lecture delivery, resources, assignments, attendance, grading, question-bank, test builder/scheduling/analytics and subject announcements work in assigned scope;
  - whole-batch resource/assignment/test/announcement operations remain blocked for a subject-scoped teacher;
  - audit logs/settings remain inaccessible and direct profile visibility remains own-profile only.
- Audit record: `docs/STAGE3_TEACHER_AUDIT.md`.
- Regression/acceptance test: `database/tests/teacher_workflow_acceptance.sql`.
- Android **1.0.41 / versionCode 42** remains unchanged.
- Next checkpoint: **Stage 4 — Content Manager content lifecycle and publishing boundaries**.


## STAGE 4 COMPLETE — Content Manager lifecycle (2026-10-04)

- Stage 4 Content Manager acceptance: **PASS**.
- Rollback-only live fixtures verified end-to-end academic/content lifecycle.
- Allowed and verified:
  - course create/publish/archive;
  - batch create/activate;
  - subject/module create/publish;
  - lecture create/publish;
  - protected delivery source;
  - learning resources/sources;
  - assignments;
  - question bank;
  - test builder, schedules and analytics;
  - scoped announcements.
- Restricted and verified:
  - hard-delete remains admin/owner-only;
  - enrollment administration blocked;
  - teacher assignment administration blocked;
  - commerce offer mutation blocked;
  - staff/role assignment blocked;
  - attendance marking blocked;
  - audit logs/settings blocked;
  - direct profile visibility remains own profile only.
- Frontend role gates match the database boundary; `AcademicManagementPage` already hides delete controls from Content Manager.
- Audit: `docs/STAGE4_CONTENT_MANAGER_AUDIT.md`.
- Acceptance test: `database/tests/content_manager_workflow_acceptance.sql`.
- No schema fix was required in Stage 4.
- Android **1.0.41 / versionCode 42** remains unchanged.
- Next checkpoint: **Stage 5 — Admin and Owner administration, commerce, audit/settings and privileged-role boundaries**.


## STAGE 4 COMPLETE — Content Manager content lifecycle (2026-10-04)

- Stage 4 Content Manager workflow acceptance: **PASS**.
- Live tests used rollback-only fixtures; **no temporary content, roles, enrollments, assessments, announcements, or commerce data were retained**.
- Verified Content Manager can create/edit/publish:
  - courses and batches;
  - subjects, modules and lectures;
  - lecture delivery sources;
  - learning resources/provider sources;
  - assignments;
  - question bank entries;
  - tests and schedules;
  - manual result-release state;
  - announcements.
- Verified restricted boundaries:
  - own-profile-only identity visibility;
  - no enrollment visibility/management;
  - no commerce-order visibility;
  - no audit-log/settings visibility;
  - no privileged role escalation;
  - core academic/content deletion remains Admin/Owner-only.
- Frontend delete affordances for core content already match those RLS boundaries; schedule deletion is intentionally staff-scoped.
- Audit record: `docs/STAGE4_CONTENT_MANAGER_AUDIT.md`.
- Repeatable test: `database/tests/content_manager_workflow_acceptance.sql`.
- No schema or Android change was required in Stage 4.
- Android **1.0.41 / versionCode 42** remains authoritative.
- Next checkpoint: **Stage 5 — Admin and Owner operations, enrollment/staff/commerce/settings/audit and destructive-operation boundaries**.


## STAGE 5 COMPLETE — Admin & Owner operations (2026-10-04)

- Stage 5 operational acceptance: **PASS**.
- Owner workflow was exercised live with rollback-only fixtures.
- Verified Owner operations:
  - platform-wide profile visibility;
  - audit log and application-settings access;
  - enrollment CRUD;
  - teacher-role/assignment administration;
  - commerce order visibility;
  - manual payment finalization;
  - receipt creation;
  - paid-order enrollment/access provisioning;
  - protected settings update;
  - destructive core-content deletion.
- Admin privilege boundaries remain verified by Stage 1 live rollback tests:
  - Admin can grant Teacher/Content Manager;
  - Admin cannot grant Admin/Owner;
  - Owner remains the privileged role authority.
- Live Admin/Owner RLS policies were re-reviewed and match the frontend route model for enrollments, commerce, audit, settings, staff and destructive operations.
- The combined test that would temporarily rewrite the real Owner identity into Admin was not forced after the safety layer blocked that pattern; no bypass was attempted.
- Audit record: `docs/STAGE5_ADMIN_OWNER_AUDIT.md`.
- Repeatable Owner test: `database/tests/admin_owner_operations_acceptance.sql`.
- No schema or Android change was required in Stage 5.
- Android **1.0.41 / versionCode 42** remains authoritative.
- Next checkpoint: **Stage 6 — production hardening, runtime health, performance/security advisors, deployment consistency and final audit closure**.


## STAGE 6 COMPLETE — Production hardening and audit closure (2026-10-04)

- The staged post-APK platform audit is complete through Stage 6.
- Runtime/deployment checks:
  - latest completed GitHub Quality run before the Stage 6 checkpoint: **PASS**;
  - Vercel runtime error scan for the checked 24-hour window: **no runtime error clusters**;
  - canonical website, manifest and service worker return HTTP 200;
  - canonical security headers are present;
  - service-worker cache remains `statistics-lover-static-v13`.
- Supabase Security Advisor remaining warning:
  - **Leaked Password Protection Disabled** — external Auth configuration item; connected tools do not expose this setting.
- Supabase Performance Advisor found 4 unindexed foreign keys.
- Live migration `foreign_key_covering_indexes` applied successfully.
- Repository migration: `database/migrations/0034_foreign_key_covering_indexes.sql`.
- Added indexes:
  - `learning_resource_sources_created_by_idx`;
  - `learning_resources_created_by_idx`;
  - `lecture_attendance_marked_by_idx`;
  - `teacher_assignments_assigned_by_idx`.
- Remaining advisor findings about unused indexes and multiple permissive RLS policies are intentionally deferred until representative production traffic exists; changing them now would add regression risk without a demonstrated bottleneck.
- Audit closure:
  - Stage 1 Auth/Roles: PASS.
  - Stage 2 Student: PASS.
  - Stage 3 Teacher: PASS after teacher `INSERT ... RETURNING` RLS fix.
  - Stage 4 Content Manager: PASS.
  - Stage 5 Admin/Owner: PASS.
  - Stage 6 Hardening/Runtime: PASS with external configuration items noted.
- Audit record: `docs/STAGE6_PRODUCTION_HARDENING.md`.
- Android **1.0.41 / versionCode 42** remains the authoritative APK baseline.
- Remaining external/configuration work:
  1. enable Supabase leaked-password protection;
  2. configure/verify production email and WhatsApp delivery credentials before depending on those channels;
  3. revisit performance-only RLS/index advisor findings after meaningful production traffic exists.


## STAGE 7A COMPLETE — Razorpay payment backend foundation (2026-10-04)

- Payment gateway integration has started from the audited Stage 6 baseline.
- Razorpay selected as the first gateway adapter because the commerce schema already supports `razorpay` and Statistics Lover pricing is INR-oriented.
- Live Supabase migration `razorpay_gateway_foundation` applied.
- Repository migration: `database/migrations/0035_razorpay_gateway_foundation.sql`.
- New live Edge Functions:
  - `razorpay-checkout` — **ACTIVE**, `verify_jwt=true`;
  - `razorpay-webhook` — **ACTIVE**, `verify_jwt=false` because Razorpay cannot supply a Supabase user JWT; the function verifies the Razorpay HMAC itself.
- Security/authorization:
  - provider order binding is service-role-only;
  - gateway order refs are unique per provider;
  - browser never receives Razorpay Key Secret;
  - checkout callback HMAC uses the server-stored Razorpay order id;
  - payment status/amount/currency are re-verified server-side before existing payment finalization/enrollment provisioning;
  - webhook raw body is HMAC-verified;
  - deterministic provider event ids preserve idempotency.
- Rollout gate added: `commerce_razorpay_enabled=false`.
- Public safe config RPC `get_public_commerce_config()` returns only the enabled boolean.
- Required custom Edge Function secrets are not yet configured through the connected toolset:
  - `RAZORPAY_KEY_ID`;
  - `RAZORPAY_KEY_SECRET`;
  - `RAZORPAY_WEBHOOK_SECRET`.
- Required webhook URL: `https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/razorpay-webhook`.
- Minimum webhook events: `payment.captured`, `payment.failed`.
- Do **not** enable Razorpay yet; first complete frontend wiring, then configure test-mode secrets/webhook, execute a sandbox payment, and only then flip the rollout gate.
- Android **1.0.41 / versionCode 42** remains unchanged; its WebView already handles `upi:` and `intent:` external navigation, so no Android change is currently required for Razorpay web checkout.


## STAGE 7B COMPLETE — Razorpay web checkout wiring (2026-10-04)

- Web checkout is now connected to the Stage 7A Razorpay backend and remains behind `commerce_razorpay_enabled=false`.
- Store behavior:
  - Razorpay disabled: existing manual-order behavior is preserved.
  - Razorpay enabled: Statistics Lover creates a server-authoritative `razorpay` order, opens Razorpay Standard Checkout, and sends only payment/order/signature callback values to the authenticated verification function.
- My Orders supports retrying pending Razorpay orders and shows a payment-success confirmation after verified checkout.
- New client helper: `src/features/commerce/razorpayCheckout.ts`.
- Public payment availability is read only through `get_public_commerce_config()`.
- Razorpay Key Secret is never present in browser code; only public Key ID is returned by the backend when checkout is prepared.
- Production CSP now allows `https://checkout.razorpay.com` plus required `https://*.razorpay.com` connection/frame endpoints.
- CI correction during Stage 7B:
  - fixed an accidental escaped-newline formatting error in `commerceService.ts`;
  - removed impure `Date.now()` use from React render; order expiration remains server-authoritative.
- GitHub Quality run **37200532510 — SUCCESS** (typecheck, lint, build).
- Stage 7B audit: `docs/STAGE7B_RAZORPAY_WEB_CHECKOUT.md`.
- Android remains **1.0.41 / versionCode 42**. No native change is currently required because the existing WebView handles JavaScript, third-party cookies, and external `upi:` / `intent:` schemes.
- Razorpay remains intentionally **disabled** until external Test Mode configuration is available.
- Required activation sequence:
  1. configure Supabase Edge Function secrets `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`;
  2. configure Razorpay Test Mode webhook to `https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/razorpay-webhook` for at least `payment.captured` and `payment.failed`;
  3. execute one complete sandbox payment;
  4. verify order -> payment -> receipt -> enrollment and webhook idempotency;
  5. only then set `commerce_razorpay_enabled=true`.


## STAGE 7C COMPLETE — Razorpay pre-activation verification (2026-10-04)

- Statistics Lover-side Razorpay integration is complete up to the external merchant-credential boundary.
- Production frontend deployment:
  - source commit with deployed checkout tree: `94c478ad8da379e4531b31b95cb7432adb7f4e02`;
  - Vercel deployment `dpl_3nP47KJYuLgJcASzuXSRySB4dbwh` — **READY**;
  - GitHub Quality run **37200948393 — SUCCESS**;
  - canonical alias `statistics-lover.vercel.app` reassigned to this deployment;
  - live bundle `index-D4X7g2U9.js`;
  - live CSP verified to include Razorpay checkout script/connection/frame origins.
- Rollout state remains safe: `get_public_commerce_config()` returns `razorpay_enabled=false`.
- Live rollback-only internal Razorpay payment-domain acceptance: **PASS**.
- Verified:
  - student Razorpay order creation;
  - trusted provider-order binding;
  - amount mismatch rejection;
  - no premature enrollment on rejected payment;
  - valid verified payment -> paid order;
  - provider payment reference persistence;
  - receipt generation;
  - enrollment activation;
  - idempotent verified-event replay;
  - no duplicate payment event or receipt.
- Repeatable acceptance test: `database/tests/razorpay_gateway_acceptance.sql`.
- Audit record: `docs/STAGE7C_RAZORPAY_PREACTIVATION.md`.
- Required external Razorpay Test Mode configuration remains:
  - `RAZORPAY_KEY_ID`;
  - `RAZORPAY_KEY_SECRET`;
  - `RAZORPAY_WEBHOOK_SECRET`;
  - webhook URL `https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/razorpay-webhook`;
  - events `payment.captured` and `payment.failed`.
- After external secrets/webhook are configured, execute a real Razorpay Test Mode sandbox payment and verify order -> payment -> receipt -> enrollment before setting `commerce_razorpay_enabled=true`.
- Do not commit or expose Razorpay Key Secret/webhook secret in browser code, Vercel public env, GitHub, or APK.
- Android remains **1.0.41 / versionCode 42**; no native change is required at this checkpoint.


## CONTEXT REFRESH — 2026-10-04 18:51 IST

- This refresh supersedes older handoff lines that still referred to recovered Android 1.0.15 / versionCode 16 or earlier UI-stabilization checkpoints as the current focus.
- Current canonical development head: `5c85c41383ce22708a1e188492642f997390fce6` — `chore: deploy latest develop to production`.
- Current `main` head: `a7cf2408b6b4d74d47f0b5d584c7dc7cd1e45381`. Do not assume `main` contains the newest implementation; verify `develop` first.
- Latest GitHub Quality for develop: run `37204654493` — **SUCCESS**.
- Latest Vercel develop deployment: `dpl_7y6tZKHaJdy6MFk11bvtQheb23XF` — **READY**.
- Canonical production URL and stable develop alias were fetched on this refresh and serve the same current application asset hashes, including the Razorpay-enabled CSP and PWA metadata.
- Android authoritative baseline remains **Statistics Lover 1.0.41 / versionCode 42**.
- Staged acceptance/hardening status remains complete through Stage 6; Stage 7A–7C Razorpay implementation/pre-activation verification is complete.
- Razorpay remains intentionally disabled until external Test Mode credentials/webhook and one end-to-end sandbox payment are completed.
- Remaining external configuration blockers:
  - Supabase leaked-password protection;
  - production email/WhatsApp provider credentials/templates;
  - Razorpay Test Mode secrets and webhook.


## RAZORPAY KYC PAUSE — Next payment milestone (2026-10-04)

- Razorpay gateway implementation is technically complete through the pre-activation stage.
- Current customer-facing gateway state remains intentionally **disabled** with `commerce_razorpay_enabled=false`.
- Razorpay merchant account/KYC has not yet been completed by the owner.
- Do not request, store, or paste Razorpay secrets into chat.
- The next payment-gateway action is intentionally paused until the owner confirms that **Razorpay KYC/account activation is complete**.
- When KYC is complete, continue in guided steps, one step at a time:
  1. enter Razorpay Test Mode;
  2. generate Test Mode API keys;
  3. create a dedicated Razorpay webhook secret;
  4. configure Supabase Edge Function secrets `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `RAZORPAY_WEBHOOK_SECRET`;
  5. configure the Razorpay Test Mode webhook to `https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/razorpay-webhook`;
  6. enable at minimum `payment.captured` and `payment.failed` events;
  7. execute a full sandbox payment;
  8. verify order -> verified payment -> receipt -> enrollment -> webhook idempotency;
  9. only after the sandbox pass, set `commerce_razorpay_enabled=true`;
  10. later repeat the same controlled process with Live Mode keys/webhook after Razorpay live activation.
- Until KYC is complete, make no further Razorpay activation changes.
- Android remains **1.0.41 / versionCode 42** and requires no payment-specific rebuild at this checkpoint.


## RAZORPAY TEST-MODE SETUP RESUMED — 2026-10-06

- The Razorpay merchant account exists and KYC is **under review**, not yet approved.
- The owner explicitly authorized proceeding with **Test Mode** setup while KYC review is pending.
- Test-mode configuration and a sandbox transaction may proceed one step at a time; production/live payment activation still requires appropriate merchant approval and successful payment verification.
- Next user-facing step: sign into Razorpay's web dashboard and switch to **Test Mode**. Guide the owner through Test API key creation, safe Supabase secret configuration, webhook setup, and sandbox payment testing one step at a time after they confirm each screen.
- Never ask the owner to paste key secrets or webhook secrets into chat. Keep `commerce_razorpay_enabled=false` until Test Mode end-to-end verification has passed.
- Android 1.0.41/versionCode 42 stays unchanged.


## RAZORPAY TEST-MODE WEBHOOK DELIVERY VERIFIED — 2026-10-06

- Razorpay Test Mode account API key/secret have been saved by the owner in Supabase Edge Function secrets (not exposed to the chat).
- Separate webhook secret was saved in Supabase and entered into Razorpay; the owner confirmed the webhook settings screenshot:
  - URL `https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/razorpay-webhook`;
  - enabled, in Test Mode;
  - events `payment.captured` and `payment.failed`.
- Owner created a standalone Razorpay Test Mode Payment Link for INR 1 and completed a simulated card payment.
- Supabase live function gateway logs show Razorpay's POST to the `razorpay-webhook` function on **2026-10-06 17:26:27 UTC**, sender `Razorpay-Webhook/v1`, returning **HTTP 200**.
- The standalone Payment Link is not mapped to an internal Statistics Lover commerce order. Thus this confirms **webhook delivery/HTTP success**, not full platform checkout, receipt, or enrollment.
- At this checkpoint the database has **zero active batch offers**, **one active batch**, **zero pending Razorpay commerce orders**, and the rollout flag `commerce_razorpay_enabled=false`.
- Next stage: design/create a controlled, reversible sandbox **Statistics Lover store offer** and test the actual checkout order -> Razorpay capture -> verified webhook/payment -> receipt -> enrollment end-to-end. Do not turn on the global rollout flag for actual customers prematurely; avoid exposing a test product on the public store without deliberate controls.
- KYC remains under review, live-mode activation is not authorized, and Android 1.0.41 remains unchanged.


## RAZORPAY RESTRICTED SANDBOX PREPARED — 2026-10-06

- Explicit authorization received to prepare an isolated INR 1 end-to-end checkout test.
- New hidden course `statistics-lover-razorpay-sandbox` remains **draft**, hidden batch remains **draft**, and offer remains **inactive**.
- Store RPC `get_public_batch_offers()` still returns no public offers.
- New `public.commerce_sandbox_orders` server-owned marker table is RLS-enabled; no public/anonymous/authenticated direct access.
- New `create_razorpay_sandbox_order()` RPC only allows active Owner to create or reuse a pending ₹1 Razorpay test order. Customer-facing order creation is unchanged.
- Razorpay checkout Edge Function permits a narrowly scoped bypass of the global disabled flag **only** for a server-marked test order belonging to a currently authorized Owner, of amount 100 paise in INR. Other users still receive 503.
- New Owner-only route: `/admin/razorpay-sandbox`.
- The actual simulated card payment remains a separate user action; do not claim this end-to-end test passed until receipt/enrollment and webhook idempotency are verified on a real sandbox gateway order.
- Keep `commerce_razorpay_enabled=false` and Android 1.0.41 unchanged.


## STAGE 7D — OWNER-ONLY ₹1 RAZORPAY SANDBOX (2026-10-06)

- Prepared private draft course + draft batch + inactive INR 1 offer. Public Store RPC still has **zero offers**.
- Dedicated active-Owner-only RPC `create_razorpay_sandbox_order()` creates or reuses an unexpired ₹1 test order and server-only marker row.
- Table `commerce_sandbox_orders` is RLS-enabled and unavailable for direct reads by normal/anonymous users.
- `razorpay-checkout` Edge Function version 4 ACTIVE with JWT verification, allowing a tightly constrained Owner+sandbox-marked+100-paise test order even though global `commerce_razorpay_enabled=false`. Public checkout stays disabled.
- Owner-only browser route: `/admin/razorpay-sandbox`.
- Rollback-only role/order/store-isolation acceptance: PASS. GitHub Quality 37504558472: SUCCESS.
- Source migration: `database/migrations/0036_razorpay_restricted_owner_sandbox.sql`. Repeatable test: `database/tests/razorpay_owner_sandbox_acceptance.sql`. Runbook: `docs/STAGE7D_RAZORPAY_SANDBOX.md`.
- Next action: verify canonical Vercel deployment then make exactly one Razorpay Test Mode checkout from Owner account and inspect captured payment, receipt, enrollment and webhook idempotency. **Do not claim real end-to-end success until then.**
- Keep global gateway disabled and Android 1.0.41 unchanged.


## RAZORPAY CHECKOUT AUTH FIX — 2026-10-06

- Owner reached `/admin/razorpay-sandbox` and used **Start ₹1 test checkout**.
- The Owner-authenticated `create_razorpay_sandbox_order()` RPC succeeded, producing a pending ₹1 Razorpay order with private marker and **no provider_order_reference**, so no gateway payment started.
- Live Supabase function logs for Razorpay checkout showed HTTP 401 even while the authenticated RPC returned HTTP 200.
- Cause identified: the stateless Edge Function was calling `supabase.auth.getUser()` without passing the user's bearer access token, so Supabase Auth looked for a non-existent local Edge session.
- Fix: parse/require a Bearer token from the request and call `supabase.auth.getUser(accessToken)` explicitly. This validates the session with Supabase Auth without weakening Owner/marker/price checks or disabling JWT enforcement.
- Global `commerce_razorpay_enabled=false` remains unchanged. The original pending test order is deliberately retained for retry.
- Must validate the corrected deployed Edge Function and retry in the Owner browser before claiming payment/receipt/enrollment success.
