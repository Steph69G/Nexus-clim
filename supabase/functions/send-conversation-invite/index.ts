import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  conversation_id: string;
  invited_email: string;
  message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { conversation_id, invited_email, message }: InviteRequest = await req.json();

    if (!conversation_id || !invited_email) {
      throw new Error("Missing required fields: conversation_id, invited_email");
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

    console.log(`[send-conversation-invite] Processing invitation from ${user.id} to ${invited_email}`);

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

    const { data: invitation, error: insertError } = await supabaseClient
      .from("conversation_invitations")
      .insert({
        conversation_id,
        invited_email: invited_email.toLowerCase().trim(),
        invited_by: user.id,
        message: message || null,
      })
      .select("id, token, expires_at")
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        throw new Error("Une invitation est déjà en attente pour cet email");
      }
      throw insertError;
    }

    const appUrl = Deno.env.get("APP_URL") || "https://nexus-clim.app";
    const invitationLink = `${appUrl}/register?invitation=${invitation.token}`;

    const expirationDate = new Date(invitation.expires_at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const conversationTitle = conversation.title ||
      (conversation.type === "direct" ? "Conversation privée" : "Groupe");

    const emailVariables = {
      inviter_name: inviterName,
      conversation_title: conversationTitle,
      invitation_link: invitationLink,
      expiration_date: expirationDate,
      message: message || "",
    };

    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.warn("[send-conversation-invite] RESEND_API_KEY not configured, simulating email");

      return new Response(
        JSON.stringify({
          success: true,
          message: "Invitation created (email simulated)",
          invitation_id: invitation.id,
          invitation_link: invitationLink,
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
      .single();

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
        subject: subject,
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

    console.log(`[send-conversation-invite] Invitation sent successfully: ${resendData.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Invitation envoyée avec succès",
        invitation_id: invitation.id,
        email_id: resendData.id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[send-conversation-invite] Error:", error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
