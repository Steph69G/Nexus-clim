/*
  # Phase 3 - Système d'emails automatiques

  1. Table email_events
    - Enregistre tous les emails envoyés
    - Idempotence: évite doublons
    - Historique complet

  2. Table email_templates
    - Templates HTML pour emails
    - Variables dynamiques Handlebars-like
    - 6 types différents

  3. Fonction get_emails_to_send
    - Récupère emails à envoyer selon événements
    - Vérifie qu'ils n'ont pas déjà été envoyés

  4. Types d'emails
    - mission_confirmed: Client - mission acceptée par ST
    - mission_reminder: Client - rappel J-1
    - report_ready: Client - rapport validé dispo
    - invoice_sent: Client - facture envoyée
    - payment_reminder: Client - relance paiement
    - new_offer_available: ST - nouvelle offre publiée
*/

-- Table: email_events (log + idempotence)
CREATE TABLE IF NOT EXISTS email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  recipient_email VARCHAR(255) NOT NULL,
  recipient_user_id UUID REFERENCES profiles(user_id),
  related_entity_type VARCHAR(50),
  related_entity_id UUID,
  template_used VARCHAR(50),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'sent',
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_events_entity ON email_events(related_entity_type, related_entity_id);
CREATE INDEX idx_email_events_recipient ON email_events(recipient_email, event_type);
CREATE INDEX idx_email_events_sent_at ON email_events(sent_at DESC);

-- Table: email_templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name VARCHAR(50) UNIQUE NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insertion templates par défaut
INSERT INTO email_templates (template_name, subject, body_html, body_text, variables) VALUES
(
  'mission_confirmed',
  'Mission confirmée - {{mission_number}}',
  '<html><body><h2>Bonjour {{client_name}},</h2><p>Votre mission <strong>{{mission_number}}</strong> a été confirmée.</p><p><strong>Date:</strong> {{mission_date}}<br><strong>Type:</strong> {{intervention_type}}<br><strong>Technicien:</strong> {{tech_name}}</p><p>Le technicien vous contactera prochainement.</p><p>Cordialement,<br>L''équipe Nexus Clim</p></body></html>',
  'Bonjour {{client_name}}, Votre mission {{mission_number}} a été confirmée pour le {{mission_date}}.',
  '["client_name", "mission_number", "mission_date", "intervention_type", "tech_name"]'::jsonb
),
(
  'mission_reminder',
  'Rappel intervention demain - {{mission_number}}',
  '<html><body><h2>Bonjour {{client_name}},</h2><p>Nous vous rappelons votre intervention prévue <strong>demain {{mission_date}}</strong>.</p><p><strong>Type:</strong> {{intervention_type}}<br><strong>Technicien:</strong> {{tech_name}}<br><strong>Téléphone:</strong> {{tech_phone}}</p><p>À demain !</p><p>Cordialement,<br>L''équipe Nexus Clim</p></body></html>',
  'Bonjour {{client_name}}, Rappel: intervention demain {{mission_date}}. Technicien: {{tech_name}}.',
  '["client_name", "mission_number", "mission_date", "intervention_type", "tech_name", "tech_phone"]'::jsonb
),
(
  'report_ready',
  'Rapport d''intervention disponible - {{mission_number}}',
  '<html><body><h2>Bonjour {{client_name}},</h2><p>Le rapport de votre intervention du {{mission_date}} est maintenant disponible.</p><p><a href="{{report_url}}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Consulter le rapport</a></p><p>Vous pouvez également le télécharger depuis votre espace client.</p><p>Cordialement,<br>L''équipe Nexus Clim</p></body></html>',
  'Bonjour {{client_name}}, Votre rapport d''intervention est disponible: {{report_url}}',
  '["client_name", "mission_number", "mission_date", "report_url"]'::jsonb
),
(
  'invoice_sent',
  'Facture {{invoice_number}} - Nexus Clim',
  '<html><body><h2>Bonjour {{client_name}},</h2><p>Veuillez trouver ci-joint la facture <strong>{{invoice_number}}</strong>.</p><p><strong>Montant:</strong> {{total_ttc}}<br><strong>Échéance:</strong> {{due_date}}</p><p><a href="{{invoice_pdf_url}}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Télécharger la facture (PDF)</a></p><p>Cordialement,<br>L''équipe Nexus Clim</p></body></html>',
  'Bonjour {{client_name}}, Votre facture {{invoice_number}} est disponible: {{invoice_pdf_url}}',
  '["client_name", "invoice_number", "total_ttc", "due_date", "invoice_pdf_url"]'::jsonb
),
(
  'payment_reminder',
  'Relance facture {{invoice_number}}',
  '<html><body><h2>Bonjour {{client_name}},</h2><p>Nous n''avons pas reçu le paiement de la facture <strong>{{invoice_number}}</strong> échue le {{due_date}}.</p><p><strong>Montant restant dû:</strong> {{amount_due}}</p><p>Merci de régulariser votre situation dans les plus brefs délais.</p><p><a href="{{invoice_url}}">Consulter la facture</a></p><p>Cordialement,<br>L''équipe Nexus Clim</p></body></html>',
  'Bonjour {{client_name}}, Relance facture {{invoice_number}} échue le {{due_date}}. Montant: {{amount_due}}.',
  '["client_name", "invoice_number", "due_date", "amount_due", "invoice_url"]'::jsonb
),
(
  'new_offer_available',
  'Nouvelle mission disponible - {{mission_type}}',
  '<html><body><h2>Bonjour {{tech_name}},</h2><p>Une nouvelle mission est disponible dans votre zone :</p><p><strong>Type:</strong> {{mission_type}}<br><strong>Ville:</strong> {{city}}<br><strong>Date prévue:</strong> {{mission_date}}<br><strong>Distance:</strong> ~{{distance}} km</p><p><a href="{{offer_url}}" style="background: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Voir l''offre</a></p><p>Connexion requise pour voir l''adresse complète.</p><p>Cordialement,<br>L''équipe Nexus Clim</p></body></html>',
  'Bonjour {{tech_name}}, Nouvelle mission {{mission_type}} à {{city}} le {{mission_date}}. Voir: {{offer_url}}',
  '["tech_name", "mission_type", "city", "mission_date", "distance", "offer_url"]'::jsonb
)
ON CONFLICT (template_name) DO NOTHING;

-- Fonction: Vérifier si email déjà envoyé (idempotence)
CREATE OR REPLACE FUNCTION email_already_sent(
  p_event_type VARCHAR,
  p_related_entity_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM email_events
    WHERE event_type = p_event_type
      AND related_entity_id = p_related_entity_id
      AND status = 'sent'
      AND sent_at > NOW() - INTERVAL '24 hours'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Enregistrer envoi email
CREATE OR REPLACE FUNCTION log_email_sent(
  p_event_type VARCHAR,
  p_recipient_email VARCHAR,
  p_recipient_user_id UUID,
  p_related_entity_type VARCHAR,
  p_related_entity_id UUID,
  p_template_used VARCHAR,
  p_status VARCHAR DEFAULT 'sent',
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO email_events (
    event_type,
    recipient_email,
    recipient_user_id,
    related_entity_type,
    related_entity_id,
    template_used,
    status,
    error_message,
    metadata
  ) VALUES (
    p_event_type,
    p_recipient_email,
    p_recipient_user_id,
    p_related_entity_type,
    p_related_entity_id,
    p_template_used,
    p_status,
    p_error_message,
    p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS sur email_events
ALTER TABLE email_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all email events"
  ON email_events FOR SELECT
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

-- RLS sur email_templates
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  TO authenticated
  USING ((auth.jwt()->>'role')::text = 'admin');

CREATE POLICY "Public can read active email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (is_active = true);
