import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.47.10";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreateNotificationPayload {
  user_id: string;
  notification_type: string;
  title: string;
  message: string;
  channels: Array<"in_app" | "email" | "sms" | "push">;
  priority?: "low" | "normal" | "high" | "urgent";
  related_mission_id?: string;
  related_quote_id?: string;
  related_invoice_id?: string;
  related_contract_id?: string;
  action_url?: string;
  action_label?: string;
  data?: Record<string, unknown>;
  dedup_key?: string;
}

function buildDedupKey(payload: CreateNotificationPayload): string | null {
  if (payload.dedup_key) return payload.dedup_key;

  const relatedId =
    payload.related_mission_id ??
    payload.related_quote_id ??
    payload.related_invoice_id ??
    payload.related_contract_id ??
    null;

  if (!relatedId) return null;

  const hashInput = `${payload.title}:${payload.message}`;
  let hash = 0;
  for (let i = 0; i < hashInput.length; i++) {
    const char = hashInput.charCodeAt(i);
    hash = (hash * 31 + char) | 0;
  }

  return `${payload.notification_type}:${relatedId}:${hash}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const payload: CreateNotificationPayload = await req.json();

    if (!payload.user_id || !payload.notification_type || !payload.title || !payload.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!Array.isArray(payload.channels) || payload.channels.length === 0) {
      return new Response(
        JSON.stringify({ error: "At least one channel required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: prefs, error: prefsErr } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", payload.user_id)
      .maybeSingle();

    if (prefsErr) {
      console.error("Failed to fetch preferences:", prefsErr);
    }

    const effectivePrefs = prefs ?? {
      in_app_enabled: true,
      email_enabled: false,
      sms_enabled: false,
      push_enabled: false,
      muted_notification_types: [],
    };

    if (effectivePrefs.muted_notification_types?.includes(payload.notification_type)) {
      return new Response(
        JSON.stringify({
          id: null,
          skipped: true,
          reason: "notification_type_muted",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const filteredChannels = payload.channels.filter((channel) => {
      switch (channel) {
        case "in_app":
          return effectivePrefs.in_app_enabled;
        case "email":
          return effectivePrefs.email_enabled;
        case "sms":
          return effectivePrefs.sms_enabled;
        case "push":
          return effectivePrefs.push_enabled;
        default:
          return false;
      }
    });

    if (filteredChannels.length === 0) {
      return new Response(
        JSON.stringify({
          id: null,
          skipped: true,
          reason: "all_channels_disabled",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const dedupKey = buildDedupKey(payload);

    const { data, error } = await supabase.rpc("create_notification_secure", {
      p_user_id: payload.user_id,
      p_type: payload.notification_type,
      p_title: payload.title,
      p_message: payload.message,
      p_channels: filteredChannels,
      p_priority: payload.priority || "normal",
      p_related_mission_id: payload.related_mission_id || null,
      p_related_quote_id: payload.related_quote_id || null,
      p_related_invoice_id: payload.related_invoice_id || null,
      p_related_contract_id: payload.related_contract_id || null,
      p_action_url: payload.action_url || null,
      p_action_label: payload.action_label || null,
      p_data: payload.data || {},
      p_dedup_key: dedupKey,
    });

    if (error) {
      const isDuplicate =
        error.message?.toLowerCase().includes("duplicate key") ||
        error.message?.toLowerCase().includes("unique constraint");

      if (isDuplicate) {
        return new Response(
          JSON.stringify({
            id: null,
            skipped: true,
            reason: "duplicate",
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.error("create_notification_secure error:", error);
      return new Response(
        JSON.stringify({
          error: "create_notification_failed",
          details: error.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ id: data }),
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
