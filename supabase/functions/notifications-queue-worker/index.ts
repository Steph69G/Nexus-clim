import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface NotificationQueueItem {
  id: string;
  mission_id: string | null;
  event_type: string;
  template_name: string;
  recipients: Array<{
    user_id?: string;
    email?: string;
    phone?: string;
    name?: string;
  }>;
  channels: string[];
  title: string;
  body: string;
  action_url: string | null;
  priority: string;
  retry_count: number;
  max_retries: number;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[notifications-queue-worker] Starting batch processing");

    // Récupérer notifications pending (batch de 50)
    const { data: notifications, error: fetchError } = await supabase
      .from("notifications_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      console.log("[notifications-queue-worker] No pending notifications");
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          message: "No pending notifications",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`[notifications-queue-worker] Processing ${notifications.length} notifications`);

    const results = {
      total: notifications.length,
      sent: 0,
      failed: 0,
      errors: [] as Array<{ id: string; error: string }>,
    };

    // Traiter chaque notification
    for (const notification of notifications as NotificationQueueItem[]) {
      try {
        // Marquer comme processing
        await supabase
          .from("notifications_queue")
          .update({ status: "processing" })
          .eq("id", notification.id);

        console.log(`[notifications-queue-worker] Processing notification ${notification.id} (${notification.event_type})`);

        // Traiter chaque canal
        const channelResults = await Promise.allSettled(
          notification.channels.map(async (channel) => {
            if (channel === "email") {
              return await sendEmailNotifications(notification, supabase);
            } else if (channel === "sms") {
              return await sendSMSNotifications(notification, supabase);
            } else if (channel === "push") {
              return await sendPushNotifications(notification, supabase);
            } else if (channel === "in_app") {
              return await createInAppNotifications(notification, supabase);
            }
            return { success: false, channel, reason: "Unknown channel" };
          })
        );

        // Vérifier résultats
        const allSuccess = channelResults.every(
          (result) => result.status === "fulfilled" && result.value.success
        );

        if (allSuccess) {
          // Marquer comme sent
          await supabase.rpc("mark_notification_sent", {
            p_notification_id: notification.id,
          });
          results.sent++;
          console.log(`[notifications-queue-worker] ✅ Notification ${notification.id} sent successfully`);
        } else {
          // Marquer comme failed (avec retry si possible)
          const errors = channelResults
            .filter((r) => r.status === "rejected" || !r.value?.success)
            .map((r) =>
              r.status === "rejected"
                ? r.reason
                : `${r.value.channel}: ${r.value.reason}`
            )
            .join("; ");

          await supabase.rpc("mark_notification_failed", {
            p_notification_id: notification.id,
            p_error: errors,
          });

          results.failed++;
          results.errors.push({ id: notification.id, error: errors });
          console.error(`[notifications-queue-worker] ❌ Notification ${notification.id} failed: ${errors}`);
        }
      } catch (error) {
        console.error(`[notifications-queue-worker] Error processing ${notification.id}:`, error);

        // Marquer comme failed
        await supabase.rpc("mark_notification_failed", {
          p_notification_id: notification.id,
          p_error: error.message,
        });

        results.failed++;
        results.errors.push({ id: notification.id, error: error.message });
      }
    }

    console.log(`[notifications-queue-worker] Batch complete: ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        ...results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[notifications-queue-worker] Fatal error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// =====================================================
// HELPERS: Envoi par canal
// =====================================================

async function sendEmailNotifications(
  notification: NotificationQueueItem,
  supabase: any
): Promise<{ success: boolean; channel: string; reason?: string }> {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");

    for (const recipient of notification.recipients) {
      if (!recipient.email) continue;

      // Appeler edge function send-notification-email
      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify({
          event_type: notification.event_type,
          recipient_email: recipient.email,
          recipient_user_id: recipient.user_id,
          related_entity_type: "mission",
          related_entity_id: notification.mission_id,
          variables: {
            title: notification.title,
            body: notification.body,
            action_url: notification.action_url || "",
            recipient_name: recipient.name || "Utilisateur",
          },
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Email send failed: ${error}`);
      }
    }

    return { success: true, channel: "email" };
  } catch (error) {
    console.error("[sendEmailNotifications] Error:", error);
    return { success: false, channel: "email", reason: error.message };
  }
}

async function sendSMSNotifications(
  notification: NotificationQueueItem,
  supabase: any
): Promise<{ success: boolean; channel: string; reason?: string }> {
  try {
    const smsApiKey = Deno.env.get("SMS_API_KEY");

    if (!smsApiKey) {
      console.warn("[sendSMSNotifications] SMS_API_KEY not configured, skipping");
      return { success: true, channel: "sms", reason: "SMS not configured" };
    }

    for (const recipient of notification.recipients) {
      if (!recipient.phone) continue;

      // TODO: Intégrer avec API SMS (OVH, Twilio, etc.)
      console.log(`[sendSMSNotifications] Would send SMS to ${recipient.phone}: ${notification.body}`);
    }

    return { success: true, channel: "sms" };
  } catch (error) {
    console.error("[sendSMSNotifications] Error:", error);
    return { success: false, channel: "sms", reason: error.message };
  }
}

async function sendPushNotifications(
  notification: NotificationQueueItem,
  supabase: any
): Promise<{ success: boolean; channel: string; reason?: string }> {
  try {
    const oneSignalKey = Deno.env.get("ONESIGNAL_API_KEY");

    if (!oneSignalKey) {
      console.warn("[sendPushNotifications] ONESIGNAL_API_KEY not configured, skipping");
      return { success: true, channel: "push", reason: "Push not configured" };
    }

    for (const recipient of notification.recipients) {
      if (!recipient.user_id) continue;

      // TODO: Intégrer avec OneSignal ou Firebase
      console.log(`[sendPushNotifications] Would send push to user ${recipient.user_id}: ${notification.title}`);
    }

    return { success: true, channel: "push" };
  } catch (error) {
    console.error("[sendPushNotifications] Error:", error);
    return { success: false, channel: "push", reason: error.message };
  }
}

async function createInAppNotifications(
  notification: NotificationQueueItem,
  supabase: any
): Promise<{ success: boolean; channel: string; reason?: string }> {
  try {
    // Créer notifications in-app dans la table
    for (const recipient of notification.recipients) {
      if (!recipient.user_id) continue;

      const { error } = await supabase.from("notifications").insert({
        user_id: recipient.user_id,
        type: notification.event_type,
        title: notification.title,
        message: notification.body,
        action_url: notification.action_url,
        priority: notification.priority,
        read: false,
        metadata: {
          mission_id: notification.mission_id,
          template_name: notification.template_name,
        },
      });

      if (error) {
        throw new Error(`Failed to create in-app notification: ${error.message}`);
      }
    }

    return { success: true, channel: "in_app" };
  } catch (error) {
    console.error("[createInAppNotifications] Error:", error);
    return { success: false, channel: "in_app", reason: error.message };
  }
}
