import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { mission_id } = await req.json();
    if (!mission_id) {
      return new Response(
        JSON.stringify({ error: "mission_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: mission, error } = await supabase
      .from("missions")
      .select(`
        id,
        title,
        scheduled_start,
        client:user_clients!missions_client_id_fkey(id, email, full_name),
        tech:profiles!missions_assigned_user_id_fkey(id, email, full_name)
      `)
      .eq("id", mission_id)
      .single();

    if (error || !mission) {
      return new Response(
        JSON.stringify({ error: "Mission not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Mission accepted - would send email to client:", mission.client?.email);
    console.log("Assigned tech:", mission.tech?.full_name);

    return new Response(
      JSON.stringify({ ok: true, mission_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error in on-mission-accepted:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
