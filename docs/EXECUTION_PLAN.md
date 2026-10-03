# Statistics Lover — Autonomous Completion Plan

This is the execution ledger for finishing the website layer by layer without relying on chat memory.

## Rules
- Work on `develop`.
- Finish one vertical layer before starting the next.
- Each layer includes database/security, admin workflow, user workflow, responsive UI, typecheck/lint/build, deployment verification and documentation.
- Do not require manual wiring when connected GitHub/Supabase/Vercel tooling can perform it.
- Record milestones in `PROJECT_CONTEXT.md`.
- Merge to `main` only after the final acceptance pass.

## A — Foundation and identity
- [x] Responsive public shell
- [x] Authentication/profile/roles
- [x] Suspension handling
- [x] Courses/batches/enrollments
- [x] Academic admin workspace

## B — Teaching
- [x] Subject/module/lecture hierarchy
- [x] Protected live-class provider foundation
- [x] Protected recording provider foundation
- [x] Google Drive recording player
- [x] Learning-resource database/RLS/RPC foundation
- [x] Study material admin/student UI
- [x] Live-class scheduling/availability hardening
- [x] Teacher assignments and teacher workspace
- [x] Attendance
- [x] Assignments and submissions
- [ ] Teaching-layer acceptance tests

## C — Assessment
- [x] Question bank and options
- [x] Test/section builder
- [ ] Scheduling/assignment
- [ ] Student test-taking
- [ ] Attempts/submission/scoring/results
- [ ] Performance analytics
- [ ] PYQ assessment integration

## D — Commerce and communication
- [ ] Orders/payments/provider adapter
- [ ] Coupons/receipts
- [ ] Enrollment activation from payment
- [ ] Announcements
- [ ] Email/WhatsApp/in-app notifications

## E — Product completion
- [ ] Student dashboard completion
- [ ] Teacher dashboard
- [ ] Admin operations dashboard
- [ ] Search/filter/pagination
- [ ] Audit logs/settings
- [ ] Accessibility/responsive/error-state pass
- [ ] PWA/performance

## F — Security, QA and release
- [ ] RLS/privilege/browser-secret/provider-link audit
- [ ] Data-integrity audit
- [ ] Cross-role acceptance scenarios
- [ ] Production migration/build verification
- [ ] Release `develop` -> `main`
- [ ] Production smoke test/final handover

## G — Android APK
- [ ] Shared auth/session strategy
- [ ] Dedicated recording WebView with desktop user agent
- [ ] Native fullscreen/orientation
- [ ] Download/piracy policy
- [ ] Push notifications
- [ ] Signed release
