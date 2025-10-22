/*
  # Système d'Envoi Automatique des Enquêtes de Satisfaction

  1. Tables
    - `survey_email_logs`
      - `id` (uuid, primary key)
      - `survey_id` (uuid, FK satisfaction_surveys)
      - `email_type` (text) - initial, reminder_1, reminder_2
      - `recipient_email` (text)
      - `sent_at` (timestamptz)
      - `opened_at` (timestamptz) - Si tracking ouverture
      - `clicked_at` (timestamptz) - Si clic sur lien
      - `status` (text) - sent, failed, bounced
      - `error_message` (text)
      - `created_at` (timestamptz)

    - `survey_email_templates`
      - `id` (uuid, primary key)
      - `template_type` (text) - initial, reminder_1, reminder_2
      - `subject` (text)
      - `body_html` (text)
      - `body_text` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Functions
    - auto_send_survey_after_mission() - Trigger sur missions
    - send_survey_reminders() - Fonction pour relances
    - get_surveys_needing_reminder() - Liste enquêtes à relancer

  3. Security
    - Enable RLS
    - Admin peut tout voir et gérer
*/

-- Table des logs d'envoi d'emails
CREATE TABLE IF NOT EXISTS survey_email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  survey_id uuid REFERENCES satisfaction_surveys(id) ON DELETE CASCADE,
  email_type text NOT NULL CHECK (email_type IN ('initial', 'reminder_1', 'reminder_2')),
  recipient_email text NOT NULL,
  sent_at timestamptz DEFAULT now(),
  opened_at timestamptz,
  clicked_at timestamptz,
  status text DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'bounced', 'delivered')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_survey_email_logs_survey 
  ON survey_email_logs(survey_id);
CREATE INDEX IF NOT EXISTS idx_survey_email_logs_status 
  ON survey_email_logs(status);
CREATE INDEX IF NOT EXISTS idx_survey_email_logs_sent 
  ON survey_email_logs(sent_at);

-- Table des templates d'emails
CREATE TABLE IF NOT EXISTS survey_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_type text UNIQUE NOT NULL CHECK (template_type IN ('initial', 'reminder_1', 'reminder_2')),
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_survey_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER survey_email_templates_updated_at
  BEFORE UPDATE ON survey_email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_survey_email_templates_updated_at();

-- RLS Policies pour survey_email_logs
ALTER TABLE survey_email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all email logs"
  ON survey_email_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert email logs"
  ON survey_email_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- RLS Policies pour survey_email_templates
ALTER TABLE survey_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view templates"
  ON survey_email_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage templates"
  ON survey_email_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Templates par défaut
INSERT INTO survey_email_templates (template_type, subject, body_html, body_text)
VALUES
(
  'initial',
  '⭐ Votre avis compte - Enquête de satisfaction Nexus Clim',
  '<html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0;">Nexus Clim</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Votre avis compte pour nous !</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          Bonjour <strong>{{client_name}}</strong>,
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Nous vous remercions d''avoir fait confiance à Nexus Clim pour votre intervention récente.
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Afin d''améliorer continuellement nos services, nous aimerions connaître votre avis sur l''intervention réalisée le <strong>{{mission_date}}</strong>.
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="{{survey_link}}" style="background: #3b82f6; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
            Donner mon avis
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; line-height: 1.6;">
          Cette enquête ne vous prendra que <strong>2 minutes</strong> et nous aidera à vous servir encore mieux.
        </p>
        
        <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 30px;">
          <p style="font-size: 14px; color: #6b7280; margin: 0;">
            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
            <a href="{{survey_link}}" style="color: #3b82f6; word-break: break-all;">{{survey_link}}</a>
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>Nexus Clim - Votre expert en climatisation</p>
        <p style="margin: 5px 0;">📞 01 23 45 67 89 | 📧 contact@nexusclim.fr</p>
      </div>
    </body>
  </html>',
  'Bonjour {{client_name}},

Nous vous remercions d''avoir fait confiance à Nexus Clim pour votre intervention récente.

Afin d''améliorer continuellement nos services, nous aimerions connaître votre avis sur l''intervention réalisée le {{mission_date}}.

Donnez votre avis en cliquant sur ce lien :
{{survey_link}}

Cette enquête ne vous prendra que 2 minutes et nous aidera à vous servir encore mieux.

Merci,
L''équipe Nexus Clim

---
Nexus Clim - Votre expert en climatisation
📞 01 23 45 67 89 | 📧 contact@nexusclim.fr'
),
(
  'reminder_1',
  '🔔 Rappel : Votre avis nous intéresse - Enquête Nexus Clim',
  '<html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0;">🔔 Rappel</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">Votre avis compte toujours !</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          Bonjour <strong>{{client_name}}</strong>,
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Nous vous avons récemment sollicité pour partager votre avis sur notre intervention du <strong>{{mission_date}}</strong>.
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Si vous n''avez pas encore eu le temps de répondre, nous serions ravis de connaître votre retour d''expérience.
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="{{survey_link}}" style="background: #f59e0b; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
            Répondre maintenant
          </a>
        </div>
        
        <p style="font-size: 14px; color: #6b7280; line-height: 1.6; text-align: center;">
          ⏱️ Seulement <strong>2 minutes</strong> de votre temps
        </p>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>Nexus Clim - Votre expert en climatisation</p>
      </div>
    </body>
  </html>',
  'Bonjour {{client_name}},

Nous vous avons récemment sollicité pour partager votre avis sur notre intervention du {{mission_date}}.

Si vous n''avez pas encore eu le temps de répondre, nous serions ravis de connaître votre retour d''expérience.

Répondez maintenant : {{survey_link}}

Seulement 2 minutes de votre temps.

Merci,
L''équipe Nexus Clim'
),
(
  'reminder_2',
  '⏰ Dernière chance : Partagez votre expérience - Nexus Clim',
  '<html>
    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
        <h1 style="margin: 0;">⏰ Dernière chance</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">L''enquête expire bientôt</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
        <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
          Bonjour <strong>{{client_name}}</strong>,
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          C''est votre dernière opportunité de partager votre avis sur notre intervention.
        </p>
        
        <p style="font-size: 16px; color: #374151; line-height: 1.6;">
          Votre retour est <strong>essentiel</strong> pour nous aider à améliorer nos services et mieux vous servir.
        </p>
        
        <div style="text-align: center; margin: 40px 0;">
          <a href="{{survey_link}}" style="background: #ef4444; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold; display: inline-block;">
            Je donne mon avis
          </a>
        </div>
        
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-top: 30px;">
          <p style="font-size: 14px; color: #991b1b; margin: 0; font-weight: bold;">
            ⚠️ Cette enquête expire dans 48 heures
          </p>
        </div>
      </div>
      
      <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
        <p>Nexus Clim - Votre expert en climatisation</p>
      </div>
    </body>
  </html>',
  'Bonjour {{client_name}},

C''est votre dernière opportunité de partager votre avis sur notre intervention.

Votre retour est essentiel pour nous aider à améliorer nos services et mieux vous servir.

Donnez votre avis maintenant : {{survey_link}}

⚠️ Cette enquête expire dans 48 heures

Merci,
L''équipe Nexus Clim'
);

-- Fonction pour obtenir les enquêtes nécessitant une relance
CREATE OR REPLACE FUNCTION get_surveys_needing_reminder()
RETURNS TABLE (
  survey_id uuid,
  client_name text,
  client_email text,
  survey_token uuid,
  days_since_sent int,
  last_reminder_type text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.client_name,
    s.client_email,
    s.survey_token,
    EXTRACT(DAY FROM (now() - s.sent_at))::int as days_since,
    (
      SELECT email_type 
      FROM survey_email_logs 
      WHERE survey_id = s.id 
      ORDER BY sent_at DESC 
      LIMIT 1
    ) as last_reminder
  FROM satisfaction_surveys s
  WHERE s.status = 'pending'
  AND s.sent_at IS NOT NULL
  AND (
    -- Première relance après 3 jours
    (EXTRACT(DAY FROM (now() - s.sent_at)) >= 3 
     AND NOT EXISTS (
       SELECT 1 FROM survey_email_logs 
       WHERE survey_id = s.id 
       AND email_type IN ('reminder_1', 'reminder_2')
     ))
    OR
    -- Deuxième relance après 7 jours
    (EXTRACT(DAY FROM (now() - s.sent_at)) >= 7
     AND EXISTS (
       SELECT 1 FROM survey_email_logs 
       WHERE survey_id = s.id 
       AND email_type = 'reminder_1'
     )
     AND NOT EXISTS (
       SELECT 1 FROM survey_email_logs 
       WHERE survey_id = s.id 
       AND email_type = 'reminder_2'
     ))
  );
END;
$$ LANGUAGE plpgsql;
