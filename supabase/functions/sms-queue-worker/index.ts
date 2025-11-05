import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.47.10";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const OVH_APP_KEY = Deno.env.get("OVH_APP_KEY")!;
const OVH_APP_SECRET = Deno.env.get("OVH_APP_SECRET")!;
const OVH_CONSUMER_KEY = Deno.env.get("OVH_CONSUMER_KEY")!;
const OVH_SMS_SERVICE = Deno.env.get("OVH_SMS_SERVICE")!;
const SMS_SENDER = Deno.env.get("SMS_SENDER") || "ClimPassion";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function ovhSignature(
  method: string,
  url: string,
  body: string,
  timestamp: number
): Promise<string> {
  const toSign = [
    OVH_APP_SECRET,
    OVH_CONSUMER_KEY,
    method,
    url,
    body,
    timestamp.toString(),
  ].join("+");

  const encoder = new TextEncoder();
  const data = encoder.encode(toSign);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return "$1$" + hashHex;
}

async function sendSMS_OVH(to: string, message: string): Promise<any> {
  if (!OVH_APP_KEY || !OVH_APP_SECRET || !OVH_CONSUMER_KEY || !OVH_SMS_SERVICE) {
    throw new Error("OVH credentials not configured");
  }

  const cleanPhone = to.replace(/[^0-9+]/g, "");
  if (!cleanPhone.startsWith("+") && !cleanPhone.startsWith("00")) {
    throw new Error("Phone number must start with + or 00");
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const body = JSON.stringify({
    message: message.substring(0, 160),
    receivers: [cleanPhone],
    sender: SMS_SENDER,
    noStopClause: false,
    priority: "high",
  });

  const url = `https://eu.api.ovh.com/1.0/sms/${OVH_SMS_SERVICE}/jobs/`;
  const signature = await ovhSignature("POST", url, body, timestamp);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "X-Ovh-Application": OVH_APP_KEY,
      "X-Ovh-Consumer": OVH_CONSUMER_KEY,
      "X-Ovh-Signature": signature,
      "X-Ovh-Timestamp": timestamp.toString(),
      "Content-Type": "application/json",
    },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OVH SMS API error: ${response.status} ${text}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: jobs, error } = await supabase
      .from("notifications")
      .select("id, user_id, notification_type, title, message, channels, sms_status, retry_count, max_retries")
      .contains("channels", ["sms"])
      .or("sms_status.is.null,sms_status.eq.pending")
      .lte("next_retry_at", new Date().toISOString())
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Failed to fetch SMS jobs:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!jobs || jobs.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, failed: 0 }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const notif of jobs) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("user_id", notif.user_id)
        .maybeSingle();

      if (profileError || !profile?.phone) {
        await supabase
          .from("notifications")
          .update({
            sms_status: "failed",
            sms_error: profileError?.message || "no_phone_number",
          })
          .eq("id", notif.id);

        failed++;
        continue;
      }

      const smsText = `${notif.title}: ${notif.message}`.substring(0, 155);

      try {
        await sendSMS_OVH(profile.phone, smsText);

        await supabase
          .from("notifications")
          .update({
            sms_status: "sent",
            sms_sent_at: new Date().toISOString(),
            sms_error: null,
          })
          .eq("id", notif.id);

        sent++;
      } catch (smsError) {
        console.error(`Failed to send SMS for notification ${notif.id}:`, smsError);

        const currentRetry = notif.retry_count ?? 0;
        const maxRetries = notif.max_retries ?? 3;

        if (currentRetry < maxRetries) {
          await supabase.rpc("schedule_next_retry", { p_id: notif.id });

          await supabase
            .from("notifications")
            .update({
              sms_status: "pending",
              sms_error: smsError instanceof Error
                ? smsError.message.slice(0, 256)
                : "send_failed",
            })
            .eq("id", notif.id);
        } else {
          await supabase
            .from("notifications")
            .update({
              sms_status: "failed",
              sms_error: smsError instanceof Error
                ? smsError.message.slice(0, 256)
                : "max_retries_reached",
            })
            .eq("id", notif.id);
        }

        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        processed: jobs.length,
        sent,
        failed,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        error: "internal_server_error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
