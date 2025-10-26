import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvoiceData {
  id: string;
  invoice_number: string;
  issue_date: string;
  due_date: string;
  status: string;
  total_ht_cents: number;
  total_tva_cents: number;
  total_ttc_cents: number;
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

async function generateInvoicePDF(invoice: InvoiceData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let y = height - 50;

  // En-tête - Logo et titre
  page.drawText("CLIM PASSION", {
    x: 50,
    y: y,
    size: 20,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.6),
  });

  page.drawText("FACTURE", {
    x: width - 150,
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
  ];

  page.drawText(companyInfo.join("\n"), {
    x: 50,
    y: y,
    size: 9,
    font: font,
    lineHeight: 12,
  });

  // Numéro et dates de facture
  page.drawText(`N° ${invoice.invoice_number}`, {
    x: width - 200,
    y: y,
    size: 11,
    font: fontBold,
  });

  y -= 15;
  page.drawText(`Date d'émission: ${formatDate(invoice.issue_date)}`, {
    x: width - 200,
    y: y,
    size: 9,
    font: font,
  });

  y -= 12;
  page.drawText(`Date d'échéance: ${formatDate(invoice.due_date)}`, {
    x: width - 200,
    y: y,
    size: 9,
    font: font,
  });

  y -= 40;

  // Informations client
  page.drawText("FACTURÉ À:", {
    x: 50,
    y: y,
    size: 10,
    font: fontBold,
  });

  y -= 20;

  const clientInfo = [
    invoice.client.raison_sociale,
    invoice.client.siret ? `SIRET: ${invoice.client.siret}` : "",
    invoice.client.address_line1,
    invoice.client.address_line2 || "",
    `${invoice.client.postal_code} ${invoice.client.city}`,
  ].filter(Boolean);

  page.drawText(clientInfo.join("\n"), {
    x: 50,
    y: y,
    size: 10,
    font: font,
    lineHeight: 14,
  });

  y -= 80;

  // Tableau des articles
  const tableTop = y;
  const tableHeaders = ["Désignation", "Qté", "Prix unit. HT", "TVA", "Total HT"];
  const colWidths = [250, 50, 80, 50, 80];
  let xPos = 50;

  // En-têtes de tableau
  tableHeaders.forEach((header, i) => {
    page.drawText(header, {
      x: xPos,
      y: y,
      size: 9,
      font: fontBold,
    });
    xPos += colWidths[i];
  });

  // Ligne sous les en-têtes
  y -= 5;
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  y -= 15;

  // Lignes d'articles
  invoice.items.forEach((item) => {
    if (y < 150) { // Nouvelle page si nécessaire
      const newPage = pdfDoc.addPage([595, 842]);
      y = newPage.getSize().height - 50;
    }

    xPos = 50;

    // Description (avec wrap si trop long)
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

    // Quantité
    page.drawText(item.quantity.toString(), {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });
    xPos += colWidths[1];

    // Prix unitaire
    page.drawText(formatPrice(item.unit_price_cents), {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });
    xPos += colWidths[2];

    // TVA
    page.drawText(`${item.tva_rate}%`, {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });
    xPos += colWidths[3];

    // Total HT
    page.drawText(formatPrice(item.total_cents), {
      x: xPos,
      y: y,
      size: 9,
      font: font,
    });

    y -= 20;
  });

  y -= 10;

  // Ligne avant totaux
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
  page.drawText(formatPrice(invoice.total_ht_cents), {
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
  page.drawText(formatPrice(invoice.total_tva_cents), {
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
  page.drawText(formatPrice(invoice.total_ttc_cents), {
    x: totalsX + 100,
    y: y,
    size: 12,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.6),
  });

  // Pied de page - Mentions légales
  const footer = [
    "Conditions de paiement: Paiement à réception de facture",
    "En cas de retard de paiement, application d'un taux de pénalité égal à 3 fois le taux d'intérêt légal.",
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
    const { invoice_id } = await req.json();

    if (!invoice_id) {
      throw new Error("invoice_id is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`[generate-invoice-pdf] Generating PDF for invoice ${invoice_id}`);

    // Récupérer les données de la facture
    const { data: invoice, error: invoiceError } = await supabaseClient
      .from("invoices")
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
      .eq("id", invoice_id)
      .single();

    if (invoiceError) throw invoiceError;
    if (!invoice) throw new Error("Invoice not found");

    // Récupérer les lignes de facture
    const { data: items, error: itemsError } = await supabaseClient
      .from("invoice_items")
      .select("*")
      .eq("invoice_id", invoice_id)
      .order("created_at", { ascending: true });

    if (itemsError) throw itemsError;

    const invoiceData: InvoiceData = {
      ...invoice,
      client: invoice.client,
      items: items || [],
    };

    // Générer le PDF
    const pdfBytes = await generateInvoicePDF(invoiceData);

    // Upload vers Storage
    const fileName = `facture-${invoice.invoice_number}.pdf`;
    const filePath = `invoices/${invoice.client_id}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("documents")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // Créer l'entrée dans client_portal_documents
    const { error: docError } = await supabaseClient
      .from("client_portal_documents")
      .insert({
        client_id: invoice.client_id,
        document_type: "facture",
        file_name: fileName,
        file_url: filePath,
        related_entity_type: "invoice",
        related_entity_id: invoice.id,
      });

    if (docError && docError.code !== "23505") { // Ignore duplicate
      console.error("[generate-invoice-pdf] Error creating document entry:", docError);
    }

    // Obtenir l'URL publique
    const { data: urlData } = supabaseClient.storage
      .from("documents")
      .getPublicUrl(filePath);

    console.log(`[generate-invoice-pdf] PDF generated successfully: ${filePath}`);

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
    console.error("[generate-invoice-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
