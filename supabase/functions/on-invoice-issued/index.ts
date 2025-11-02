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

    const { data: invoice, error } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        total_ttc_cents,
        currency,
        mission:missions!invoices_mission_id_fkey(
          id,
          title,
          client:user_clients!missions_client_id_fkey(id, email, full_name)
        )
      `)
      .eq("mission_id", mission_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !invoice) {
      return new Response(
        JSON.stringify({ error: "Invoice not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Invoice issued - would generate and send PDF");
    console.log("Invoice number:", invoice.invoice_number);
    console.log("Client email:", invoice.mission?.client?.email);
    console.log("Amount:", invoice.total_ttc_cents / 100, invoice.currency);

    return new Response(
      JSON.stringify({ ok: true, invoice_id: invoice.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("Error in on-invoice-issued:", e);
    return new Response(
      JSON.stringify({ error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
