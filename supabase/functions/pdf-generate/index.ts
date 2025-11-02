import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PdfGeneratePayload {
  type: "rapport" | "facture";
  mission_id: string;
  data: Record<string, any>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { type, mission_id, data }: PdfGeneratePayload = await req.json();

    if (!type || !mission_id) {
      return new Response(
        JSON.stringify({ error: "type and mission_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // TODO Phase 2 :
    // 1. Charger template HTML depuis storage /pdf/templates/{type}.html
    // 2. Injecter data dans template (mustache/handlebars)
    // 3. Générer PDF avec puppeteer ou équivalent Deno
    // 4. Uploader vers storage bucket approprié
    // 5. Retourner URL signée du PDF

    console.log(`[pdf-generate] Generating ${type} PDF for mission ${mission_id}`);

    // Placeholder : retourne URL fictive
    const pdfUrl = `https://storage.supabase.co/nexus-clim/pdfs/${type}/${mission_id}.pdf`;

    return new Response(
      JSON.stringify({
        success: true,
        pdf_url: pdfUrl,
        type,
        mission_id
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[pdf-generate] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
