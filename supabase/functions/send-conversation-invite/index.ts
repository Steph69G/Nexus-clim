import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Max-Age": "86400",
  Vary: "Origin",
};

interface InviteRequest {
  conversation_id: string;
  invited_email: string;
  message?: string;
  send_method?: "manual" | "email";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const { conversation_id, invited_email, message, send_method = "manual" }: InviteRequest = await req.json();

    if (!conversation_id || !invited_email) {
      throw new Error("Missing required fields: conversation_id, invited_email");
    }

    if (!["manual", "email"].includes(send_method)) {
      throw new Error("Invalid send_method. Must be 'manual' or 'email'");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing Authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    console.log(`[send-conversation-invite] From ${user.id} → ${invited_email}`);

    const { data: conversation, error: convError } = await supabaseClient
      .from("conversations")
      .select("id, title, type")
      .eq("id", conversation_id)
      .single();

    if (convError || !conversation) {
      throw new Error("Conversation not found");
    }

    const { data: participant, error: participantError } = await supabaseClient
      .from("conversation_participants")
      .select("user_id")
      .eq("conversation_id", conversation_id)
      .eq("user_id", user.id)
      .single();

    if (participantError || !participant) {
      throw new Error("You are not a participant of this conversation");
    }

    const { data: inviterProfile } = await supabaseClient
      .from("profiles")
      .select("full_name, email")
      .eq("id", user.id)
      .single();

    const inviterName = inviterProfile?.full_name || inviterProfile?.email || "Un utilisateur";

    const now = new Date();
    const expires = new Date(now.getTime() + 7 * 24 * 3600 * 1000);

    const { data: invitation, error: upsertError } = await supabaseClient
      .from("conversation_invitations")
      .upsert(
        {
          conversation_id,
          invited_email: invited_email.toLowerCase().trim(),
          status: "pending",
          invited_by: user.id,
          message: message || null,
          send_method,
          token: crypto.randomUUID(),
          expires_at: expires.toISOString(),
          updated_at: now.toISOString(),
        },
        { onConflict: "conversation_id,invited_email", ignoreDuplicates: false }
      )
      .select("id, token, expires_at, resent_count")
      .single();

    if (upsertError) {
      console.error("[send-conversation-invite] Upsert error:", upsertError);
      throw upsertError;
    }

    await supabaseClient
      .from("conversation_invitations")
      .update({ resent_count: (invitation.resent_count ?? 0) + 1 })
      .eq("id", invitation.id);

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
      conversation.title ||
      (conversation.type === "direct"
        ? "Conversation privée"
        : "Groupe");

    const emailVariables = {
      inviter_name: inviterName,
      conversation_title: conversationTitle,
      invitation_link: invitationLink,
      expiration_date: expirationDate,
      message: message || "",
    };

    if (send_method === "manual") {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Invitation créée. Partagez le lien manuellement.",
          invitation_id: invitation.id,
          invitation_link: invitationLink,
          send_method: "manual",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.warn(
        "[send-conversation-invite] RESEND_API_KEY not configured, simulating email"
      );

      return new Response(
        JSON.stringify({
          success: true,
          message: "Invitation créée (email simulé - RESEND_API_KEY non configuré)",
          invitation_id: invitation.id,
          invitation_link: invitationLink,
          send_method: "email",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const { data: template } = await supabaseClient
      .from("email_templates")
      .select("*")
      .eq("template_name", "conversation_invitation")
      .eq("is_active", true)
      .maybeSingle();

    if (!template) {
      throw new Error("Email template not found");
    }

    let bodyHtml = template.body_html;
    let bodyText = template.body_text || "";
    let subject = template.subject;

    for (const [key, value] of Object.entries(emailVariables)) {
      const regex = new RegExp(`{{${key}}}`, "g");
      bodyHtml = bodyHtml.replace(regex, value || "");
      bodyText = bodyText.replace(regex, value || "");
      subject = subject.replace(regex, value || "");
    }

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
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

    if (!resendResponse.ok) {
      const errorText = await resendResponse.text();
      console.error("[send-conversation-invite] Resend error:", errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

    const resendData = await resendResponse.json();

    console.log(
      `[send-conversation-invite] Invitation sent successfully: ${resendData.id}`
    );

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation envoyée par email avec succès",
        invitation_id: invitation.id,
        email_id: resendData.id,
        send_method: "email",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[send-conversation-invite] Error:", error);

    return new Response(
      JSON.stringify({ error: String(error?.message ?? error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
