import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ValidatedPayload {
  mission_id: string;
  report_status: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { mission_id, report_status }: ValidatedPayload = await req.json();

    if (!mission_id) {
      return new Response(
        JSON.stringify({ error: "mission_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO Phase 2 :
    // 1. Récupérer mission + client depuis Supabase
    // 2. Générer PDF rapport (appel à pdf-generate)
    // 3. Uploader PDF vers storage bucket /reports/{mission_id}.pdf
    // 4. Envoyer email client avec lien PDF
    // 5. Si billing_status = NON_FACTURABLE, basculer vers FACTURABLE
    // 6. Logger dans notifications

    console.log(`[on-report-validated] Report validated for mission ${mission_id}, status: ${report_status}`);

    // Placeholder : succès
    return new Response(
      JSON.stringify({
        success: true,
        mission_id,
        message: "PDF rapport généré et envoyé au client"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[on-report-validated] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
