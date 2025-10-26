import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QuoteData {
  id: string;
  quote_number: string;
  issue_date: string;
  validity_date: string;
  status: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
  notes?: string;
  client: {
    raison_sociale: string;
    siret?: string;
    address_line1: string;
    address_line2?: string;
    postal_code: string;
    city: string;
  };
  items: Array<{
    description: string;
    quantity: number;
    unit_price_cents: number;
    tva_rate: number;
    total_cents: number;
  }>;
}

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2) + " €";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

async function generateQuotePDF(quote: QuoteData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  // En-tête
  page.drawText("CLIM PASSION", {
    x: 50,
    y: y,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.6),
  });

  page.drawText("DEVIS", {
    x: width - 120,
    y: y,
    size: 24,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.6),
  });

  y -= 30;

  // Informations entreprise
  const companyInfo = [
    "Clim Passion",
    "123 Avenue de la Climatisation",
    "75001 Paris",
    "SIRET: 123 456 789 00012",
    "TVA: FR12345678901",
    "Tél: 01 23 45 67 89",
  ];

  page.drawText(companyInfo.join("\n"), {
    x: 50,
    y: y,
    size: 9,
    font: font,
    lineHeight: 12,
  });

  // Numéro et dates
  page.drawText(`N° ${quote.quote_number}`, {
    x: width - 200,
    y: y,
    size: 11,
    font: fontBold,
  });

  y -= 15;
  page.drawText(`Date d'émission: ${formatDate(quote.issue_date)}`, {
    x: width - 200,
    y: y,
    size: 9,
    font: font,
  });

  y -= 12;
  page.drawText(`Valable jusqu'au: ${formatDate(quote.validity_date)}`, {
    x: width - 200,
    y: y,
    size: 9,
    font: font,
    color: rgb(0.8, 0.2, 0.2),
  });

  y -= 40;

  // Client
  page.drawText("CLIENT:", {
    x: 50,
    y: y,
    size: 10,
    font: fontBold,
  });

  y -= 20;

  const clientInfo = [
    quote.client.raison_sociale,
    quote.client.siret ? `SIRET: ${quote.client.siret}` : "",
    quote.client.address_line1,
    quote.client.address_line2 || "",
    `${quote.client.postal_code} ${quote.client.city}`,
  ].filter(Boolean);

  page.drawText(clientInfo.join("\n"), {
    x: 50,
    y: y,
    size: 10,
    font: font,
    lineHeight: 14,
  });

  y -= 80;

  // Tableau
  const tableHeaders = ["Désignation", "Qté", "Prix unit. HT", "TVA", "Total HT"];
  const colWidths = [250, 50, 80, 50, 80];
  let xPos = 50;

  tableHeaders.forEach((header, i) => {
    page.drawText(header, {
      x: xPos,
      y: y,
      size: 9,
      font: fontBold,
    });
    xPos += colWidths[i];
  });

  y -= 5;
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= 15;

  // Articles
  quote.items.forEach((item) => {
    if (y < 200) {
      const newPage = pdfDoc.addPage([595, 842]);
      y = newPage.getSize().height - 50;
    }

    xPos = 50;

    const desc = item.description.length > 40
      ? item.description.substring(0, 40) + "..."
      : item.description;

    page.drawText(desc, {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });
    xPos += colWidths[0];

    page.drawText(item.quantity.toString(), {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });
    xPos += colWidths[1];

    page.drawText(formatPrice(item.unit_price_cents), {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });
    xPos += colWidths[2];

    page.drawText(`${item.tva_rate}%`, {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });
    xPos += colWidths[3];

    page.drawText(formatPrice(item.total_cents), {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });

    y -= 20;
  });

  y -= 10;
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= 20;

  // Totaux
  const totalsX = width - 200;

  page.drawText("Total HT:", {
    x: totalsX,
    y: y,
    size: 10,
    font: fontBold,
  });
  page.drawText(formatPrice(quote.total_ht_cents), {
    x: totalsX + 100,
    y: y,
    size: 10,
    font: font,
  });

  y -= 15;

  page.drawText("TVA (20%):", {
    x: totalsX,
    y: y,
    size: 10,
    font: fontBold,
  });
  page.drawText(formatPrice(quote.total_tva_cents), {
    x: totalsX + 100,
    y: y,
    size: 10,
    font: font,
  });

  y -= 20;

  page.drawText("TOTAL TTC:", {
    x: totalsX,
    y: y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.6),
  });
  page.drawText(formatPrice(quote.total_ttc_cents), {
    x: totalsX + 100,
    y: y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.6),
  });

  // Notes si présentes
  if (quote.notes && y > 200) {
    y -= 30;
    page.drawText("Notes:", {
      x: 50,
      y: y,
      size: 10,
      font: fontBold,
    });
    y -= 15;
    page.drawText(quote.notes, {
      x: 50,
      y: y,
      size: 9,
      font: font,
      maxWidth: width - 100,
    });
  }

  // Pied de page
  const footer = [
    "Devis valable 30 jours. Pour acceptation, veuillez nous retourner ce devis signé avec la mention 'Bon pour accord'.",
    "Conditions générales disponibles sur demande.",
    "Clim Passion - RC Paris 123 456 789 - Capital social: 10 000 €",
  ];

  page.drawText(footer.join("\n"), {
    x: 50,
    y: 80,
    size: 7,
    font: font,
    lineHeight: 10,
    color: rgb(0.4, 0.4, 0.4),
  });

  return await pdfDoc.save();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { quote_id } = await req.json();

    if (!quote_id) {
      throw new Error("quote_id is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`[generate-quote-pdf] Generating PDF for quote ${quote_id}`);

    // Récupérer le devis
    const { data: quote, error: quoteError } = await supabaseClient
      .from("quotes")
      .select(`
        *,
        client:client_accounts(
          raison_sociale,
          siret,
          address_line1,
          address_line2,
          postal_code,
          city
        )
      `)
      .eq("id", quote_id)
      .single();

    if (quoteError) throw quoteError;
    if (!quote) throw new Error("Quote not found");

    // Récupérer les lignes
    const { data: items, error: itemsError } = await supabaseClient
      .from("quote_items")
      .select("*")
      .eq("quote_id", quote_id)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    const quoteData: QuoteData = {
      ...quote,
      client: quote.client,
      items: items || [],
    };

    // Générer PDF
    const pdfBytes = await generateQuotePDF(quoteData);

    // Upload
    const fileName = `devis-${quote.quote_number}.pdf`;
    const filePath = `quotes/${quote.client_id}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("documents")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Document portal
    const { error: docError } = await supabaseClient
      .from("client_portal_documents")
      .insert({
        client_id: quote.client_id,
        document_type: "devis",
        file_name: fileName,
        file_url: filePath,
        related_entity_type: "quote",
        related_entity_id: quote.id,
      });

    if (docError && docError.code !== "23505") {
      console.error("[generate-quote-pdf] Error creating document entry:", docError);
    }

    const { data: urlData } = supabaseClient.storage
      .from("documents")
      .getPublicUrl(filePath);

    console.log(`[generate-quote-pdf] PDF generated successfully: ${filePath}`);

    return new Response(
      JSON.stringify({
        success: true,
        file_path: filePath,
        file_name: fileName,
        public_url: urlData.publicUrl,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[generate-quote-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
