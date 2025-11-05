import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.47.10";

const USE_RESEND = true;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_EMAIL = Deno.env.get("MAIL_FROM") || "notifications@climpassion.fr";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

async function sendEmailResend(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend failed: ${res.status} ${text}`);
  }

  return await res.json();
}

async function sendEmailSendgrid(to: string, subject: string, html: string) {
  if (!SENDGRID_API_KEY) {
    throw new Error("SENDGRID_API_KEY not configured");
  }

  const res = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SENDGRID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: FROM_EMAIL },
      subject,
      content: [{ type: "text/html", value: html }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sendgrid failed: ${res.status} ${text}`);
  }

  return true;
}

function subjectForType(type: string): string {
  const subjects: Record<string, string> = {
    invoice_overdue: "⏰ Rappel : facture en retard",
    emergency_request_received: "🚨 Nouvelle urgence reçue",
    mission_assigned: "🛠️ Nouvelle mission assignée",
    mission_updated: "📝 Mission mise à jour",
    quote_accepted: "✅ Devis accepté",
    contract_expiring: "⚠️ Contrat arrivant à échéance",
  };

  return subjects[type] || "Notification Clim Passion";
}

function renderTemplateHTML(
  type: string,
  title: string,
  message: string,
  action_url?: string,
  action_label?: string
): string {
  const fullUrl = action_url && action_url.startsWith("/")
    ? `https://app.climpassion.fr${action_url}`
    : action_url;

  const btn = fullUrl
    ? `
    <p style="margin:24px 0">
      <a href="${fullUrl}" target="_blank"
         style="background:#0ea5e9;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:600;">
        ${action_label || "Ouvrir"}
      </a>
    </p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9fafb;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#0ea5e9;margin:0;font-size:24px;">Clim Passion</h1>
    </div>

    <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">${title}</h2>

    <div style="color:#374151;line-height:1.6;white-space:pre-line;margin-bottom:16px;">
      ${message}
    </div>

    ${btn}

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0"/>

    <p style="color:#6b7280;font-size:13px;margin:0;text-align:center;">
      Cet e-mail vous a été envoyé automatiquement par le système Clim Passion.<br>
      Pour toute question, contactez votre responsable.
    </p>
  </div>
</body>
</html>`;
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
      .select("id, user_id, notification_type, title, message, action_url, action_label, channels, email_status, created_at")
      .is("archived_at", null)
      .contains("channels", ["email"])
      .or("email_status.is.null,email_status.eq.pending")
      .order("created_at", { ascending: true })
      .limit(20);

    if (error) {
      console.error("Failed to fetch notifications:", error);
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
        .select("email, full_name")
        .eq("user_id", notif.user_id)
        .maybeSingle();

      if (profileError || !profile?.email) {
        await supabase
          .from("notifications")
          .update({
            email_status: "failed",
            email_error: profileError?.message || "no_recipient_email",
          })
          .eq("id", notif.id);

        failed++;
        continue;
      }

      const subject = subjectForType(notif.notification_type);
      const html = renderTemplateHTML(
        notif.notification_type,
        notif.title,
        notif.message,
        notif.action_url,
        notif.action_label
      );

      try {
        if (USE_RESEND) {
          await sendEmailResend(profile.email, subject, html);
        } else {
          await sendEmailSendgrid(profile.email, subject, html);
        }

        await supabase
          .from("notifications")
          .update({
            email_status: "sent",
            email_error: null,
            email_sent_at: new Date().toISOString(),
          })
          .eq("id", notif.id);

        sent++;
      } catch (emailError) {
        console.error(`Failed to send email for notification ${notif.id}:`, emailError);

        const errorMessage = emailError instanceof Error
          ? emailError.message.slice(0, 512)
          : "send_failed";

        await supabase
          .from("notifications")
          .update({
            email_status: "failed",
            email_error: errorMessage,
          })
          .eq("id", notif.id);

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
