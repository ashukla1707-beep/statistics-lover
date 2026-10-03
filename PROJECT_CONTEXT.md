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
- Current focus: **Watch Recording / lecture player**

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
