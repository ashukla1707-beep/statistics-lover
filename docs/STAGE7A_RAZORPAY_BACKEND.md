# Stage 7A — Razorpay Gateway Backend Foundation

Date: 2026-10-04

## Result

Backend gateway foundation is deployed but intentionally **disabled for customers** until merchant credentials and the Razorpay webhook secret are configured and a sandbox payment passes.

## Provider

Razorpay was selected for the first live gateway adapter because the existing Statistics Lover commerce domain already includes the `razorpay` provider and uses INR-oriented pricing.

## Live backend changes

Supabase migration:

`razorpay_gateway_foundation`

Repository migration:

`database/migrations/0035_razorpay_gateway_foundation.sql`

New deployed Edge Functions:

- `razorpay-checkout` — authenticated; creates Razorpay Orders, binds the gateway order id to the server-authoritative Statistics Lover order, verifies checkout HMAC signatures, fetches/captures the payment server-side when necessary, verifies amount/currency/order ownership and records the verified payment.
- `razorpay-webhook` — public endpoint by necessity; validates Razorpay webhook HMAC against the raw request body before processing `payment.captured` or `payment.failed`.

## Security properties

- Razorpay Key Secret is never sent to the browser or Android APK.
- Client amount/currency are never trusted.
- The internal order is looked up by authenticated student ownership.
- Provider order binding is service-role-only.
- Provider order reference has a partial unique index.
- Checkout signature uses HMAC-SHA256 with the stored server-side Razorpay order id.
- Captured payment is re-fetched from Razorpay before enrollment is activated.
- Verified payment continues through the existing idempotent `record_verified_commerce_payment` boundary.
- Webhook processing is HMAC-verified and uses deterministic payment event ids.
- Webhook failure events are recorded but do not revoke/alter enrollment automatically.

## Safe rollout gate

A new setting exists:

`commerce_razorpay_enabled = false`

The checkout Edge Function refuses gateway operations until this setting is enabled. This prevents a half-configured checkout from becoming visible before credentials/testing are complete.

The public browser may read only the safe boolean through:

`get_public_commerce_config()`

## Required external secrets before activation

Configure these Supabase Edge Function secrets:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Then configure the Razorpay webhook to call:

`https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/razorpay-webhook`

Subscribe at minimum to:

- `payment.captured`
- `payment.failed`

Do not enable `commerce_razorpay_enabled` until a test-mode payment has completed end-to-end.
