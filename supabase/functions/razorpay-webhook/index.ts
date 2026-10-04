import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type PaymentEntity = {
  id?: string;
  order_id?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
  captured?: boolean;
  method?: string;
};

const encoder = new TextEncoder();

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

function toHex(value: ArrayBuffer) {
  return Array.from(new Uint8Array(value)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacHex(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const webhookSecret = requiredEnv("RAZORPAY_WEBHOOK_SECRET");
    const signature = req.headers.get("x-razorpay-signature")?.trim().toLowerCase() ?? "";
    const rawBody = await req.text();
    if (!signature) return json({ error: "Missing Razorpay signature" }, 401);

    const expected = await hmacHex(webhookSecret, rawBody);
    if (!safeEqual(expected, signature)) {
      return json({ error: "Invalid Razorpay signature" }, 401);
    }

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const event = String(payload.event ?? "");
    const eventPayload = (payload.payload ?? {}) as Record<string, unknown>;
    const paymentWrapper = (eventPayload.payment ?? {}) as Record<string, unknown>;
    const payment = (paymentWrapper.entity ?? {}) as PaymentEntity;

    if (!["payment.captured", "payment.failed"].includes(event)) {
      return json({ ok: true, ignored: event || "unknown" });
    }

    const paymentId = String(payment.id ?? "").trim();
    const razorpayOrderId = String(payment.order_id ?? "").trim();
    if (!paymentId || !razorpayOrderId) {
      return json({ ok: true, ignored: "payment_without_order" });
    }

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: order, error: orderError } = await admin.from("commerce_orders")
      .select("id,currency,total_minor,status")
      .eq("provider", "razorpay")
      .eq("provider_order_reference", razorpayOrderId)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!order) return json({ ok: true, ignored: "unmapped_order" });

    const amount = Number(payment.amount ?? -1);
    const currency = String(payment.currency ?? "").toUpperCase();

    if (event === "payment.captured") {
      if (amount !== order.total_minor || currency !== order.currency) {
        return json({ error: "Captured payment amount/currency mismatch" }, 409);
      }

      const { error } = await admin.rpc("record_verified_commerce_payment", {
        target_order: order.id,
        payment_provider: "razorpay",
        provider_event_id: `payment:${paymentId}:captured`,
        provider_payment_reference: paymentId,
        amount_minor: amount,
        currency,
        payload: {
          source: "webhook",
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: paymentId,
          status: payment.status ?? "captured",
          captured: payment.captured ?? true,
          method: payment.method ?? null,
        },
      });
      if (error) throw error;
      return json({ ok: true, paid: true });
    }

    const { error: failedError } = await admin.from("commerce_payments").upsert({
      order_id: order.id,
      provider: "razorpay",
      provider_event_id: `payment:${paymentId}:failed`,
      provider_payment_reference: paymentId,
      amount_minor: Math.max(0, amount),
      currency: currency || order.currency,
      status: "failed",
      payload: {
        source: "webhook",
        razorpay_order_id: razorpayOrderId,
        razorpay_payment_id: paymentId,
        status: payment.status ?? "failed",
        method: payment.method ?? null,
      },
    }, {
      onConflict: "provider,provider_event_id",
      ignoreDuplicates: true,
    });
    if (failedError) throw failedError;

    return json({ ok: true, failed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed.";
    const configError = message.includes("RAZORPAY_") && message.includes("not configured");
    return json({ error: configError ? "Razorpay webhook is not configured." : message }, configError ? 503 : 400);
  }
});
