import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ReportData {
  id: string;
  mission_id: string;
  status: string;
  created_at: string;
  submitted_at?: string;
  validated_at?: string;
  form_data: any;
  observations?: string;
  mission: {
    mission_number: string;
    scheduled_date: string;
    address_line1: string;
    city: string;
    postal_code: string;
    intervention_type: {
      name: string;
    };
  };
  client: {
    raison_sociale: string;
  };
  technician: {
    full_name: string;
  };
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR");
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.toLocaleDateString("fr-FR")} à ${date.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

async function generateReportPDF(report: ReportData): Promise<Uint8Array> {
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

  page.drawText("RAPPORT D'INTERVENTION", {
    x: width - 250,
    y: y,
    size: 16,
    font: fontBold,
    color: rgb(0.1, 0.3, 0.6),
  });

  y -= 30;

  // Infos entreprise
  const companyInfo = [
    "Clim Passion",
    "123 Avenue de la Climatisation",
    "75001 Paris",
    "Tél: 01 23 45 67 89",
  ];

  page.drawText(companyInfo.join("\n"), {
    x: 50,
    y: y,
    size: 9,
    font: font,
    lineHeight: 12,
  });

  // Numéro mission et dates
  page.drawText(`Mission N° ${report.mission.mission_number}`, {
    x: width - 250,
    y: y,
    size: 11,
    font: fontBold,
  });

  y -= 15;
  page.drawText(`Date: ${formatDate(report.mission.scheduled_date)}`, {
    x: width - 250,
    y: y,
    size: 9,
    font: font,
  });

  y -= 12;
  page.drawText(`Type: ${report.mission.intervention_type.name}`, {
    x: width - 250,
    y: y,
    size: 9,
    font: font,
  });

  y -= 40;

  // Informations client
  page.drawText("CLIENT:", {
    x: 50,
    y: y,
    size: 11,
    font: fontBold,
  });

  y -= 18;

  const clientInfo = [
    report.client.raison_sociale,
    report.mission.address_line1,
    `${report.mission.postal_code} ${report.mission.city}`,
  ];

  page.drawText(clientInfo.join("\n"), {
    x: 50,
    y: y,
    size: 10,
    font: font,
    lineHeight: 14,
  });

  // Technicien
  y -= 60;

  page.drawText("TECHNICIEN:", {
    x: 50,
    y: y,
    size: 11,
    font: fontBold,
  });

  y -= 18;

  page.drawText(report.technician.full_name, {
    x: 50,
    y: y,
    size: 10,
    font: font,
  });

  y -= 40;

  // Ligne de séparation
  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 2,
    color: rgb(0.1, 0.3, 0.6),
  });

  y -= 25;

  // Détails de l'intervention
  page.drawText("DÉTAILS DE L'INTERVENTION", {
    x: 50,
    y: y,
    size: 13,
    font: fontBold,
  });

  y -= 25;

  // Afficher form_data (données dynamiques)
  if (report.form_data && typeof report.form_data === "object") {
    const entries = Object.entries(report.form_data);

    for (const [key, value] of entries) {
      if (y < 150) {
        // Nouvelle page si nécessaire
        const newPage = pdfDoc.addPage([595, 842]);
        y = newPage.getSize().height - 50;
      }

      // Label (clé)
      const label = key
        .replace(/_/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      page.drawText(`${label}:`, {
        x: 50,
        y: y,
        size: 10,
        font: fontBold,
      });

      y -= 15;

      // Valeur
      let valueStr = "";
      if (typeof value === "boolean") {
        valueStr = value ? "Oui" : "Non";
      } else if (Array.isArray(value)) {
        valueStr = value.join(", ");
      } else if (typeof value === "object" && value !== null) {
        valueStr = JSON.stringify(value, null, 2);
      } else {
        valueStr = String(value || "N/A");
      }

      // Gérer texte long (wrap)
      const maxWidth = 450;
      const lines = valueStr.match(/.{1,70}/g) || [valueStr];

      lines.slice(0, 5).forEach((line) => {
        page.drawText(line, {
          x: 70,
          y: y,
          size: 9,
          font: font,
        });
        y -= 12;
      });

      y -= 8;
    }
  } else {
    page.drawText("Aucune donnée d'intervention saisie", {
      x: 50,
      y: y,
      size: 9,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });
    y -= 20;
  }

  // Observations
  if (report.observations) {
    y -= 15;
    page.drawText("OBSERVATIONS:", {
      x: 50,
      y: y,
      size: 11,
      font: fontBold,
    });

    y -= 18;

    const obsLines = report.observations.match(/.{1,70}/g) || [report.observations];
    obsLines.slice(0, 5).forEach((line) => {
      page.drawText(line, {
        x: 50,
        y: y,
        size: 9,
        font: font,
      });
      y -= 12;
    });
  }

  // Signatures (zone)
  y = 150;

  page.drawLine({
    start: { x: 50, y: y },
    end: { x: width - 50, y: y },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7),
  });

  y -= 25;

  page.drawText("Signature Technicien:", {
    x: 50,
    y: y,
    size: 9,
    font: font,
  });

  page.drawText("Signature Client:", {
    x: width - 200,
    y: y,
    size: 9,
    font: font,
  });

  // Pied de page
  const footer = [
    `Rapport généré le ${formatDateTime(new Date().toISOString())}`,
    report.status === "validé"
      ? `Validé le ${formatDateTime(report.validated_at!)}`
      : `Statut: ${report.status}`,
    "Clim Passion - SIRET: 123 456 789 00012",
  ];

  page.drawText(footer.join(" | "), {
    x: 50,
    y: 40,
    size: 7,
    font: font,
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
    const { report_id } = await req.json();

    if (!report_id) {
      throw new Error("report_id is required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log(`[generate-report-pdf] Generating PDF for report ${report_id}`);

    // Récupérer le rapport complet
    const { data: report, error: reportError } = await supabaseClient
      .from("intervention_reports")
      .select(`
        *,
        mission:missions(
          mission_number,
          scheduled_date,
          address_line1,
          city,
          postal_code,
          client_id,
          assigned_to,
          intervention_type:intervention_types(name)
        )
      `)
      .eq("id", report_id)
      .single();

    if (reportError) throw reportError;
    if (!report) throw new Error("Report not found");

    // Client
    const { data: client } = await supabaseClient
      .from("client_accounts")
      .select("raison_sociale")
      .eq("id", report.mission.client_id)
      .single();

    // Technicien
    const { data: technician } = await supabaseClient
      .from("profiles")
      .select("full_name")
      .eq("user_id", report.mission.assigned_to)
      .single();

    const reportData: ReportData = {
      ...report,
      mission: report.mission,
      client: client || { raison_sociale: "Client inconnu" },
      technician: technician || { full_name: "Technicien inconnu" },
    };

    // Générer PDF
    const pdfBytes = await generateReportPDF(reportData);

    // Upload
    const fileName = `rapport-${report.mission.mission_number}.pdf`;
    const filePath = `reports/${report.mission.client_id}/${fileName}`;

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
        client_id: report.mission.client_id,
        document_type: "rapport",
        file_name: fileName,
        file_url: filePath,
        related_entity_type: "intervention_report",
        related_entity_id: report.id,
      });

    if (docError && docError.code !== "23505") {
      console.error("[generate-report-pdf] Error creating document entry:", docError);
    }

    const { data: urlData } = supabaseClient.storage
      .from("documents")
      .getPublicUrl(filePath);

    console.log(`[generate-report-pdf] PDF generated successfully: ${filePath}`);

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
    console.error("[generate-report-pdf] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
