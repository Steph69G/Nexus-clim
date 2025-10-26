import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Survey {
  id: string;
  mission_id: string;
  client_name: string;
  client_email: string;
  survey_token: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[send-survey-email] Starting survey email job...");

    // Appeler la function SQL pour récupérer les enquêtes à envoyer
    const { data: surveys, error: surveysError } = await supabaseClient
      .rpc("get_surveys_to_send_24h");

    if (surveysError) {
      console.error("[send-survey-email] Error fetching surveys:", surveysError);
      throw surveysError;
    }

    if (!surveys || surveys.length === 0) {
      console.log("[send-survey-email] No surveys to send");
      return new Response(
        JSON.stringify({ message: "No surveys to send", count: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`[send-survey-email] Found ${surveys.length} survey(s) to send`);

    // Récupérer le template email
    const { data: template, error: templateError } = await supabaseClient
      .from("survey_email_templates")
      .select("subject, body_html, body_text")
      .eq("template_type", "initial")
      .eq("is_active", true)
      .single();

    if (templateError) {
      console.error("[send-survey-email] Error fetching template:", templateError);
      throw templateError;
    }

    const results = [];

    // Envoyer les emails
    for (const survey of surveys as Survey[]) {
      try {
        // Construction du lien enquête
        const surveyUrl = `${Deno.env.get("SUPABASE_URL")?.replace("/rest/v1", "")}/satisfaction-survey/${survey.survey_token}`;

        // Récupérer la date de la mission
        const { data: mission } = await supabaseClient
          .from("missions")
          .select("scheduled_start, completed_at")
          .eq("id", survey.mission_id)
          .single();

        const missionDate = mission?.completed_at || mission?.scheduled_start || new Date().toISOString();
        const formattedDate = new Date(missionDate).toLocaleDateString("fr-FR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        // Remplacer les variables dans le template
        let emailHtml = template.body_html
          .replace(/{{client_name}}/g, survey.client_name)
          .replace(/{{mission_date}}/g, formattedDate)
          .replace(/{{survey_link}}/g, surveyUrl);

        let emailText = template.body_text
          .replace(/{{client_name}}/g, survey.client_name)
          .replace(/{{mission_date}}/g, formattedDate)
          .replace(/{{survey_link}}/g, surveyUrl);

        // NOTE: Ici, vous devez intégrer votre service d'envoi d'email
        // (Resend, SendGrid, Mailgun, etc.)
        // Pour l'instant, on simule l'envoi

        console.log(`[send-survey-email] Sending to ${survey.client_email}`);
        console.log(`[send-survey-email] Survey URL: ${surveyUrl}`);

        // EXEMPLE avec Resend (à décommenter et configurer)
        /*
        const resendApiKey = Deno.env.get("RESEND_API_KEY");
        const resendResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Nexus Clim <noreply@nexusclim.fr>",
            to: [survey.client_email],
            subject: template.subject,
            html: emailHtml,
            text: emailText,
          }),
        });

        if (!resendResponse.ok) {
          throw new Error(`Resend API error: ${await resendResponse.text()}`);
        }
        */

        // Marquer l'enquête comme envoyée
        const { error: markError } = await supabaseClient
          .rpc("mark_survey_as_sent", { p_survey_id: survey.id });

        if (markError) {
          console.error(`[send-survey-email] Error marking survey ${survey.id} as sent:`, markError);
        }

        results.push({
          survey_id: survey.id,
          client_email: survey.client_email,
          status: "sent",
        });

        console.log(`[send-survey-email] Survey ${survey.id} sent successfully`);
      } catch (error) {
        console.error(`[send-survey-email] Error sending survey ${survey.id}:`, error);
        results.push({
          survey_id: survey.id,
          client_email: survey.client_email,
          status: "failed",
          error: error.message,
        });

        // Logger l'erreur dans survey_email_logs
        await supabaseClient
          .from("survey_email_logs")
          .insert({
            survey_id: survey.id,
            email_type: "initial",
            recipient_email: survey.client_email,
            status: "failed",
            error_message: error.message,
          });
      }
    }

    console.log(`[send-survey-email] Job completed. Sent: ${results.filter((r) => r.status === "sent").length}, Failed: ${results.filter((r) => r.status === "failed").length}`);

    return new Response(
      JSON.stringify({
        message: "Survey emails processed",
        count: surveys.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[send-survey-email] Fatal error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
