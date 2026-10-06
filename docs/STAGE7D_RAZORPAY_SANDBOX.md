# Stage 7D — Restricted ₹1 Razorpay Sandbox Checkout

Prepared on 2026-10-06. **Do not enable global Razorpay.**

## Safety

The sandbox course is `draft`, batch is `draft`, and offer is `inactive`. Public `get_public_batch_offers()` must return zero sandbox rows. Normal `create_commerce_order()` cannot purchase this batch. Only an active Owner can call the dedicated `create_razorpay_sandbox_order()` function.

The sandbox-order marker table has RLS enabled and denies normal direct table access. The active checkout Edge Function (version 4) bypasses global `commerce_razorpay_enabled=false` only after looking up the server-created marker, verifying the order's owner is the current authenticated Owner, and confirming the order is exactly INR 1 (100 paise). This protects the public store from testing.

## Private test workflow

1. Sign into the Statistics Lover web app using the existing Owner account.
2. Open `/admin/razorpay-sandbox`.
3. Tap **Start ₹1 test checkout** and pay with an official Razorpay Test Mode card, never a real card.
4. Check `/orders` for the paid sandbox order and receipt.
5. Verify in Supabase that the order is paid, the captured provider payment was recorded, one receipt exists, and the owner has a test enrollment in the sandbox batch; verify the webhook status and absence of duplicate rows.
6. After validation, retire the private sandbox offer and carefully remove only its identifiable test enrollment/order/fixtures. Do not modify customer courses or real orders.

## Verification

- Live database rollback acceptance test: PASS (owner order creation and reuse, non-owner denial, hidden public offer, trusted marker).
- GitHub Quality run for feature commit: 37504558472 — SUCCESS.
- Edge Function: `razorpay-checkout` version 4 ACTIVE, JWT verification enabled.
- Sandbox web deployment: pending canonical-alias confirmation at documentation checkpoint.
- Real Test Mode checkout, captured payment, receipt/enrollment and webhook idempotency **still need on-device/browser action**.
- No change to Android 1.0.41/versionCode 42.

Database migration: `database/migrations/0036_razorpay_restricted_owner_sandbox.sql`

Acceptance SQL: `database/tests/razorpay_owner_sandbox_acceptance.sql`
