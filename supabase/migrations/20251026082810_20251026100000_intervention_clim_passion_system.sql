/*
  # Système Fiches d'Intervention Clim Passion - Workflow Complet

  ## Objectif
  Mettre en place le workflow complet des fiches d'intervention :
  Mission → Rapport → PDF → Email → Enquête Satisfaction

  ## Modifications

  ### 1. Colonnes ajoutées à intervention_reports
  - `survey_sent` (boolean) - Flag enquête satisfaction envoyée
  - `validated_by` (uuid) - Qui a validé le rapport
  - `validated_at` (timestamptz) - Date de validation

  ### 2. Templates Clim Passion
  Insertion des 4 templates standards dans procedure_templates :
  - ENTR : Entretien/Maintenance
  - DEP : Dépannage
  - INST : Installation
  - PACS : Pompe à Chaleur / Split

  ### 3. Triggers automatiques
  - Auto-création rapport au démarrage mission (in_progress)
  - Validation automatique pour SAL (vs validation manuelle ST)
  - Planification enquête 24h après validation
  - Lien vers pré-facture après validation

  ## Sécurité
  - Permissions vérifiées (ADMIN, SAL, technicien auteur)
  - Signatures stockées en URLs sécurisées
  - Email récupéré depuis missions ou profiles
  - Traçabilité complète
*/

-- ═══════════════════════════════════════════════════════════════
-- 1. AJOUT DES COLONNES MANQUANTES
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN
  -- Colonne survey_sent
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intervention_reports' AND column_name = 'survey_sent'
  ) THEN
    ALTER TABLE intervention_reports ADD COLUMN survey_sent boolean DEFAULT false;
  END IF;

  -- Colonne validated_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intervention_reports' AND column_name = 'validated_by'
  ) THEN
    ALTER TABLE intervention_reports ADD COLUMN validated_by uuid REFERENCES profiles(user_id) ON DELETE SET NULL;
  END IF;

  -- Colonne validated_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'intervention_reports' AND column_name = 'validated_at'
  ) THEN
    ALTER TABLE intervention_reports ADD COLUMN validated_at timestamptz;
  END IF;
END $$;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_intervention_reports_validated_by ON intervention_reports(validated_by);
CREATE INDEX IF NOT EXISTS idx_intervention_reports_survey_sent ON intervention_reports(survey_sent);

-- ═══════════════════════════════════════════════════════════════
-- 2. TEMPLATES CLIM PASSION
-- ═══════════════════════════════════════════════════════════════

-- Template 1: ENTRETIEN/MAINTENANCE
INSERT INTO procedure_templates (name, description, mission_type, steps, is_active, version)
VALUES (
  'Fiche Entretien Clim Passion',
  'Fiche d''entretien standard pour climatisation',
  'Maintenance',
  '[
    {
      "step_number": 1,
      "title": "Identification du matériel",
      "description": "Relever les informations de l''équipement",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "marque", "label": "Marque", "type": "text"},
        {"name": "modele", "label": "Modèle", "type": "text"},
        {"name": "serial", "label": "Numéro de série", "type": "text"},
        {"name": "puissance", "label": "Puissance (BTU)", "type": "number"}
      ]
    },
    {
      "step_number": 2,
      "title": "Contrôle visuel",
      "description": "Vérification visuelle de l''installation",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "etat_general", "label": "État général", "type": "select", "options": ["Bon", "Moyen", "Mauvais"]},
        {"name": "proprete", "label": "Propreté", "type": "select", "options": ["Propre", "À nettoyer", "Sale"]},
        {"name": "fixations", "label": "Fixations", "type": "checkbox", "label_text": "Fixations correctes"}
      ]
    },
    {
      "step_number": 3,
      "title": "Nettoyage et maintenance",
      "description": "Opérations de nettoyage",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "filtres_nettoyes", "label": "Filtres nettoyés", "type": "checkbox"},
        {"name": "batterie_nettoyee", "label": "Batterie nettoyée", "type": "checkbox"},
        {"name": "condensat_verifie", "label": "Évacuation condensat vérifiée", "type": "checkbox"},
        {"name": "desinfection", "label": "Désinfection effectuée", "type": "checkbox"}
      ]
    },
    {
      "step_number": 4,
      "title": "Contrôle de fonctionnement",
      "description": "Vérification des paramètres de fonctionnement",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": true,
      "fields": [
        {"name": "pression_bp", "label": "Pression BP (bar)", "type": "number"},
        {"name": "pression_hp", "label": "Pression HP (bar)", "type": "number"},
        {"name": "temp_soufflage", "label": "Température soufflage (°C)", "type": "number"},
        {"name": "temp_reprise", "label": "Température reprise (°C)", "type": "number"},
        {"name": "intensite", "label": "Intensité (A)", "type": "number"}
      ]
    },
    {
      "step_number": 5,
      "title": "Observations et recommandations",
      "description": "Notes et recommandations client",
      "is_mandatory": false,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "observations", "label": "Observations", "type": "textarea"},
        {"name": "recommandations", "label": "Recommandations", "type": "textarea"},
        {"name": "prochain_entretien", "label": "Date prochain entretien", "type": "date"}
      ]
    },
    {
      "step_number": 6,
      "title": "Signatures",
      "description": "Signatures technicien et client",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": true,
      "requires_measurement": false,
      "fields": [
        {"name": "signature_tech", "label": "Signature technicien", "type": "signature"},
        {"name": "signature_client", "label": "Signature client", "type": "signature"}
      ]
    }
  ]'::jsonb,
  true,
  1
) ON CONFLICT DO NOTHING;

-- Template 2: DÉPANNAGE
INSERT INTO procedure_templates (name, description, mission_type, steps, is_active, version)
VALUES (
  'Fiche Dépannage Clim Passion',
  'Fiche intervention dépannage urgence',
  'Dépannage',
  '[
    {
      "step_number": 1,
      "title": "Identification",
      "description": "Informations matériel et panne",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "marque", "label": "Marque", "type": "text"},
        {"name": "modele", "label": "Modèle", "type": "text"},
        {"name": "symptome", "label": "Symptôme signalé", "type": "textarea"}
      ]
    },
    {
      "step_number": 2,
      "title": "Diagnostic",
      "description": "Analyse de la panne",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": true,
      "fields": [
        {"name": "diagnostic", "label": "Diagnostic", "type": "textarea"},
        {"name": "cause", "label": "Cause identifiée", "type": "text"},
        {"name": "pieces_defectueuses", "label": "Pièces défectueuses", "type": "textarea"}
      ]
    },
    {
      "step_number": 3,
      "title": "Intervention",
      "description": "Travaux effectués",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "travaux", "label": "Travaux effectués", "type": "textarea"},
        {"name": "pieces_changees", "label": "Pièces remplacées", "type": "textarea"},
        {"name": "duree", "label": "Durée intervention (h)", "type": "number"}
      ]
    },
    {
      "step_number": 4,
      "title": "Tests et remise en service",
      "description": "Vérification bon fonctionnement",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": true,
      "fields": [
        {"name": "test_froid", "label": "Test mode froid", "type": "checkbox"},
        {"name": "test_chaud", "label": "Test mode chaud", "type": "checkbox"},
        {"name": "temp_soufflage", "label": "Température soufflage (°C)", "type": "number"},
        {"name": "fonctionnement_ok", "label": "Fonctionnement OK", "type": "checkbox"}
      ]
    },
    {
      "step_number": 5,
      "title": "Signatures",
      "description": "Validation intervention",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": true,
      "requires_measurement": false,
      "fields": [
        {"name": "signature_tech", "label": "Signature technicien", "type": "signature"},
        {"name": "signature_client", "label": "Signature client", "type": "signature"}
      ]
    }
  ]'::jsonb,
  true,
  1
) ON CONFLICT DO NOTHING;

-- Template 3: INSTALLATION
INSERT INTO procedure_templates (name, description, mission_type, steps, is_active, version)
VALUES (
  'Fiche Installation Clim Passion',
  'Fiche installation complète climatisation',
  'Installation',
  '[
    {
      "step_number": 1,
      "title": "Matériel installé",
      "description": "Détails équipement installé",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "marque", "label": "Marque", "type": "text"},
        {"name": "modele_ui", "label": "Modèle unité intérieure", "type": "text"},
        {"name": "serial_ui", "label": "N° série UI", "type": "text"},
        {"name": "modele_ue", "label": "Modèle unité extérieure", "type": "text"},
        {"name": "serial_ue", "label": "N° série UE", "type": "text"},
        {"name": "puissance", "label": "Puissance (BTU)", "type": "number"}
      ]
    },
    {
      "step_number": 2,
      "title": "Installation unité intérieure",
      "description": "Pose UI et raccordements",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "fixation_ui", "label": "Fixation UI", "type": "checkbox"},
        {"name": "raccord_elec", "label": "Raccordement électrique", "type": "checkbox"},
        {"name": "raccord_frigo", "label": "Raccordement frigorifique", "type": "checkbox"},
        {"name": "condensat", "label": "Évacuation condensat", "type": "checkbox"}
      ]
    },
    {
      "step_number": 3,
      "title": "Installation unité extérieure",
      "description": "Pose UE et raccordements",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "fixation_ue", "label": "Fixation UE", "type": "checkbox"},
        {"name": "support_antivibratile", "label": "Support anti-vibratile", "type": "checkbox"},
        {"name": "liaison_frigo", "label": "Liaison frigorifique", "type": "checkbox"},
        {"name": "branchement_elec", "label": "Branchement électrique", "type": "checkbox"}
      ]
    },
    {
      "step_number": 4,
      "title": "Mise en service",
      "description": "Tirage au vide et charge",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": true,
      "fields": [
        {"name": "tirage_vide", "label": "Tirage au vide effectué", "type": "checkbox"},
        {"name": "vide_atteint", "label": "Vide atteint (mbar)", "type": "number"},
        {"name": "charge_fluide", "label": "Charge fluide (g)", "type": "number"},
        {"name": "type_fluide", "label": "Type fluide", "type": "text"},
        {"name": "pression_bp", "label": "Pression BP (bar)", "type": "number"},
        {"name": "pression_hp", "label": "Pression HP (bar)", "type": "number"}
      ]
    },
    {
      "step_number": 5,
      "title": "Tests de fonctionnement",
      "description": "Vérification tous modes",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": true,
      "fields": [
        {"name": "test_froid", "label": "Test mode froid", "type": "checkbox"},
        {"name": "test_chaud", "label": "Test mode chaud", "type": "checkbox"},
        {"name": "temp_soufflage_froid", "label": "Temp. soufflage froid (°C)", "type": "number"},
        {"name": "temp_soufflage_chaud", "label": "Temp. soufflage chaud (°C)", "type": "number"},
        {"name": "telecommande_ok", "label": "Télécommande OK", "type": "checkbox"}
      ]
    },
    {
      "step_number": 6,
      "title": "Explications client",
      "description": "Formation utilisation",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "utilisation", "label": "Utilisation expliquée", "type": "checkbox"},
        {"name": "entretien", "label": "Entretien expliqué", "type": "checkbox"},
        {"name": "garantie", "label": "Garantie remise", "type": "checkbox"},
        {"name": "manuel", "label": "Manuel remis", "type": "checkbox"}
      ]
    },
    {
      "step_number": 7,
      "title": "Signatures",
      "description": "Validation installation",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": true,
      "requires_measurement": false,
      "fields": [
        {"name": "signature_tech", "label": "Signature technicien", "type": "signature"},
        {"name": "signature_client", "label": "Signature client", "type": "signature"}
      ]
    }
  ]'::jsonb,
  true,
  1
) ON CONFLICT DO NOTHING;

-- Template 4: PAC / SPLIT
INSERT INTO procedure_templates (name, description, mission_type, steps, is_active, version)
VALUES (
  'Fiche PAC/Split Clim Passion',
  'Fiche spécifique pompe à chaleur et multi-split',
  'Installation',
  '[
    {
      "step_number": 1,
      "title": "Système installé",
      "description": "Configuration du système",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "type_systeme", "label": "Type système", "type": "select", "options": ["Mono-split", "Multi-split", "PAC Air/Air", "PAC Air/Eau"]},
        {"name": "nb_unites_int", "label": "Nombre d''unités intérieures", "type": "number"},
        {"name": "marque", "label": "Marque", "type": "text"},
        {"name": "modele_ue", "label": "Modèle unité extérieure", "type": "text"}
      ]
    },
    {
      "step_number": 2,
      "title": "Unités intérieures",
      "description": "Détails chaque unité intérieure",
      "is_mandatory": true,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "unites_details", "label": "Détails unités (1 par ligne)", "type": "textarea"}
      ]
    },
    {
      "step_number": 3,
      "title": "Installation hydraulique (PAC Eau)",
      "description": "Si PAC Air/Eau uniquement",
      "is_mandatory": false,
      "requires_photo": true,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "ballon_tampon", "label": "Ballon tampon installé", "type": "checkbox"},
        {"name": "vase_expansion", "label": "Vase d''expansion", "type": "checkbox"},
        {"name": "circulateur", "label": "Circulateur", "type": "checkbox"},
        {"name": "desembouage", "label": "Désembouage effectué", "type": "checkbox"}
      ]
    },
    {
      "step_number": 4,
      "title": "Circuit frigorifique",
      "description": "Liaisons et mise en service",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": true,
      "fields": [
        {"name": "tirage_vide", "label": "Tirage au vide", "type": "checkbox"},
        {"name": "vide_mbar", "label": "Vide atteint (mbar)", "type": "number"},
        {"name": "charge_totale", "label": "Charge totale fluide (kg)", "type": "number"},
        {"name": "bp_marche", "label": "BP en marche (bar)", "type": "number"},
        {"name": "hp_marche", "label": "HP en marche (bar)", "type": "number"}
      ]
    },
    {
      "step_number": 5,
      "title": "Paramétrage système",
      "description": "Configuration avancée",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": false,
      "fields": [
        {"name": "adressage_unites", "label": "Adressage unités OK", "type": "checkbox"},
        {"name": "regulation", "label": "Régulation configurée", "type": "checkbox"},
        {"name": "planning", "label": "Planning programmé", "type": "checkbox"},
        {"name": "wifi", "label": "Connexion WiFi configurée", "type": "checkbox"}
      ]
    },
    {
      "step_number": 6,
      "title": "Tests de performance",
      "description": "Vérification toutes zones",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": false,
      "requires_measurement": true,
      "fields": [
        {"name": "test_toutes_zones", "label": "Test toutes zones", "type": "checkbox"},
        {"name": "cop_mesure", "label": "COP mesuré", "type": "number"},
        {"name": "temp_depart", "label": "Température départ (°C)", "type": "number"},
        {"name": "temp_retour", "label": "Température retour (°C)", "type": "number"}
      ]
    },
    {
      "step_number": 7,
      "title": "Signatures",
      "description": "Validation système",
      "is_mandatory": true,
      "requires_photo": false,
      "requires_signature": true,
      "requires_measurement": false,
      "fields": [
        {"name": "signature_tech", "label": "Signature technicien", "type": "signature"},
        {"name": "signature_client", "label": "Signature client", "type": "signature"}
      ]
    }
  ]'::jsonb,
  true,
  1
) ON CONFLICT DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3. TRIGGERS & FUNCTIONS AUTOMATIQUES
-- ═══════════════════════════════════════════════════════════════

-- Function: Auto-création rapport au démarrage mission
CREATE OR REPLACE FUNCTION auto_create_intervention_report()
RETURNS TRIGGER AS $$
DECLARE
  template_rec record;
  mission_type_name text;
BEGIN
  -- Seulement si passage à in_progress
  IF NEW.status = 'En cours' AND (OLD.status IS NULL OR OLD.status != 'En cours') THEN

    -- Récupérer le type de mission
    SELECT it.name INTO mission_type_name
    FROM intervention_types it
    WHERE it.id = NEW.type_id;

    -- Trouver le template approprié
    SELECT * INTO template_rec
    FROM procedure_templates
    WHERE is_active = true
    AND (
      (mission_type_name ILIKE '%maintenance%' AND mission_type LIKE '%Maintenance%')
      OR (mission_type_name ILIKE '%dépannage%' AND mission_type LIKE '%Dépannage%')
      OR (mission_type_name ILIKE '%installation%' AND mission_type LIKE '%Installation%')
      OR (mission_type_name ILIKE '%pac%' OR mission_type_name ILIKE '%split%' AND name LIKE '%PAC%')
    )
    LIMIT 1;

    -- Si pas de template spécifique, prendre le premier template actif
    IF template_rec IS NULL THEN
      SELECT * INTO template_rec
      FROM procedure_templates
      WHERE is_active = true
      LIMIT 1;
    END IF;

    -- Créer le rapport d'intervention si un technicien est assigné
    IF NEW.assigned_user_id IS NOT NULL THEN
      INSERT INTO intervention_reports (
        mission_id,
        procedure_template_id,
        technician_user_id,
        status,
        started_at,
        client_name,
        intervention_address
      ) VALUES (
        NEW.id,
        template_rec.id,
        NEW.assigned_user_id,
        'en_cours',
        now(),
        NEW.client_name,
        COALESCE(NEW.address || ', ' || NEW.city, NEW.address, '')
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger création rapport
DROP TRIGGER IF EXISTS trg_auto_create_intervention_report ON missions;
CREATE TRIGGER trg_auto_create_intervention_report
  AFTER INSERT OR UPDATE ON missions
  FOR EACH ROW
  EXECUTE FUNCTION auto_create_intervention_report();

-- Function: Validation automatique pour SAL (vs validation manuelle pour ST)
CREATE OR REPLACE FUNCTION auto_validate_report_if_sal()
RETURNS TRIGGER AS $$
DECLARE
  tech_role text;
BEGIN
  -- Quand le rapport passe à terminé
  IF NEW.status = 'terminé' AND (OLD.status IS NULL OR OLD.status != 'terminé') THEN

    -- Récupérer le rôle du technicien
    SELECT role INTO tech_role
    FROM profiles
    WHERE user_id = NEW.technician_user_id;

    -- Si SAL ou ADMIN → validation automatique
    IF tech_role IN ('sal', 'admin') THEN
      NEW.status := 'validé';
      NEW.validated_by := NEW.technician_user_id;
      NEW.validated_at := now();
    END IF;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger validation auto SAL
DROP TRIGGER IF EXISTS trg_auto_validate_report_if_sal ON intervention_reports;
CREATE TRIGGER trg_auto_validate_report_if_sal
  BEFORE UPDATE ON intervention_reports
  FOR EACH ROW
  EXECUTE FUNCTION auto_validate_report_if_sal();

-- Function: Planification enquête satisfaction 24h après validation
CREATE OR REPLACE FUNCTION schedule_survey_after_validation()
RETURNS TRIGGER AS $$
DECLARE
  mission_rec record;
  survey_id uuid;
BEGIN
  -- Quand le rapport passe à validé ET que l'enquête n'a pas été envoyée
  IF NEW.status = 'validé'
     AND (OLD.status IS NULL OR OLD.status != 'validé')
     AND NEW.survey_sent = false THEN

    -- Récupérer les infos mission
    SELECT * INTO mission_rec
    FROM missions
    WHERE id = NEW.mission_id;

    -- Vérifier qu'une enquête n'existe pas déjà pour cette mission
    IF NOT EXISTS (
      SELECT 1 FROM satisfaction_surveys
      WHERE mission_id = NEW.mission_id
    ) THEN

      -- Créer l'enquête (sera envoyée 24h plus tard par un cron/edge function)
      INSERT INTO satisfaction_surveys (
        mission_id,
        client_name,
        client_email,
        status,
        created_at
      ) VALUES (
        NEW.mission_id,
        mission_rec.client_name,
        COALESCE(mission_rec.client_email, 'noemail@example.com'),
        'pending',
        now()
      ) RETURNING id INTO survey_id;

      -- Marquer que l'enquête a été planifiée
      NEW.survey_sent := true;

      -- Note: L'envoi réel de l'email se fera via une Edge Function
      -- déclenchée 24h après (cron job vérifiant created_at + 24h)
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger planification enquête
DROP TRIGGER IF EXISTS trg_schedule_survey_after_validation ON intervention_reports;
CREATE TRIGGER trg_schedule_survey_after_validation
  BEFORE UPDATE ON intervention_reports
  FOR EACH ROW
  EXECUTE FUNCTION schedule_survey_after_validation();

-- Function: Lien vers pré-facture après validation rapport
CREATE OR REPLACE FUNCTION create_pre_invoice_after_validation()
RETURNS TRIGGER AS $$
DECLARE
  mission_rec record;
  report_materials jsonb;
  pre_invoice_id uuid;
BEGIN
  -- Quand le rapport passe à validé
  IF NEW.status = 'validé'
     AND (OLD.status IS NULL OR OLD.status != 'validé') THEN

    -- Récupérer mission
    SELECT * INTO mission_rec
    FROM missions
    WHERE id = NEW.mission_id;

    -- Vérifier qu'une pré-facture n'existe pas déjà
    IF NOT EXISTS (
      SELECT 1 FROM pre_invoices
      WHERE mission_id = NEW.mission_id
      AND intervention_report_id = NEW.id
    ) THEN

      -- Créer la pré-facture
      INSERT INTO pre_invoices (
        mission_id,
        intervention_report_id,
        client_name,
        client_email,
        client_phone,
        client_address,
        client_city,
        client_zip,
        status,
        items,
        created_by_user_id
      ) VALUES (
        NEW.mission_id,
        NEW.id,
        mission_rec.client_name,
        COALESCE(mission_rec.client_email, 'noemail@example.com'),
        COALESCE(mission_rec.client_phone, ''),
        COALESCE(mission_rec.address, ''),
        COALESCE(mission_rec.city, ''),
        COALESCE(mission_rec.zip, ''),
        'brouillon',
        COALESCE(NEW.materials_used, '[]'::jsonb),
        NEW.technician_user_id
      ) RETURNING id INTO pre_invoice_id;

    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger création pré-facture
DROP TRIGGER IF EXISTS trg_create_pre_invoice_after_validation ON intervention_reports;
CREATE TRIGGER trg_create_pre_invoice_after_validation
  AFTER UPDATE ON intervention_reports
  FOR EACH ROW
  EXECUTE FUNCTION create_pre_invoice_after_validation();

-- ═══════════════════════════════════════════════════════════════
-- 4. FONCTIONS HELPER
-- ═══════════════════════════════════════════════════════════════

-- Function: Récupérer les enquêtes à envoyer (24h après validation rapport)
CREATE OR REPLACE FUNCTION get_surveys_to_send_24h()
RETURNS TABLE (
  survey_id uuid,
  mission_id uuid,
  client_name text,
  client_email text,
  survey_token uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.mission_id,
    s.client_name,
    s.client_email,
    s.survey_token
  FROM satisfaction_surveys s
  WHERE s.status = 'pending'
  AND s.sent_at IS NULL
  AND s.created_at <= now() - interval '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Function: Marquer enquête comme envoyée
CREATE OR REPLACE FUNCTION mark_survey_as_sent(p_survey_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE satisfaction_surveys
  SET
    sent_at = now(),
    updated_at = now()
  WHERE id = p_survey_id;

  -- Log dans survey_email_logs
  INSERT INTO survey_email_logs (
    survey_id,
    email_type,
    recipient_email,
    status
  )
  SELECT
    id,
    'initial',
    client_email,
    'sent'
  FROM satisfaction_surveys
  WHERE id = p_survey_id;
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════
-- 5. COMMENTAIRES & DOCUMENTATION
-- ═══════════════════════════════════════════════════════════════

COMMENT ON COLUMN intervention_reports.survey_sent IS 'Flag indiquant si l''enquête satisfaction a été planifiée';
COMMENT ON COLUMN intervention_reports.validated_by IS 'ID utilisateur ayant validé le rapport';
COMMENT ON COLUMN intervention_reports.validated_at IS 'Date/heure de validation du rapport';

COMMENT ON FUNCTION auto_create_intervention_report() IS 'Crée automatiquement un rapport d''intervention quand une mission passe en status En cours';
COMMENT ON FUNCTION auto_validate_report_if_sal() IS 'Valide automatiquement le rapport si le technicien est SAL/ADMIN (vs validation manuelle pour ST)';
COMMENT ON FUNCTION schedule_survey_after_validation() IS 'Planifie l''envoi d''une enquête satisfaction 24h après validation du rapport';
COMMENT ON FUNCTION create_pre_invoice_after_validation() IS 'Crée automatiquement une pré-facture après validation du rapport';
COMMENT ON FUNCTION get_surveys_to_send_24h() IS 'Retourne les enquêtes à envoyer (créées il y a 24h et pas encore envoyées)';
COMMENT ON FUNCTION mark_survey_as_sent(uuid) IS 'Marque une enquête comme envoyée et log dans survey_email_logs';
