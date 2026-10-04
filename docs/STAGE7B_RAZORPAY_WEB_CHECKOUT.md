# Stage 7B — Razorpay Web Checkout

Date: 2026-10-04

## Result

Frontend Razorpay checkout is wired and Quality-verified behind the server-side rollout flag. The flag remains disabled until merchant Test Mode credentials and webhook configuration are available.

## Browser flow

When `commerce_razorpay_enabled=true`:

1. Student chooses a batch and optional coupon.
2. Existing server-authoritative order RPC creates a `razorpay` Statistics Lover order.
3. Authenticated `razorpay-checkout` creates/binds the Razorpay Order.
4. Browser loads Razorpay Standard Checkout.
5. Successful checkout sends payment id, gateway order id and signature only to the authenticated Edge Function.
6. Edge Function verifies HMAC, payment order, amount, currency and captured status before calling the existing verified-payment finalizer.
7. Existing finalizer atomically marks the order paid, activates enrollment and creates the receipt.
8. Student lands on My Orders and sees the verified payment/access state.

Pending Razorpay orders can be retried from My Orders. Expiration remains server-authoritative.

## Safe fallback

While the rollout flag is false, the pre-existing manual-order behavior remains unchanged. This prevents a half-configured online checkout from becoming visible.

## Security

- Razorpay Key Secret is never shipped to browser or APK.
- Price/discount/amount/currency remain server-authoritative.
- Checkout callback signature is verified server-side.
- Captured payment is re-fetched/validated server-side before provisioning.
- Provider event IDs remain idempotent through the existing payment finalizer.
- CSP permits only Razorpay Checkout script plus Razorpay HTTPS connection/frame endpoints required by Standard Checkout.

## Android

No APK code change is required for this phase. Android 1.0.41's WebView already supports JavaScript, third-party cookies and external `upi:` / `intent:` navigation used by payment apps.

## Verification

GitHub Quality run `37200532510`: **SUCCESS** after typecheck, lint and production build.

## Activation still required

Do not switch the rollout flag until Test Mode secrets are installed, the webhook is configured, and a complete sandbox payment verifies:

order -> gateway payment -> verified payment row -> receipt -> enrollment.
