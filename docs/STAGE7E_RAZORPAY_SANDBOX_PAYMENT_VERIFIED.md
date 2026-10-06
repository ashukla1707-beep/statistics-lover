# Stage 7E — Razorpay Test Mode payment: verified

Date: 2026-10-06

## Outcome

**PASS: one genuine Razorpay Test Mode ₹1 payment has completed the full Statistics Lover order → captured payment → receipt → active enrollment path.** This is sandbox verification only, not permission to activate real-money payments.

## Evidence from live Supabase database

- Restricted Owner-only sandbox course and batch stayed unpublished; the public Store RPC returned **0 offers**.
- Global `commerce_razorpay_enabled` remained **false**.
- The paid checkout used Statistics Lover order `754107b7-5c9c-46b5-88a2-fc858c75f7bc`, bound to Razorpay order `order_Tkif3DIYBkbr6k`.
- Status `paid` at **2026-10-06 18:23:25 UTC**, amount **100 paise / INR 1.00**, provider payment reference `pay_TkihnbgMzwosmA`.
- Exactly **1** verified `commerce_payments` record, **1** `commerce_receipts` record and **1** active sandbox `enrollments` record exist for the paid order.
- Payment event `payment:pay_TkihnbgMzwosmA:captured` persisted with `payload.source=webhook`, `payload.status=captured`, `payload.captured=true`.
- `supabase/functions/razorpay-webhook/index.ts` verifies the `x-razorpay-signature` HMAC against `RAZORPAY_WEBHOOK_SECRET` before finalizing captured payments; thus the recorded `source=webhook` is evidence of the signed webhook processing path.
- Rollback-only live SQL replay of the same verified event returned the existing order without creating duplicate payments, receipts or enrollments. All test transaction mutations were rolled back.

## Follow-up / cleanup items

- Another ₹1 sandbox order `8d8f2f77-2261-4cea-9082-4ccfc68eb7c4` was created afterward and remained **pending**, with a Razorpay provider order reference but **no captured payment, receipt or enrollment** at the checkpoint. Do not pay it again; let it expire or retire it during the dedicated sandbox-cleanup stage. An older pending unbound order had already expired.
- Do not remove or rewrite the paid order/receipt until evidence retention and cleanup are considered. Sandbox records are test artifacts.
- Razorpay KYC approval/live merchant activation was still pending. **Do not switch to live credentials or enable the public gateway as a result of this test alone.** Repeat validation with approved Live Mode credentials under a separate controlled launch plan.
- Android **1.0.41 / versionCode 42** was not changed.
