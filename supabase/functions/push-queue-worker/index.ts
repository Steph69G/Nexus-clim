import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.47.10";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ONESIGNAL_APP_ID = Deno.env.get("ONESIGNAL_APP_ID");
const ONESIGNAL_API_KEY = Deno.env.get("ONESIGNAL_API_KEY");
const APP_BASE_URL = Deno.env.get("APP_BASE_URL") || "https://app.example.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OneSignalResponse {
  id?: string;
  recipients?: number;
  errors?: any;
}

async function sendOneSignal(
  playerIds: string[],
  title: string,
  message: string,
  url?: string
): Promise<OneSignalResponse> {
  if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
    throw new Error("OneSignal credentials not configured");
  }

  const fullUrl = url?.startsWith("/")
    ? new URL(url, APP_BASE_URL).toString()
    : url;

  const payload = {
    app_id: ONESIGNAL_APP_ID,
    include_player_ids: playerIds,
    headings: { en: title },
    contents: { en: message },
    url: fullUrl,
    priority: 10,
    ttl: 86400,
  };

  const response = await fetch("https://onesignal.com/api/v1/notifications", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${ONESIGNAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OneSignal API error: ${response.status} ${errorText}`);
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
    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      console.warn("OneSignal not configured, skipping push notifications");
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, failed: 0, message: "OneSignal not configured" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: jobs, error } = await supabase
      .from("notifications")
      .select("id, user_id, title, message, action_url, channels, push_status")
      .contains("channels", ["push"])
      .or("push_status.is.null,push_status.eq.pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Failed to fetch push jobs:", error);
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
      const { data: devices, error: deviceError } = await supabase
        .from("user_devices")
        .select("token, platform")
        .eq("user_id", notif.user_id)
        .eq("provider", "onesignal")
        .gte("last_seen_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (deviceError || !devices || devices.length === 0) {
        await supabase
          .from("notifications")
          .update({
            push_status: "failed",
            push_error: deviceError?.message || "no_active_devices",
          })
          .eq("id", notif.id);

        await supabase.from("notification_events").insert({
          notification_id: notif.id,
          channel: "push",
          event: "failed",
          details: deviceError?.message || "no_active_devices",
        });

        failed++;
        continue;
      }

      try {
        const playerIds = devices.map((d: any) => d.token);
        const result = await sendOneSignal(
          playerIds,
          notif.title,
          notif.message,
          notif.action_url || undefined
        );

        await supabase
          .from("notifications")
          .update({
            push_status: "sent",
            push_sent_at: new Date().toISOString(),
            push_error: null,
          })
          .eq("id", notif.id);

        await supabase.from("notification_events").insert({
          notification_id: notif.id,
          channel: "push",
          event: "sent",
          details: `onesignal: ${playerIds.length} devices, recipients: ${result.recipients || 0}`,
        });

        sent++;
      } catch (pushError) {
        console.error(`Failed to send push for notification ${notif.id}:`, pushError);

        const errorMessage = pushError instanceof Error
          ? pushError.message
          : "send_failed";

        await supabase
          .from("notifications")
          .update({
            push_status: "failed",
            push_error: errorMessage.slice(0, 512),
          })
          .eq("id", notif.id);

        await supabase.from("notification_events").insert({
          notification_id: notif.id,
          channel: "push",
          event: "failed",
          details: errorMessage.slice(0, 512),
        });

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
    console.error("Unexpected error in push-queue-worker:", error);
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
