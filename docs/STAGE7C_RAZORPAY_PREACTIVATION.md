# Stage 7C — Razorpay Pre-activation Verification

Date: 2026-10-04

## Result

The Razorpay integration is complete on the Statistics Lover side up to the merchant-credential boundary.

The production frontend is deployed, the gateway backend is deployed, and the internal payment-domain acceptance test passes. Customer Razorpay checkout remains intentionally disabled until Razorpay Test Mode credentials and webhook configuration are supplied externally.

## Production verification

- Web commit deployed: `94c478ad8da379e4531b31b95cb7432adb7f4e02`
- Vercel deployment: `dpl_3nP47KJYuLgJcASzuXSRySB4dbwh`
- Vercel state: **READY**
- GitHub Quality run: `37200948393` — **SUCCESS**
- Canonical alias: `statistics-lover.vercel.app`
- Live bundle: `index-D4X7g2U9.js`
- Live CSP includes Razorpay checkout script, Razorpay connection endpoints, and Razorpay frames.
- `get_public_commerce_config()` still returns `razorpay_enabled=false`.

## Internal payment-domain test

A rollback-only live Supabase acceptance test verified:

- student creates a pending internal order with provider `razorpay`;
- trusted service binds a Razorpay provider order reference;
- a verified payment with the wrong amount is rejected;
- access is not provisioned after the rejected payment;
- a correctly verified payment marks the order paid;
- the provider payment reference is stored;
- a receipt is created;
- enrollment is activated;
- replaying the same verified event is idempotent;
- no duplicate payment event is created;
- no duplicate receipt is created.

All fixtures were rolled back.

Repeatable test:

`database/tests/razorpay_gateway_acceptance.sql`

## Remaining external merchant setup

The following values must be configured as Supabase Edge Function secrets in Razorpay **Test Mode**:

- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`

Webhook endpoint:

`https://wjsudutyvsssfhrdqvbr.supabase.co/functions/v1/razorpay-webhook`

Minimum webhook events:

- `payment.captured`
- `payment.failed`

After the secrets and webhook are configured, run one sandbox payment end to end. Only after that succeeds should `commerce_razorpay_enabled` be changed to `true`.

Do not place the Razorpay Key Secret or webhook secret in GitHub, Vercel browser variables, the React bundle, or the Android APK.
