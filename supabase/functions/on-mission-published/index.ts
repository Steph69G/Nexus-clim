import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PublishedPayload {
  mission_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { mission_id }: PublishedPayload = await req.json();

    if (!mission_id) {
      return new Response(
        JSON.stringify({ error: "mission_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO Phase 2 :
    // 1. Récupérer mission depuis Supabase
    // 2. Filtrer techs éligibles (zone géo, skills, disponibilité)
    // 3. Envoyer email + push notification
    // 4. Logger notification_sent dans table notifications

    console.log(`[on-mission-published] Mission ${mission_id} published`);

    // Placeholder : succès
    return new Response(
      JSON.stringify({
        success: true,
        mission_id,
        message: "Notifications envoyées aux techniciens éligibles"
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[on-mission-published] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
