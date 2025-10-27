import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  conversation_id: string;
  invited_email: string;
  message?: string;
  send_method?: "manual" | "email";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    let body: InviteRequest;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { conversation_id, invited_email, message, send_method = "manual" } = body;
    if (!conversation_id || !invited_email) {
      return json({ error: "Missing fields: conversation_id, invited_email" }, 400);
    }
    if (send_method !== "manual" && send_method !== "email") {
      return json({ error: "Invalid send_method. Must be 'manual' or 'email'" }, 400);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SERVICE_ROLE) {
      return json({ error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Missing Authorization header" }, 401);
    }
    const token = authHeader.replace("Bearer ", "");

    const { data: authData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !authData?.user) {
      return json({ error: "Unauthorized" }, 401);
    }
    const currentUser = authData.user;

    const { data: conversation, error: convErr } = await admin
      .from("conversations")
      .select("id, title, type")
      .eq("id", conversation_id)
      .single();
    if (convErr || !conversation) {
      return json({ error: "Conversation not found" }, 404);
    }

    const { data: participant, error: partErr } = await admin
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversation_id)
      .eq("user_id", currentUser.id)
      .maybeSingle();
    if (partErr || !participant) {
      return json({ error: "You are not a participant of this conversation" }, 403);
    }

    const { data: inviterProfile } = await admin
      .from("profiles")
      .select("full_name, email")
      .eq("id", currentUser.id)
      .maybeSingle();
    const inviterName = inviterProfile?.full_name || inviterProfile?.email || "Un utilisateur";

    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    const { data: existing } = await admin
      .from("conversation_invitations")
      .select("id, token, expires_at, resent_count")
      .eq("conversation_id", conversation_id)
      .eq("invited_email", invited_email.toLowerCase().trim())
      .eq("status", "pending")
      .maybeSingle();

    let invitation;
    if (existing) {
      const { data: updated, error: updateErr } = await admin
        .from("conversation_invitations")
        .update({
          token: crypto.randomUUID(),
          expires_at: expires.toISOString(),
          message: message || null,
          send_method,
          resent_count: (existing.resent_count || 0) + 1,
        })
        .eq("id", existing.id)
        .select("id, token, expires_at, resent_count")
        .single();

      if (updateErr) {
        return json({ error: updateErr.message }, 500);
      }
      invitation = updated;
    } else {
      const { data: created, error: insertErr } = await admin
        .from("conversation_invitations")
        .insert({
          conversation_id,
          invited_email: invited_email.toLowerCase().trim(),
          status: "pending",
          invited_by: currentUser.id,
          message: message || null,
          send_method,
          token: crypto.randomUUID(),
          expires_at: expires.toISOString(),
          resent_count: 0,
        })
        .select("id, token, expires_at, resent_count")
        .single();

      if (insertErr) {
        return json({ error: insertErr.message }, 500);
      }
      invitation = created;
    }

    if (!invitation) {
      return json({ error: "Failed to create invitation" }, 500);
    }

    const appUrl = Deno.env.get("APP_URL") || "https://nexus-clim.app";
    const invitationLink = `${appUrl}/register?invitation=${invitation.token}`;
    const expirationDate = new Date(invitation.expires_at).toLocaleString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const conversationTitle =
      conversation.title || (conversation.type === "direct" ? "Conversation privée" : "Groupe");

    if (send_method === "manual") {
      return json({
        success: true,
        message: "Invitation créée. Partagez le lien manuellement.",
        invitation_id: invitation.id,
        invitation_link: invitationLink,
        send_method: "manual",
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      return json({
        success: true,
        message: "Invitation créée (email non envoyé — RESEND_API_KEY manquant)",
        invitation_id: invitation.id,
        invitation_link: invitationLink,
        send_method: "email",
      });
    }

    const { data: template } = await admin
      .from("email_templates")
      .select("*")
      .eq("template_name", "conversation_invitation")
      .eq("is_active", true)
      .maybeSingle();

    if (!template) {
      return json({ error: "Email template not found" }, 500);
    }

    const emailVariables: Record<string, string> = {
      inviter_name: inviterName,
      conversation_title: conversationTitle,
      invitation_link: invitationLink,
      expiration_date: expirationDate,
      message: message || "",
    };

    let bodyHtml = template.body_html as string;
    let bodyText = (template.body_text as string) || "";
    let subject = template.subject as string;

    for (const [key, value] of Object.entries(emailVariables)) {
      const re = new RegExp(`{{${key}}}`, "g");
      bodyHtml = bodyHtml.replace(re, value ?? "");
      bodyText = bodyText.replace(re, value ?? "");
      subject = subject.replace(re, value ?? "");
    }

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Nexus Clim <noreply@nexus-clim.app>",
        to: [invited_email],
        subject,
        html: bodyHtml,
        text: bodyText,
      }),
    });

    if (!resendResp.ok) {
      const errorText = await resendResp.text();
      return json({ error: `Failed to send email: ${errorText}` }, 500);
    }
    const resendData = await resendResp.json();

    return json({
      success: true,
      message: "Invitation envoyée par email avec succès",
      invitation_id: invitation.id,
      email_id: resendData.id,
      send_method: "email",
    });
  } catch (error: any) {
    return json({ error: String(error?.message ?? error) }, 500);
  }
});

function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
