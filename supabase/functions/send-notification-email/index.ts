import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface EmailRequest {
  event_type: string;
  recipient_email: string;
  recipient_user_id?: string;
  related_entity_type?: string;
  related_entity_id?: string;
  variables: Record<string, string>;
}

function replaceVariables(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    result = result.replace(regex, value || '');
  }
  return result;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const emailRequest: EmailRequest = await req.json();

    const {
      event_type,
      recipient_email,
      recipient_user_id,
      related_entity_type,
      related_entity_id,
      variables,
    } = emailRequest;

    if (!event_type || !recipient_email || !variables) {
      throw new Error("Missing required fields: event_type, recipient_email, variables");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`[send-notification-email] Processing ${event_type} for ${recipient_email}`);

    // Vérifier idempotence
    if (related_entity_id) {
      const { data: alreadySent } = await supabaseClient
        .rpc("email_already_sent", {
          p_event_type: event_type,
          p_related_entity_id: related_entity_id,
        });

      if (alreadySent) {
        console.log(`[send-notification-email] Email already sent for ${event_type} - ${related_entity_id}`);
        return new Response(
          JSON.stringify({
            success: true,
            message: "Email already sent (idempotence)",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }
    }

    // Mapper event_type vers template_name
    const templateMap: Record<string, string> = {
      mission_confirmed: "mission_confirmed",
      mission_reminder: "mission_reminder",
      report_ready: "report_ready",
      invoice_sent: "invoice_sent",
      payment_reminder: "payment_reminder",
      new_offer_available: "new_offer_available",
    };

    const templateName = templateMap[event_type];
    if (!templateName) {
      throw new Error(`Unknown event_type: ${event_type}`);
    }

    // Récupérer le template
    const { data: template, error: templateError } = await supabaseClient
      .from("email_templates")
      .select("*")
      .eq("template_name", templateName)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    // Remplacer variables
    const subject = replaceVariables(template.subject, variables);
    const bodyHtml = replaceVariables(template.body_html, variables);
    const bodyText = replaceVariables(template.body_text || "", variables);

    console.log(`[send-notification-email] Sending email: ${subject}`);

    // Envoi via Resend API
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.warn("[send-notification-email] RESEND_API_KEY not configured, simulating send");

      // Log l'email au lieu de l'envoyer
      await supabaseClient.rpc("log_email_sent", {
        p_event_type: event_type,
        p_recipient_email: recipient_email,
        p_recipient_user_id: recipient_user_id || null,
        p_related_entity_type: related_entity_type || null,
        p_related_entity_id: related_entity_id || null,
        p_template_used: templateName,
        p_status: "simulated",
        p_metadata: { subject, variables },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Email simulated (RESEND_API_KEY not configured)",
          subject,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Envoi réel via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nexus Clim <noreply@nexus-clim.app>",
        to: [recipient_email],
        subject: subject,
        html: bodyHtml,
        text: bodyText,
      }),
    });

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      throw new Error(`Resend API error: ${errorText}`);
    }

    const resendData = await resendResponse.json();

    // Logger l'envoi
    await supabaseClient.rpc("log_email_sent", {
      p_event_type: event_type,
      p_recipient_email: recipient_email,
      p_recipient_user_id: recipient_user_id || null,
      p_related_entity_type: related_entity_type || null,
      p_related_entity_id: related_entity_id || null,
      p_template_used: templateName,
      p_status: "sent",
      p_metadata: { resend_id: resendData.id, subject },
    });

    console.log(`[send-notification-email] Email sent successfully: ${resendData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email sent successfully",
        resend_id: resendData.id,
        subject,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[send-notification-email] Error:", error);

    // Logger l'erreur
    try {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const emailRequest: EmailRequest = await req.json();

      await supabaseClient.rpc("log_email_sent", {
        p_event_type: emailRequest.event_type || "unknown",
        p_recipient_email: emailRequest.recipient_email || "unknown",
        p_recipient_user_id: emailRequest.recipient_user_id || null,
        p_related_entity_type: emailRequest.related_entity_type || null,
        p_related_entity_id: emailRequest.related_entity_id || null,
        p_template_used: emailRequest.event_type || "unknown",
        p_status: "failed",
        p_error_message: error.message,
      });
    } catch (logError) {
      console.error("[send-notification-email] Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
