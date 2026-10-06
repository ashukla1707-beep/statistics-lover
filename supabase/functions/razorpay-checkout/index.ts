import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type OrderRow = {
  id: string;
  order_number: string;
  student_id: string;
  batch_id: string;
  currency: string;
  total_minor: number;
  status: "pending" | "paid" | "cancelled" | "failed" | "refunded";
  provider: "manual" | "razorpay" | "stripe" | "external";
  provider_order_reference: string | null;
  expires_at: string;
  batch: { title: string; course: { title: string } | null } | null;
};

type RazorpayPayment = {
  id: string;
  order_id?: string | null;
  amount?: number;
  currency?: string;
  status?: string;
  captured?: boolean;
  method?: string;
};

const encoder = new TextEncoder();
const allowedOrigins = new Set([
  "https://statistics-lover.vercel.app",
  "https://statistics-lover-git-develop-statistics-lover.vercel.app",
  "https://hstatistics.workers.dev",
]);

function corsHeaders(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  return {
    "access-control-allow-origin": allowedOrigins.has(origin) ? origin : "https://statistics-lover.vercel.app",
    "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req),
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

async function razorpayFetch(
  keyId: string,
  keySecret: string,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...init,
    headers: {
      authorization: `Basic ${btoa(`${keyId}:${keySecret}`)}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const description = String(
      (payload as { error?: { description?: unknown } })?.error?.description ??
        `Razorpay request failed with status ${response.status}`,
    );
    // Razorpay's Orders API uses "Authentication failed" for a mismatched,
    // revoked or wrong-mode Key ID / Key Secret pair. Do not mistake this
    // upstream failure for a user's Statistics Lover login problem.
    if (response.status === 401 || /^authentication failed\\.?$/i.test(description)) {
      console.warn("razorpay-checkout: Razorpay API credentials rejected", {
        status: response.status,
        endpoint: path === "/orders" ? "orders" : "payment",
      });
      throw new Error(
        "Razorpay rejected the configured API keys. Open Supabase Edge Function Secrets and replace RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET with the latest matching Razorpay Test Mode pair."
      );
    }
    throw new Error(description);
  }
  return payload as Record<string, unknown>;
}

async function requireEnabled(admin: ReturnType<typeof createClient>) {
  const { data, error } = await admin.from("app_settings")
    .select("value")
    .eq("key", "commerce_razorpay_enabled")
    .maybeSingle();
  if (error) throw error;
  return data?.value === true;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(req) });
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const anonKey = requiredEnv("SUPABASE_ANON_KEY");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const authorization = req.headers.get("authorization")?.trim() ?? "";
    const bearerMatch = /^Bearer\s+(\S+)$/i.exec(authorization);
    if (!bearerMatch) return json(req, { error: "Authentication required" }, 401);

    // Edge Functions are stateless: they have no stored browser session.
    // Explicitly pass the caller's bearer JWT to getUser(jwt). Calling
    // getUser() without a JWT looks for a local session and returns 401,
    // even when the request's Authorization header is valid.
    const accessToken = bearerMatch[1];
    // Do not attach a global Authorization header to the GoTrue verifier.
    // GoTrue's getUser(jwt) needs to construct its own token request; mixing
    // global headers into the auth client previously caused 401 at this stage.
    const tokenVerifier = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userError } =
      await tokenVerifier.auth.getUser(accessToken);
    if (userError || !userData.user) {
      console.warn("razorpay-checkout: caller token verification failed", {
        authCode: userError?.code ?? "unknown",
      });
      return json(req, { error: "Your login session could not be verified. Sign in again and retry." }, 401);
    }
    const user = userData.user;

    // Keep role/profile queries separate from token verification. This is
    // the caller's verified access token, not a service-role privilege grant.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Ordinary checkout remains globally disabled until launch readiness.
    // Only a server-marked sandbox order owned by the active Owner may bypass it.
    const globallyEnabled = await requireEnabled(admin);

    const keyId = requiredEnv("RAZORPAY_KEY_ID");
    const keySecret = requiredEnv("RAZORPAY_KEY_SECRET");
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action ?? "").trim();
    const orderId = String(body.orderId ?? "").trim();
    if (!orderId) return json(req, { error: "Order is required." }, 400);

    const { data: orderData, error: orderError } = await admin.from("commerce_orders")
      .select(`
        id,order_number,student_id,batch_id,currency,total_minor,status,provider,
        provider_order_reference,expires_at,
        batch:batches!commerce_orders_batch_id_fkey(
          title,course:courses!batches_course_id_fkey(title)
        )
      `)
      .eq("id", orderId)
      .eq("student_id", user.id)
      .maybeSingle();
    if (orderError) throw orderError;
    if (!orderData) return json(req, { error: "Order not found." }, 404);
    const order = orderData as unknown as OrderRow;

    if (order.provider !== "razorpay") {
      return json(req, { error: "This order is not a Razorpay order." }, 409);
    }

    if (!globallyEnabled) {
      const [{ data: sandboxMarker, error: markerError }, { data: ownerRole, error: roleError }] =
        await Promise.all([
          admin.from("commerce_sandbox_orders")
            .select("order_id")
            .eq("order_id", order.id)
            .eq("owner_id", user.id)
            .maybeSingle(),
          callerClient.from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .eq("role", "owner")
            .maybeSingle(),
        ]);
      if (markerError) throw markerError;
      if (roleError) throw roleError;
      if (!sandboxMarker || !ownerRole ||
          order.total_minor !== 100 || order.currency !== "INR") {
        return json(req, { error: "Online payments are not enabled yet." }, 503);
      }
    }
    if (order.status === "paid") return json(req, { paid: true, orderId: order.id });
    if (order.status !== "pending") {
      return json(req, { error: "This order can no longer be paid." }, 409);
    }
    if (new Date(order.expires_at).getTime() <= Date.now()) {
      return json(req, { error: "This order has expired. Create a new order." }, 409);
    }
    if (!Number.isSafeInteger(order.total_minor) || order.total_minor <= 0) {
      return json(req, { error: "Online gateway payment requires a positive order total." }, 409);
    }

    if (action === "create") {
      let razorpayOrderId = order.provider_order_reference;
      if (!razorpayOrderId) {
        const created = await razorpayFetch(keyId, keySecret, "/orders", {
          method: "POST",
          body: JSON.stringify({
            amount: order.total_minor,
            currency: order.currency,
            receipt: order.order_number,
            notes: {
              statistics_lover_order_id: order.id,
              statistics_lover_student_id: order.student_id,
            },
          }),
        });
        razorpayOrderId = String(created.id ?? "");
        if (!razorpayOrderId) throw new Error("Razorpay did not return an order id.");

        const { error: bindError } = await admin.rpc("bind_commerce_provider_order", {
          target_order: order.id,
          payment_provider: "razorpay",
          provider_order_reference: razorpayOrderId,
        });
        if (bindError) throw bindError;
      }

      const { data: profile, error: profileError } = await callerClient.from("profiles")
        .select("full_name,email,phone")
        .eq("id", user.id)
        .maybeSingle();
      if (profileError) throw profileError;

      return json(req, {
        paid: false,
        checkout: {
          keyId,
          orderId: order.id,
          razorpayOrderId,
          amount: order.total_minor,
          currency: order.currency,
          name: "Statistics Lover",
          description: `${order.batch?.course?.title ?? "Course"} · ${order.batch?.title ?? "Batch"}`,
          prefill: {
            name: profile?.full_name ?? "",
            email: profile?.email ?? user.email ?? "",
            contact: profile?.phone ?? "",
          },
        },
      });
    }

    if (action === "verify") {
      const paymentId = String(body.paymentId ?? "").trim();
      const razorpayOrderId = String(body.razorpayOrderId ?? "").trim();
      const signature = String(body.signature ?? "").trim();
      if (!paymentId || !razorpayOrderId || !signature) {
        return json(req, { error: "Payment verification details are incomplete." }, 400);
      }
      if (!order.provider_order_reference || order.provider_order_reference !== razorpayOrderId) {
        return json(req, { error: "Gateway order does not match this Statistics Lover order." }, 409);
      }

      const expected = await hmacHex(
        keySecret,
        `${order.provider_order_reference}|${paymentId}`,
      );
      if (!safeEqual(expected, signature.toLowerCase())) {
        return json(req, { error: "Payment signature verification failed." }, 400);
      }

      let payment = await razorpayFetch(
        keyId,
        keySecret,
        `/payments/${encodeURIComponent(paymentId)}`,
      ) as RazorpayPayment;

      if (payment.status === "authorized") {
        try {
          payment = await razorpayFetch(
            keyId,
            keySecret,
            `/payments/${encodeURIComponent(paymentId)}/capture`,
            {
              method: "POST",
              body: JSON.stringify({ amount: order.total_minor, currency: order.currency }),
            },
          ) as RazorpayPayment;
        } catch {
          payment = await razorpayFetch(
            keyId,
            keySecret,
            `/payments/${encodeURIComponent(paymentId)}`,
          ) as RazorpayPayment;
        }
      }

      if (payment.order_id !== order.provider_order_reference) {
        return json(req, { error: "Razorpay payment belongs to a different order." }, 409);
      }
      if (Number(payment.amount) !== order.total_minor ||
          String(payment.currency ?? "").toUpperCase() !== order.currency) {
        return json(req, { error: "Razorpay payment amount or currency does not match." }, 409);
      }
      if (payment.status !== "captured" && payment.captured !== true) {
        return json(req, { error: "Payment is not captured yet. Please retry shortly." }, 409);
      }

      const eventId = `payment:${paymentId}:captured`;
      const { error: recordError } = await admin.rpc("record_verified_commerce_payment", {
        target_order: order.id,
        payment_provider: "razorpay",
        provider_event_id: eventId,
        provider_payment_reference: paymentId,
        amount_minor: order.total_minor,
        currency: order.currency,
        payload: {
          source: "checkout",
          razorpay_order_id: order.provider_order_reference,
          razorpay_payment_id: paymentId,
          status: payment.status ?? "captured",
          captured: payment.captured ?? true,
          method: payment.method ?? null,
        },
      });
      if (recordError) throw recordError;

      return json(req, { paid: true, orderId: order.id });
    }

    return json(req, { error: "Unknown checkout action." }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Payment request failed.";
    const configError = message.includes("RAZORPAY_") && message.includes("not configured");
    return json(req, { error: configError ? "Razorpay credentials are not configured." : message }, configError ? 503 : 400);
  }
});
