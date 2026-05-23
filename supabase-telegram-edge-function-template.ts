// AITradeX Phase 6.8 Telegram Edge Function template
// Deploy separately as a Supabase Edge Function, then set TELEGRAM_EDGE_FUNCTION_URL in config.js or app settings.
// Store TELEGRAM_BOT_TOKEN as an Edge Function secret, never in frontend code for production.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

serve(async (req) => {
  if (req.method !== "POST") return new Response(JSON.stringify({ ok:false, error:"Method not allowed" }), { status:405 });
  try {
    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!token) throw new Error("TELEGRAM_BOT_TOKEN secret missing");
    const body = await req.json();
    const chatId = String(body.chat_id || "").trim();
    const text = String(body.text || "").slice(0, 3900);
    if (!chatId || !text) throw new Error("chat_id and text are required");
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: body.parse_mode || "HTML", disable_web_page_preview: true })
    });
    const json = await res.json().catch(() => ({}));
    return new Response(JSON.stringify(json), { status: res.ok ? 200 : 400, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ ok:false, error:String(err?.message || err) }), { status:400, headers: { "Content-Type": "application/json" } });
  }
});
