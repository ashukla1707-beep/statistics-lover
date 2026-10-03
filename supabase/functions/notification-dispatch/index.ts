import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type OutboxItem = {
  id: string;
  user_id: string;
  announcement_id: string;
  channel: "email" | "whatsapp";
  destination: string;
  title: string;
  body: string;
  attempts: number;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

async function sendEmail(item: OutboxItem) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("EMAIL_FROM");
  if (!apiKey || !from) throw new Error("Email provider is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to: [item.destination], subject: item.title, text: item.body }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Resend ${response.status}: ${JSON.stringify(payload)}`);
  return String(payload.id ?? "");
}

async function sendWhatsApp(item: OutboxItem) {
  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  const templateName = Deno.env.get("WHATSAPP_TEMPLATE_NAME");
  const languageCode = Deno.env.get("WHATSAPP_TEMPLATE_LANGUAGE") ?? "en";
  const apiVersion = Deno.env.get("WHATSAPP_GRAPH_VERSION") ?? "v21.0";
  if (!token || !phoneNumberId || !templateName) throw new Error("WhatsApp provider/template is not configured.");

  const response = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: item.destination,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        components: [{ type: "body", parameters: [
          { type: "text", text: item.title },
          { type: "text", text: item.body },
        ] }],
      },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`WhatsApp ${response.status}: ${JSON.stringify(payload)}`);
  return String(payload.messages?.[0]?.id ?? "");
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey || (req.headers.get("authorization") ?? "") !== `Bearer ${serviceRoleKey}`) {
    return json({ error: "Service role required" }, 403);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!supabaseUrl) return json({ error: "Supabase URL unavailable" }, 500);

  const client = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = await req.json().catch(() => ({}));
  const requested = typeof body?.batch_size === "number" ? body.batch_size : 50;
  const batchSize = Math.max(1, Math.min(200, Math.trunc(requested)));

  const { data, error } = await client.rpc("claim_notification_outbox", { batch_size: batchSize });
  if (error) return json({ error: error.message }, 500);

  const items = (data ?? []) as OutboxItem[];
  let sent = 0, failed = 0;
  for (const item of items) {
    try {
      const providerMessageId = item.channel === "email" ? await sendEmail(item) : await sendWhatsApp(item);
      const { error: completeError } = await client.rpc("complete_notification_outbox", {
        target_id: item.id,target_success: true,target_provider_message_id: providerMessageId || null,target_error: null,
      });
      if (completeError) throw completeError;
      sent += 1;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Delivery failed";
      await client.rpc("complete_notification_outbox", {
        target_id: item.id,target_success: false,target_provider_message_id: null,target_error: message,
      });
      failed += 1;
    }
  }
  return json({ claimed: items.length, sent, failed });
});
