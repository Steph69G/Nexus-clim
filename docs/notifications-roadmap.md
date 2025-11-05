# 🔔 Notifications System - Roadmap & Improvements

## 📊 État Actuel (Diagnostic)

### ✅ Points Forts

- **Architecture claire** : UI + hook + API + triggers SQL bien séparés
- **Temps réel fonctionnel** : INSERT → Realtime → badge updates
- **Modèle de données riche** : relations, canaux, priorités, retry logic
- **Indexation optimisée** : user_id, created_at, status par canal
- **2 triggers actifs** : mission assignée, devis accepté

### 🔴 Problèmes Critiques

1. **Sécurité RLS trop permissive**
   ```sql
   -- Actuellement : N'IMPORTE QUI authentifié peut créer
   CREATE POLICY "System can create notifications"
     ON notifications FOR INSERT
     TO authenticated
     WITH CHECK (true);  -- ❌ DANGEREUX
   ```

2. **Sous-couverture fonctionnelle**
   - Seulement 2/24 types de notifications actifs
   - Pas de notifications clients
   - Pas d'alertes urgences
   - Pas d'alertes factures retard

3. **Pas d'anti-duplication**
   - Risque de doublons sur rafales d'updates
   - Pas d'idempotence

4. **Pas de préférences utilisateur**
   - Impossible d'opt-out par canal
   - Pas de quiet hours (22h-7h)
   - Pas de mute par type

5. **Pagination limitée**
   - Limite fixe 50 notifications
   - Pas de scroll infini / keyset pagination

6. **Pas d'observabilité**
   - Pas de logs d'envoi
   - Pas de métriques (latence, taux d'erreur)
   - Pas de Dead Letter Queue

---

## 🎯 Plan d'Action (2 Sprints)

### **Sprint 1 : Fondations Sécurisées** (Priorité P0)

#### 1.1 Sécuriser la Création de Notifications

**Problème :** Policy `WITH CHECK (true)` trop permissive

**Solution :**
```sql
-- 1) Supprimer la policy dangereuse
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- 2) Créer fonction sécurisée SECURITY DEFINER
CREATE OR REPLACE FUNCTION create_notification_secure(
  p_user_id uuid,
  p_notification_type text,
  p_title text,
  p_message text,
  p_channels text[] DEFAULT ARRAY['in_app']::text[],
  p_priority text DEFAULT 'normal',
  p_related_mission_id uuid DEFAULT NULL,
  p_related_quote_id uuid DEFAULT NULL,
  p_related_invoice_id uuid DEFAULT NULL,
  p_related_contract_id uuid DEFAULT NULL,
  p_related_request_id uuid DEFAULT NULL,
  p_action_url text DEFAULT NULL,
  p_action_label text DEFAULT NULL,
  p_data jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_notification_id uuid;
BEGIN
  -- Validation basique
  IF p_title IS NULL OR p_title = '' THEN
    RAISE EXCEPTION 'Title cannot be empty';
  END IF;

  IF p_message IS NULL OR p_message = '' THEN
    RAISE EXCEPTION 'Message cannot be empty';
  END IF;

  -- Validation longueur (éviter abus)
  IF length(p_title) > 255 THEN
    RAISE EXCEPTION 'Title too long (max 255 chars)';
  END IF;

  IF length(p_message) > 2000 THEN
    RAISE EXCEPTION 'Message too long (max 2000 chars)';
  END IF;

  -- Validation action_url (whitelist pattern)
  IF p_action_url IS NOT NULL
     AND NOT (p_action_url ~ '^(/[a-zA-Z0-9/_-]+|https?://[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})') THEN
    RAISE EXCEPTION 'Invalid action_url format';
  END IF;

  INSERT INTO notifications (
    user_id,
    notification_type,
    title,
    message,
    channels,
    priority,
    related_mission_id,
    related_quote_id,
    related_invoice_id,
    related_contract_id,
    related_request_id,
    action_url,
    action_label,
    data
  ) VALUES (
    p_user_id,
    p_notification_type,
    p_title,
    p_message,
    p_channels,
    p_priority,
    p_related_mission_id,
    p_related_quote_id,
    p_related_invoice_id,
    p_related_contract_id,
    p_related_request_id,
    p_action_url,
    p_action_label,
    p_data
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$;

ALTER FUNCTION create_notification_secure OWNER TO postgres;
GRANT EXECUTE ON FUNCTION create_notification_secure TO authenticated;

-- 3) Mettre à jour tous les triggers existants
CREATE OR REPLACE FUNCTION notify_mission_assigned()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_user_id IS NOT NULL
     AND (OLD.assigned_user_id IS NULL OR OLD.assigned_user_id != NEW.assigned_user_id) THEN
    PERFORM create_notification_secure(
      NEW.assigned_user_id,
      'mission_assigned',
      'Nouvelle mission assignée',
      'Une nouvelle mission vous a été assignée: ' || COALESCE(NEW.title, 'Mission #' || NEW.id),
      ARRAY['in_app', 'email', 'push']::text[],
      'normal',
      NEW.id,
      NULL,
      NULL,
      NULL,
      NULL,
      '/missions/' || NEW.id,
      'Voir la mission',
      jsonb_build_object('mission_id', NEW.id, 'city', NEW.city)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

#### 1.2 Anti-Duplication (Idempotence)

**Problème :** Rafales d'updates peuvent créer des doublons

**Solution :**
```sql
-- Migration: add_dedup_key_to_notifications.sql

ALTER TABLE notifications
ADD COLUMN IF NOT EXISTS dedup_key text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_notifications_dedup
ON notifications(dedup_key)
WHERE dedup_key IS NOT NULL AND deleted_at IS NULL;

COMMENT ON COLUMN notifications.dedup_key IS
'Clé de déduplication: type:entity_id:timestamp (ex: quote_accepted:uuid:2025-01-01)';
```

**Usage dans triggers :**
```sql
-- Dans notify_quote_accepted
DECLARE
  v_dedup text;
BEGIN
  v_dedup := 'quote_accepted:' || NEW.id || ':' || date_trunc('hour', now());

  -- Tentative d'insertion (ignore si doublon)
  BEGIN
    PERFORM create_notification_secure(
      ...,
      dedup_key => v_dedup
    );
  EXCEPTION WHEN unique_violation THEN
    -- Ignore silencieusement le doublon
    NULL;
  END;
END;
```

---

#### 1.3 Préférences Utilisateur

**Création table :**
```sql
-- Migration: create_notification_preferences.sql

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,

  -- Canaux activés
  in_app_enabled boolean DEFAULT true NOT NULL,
  email_enabled boolean DEFAULT false NOT NULL,
  sms_enabled boolean DEFAULT false NOT NULL,
  push_enabled boolean DEFAULT false NOT NULL,

  -- Quiet hours (format HH:MM)
  quiet_hours_enabled boolean DEFAULT false NOT NULL,
  quiet_hours_start time DEFAULT '22:00:00' NOT NULL,
  quiet_hours_end time DEFAULT '07:00:00' NOT NULL,

  -- Types mutés
  muted_notification_types text[] DEFAULT ARRAY[]::text[],

  -- Fréquence digest email (optionnel)
  email_digest_frequency text CHECK (email_digest_frequency IN ('immediate', 'hourly', 'daily', 'weekly', 'never')) DEFAULT 'immediate',

  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own preferences"
  ON notification_preferences FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Fonction helper pour créer les préférences par défaut
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notification_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS create_notification_preferences_trigger ON profiles;
CREATE TRIGGER create_notification_preferences_trigger
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_default_notification_preferences();
```

**Fonction de filtrage :**
```sql
CREATE OR REPLACE FUNCTION filter_channels_by_preferences(
  p_user_id uuid,
  p_channels text[],
  p_notification_type text
)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_prefs notification_preferences;
  v_filtered text[] := ARRAY[]::text[];
  v_current_time time;
  v_in_quiet_hours boolean := false;
BEGIN
  -- Récupérer les préférences
  SELECT * INTO v_prefs
  FROM notification_preferences
  WHERE user_id = p_user_id;

  -- Si pas de préférences, créer par défaut
  IF NOT FOUND THEN
    INSERT INTO notification_preferences (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_prefs;
  END IF;

  -- Vérifier si type muté
  IF p_notification_type = ANY(v_prefs.muted_notification_types) THEN
    RETURN ARRAY[]::text[];  -- Tout muter
  END IF;

  -- Vérifier quiet hours
  IF v_prefs.quiet_hours_enabled THEN
    v_current_time := CURRENT_TIME;

    IF v_prefs.quiet_hours_start < v_prefs.quiet_hours_end THEN
      -- Ex: 22:00 - 07:00 (franchit minuit)
      v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start
                          OR v_current_time < v_prefs.quiet_hours_end;
    ELSE
      -- Ex: 10:00 - 18:00 (même journée)
      v_in_quiet_hours := v_current_time >= v_prefs.quiet_hours_start
                          AND v_current_time < v_prefs.quiet_hours_end;
    END IF;

    -- En quiet hours : garder seulement in_app
    IF v_in_quiet_hours THEN
      IF 'in_app' = ANY(p_channels) THEN
        RETURN ARRAY['in_app']::text[];
      ELSE
        RETURN ARRAY[]::text[];
      END IF;
    END IF;
  END IF;

  -- Filtrer par préférences canal
  IF 'in_app' = ANY(p_channels) AND v_prefs.in_app_enabled THEN
    v_filtered := array_append(v_filtered, 'in_app');
  END IF;

  IF 'email' = ANY(p_channels) AND v_prefs.email_enabled THEN
    v_filtered := array_append(v_filtered, 'email');
  END IF;

  IF 'sms' = ANY(p_channels) AND v_prefs.sms_enabled THEN
    v_filtered := array_append(v_filtered, 'sms');
  END IF;

  IF 'push' = ANY(p_channels) AND v_prefs.push_enabled THEN
    v_filtered := array_append(v_filtered, 'push');
  END IF;

  RETURN v_filtered;
END;
$$;

-- Modifier create_notification_secure pour utiliser le filtrage
-- (Ajouter appel à filter_channels_by_preferences avant INSERT)
```

---

#### 1.4 Keyset Pagination

**Problème :** `OFFSET` ne scale pas, limite 50 fixe

**Solution API :**
```typescript
// src/api/notifications.ts

export async function fetchMyNotifications(
  limit = 50,
  unreadOnly = false,
  beforeCursor?: { created_at: string; id: string }
): Promise<Notification[]> {
  let query = supabase
    .from("notifications")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit);

  if (unreadOnly) {
    query = query.is("read_at", null);
  }

  // Keyset pagination
  if (beforeCursor) {
    query = query.or(
      `created_at.lt.${beforeCursor.created_at},and(created_at.eq.${beforeCursor.created_at},id.lt.${beforeCursor.id})`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Notification[];
}
```

**SQL alternatif (RPC) :**
```sql
CREATE OR REPLACE FUNCTION get_notifications_keyset(
  p_limit int DEFAULT 50,
  p_unread_only boolean DEFAULT false,
  p_before_created_at timestamptz DEFAULT NULL,
  p_before_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  notification_type text,
  title text,
  message text,
  priority text,
  read_at timestamptz,
  action_url text,
  action_label text,
  data jsonb,
  created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    id,
    notification_type,
    title,
    message,
    priority,
    read_at,
    action_url,
    action_label,
    data,
    created_at
  FROM notifications
  WHERE user_id = auth.uid()
    AND deleted_at IS NULL
    AND (p_unread_only = false OR read_at IS NULL)
    AND (
      p_before_created_at IS NULL
      OR (created_at, id) < (p_before_created_at, p_before_id)
    )
  ORDER BY created_at DESC, id DESC
  LIMIT p_limit;
$$;
```

---

### **Sprint 2 : Couverture & Canaux** (Priorité P1)

#### 2.1 Nouveaux Triggers Critiques

**Factures en retard (Job quotidien) :**
```sql
-- Edge Function: check-overdue-invoices
-- Scheduled: daily at 09:00

CREATE OR REPLACE FUNCTION check_overdue_invoices()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT
      i.id,
      i.client_id,
      i.invoice_number,
      i.due_date,
      EXTRACT(DAY FROM (now() - i.due_date)) as days_overdue,
      uc.email
    FROM invoices i
    LEFT JOIN user_clients uc ON uc.id = i.client_id
    WHERE i.payment_status = 'pending'
      AND i.due_date < now()
      AND i.due_date >= (now() - interval '90 days')
  LOOP
    -- Notification au client
    PERFORM create_notification_secure(
      r.client_id,
      'invoice_overdue',
      'Facture en retard',
      'Votre facture ' || r.invoice_number || ' est en retard de ' || r.days_overdue || ' jours',
      ARRAY['in_app', 'email']::text[],
      CASE WHEN r.days_overdue >= 30 THEN 'urgent' ELSE 'high' END,
      NULL,
      NULL,
      r.id,
      NULL,
      NULL,
      '/client/invoices/' || r.id,
      'Voir la facture',
      jsonb_build_object('invoice_id', r.id, 'days_overdue', r.days_overdue)
    );

    -- Notification à l'admin (tous les 7j)
    IF r.days_overdue % 7 = 0 THEN
      PERFORM create_notification_secure(
        (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
        'invoice_overdue',
        'Relance facture retard',
        'Facture ' || r.invoice_number || ' : ' || r.days_overdue || ' jours de retard',
        ARRAY['in_app']::text[],
        'warning',
        NULL,
        NULL,
        r.id,
        NULL,
        NULL,
        '/admin/accounting/invoices/' || r.id,
        'Gérer',
        jsonb_build_object('invoice_id', r.id, 'client_email', r.email)
      );
    END IF;
  END LOOP;
END;
$$;
```

**Urgence reçue (Trigger) :**
```sql
CREATE OR REPLACE FUNCTION notify_emergency_received()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifier tous les admins et salariés
  INSERT INTO notifications (
    user_id,
    notification_type,
    title,
    message,
    channels,
    priority,
    related_request_id,
    action_url,
    action_label
  )
  SELECT
    p.id,
    'emergency_request_received',
    '🚨 Nouvelle urgence',
    'Urgence ' || NEW.urgency_level || ' : ' || NEW.description,
    ARRAY['in_app', 'email', 'sms']::text[],
    'urgent',
    NEW.id,
    '/admin/emergencies/' || NEW.id,
    'Assigner maintenant'
  FROM profiles p
  WHERE p.role IN ('admin', 'sal');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_emergency_received_trigger ON emergency_requests;
CREATE TRIGGER notify_emergency_received_trigger
  AFTER INSERT ON emergency_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_emergency_received();
```

**Mission mise à jour significative (Trigger) :**
```sql
CREATE OR REPLACE FUNCTION notify_mission_updated()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifier seulement si changements significatifs
  IF (
    (OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at) OR
    (OLD.address IS DISTINCT FROM NEW.address) OR
    (OLD.status IN ('Annulée', 'Bloqué') AND OLD.status != NEW.status)
  ) THEN
    PERFORM create_notification_secure(
      NEW.assigned_user_id,
      'mission_updated',
      'Mission modifiée',
      CASE
        WHEN OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at
          THEN 'Date changée : ' || to_char(NEW.scheduled_at, 'DD/MM à HH24:MI')
        WHEN OLD.address IS DISTINCT FROM NEW.address
          THEN 'Nouvelle adresse : ' || NEW.address
        ELSE 'Statut : ' || NEW.status
      END,
      ARRAY['in_app', 'push']::text[],
      'high',
      NEW.id,
      NULL,
      NULL,
      NULL,
      NULL,
      '/missions/' || NEW.id,
      'Voir les détails',
      jsonb_build_object('change_type',
        CASE
          WHEN OLD.scheduled_at IS DISTINCT FROM NEW.scheduled_at THEN 'date'
          WHEN OLD.address IS DISTINCT FROM NEW.address THEN 'address'
          ELSE 'status'
        END
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_mission_updated_trigger ON missions;
CREATE TRIGGER notify_mission_updated_trigger
  AFTER UPDATE ON missions
  FOR EACH ROW
  WHEN (OLD.assigned_user_id IS NOT NULL)
  EXECUTE FUNCTION notify_mission_updated();
```

---

#### 2.2 Email / SMS Edge Functions

**Structure :**
```
supabase/functions/
├── send-notification-email/
│   └── index.ts
├── send-notification-sms/
│   └── index.ts
└── process-notification-queue/
    └── index.ts  (Worker qui traite pending)
```

**Exemple Email :**
```typescript
// supabase/functions/send-notification-email/index.ts

import { corsHeaders } from "../_shared/cors.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { notification_id } = await req.json();

    // Récupérer la notification
    const { data: notif, error: fetchError } = await supabase
      .from("notifications")
      .select("*, profiles!notifications_user_id_fkey(email, full_name)")
      .eq("id", notification_id)
      .single();

    if (fetchError || !notif) throw new Error("Notification not found");

    // Vérifier préférences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("email_enabled")
      .eq("user_id", notif.user_id)
      .single();

    if (!prefs?.email_enabled) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "User opted out" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Envoyer via Resend
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "notifications@climpassion.com",
        to: notif.profiles.email,
        subject: notif.title,
        html: `
          <h2>${notif.title}</h2>
          <p>${notif.message}</p>
          ${notif.action_url ? `<a href="${notif.action_url}">${notif.action_label || "Voir"}</a>` : ""}
        `,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      // Échec : marquer et replanifier
      await supabase
        .from("notifications")
        .update({
          email_status: "failed",
          email_error: JSON.stringify(result),
          retry_count: notif.retry_count + 1,
          next_retry_at: new Date(Date.now() + Math.pow(2, notif.retry_count + 1) * 60000).toISOString(),
        })
        .eq("id", notification_id);

      throw new Error(`Email failed: ${JSON.stringify(result)}`);
    }

    // Succès : marquer sent
    await supabase
      .from("notifications")
      .update({
        email_status: "sent",
        email_sent_at: new Date().toISOString(),
      })
      .eq("id", notification_id);

    return new Response(
      JSON.stringify({ success: true, email_id: result.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
```

**Worker de traitement (scheduled) :**
```typescript
// supabase/functions/process-notification-queue/index.ts

// Scheduled: every 5 minutes

Deno.serve(async () => {
  try {
    // Récupérer les pending
    const { data: pending } = await supabase
      .from("notifications")
      .select("id, channels, email_status, sms_status")
      .or(
        "email_status.eq.pending,sms_status.eq.pending"
      )
      .lte("next_retry_at", new Date().toISOString())
      .lt("retry_count", 3)
      .limit(100);

    if (!pending?.length) {
      return new Response(JSON.stringify({ processed: 0 }));
    }

    const results = await Promise.allSettled(
      pending.map(async (notif) => {
        const promises = [];

        if (notif.email_status === "pending" && notif.channels.includes("email")) {
          promises.push(
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-email`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ notification_id: notif.id }),
            })
          );
        }

        if (notif.sms_status === "pending" && notif.channels.includes("sms")) {
          promises.push(
            fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-notification-sms`, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ notification_id: notif.id }),
            })
          );
        }

        return Promise.all(promises);
      })
    );

    return new Response(
      JSON.stringify({
        processed: pending.length,
        succeeded: results.filter((r) => r.status === "fulfilled").length,
        failed: results.filter((r) => r.status === "rejected").length,
      })
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
```

---

#### 2.3 Observabilité

**Table d'événements :**
```sql
CREATE TABLE IF NOT EXISTS notification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,

  event_type text NOT NULL CHECK (event_type IN (
    'created',
    'sent_email',
    'sent_sms',
    'sent_push',
    'delivered_email',
    'delivered_sms',
    'delivered_push',
    'failed_email',
    'failed_sms',
    'failed_push',
    'bounced_email',
    'read',
    'archived'
  )),

  channel text CHECK (channel IN ('email', 'sms', 'push', 'in_app')),

  -- Métriques
  latency_ms integer,  -- Temps depuis création
  error_code text,
  error_message text,

  -- Métadonnées
  metadata jsonb DEFAULT '{}'::jsonb,

  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_notification_events_notification_id ON notification_events(notification_id);
CREATE INDEX idx_notification_events_event_type ON notification_events(event_type);
CREATE INDEX idx_notification_events_created_at ON notification_events(created_at DESC);

-- Trigger auto pour logger les événements
CREATE OR REPLACE FUNCTION log_notification_event()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO notification_events (notification_id, event_type, channel)
    VALUES (NEW.id, 'created', 'in_app');
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Email sent
    IF OLD.email_status != 'sent' AND NEW.email_status = 'sent' THEN
      INSERT INTO notification_events (
        notification_id,
        event_type,
        channel,
        latency_ms
      ) VALUES (
        NEW.id,
        'sent_email',
        'email',
        EXTRACT(EPOCH FROM (NEW.email_sent_at - NEW.created_at)) * 1000
      );
    END IF;

    -- Email failed
    IF OLD.email_status != 'failed' AND NEW.email_status = 'failed' THEN
      INSERT INTO notification_events (
        notification_id,
        event_type,
        channel,
        error_message
      ) VALUES (
        NEW.id,
        'failed_email',
        'email',
        NEW.email_error
      );
    END IF;

    -- Read
    IF OLD.read_at IS NULL AND NEW.read_at IS NOT NULL THEN
      INSERT INTO notification_events (
        notification_id,
        event_type,
        channel,
        latency_ms
      ) VALUES (
        NEW.id,
        'read',
        'in_app',
        EXTRACT(EPOCH FROM (NEW.read_at - NEW.created_at)) * 1000
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_notification_event_trigger ON notifications;
CREATE TRIGGER log_notification_event_trigger
  AFTER INSERT OR UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION log_notification_event();
```

**Vue métriques :**
```sql
CREATE OR REPLACE VIEW notification_metrics_daily AS
SELECT
  date_trunc('day', created_at) as date,
  event_type,
  channel,
  COUNT(*) as count,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY latency_ms) as p50_latency_ms,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms) as p95_latency_ms,
  COUNT(*) FILTER (WHERE error_code IS NOT NULL) as error_count
FROM notification_events
WHERE created_at >= now() - interval '30 days'
GROUP BY 1, 2, 3
ORDER BY 1 DESC, 2, 3;
```

---

## 🎨 UX Improvements

### NotificationBell Améliorations

```tsx
// src/components/NotificationBell.tsx (améliorations)

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refresh } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'priority'>('all');

  const filteredNotifications = useMemo(() => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = filtered.filter(n => !n.read_at);
    } else if (filter === 'priority') {
      filtered = filtered.filter(n => ['high', 'urgent'].includes(n.priority));
    }

    return filtered;
  }, [notifications, filter]);

  // Grouper par jour
  const groupedByDay = useMemo(() => {
    const groups: Record<string, typeof notifications> = {};

    filteredNotifications.forEach(notif => {
      const date = new Date(notif.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (date.toDateString() === today.toDateString()) {
        key = "Aujourd'hui";
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = "Hier";
      } else {
        key = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      }

      if (!groups[key]) groups[key] = [];
      groups[key].push(notif);
    });

    return groups;
  }, [filteredNotifications]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}

      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border z-50 max-h-[600px] flex flex-col">
          {/* Header avec filtres */}
          <div className="px-4 py-3 border-b space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Notifications</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => refresh()}
                  className="text-xs text-gray-600 hover:text-gray-900"
                  title="Rafraîchir"
                >
                  ⟳
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="text-xs text-sky-600 hover:underline"
                  >
                    Tout marquer lu
                  </button>
                )}
              </div>
            </div>

            {/* Filtres rapides */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`text-xs px-2 py-1 rounded ${
                  filter === 'all' ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Tous
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`text-xs px-2 py-1 rounded ${
                  filter === 'unread' ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Non lus ({unreadCount})
              </button>
              <button
                onClick={() => setFilter('priority')}
                className={`text-xs px-2 py-1 rounded ${
                  filter === 'priority' ? 'bg-sky-100 text-sky-700' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Prioritaires
              </button>
            </div>
          </div>

          {/* Liste groupée par jour */}
          <div className="overflow-y-auto flex-1">
            {Object.keys(groupedByDay).length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucune notification</p>
              </div>
            ) : (
              Object.entries(groupedByDay).map(([day, notifs]) => (
                <div key={day}>
                  <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-600 sticky top-0">
                    {day}
                  </div>
                  <div className="divide-y">
                    {notifs.map((notif) => (
                      <NotificationItem
                        key={notif.id}
                        notification={notif}
                        onClick={() => handleNotificationClick(notif)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t bg-gray-50">
            <a
              href="/admin/communication/notifications"
              className="text-xs text-sky-600 hover:underline font-medium block text-center"
            >
              Voir toutes les notifications →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 📋 Checklist Complète

### Sprint 1 (Sécurité & Fondations)

- [ ] Créer migration `fix_notifications_rls_security.sql`
- [ ] Implémenter `create_notification_secure()` avec validations
- [ ] Supprimer policy dangereuse
- [ ] Migrer tous les triggers vers fonction sécurisée
- [ ] Ajouter `dedup_key` column + index unique
- [ ] Mettre à jour triggers avec déduplication
- [ ] Créer table `notification_preferences`
- [ ] Créer fonction `filter_channels_by_preferences()`
- [ ] Trigger auto création préférences sur nouveau profil
- [ ] Intégrer filtrage dans `create_notification_secure()`
- [ ] Implémenter keyset pagination (API + RPC)
- [ ] Tester pagination avec 1000+ notifications
- [ ] UI : filtres rapides (tous/non-lus/prioritaires)
- [ ] UI : groupement par jour
- [ ] UI : pull-to-refresh

### Sprint 2 (Couverture & Canaux)

- [ ] Trigger `notify_emergency_received`
- [ ] Trigger `notify_mission_updated` (changements significatifs)
- [ ] Job quotidien `check_overdue_invoices`
- [ ] Edge Function `send-notification-email`
- [ ] Edge Function `send-notification-sms`
- [ ] Edge Function `process-notification-queue` (worker)
- [ ] Configurer Resend/SendGrid (email)
- [ ] Configurer Twilio/OVH (SMS)
- [ ] Table `notification_events`
- [ ] Trigger auto logging événements
- [ ] Vue `notification_metrics_daily`
- [ ] Dashboard admin métriques
- [ ] Tests E2E notifications
- [ ] Documentation utilisateur

---

## 🚀 Impact Attendu

### Sécurité
- ✅ Élimination risque création malveillante
- ✅ Validation inputs (XSS, injection)
- ✅ Audit trail complet

### Fiabilité
- ✅ Anti-duplication (pas de spam)
- ✅ Retry avec backoff exponentiel
- ✅ Dead letter queue (échecs > 3x)
- ✅ Idempotence garantie

### UX
- ✅ Préférences granulaires par utilisateur
- ✅ Quiet hours respectés
- ✅ Pagination infinie performante
- ✅ Filtres et groupement intuitifs

### Couverture Fonctionnelle
- Passer de **2/24 types actifs** à **12+/24**
- Activer email + SMS (multi-canal)
- Alertes temps réel urgences
- Relances automatiques factures

### Observabilité
- ✅ Métriques temps réel (latence, taux erreur)
- ✅ Dashboard admin monitoring
- ✅ Détection proactive problèmes

---

## 📚 Documentation Technique

### Variables d'Environnement Requises

```env
# Email (Resend ou SendGrid)
RESEND_API_KEY=re_xxxxx

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
TWILIO_PHONE_NUMBER=+33xxxxxxxx

# Push (Firebase - optionnel Sprint 3)
FIREBASE_PROJECT_ID=xxxxx
FIREBASE_PRIVATE_KEY=xxxxx
```

### Déploiement Edge Functions

```bash
# Email
supabase functions deploy send-notification-email --no-verify-jwt

# SMS
supabase functions deploy send-notification-sms --no-verify-jwt

# Worker
supabase functions deploy process-notification-queue --no-verify-jwt
```

### Configuration Scheduled Jobs

```sql
-- Via pg_cron (si disponible)
SELECT cron.schedule(
  'process-notification-queue',
  '*/5 * * * *',  -- Toutes les 5 minutes
  $$
  SELECT net.http_post(
    url:='https://your-project.supabase.co/functions/v1/process-notification-queue',
    headers:='{"Authorization": "Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb
  );
  $$
);

SELECT cron.schedule(
  'check-overdue-invoices',
  '0 9 * * *',  -- Tous les jours à 9h
  $$SELECT check_overdue_invoices();$$
);
```

---

**Ce roadmap transforme le système actuel (POC solide) en une plateforme de notifications production-ready, sécurisée, observée et multi-canal.** 🎯

Estimation : **Sprint 1 = 3-4 jours**, **Sprint 2 = 4-5 jours** pour 1 dev full-time.
